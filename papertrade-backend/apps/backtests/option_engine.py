import logging
from datetime import timedelta
from decimal import Decimal
from django.utils import timezone
from apps.stocks.models import Stock, StockPriceDaily
from apps.options.models import OptionDailyData
from apps.strategies.models import OptionStrategy
from .models import BacktestRun

logger = logging.getLogger(__name__)

class OptionBacktestEngine:
    def __init__(self, backtest_run: BacktestRun):
        self.backtest_run = backtest_run
        self.strategy = backtest_run.strategy_options
        self.results = []
        self.stats = {
            'total_trades': 0,
            'win_count': 0,
            'loss_count': 0,
            'total_pnl': Decimal(0),
        }

    def execute(self, stock_ids: list):
        start_time = timezone.now()
        try:
            self.backtest_run.status = 'running'
            self.backtest_run.save()

            stocks = Stock.objects.filter(id__in=stock_ids)
            start_date = self.backtest_run.start_date
            end_date = self.backtest_run.end_date

            for stock in stocks:
                self._process_stock(stock, start_date, end_date)

            # Finalize Stats
            self.backtest_run.number_of_trades = self.stats['total_trades']
            self.backtest_run.win_count = self.stats['win_count']
            self.backtest_run.loss_count = self.stats['loss_count']
            self.backtest_run.total_pnl = self.stats['total_pnl']
            
            if self.stats['total_trades'] > 0:
                 self.backtest_run.win_rate = (self.stats['win_count'] / self.stats['total_trades']) * 100
                 
            self.backtest_run.list_of_trades_json = self.results
            self.backtest_run.status = 'completed'
            self.backtest_run.time_taken = (timezone.now() - start_time).total_seconds()
            self.backtest_run.save()

        except Exception as e:
            logger.error(f"Option Backtest failed: {e}", exc_info=True)
            self.backtest_run.status = 'failed'
            self.backtest_run.error_message = str(e)
            self.backtest_run.save()

    def _process_stock(self, stock, start_date, end_date):
        # 1. Fetch Underlying Prices
        spot_prices = list(StockPriceDaily.objects.filter(
            stock=stock, date__range=[start_date, end_date]
        ).order_by('date'))
        
        if not spot_prices:
            return
            
        date_map = {p.date: p for p in spot_prices}
        sorted_dates = sorted(date_map.keys())

        # 2. Identify Expiry Dates
        # Fetching all distinct expiry dates in range (plus buffer for forward looking)
        relevant_expiries = OptionDailyData.objects.filter(
            underlying_symbol=stock.symbol, 
            expiry_date__gte=start_date
        ).values_list('expiry_date', flat=True).distinct().order_by('expiry_date')
        
        expiries = list(relevant_expiries)
        if not expiries:
            return

        # 3. Iterate Days
        active_positions = [] # List of dicts representing open trades
        
        for current_date in sorted_dates:
            spot_obj = date_map[current_date]
            spot_price = spot_obj.close_price

            # --- CHECK EXITS ---
            remaining_positions = []
            for pos in active_positions:
                # Check for exit (Partial or Full)
                is_closed = self._check_exit_conditions(pos, current_date, spot_price)
                
                if is_closed:
                    # Trade fully closed
                    self._record_trade(pos, current_date)
                else:
                    remaining_positions.append(pos)
            active_positions = remaining_positions

            # --- CHECK ENTRIES ---
            # Assumption: One active trade per strategy per stock at a time (unless pyramiding implemented later)
            if not active_positions: 
                 new_pos = self._check_entry(stock, current_date, spot_price, expiries)
                 if new_pos:
                     active_positions.append(new_pos)

    def _check_entry(self, stock, current_date, spot_price, expiries):
        # 1. Find relevant expiry
        valid_expiries = [e for e in expiries if e >= current_date]
        if not valid_expiries: return None
        
        target_expiry = valid_expiries[0] # Nearest expiry
        days_to_expiry = (target_expiry - current_date).days
        
        # 2. Check Strategy Entry Condition (Timing)
        main_entry = self.strategy.configuration.get('legs', [{}])[0].get('entry', {})
        required_days = int(main_entry.get('daysBeforeExpiry', 0))
        entry_mode = self.strategy.configuration.get('entryMode', 'EXPIRY_BASED') # EXPIRY_BASED or DAILY

        if entry_mode == 'EXPIRY_BASED':
            # Check exact day match (or within small window if skipped)
            # For simplicity, we check exact match or if we just crossed it (missed day)
            # But backtest iterates daily, so exact match check is usually fine unless data gap.
            if days_to_expiry != required_days:
                return None
        
        # 3. Construct Position
        position = {
            'entry_date': current_date,
            'expiry_date': target_expiry,
            'stock_symbol': stock.symbol,
            'legs': [],
            'status': 'OPEN',
            'pnl_realized': 0.0
        }
        
        legs_config = self.strategy.configuration.get('legs', [])
        
        # Optimization: Fetch needed option chain data in one query if possible or min/max strike
        pass_criteria = True
        
        for leg in legs_config:
            leg_entry = leg.get('entry', {})
            leg_type = leg.get('type') # CE/PE
            leg_action = leg.get('action') # BUY/SELL
            
            # Select Strike
            strike_target = float(spot_price)
            offset = float(leg_entry.get('strikeOffset', 0))
            selection_mode = leg_entry.get('strikeSelection') # ATM, ATM_PLUS, ATM_MINUS
            
            if selection_mode == 'ATM_PLUS':
                multiplier = (1 + offset/100) if leg_entry.get('strikeOffsetType') == '%' else 1
                adder = offset if leg_entry.get('strikeOffsetType') != '%' else 0
                strike_target = (strike_target * multiplier) + adder
            elif selection_mode == 'ATM_MINUS':
                multiplier = (1 - offset/100) if leg_entry.get('strikeOffsetType') == '%' else 1
                subtractor = offset if leg_entry.get('strikeOffsetType') != '%' else 0
                strike_target = (strike_target * multiplier) - subtractor
            
            # Fetch Data: Filter strikes within reasonable range to optimize
            # e.g. +/- 5% of target
            # Need strict closest match.
            
            chain_data = OptionDailyData.objects.filter(
                underlying_symbol=stock.symbol,
                expiry_date=target_expiry,
                date=current_date,
                option_type=leg_type,
                strike_price__gte=strike_target * 0.8, # Optimization buffer
                strike_price__lte=strike_target * 1.2
            ).values('strike_price', 'close_price')
            
            if not chain_data:
                pass_criteria = False
                break
            
            # Find closest strike
            best_match = min(chain_data, key=lambda x: abs(float(x['strike_price']) - strike_target))
            entry_price = float(best_match['close_price'])
            
            position['legs'].append({
                'leg_id': leg['id'],
                'type': leg_type, 
                'action': leg_action,
                'strike': float(best_match['strike_price']),
                'entry_price': entry_price,
                'qty': 1, # default lot
                'status': 'OPEN',
                'exit_price': None,
                'exit_date': None,
                'exit_reason': None, # SL, TP, EXPIRY
                'sl_config': leg.get('exit', {}).get('sl', {}), # Store SL config
                'tp_config': leg.get('exit', {}).get('tp', {})  # Store TP config
            })
            
        if not pass_criteria:
            return None
            
        return position

    def _check_exit_conditions(self, position, current_date, spot_price):
        # Returns True if ALL legs are closed
        
        all_closed = True
        
        # 1. Check Expiry first
        is_expiry = current_date >= position['expiry_date']
        
        for leg in position['legs']:
            if leg['status'] != 'OPEN':
                continue
                
            all_closed = False # Found an open leg
            
            # Fetch Daily OHLC for this leg
            opt_data = OptionDailyData.objects.filter(
                underlying_symbol=position['stock_symbol'],
                expiry_date=position['expiry_date'],
                strike_price=leg['strike'],
                option_type=leg['type'],
                date=current_date
            ).first()
            
            if not opt_data:
                # Missing data? Assume hold or force close if expiry?
                if is_expiry:
                    # Force close at 0 or last known?
                    # If expiry and no data, likely worthless or expired. 
                    # If OTM -> 0. If ITM -> Intrinsic.
                    # Simple: Close at 0 if missing on expiry.
                    self._close_leg(leg, 0, current_date, 'EXPIRY_MISSING')
                continue
            
            high = float(opt_data.high_price) if opt_data.high_price else float(opt_data.close_price)
            low = float(opt_data.low_price) if opt_data.low_price else float(opt_data.close_price)
            close = float(opt_data.close_price)
            
            # Check Expiry
            if is_expiry:
                self._close_leg(leg, close, current_date, 'EXPIRY')
                continue
                
            # Check SL/TP
            entry_price = leg['entry_price']
            
            # SL Logic
            sl_hit = False
            sl_price = 0
            if leg['sl_config'] and leg['sl_config'].get('type'):
                val = float(leg['sl_config'].get('value', 0))
                if leg['action'] == 'BUY':
                    sl_limit = entry_price - (val if leg['sl_config']['type'] == 'points' else entry_price * val/100)
                    if low <= sl_limit:
                        sl_hit = True
                        sl_price = sl_limit # Pessimistic: exited at SL limit
                else: # SELL
                    sl_limit = entry_price + (val if leg['sl_config']['type'] == 'points' else entry_price * val/100)
                    if high >= sl_limit:
                        sl_hit = True
                        sl_price = sl_limit
            
            if sl_hit:
                self._close_leg(leg, sl_price, current_date, 'SL_HIT')
                continue
                
            # TP Logic
            tp_hit = False
            tp_price = 0
            if leg['tp_config'] and leg['tp_config'].get('type'):
                val = float(leg['tp_config'].get('value', 0))
                if leg['action'] == 'BUY':
                    tp_limit = entry_price + (val if leg['tp_config']['type'] == 'points' else entry_price * val/100)
                    if high >= tp_limit:
                        tp_hit = True
                        tp_price = tp_limit
                else: # SELL
                    tp_limit = entry_price - (val if leg['tp_config']['type'] == 'points' else entry_price * val/100)
                    if low <= tp_limit:
                        tp_hit = True
                        tp_price = tp_limit
                        
            if tp_hit:
                self._close_leg(leg, tp_price, current_date, 'TP_HIT')
                continue
                
        # Update PnL for open legs (Mark-to-Market for stats/reporting, but realized only on close)
        # Actually we compute total realized pnl + MTM of open pnl?
        # For simplicity, record trade only when Fully Closed.
        
        # Re-check if all closed now
        final_check_open = any(l['status'] == 'OPEN' for l in position['legs'])
        return not final_check_open

    def _close_leg(self, leg, price, date, reason):
        leg['status'] = 'CLOSED'
        leg['exit_price'] = price
        leg['exit_date'] = date
        leg['exit_reason'] = reason
        
        qty = leg['qty']
        if leg['action'] == 'BUY':
            pnl = (price - leg['entry_price']) * qty
        else:
            pnl = (leg['entry_price'] - price) * qty
        leg['pnl'] = pnl

    def _record_trade(self, position, exit_date):
        total_pnl = sum(l.get('pnl', 0) for l in position['legs'])
        
        self.stats['total_trades'] += 1
        self.stats['total_pnl'] += Decimal(total_pnl)
        if total_pnl > 0: self.stats['win_count'] += 1
        else: self.stats['loss_count'] += 1
        
        self.results.append({
            'stock_symbol': position['stock_symbol'],
            'entry_date': position['entry_date'].strftime('%Y-%m-%d'),
            'exit_date': exit_date.strftime('%Y-%m-%d'),
            'pnl': float(total_pnl),
            'legs': [{
                'type': l['type'],
                'action': l['action'],
                'strike': l['strike'],
                'entry': l['entry_price'],
                'exit': l['exit_price'],
                'pnl': l.get('pnl', 0),
                'reason': l.get('exit_reason')
            } for l in position['legs']]
        })

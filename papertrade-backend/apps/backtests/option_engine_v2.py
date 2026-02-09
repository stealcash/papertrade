"""
Option Backtest Engine V2 - Uses new OptionBacktestRun and OptionTrade models.
This is wrapper around the existing logic but stores to the correct separate tables.
"""
import logging
from decimal import Decimal
from django.utils import timezone
from apps.stocks.models import StockPriceDaily
from apps.options.models import OptionDailyData
from .models import OptionBacktestRun, OptionTrade

logger = logging.getLogger(__name__)


class OptionBacktestEngineV2:
    """
    Engine for backtesting option strategies on INDICES (NOT individual stocks).
    Uses new separate OptionBacktestRun and OptionTrade models.
    """
    
    def __init__(self, backtest_run: OptionBacktestRun):
        self.backtest_run = backtest_run
        self.strategy = backtest_run.strategy
        self.underlying_symbol = backtest_run.underlying_symbol
        
        # MAPPING: Map spot symbol to option data symbol if they differ
        self.option_symbol = self.underlying_symbol
        if self.underlying_symbol == 'NIFTY50':
            self.option_symbol = 'NIFTY'
            
        self.results = []
        self.stats = {
            'total_trades': 0,
            'win_count': 0,
            'loss_count': 0,
            'total_pnl': Decimal(0),
        }

        # Normalize configuration for global entry/exit (Transition Support)
        conf = self.strategy.configuration
        legs = conf.get('legs', [{}])
        first_leg = legs[0] if legs else {}
        
        # Entry Config Priority: Top-level 'entry' > First leg's 'entry'
        self.entry_config = conf.get('entry') or first_leg.get('entry', {})
        
        # Exit Config Priority: Top-level 'exit' > First leg's 'exit'
        self.exit_config = conf.get('exit') or first_leg.get('exit', {})
        
        # Special case for entry_mode which might be at root
        self.entry_mode = conf.get('entryMode') or self.entry_config.get('mode', 'EXPIRY_BASED')
    
    def execute(self):
        """Execute the backtest for the configured index."""
        start_time = timezone.now()
        
        try:
            self.backtest_run.status = 'running'
            self.backtest_run.save()
            
            # Process the index
            self._process_index(
                self.underlying_symbol,
                self.backtest_run.start_date,
                self.backtest_run.end_date
            )
            
            # Save summary stats
            if self.stats['total_trades'] > 0:
                win_rate = (self.stats['win_count'] / self.stats['total_trades']) * 100
            else:
                win_rate = 0
            
            self.backtest_run.total_trades = self.stats['total_trades']
            self.backtest_run.win_count = self.stats['win_count']
            self.backtest_run.loss_count = self.stats['loss_count']
            self.backtest_run.win_rate = Decimal(win_rate)
            self.backtest_run.total_pnl = self.stats['total_pnl']
            self.backtest_run.status = 'completed'
            self.backtest_run.time_taken = (timezone.now() - start_time).total_seconds()
            self.backtest_run.save()
            
            logger.info(f"Option backtest {self.backtest_run.run_id} completed: {self.stats['total_trades']} trades")
            
        except Exception as e:
            logger.error(f"Option Backtest failed: {e}", exc_info=True)
            self.backtest_run.status = 'failed'
            self.backtest_run.error_message = str(e)
            self.backtest_run.save()
            raise
    
    def _process_index(self, index_symbol, start_date, end_date):
        """
        Process option trades for an index.
        Similar to option_engine.py but adapted for indices.
        """
        # Get underlying spot prices (for the index)
        # Note: Indices might have different data source than individual stocks
        # For now, assuming we have price data for indices in StockPriceDaily
        
        from apps.stocks.models import Stock
        try:
            index_stock = Stock.objects.get(symbol=index_symbol)
        except Stock.DoesNotExist:
            logger.warning(f"Index {index_symbol} not found in stocks table")
            return
        
        spot_prices = list(StockPriceDaily.objects.filter(
            stock=index_stock,
            date__range=[start_date, end_date]
        ).order_by('date'))
        
        if not spot_prices:
            logger.warning(f"No price data for {index_symbol} in range {start_date} to {end_date}")
            return
        
        date_map = {p.date: p for p in spot_prices}
        sorted_dates = sorted(date_map.keys())
        
        # Get distinct expiry dates for options
        relevant_expiries = OptionDailyData.objects.filter(
            underlying_symbol=self.option_symbol,
            expiry_date__gte=start_date
        ).values_list('expiry_date', flat=True).distinct().order_by('expiry_date')
        
        expiries = list(relevant_expiries)
        if not expiries:
            logger.warning(f"No option expiries found for {index_symbol}")
            return
        
        # Track active positions
        active_positions = []
        self.processed_expiries = set()
        
        # Pre-fetch ALL option data for the entire date range and relevant expiries
        self._pre_fetch_data(start_date, end_date, expiries)
        
        for i, current_date in enumerate(sorted_dates):
            spot_obj = date_map[current_date]
            spot_price = float(spot_obj.close_price)
            
            # Check exits for existing positions
            remaining_positions = []
            should_reenter = False
            
            for pos in active_positions:
                is_closed = self._check_exit_conditions(pos, current_date, spot_price)
                
                if is_closed:
                    self._record_trade(pos, current_date)
                    # Re-entry check: only if SL/TP hit (not expiry/time based)
                    # We can check the exit reason of the first leg or just check allowReentry
                    if self.exit_config.get('allowReentry'):
                        should_reenter = True
                else:
                    remaining_positions.append(pos)
            
            active_positions = remaining_positions
            
            # Save last open/close for WtT ref
            self.last_close = float(spot_obj.close_price)
            self.last_open = float(spot_obj.open_price)
            
            # Check for new entry (if no active position)
            if not active_positions:
                next_trading_date = sorted_dates[i+1] if i+1 < len(sorted_dates) else None
                # If we just exited and want to re-enter, pass is_reentry=True
                new_pos = self._check_entry(index_symbol, current_date, spot_obj, expiries, next_trading_date, is_reentry=should_reenter)
                if new_pos:
                    active_positions.append(new_pos)
    
    #### The following methods are adapted from option_engine.py ####
    
    def _check_entry(self, index_symbol, current_date, spot_obj, expiries, next_trading_date=None, is_reentry=False):
        """Check if entry conditions are met."""
        valid_expiries = [e for e in expiries if e >= current_date]
        if not valid_expiries:
            return None
        
        target_expiry = valid_expiries[0]
        days_to_expiry = (target_expiry - current_date).days
        
        # Get entry configuration
        required_days = int(self.entry_config.get('daysBeforeExpiry', 0))
        is_flexible = self.entry_config.get('flexibleEntry', False)
        
        if self.entry_mode == 'EXPIRY_BASED':
            # Don't enter multiple times for the same expiry, UNLESS it's a re-entry
            if not is_reentry and target_expiry in self.processed_expiries:
                return None
                
            can_enter = False
            
            # If re-entry is triggered, we already know we want to enter for this expiry
            if is_reentry:
                can_enter = True
            elif days_to_expiry == required_days:
                can_enter = True
            elif is_flexible:
                # Logic for "Enter Before Holiday":
                if next_trading_date:
                    next_days = (target_expiry - next_trading_date).days
                    if days_to_expiry > required_days and next_days < required_days:
                        can_enter = True
                
                # Logic for "Enter ASAP after Holiday/Start":
                if not can_enter and days_to_expiry < required_days:
                    can_enter = True
            
            if not can_enter:
                return None
            
            # Mark this expiry as processed
            self.processed_expiries.add(target_expiry)
        
        # Build position
        position = {
            'entry_date': current_date,
            'expiry_date': target_expiry,
            'underlying_symbol': index_symbol,
            'entry_spot_price': float(spot_obj.open_price if self.entry_config.get('priceRef') == 'OPEN' else spot_obj.close_price),
            'legs': [],
            'status': 'OPEN'
        }
        
        min_vol = float(self.entry_config.get('minVolume') or 0)
        
        for leg in self.strategy.configuration.get('legs', []):
            leg_data = self._build_leg(leg, index_symbol, target_expiry, current_date, spot_obj)
            if not leg_data:
                return None  # Can't build position if any leg fails
            
            # --- Minimum Volume Filter (Liquidity Control) ---
            if min_vol > 0:
                leg_vol = float(leg_data.get('volume') or 0)
                if leg_vol < min_vol:
                    return None # Skip entire strategy entry if ANY leg lacks volume
                
            position['legs'].append(leg_data)
        
        # --- Handle Wait and Trade (WtT) ---
        wtt = self.entry_config.get('waitAndTrade', {})
        if wtt and wtt.get('enabled'):
            wtt_type = wtt.get('type', 'INCREASE') # INCREASE or DECREASE
            wtt_val = float(wtt.get('value', 0))
            wtt_ref_type = wtt.get('ref', 'PREV_CLOSE')
            
            # Determine reference price
            ref_price = 0
            if wtt_ref_type == 'PREV_CLOSE':
                ref_price = getattr(self, 'last_close', float(spot_obj.open_price))
            elif wtt_ref_type == 'PREV_OPEN':
                ref_price = getattr(self, 'last_open', float(spot_obj.open_price))
            elif wtt_ref_type == 'TODAY_OPEN':
                ref_price = float(spot_obj.open_price)
            
            if ref_price <= 0: return None
                
            trigger_price = ref_price * (1 + wtt_val / 100) if wtt_type == 'INCREASE' else ref_price * (1 - wtt_val / 100)
            
            # Check if trigger was hit during the day
            high = float(spot_obj.high_price or spot_obj.close_price)
            low = float(spot_obj.low_price or spot_obj.close_price)
            
            hit = False
            if wtt_type == 'INCREASE' and high >= trigger_price: hit = True
            elif wtt_type == 'DECREASE' and low <= trigger_price: hit = True
            
            if not hit: return None
            
            # If hit, adjust entry prices for legs proportionally to the move? 
            # Or just assume entries happened at that trigger time?
            # Professional way: Adjust leg entry prices based on move from spot_ref to trigger_price.
            spot_ref = float(spot_obj.open_price if self.entry_config.get('priceRef', 'CLOSE') == 'OPEN' else spot_obj.close_price)
            if spot_ref > 0:
                mult = trigger_price / spot_ref
                for leg in position['legs']:
                    leg['entry_price'] *= mult
            
            position['entry_price_simulated'] = trigger_price
            
        return position
    
    def _build_leg(self, leg_config, index_symbol, expiry_date, current_date, spot_obj):
        """Build a single leg of the position."""
        leg_type = leg_config.get('type')  # CE/PE
        leg_action = leg_config.get('action')  # BUY/SELL
        select_by = leg_config.get('selectBy', 'STRIKE')
        spot_ref = self.entry_config.get('priceRef', 'CLOSE')
        
        best_match = None
        
        if select_by == 'STRIKE':
            # Decide which spot price to use for strike calculation
            strike_target = float(spot_obj.open_price if spot_ref == 'OPEN' else spot_obj.close_price)
            
            # Strike selection parameters remain per-leg
            offset = float(leg_config.get('strikeOffset', 0))
            selection_mode = leg_config.get('strikeSelection', 'ATM')
            
            if selection_mode == 'ATM_PLUS':
                if leg_config.get('strikeOffsetType') == '%':
                    strike_target *= (1 + offset / 100)
                else:
                    strike_target += offset
            elif selection_mode == 'ATM_MINUS':
                if leg_config.get('strikeOffsetType') == '%':
                    strike_target *= (1 - offset / 100)
                else:
                    strike_target -= offset
            
            # Get chain data from nested cache
            date_cache = self.option_data_cache.get(current_date, {})
            exp_cache = date_cache.get(expiry_date, {})
            type_cache = exp_cache.get(leg_type, {})
            
            # Filters strikes within range (O(k) where k is number of strikes in chain)
            chain_data = [
                v for strike_val, v in type_cache.items()
                if strike_target * 0.8 <= strike_val <= strike_target * 1.2
            ]

            if not chain_data:
                # Fallback to DB if cache missed (safety)
                chain_data = OptionDailyData.objects.filter(
                    underlying_symbol=self.option_symbol,
                    expiry_date=expiry_date,
                    date=current_date,
                    option_type=leg_type,
                    strike_price__gte=strike_target * 0.8,
                    strike_price__lte=strike_target * 1.2
                ).values('strike_price', 'open_price', 'close_price', 'volume', 'high_price', 'low_price')
            
            if not chain_data:
                return None
            
            # Find closest strike
            best_match = min(chain_data, key=lambda x: abs(float(x['strike_price']) - strike_target))
            
        else: # select_by == 'PREMIUM'
            target_premium = float(leg_config.get('targetPremium', 100))
            tolerance = float(leg_config.get('premiumTolerance', 10))
            
            # Get all strikes for this expiry from nested cache
            date_cache = self.option_data_cache.get(current_date, {})
            exp_cache = date_cache.get(expiry_date, {})
            type_cache = exp_cache.get(leg_type, {})
            chain_data = list(type_cache.values())
            
            if not chain_data:
                chain_data = OptionDailyData.objects.filter(
                    underlying_symbol=self.option_symbol,
                    expiry_date=expiry_date,
                    date=current_date,
                    option_type=leg_type
                ).values('strike_price', 'open_price', 'close_price', 'high_price', 'low_price', 'volume')
            
            if not chain_data:
                return None
                
            # Find strike with price closest to target_premium
            def get_price(x):
                p = float(x['open_price'] if spot_ref == 'OPEN' and x['open_price'] else x['close_price'])
                return p

            best_match = min(chain_data, key=lambda x: abs(get_price(x) - target_premium))
            
            # Check tolerance
            actual_price = get_price(best_match)
            if abs(actual_price - target_premium) > tolerance:
                return None  # Price outside tolerance range
                
        entry_price_val = float(best_match['open_price'] if spot_ref == 'OPEN' and best_match['open_price'] else best_match['close_price'])
        
        # --- Premium-Based Filters (Dynamic Constraints) ---
        if select_by == 'STRIKE':
            try:
                min_px = float(leg_config.get('minPremium') or 0)
                max_px = float(leg_config.get('maxPremium') or 0)
            except (ValueError, TypeError):
                min_px, max_px = 0, 0
            
            if min_px > 0 and entry_price_val < min_px:
                return None # Skip entry: price too low
            if max_px > 0 and entry_price_val > max_px:
                return None # Skip entry: price too high
        

        # Decide risk management source
        risk_mode = self.exit_config.get('riskManagementMode', 'GLOBAL')
        if risk_mode == 'LEG_WISE':
            sl_config = leg_config.get('stopLoss', {})
            tp_config = leg_config.get('takeProfit', {})
            tsl_config = leg_config.get('trailingStopLoss', {})
        else:
            sl_config = self.exit_config.get('stopLoss', {})
            tp_config = self.exit_config.get('takeProfit', {})
            tsl_config = self.exit_config.get('trailingStopLoss', {})

        return {
            'leg_id': leg_config.get('id', ''),
            'type': leg_type,
            'action': leg_action,
            'strike': float(best_match['strike_price']),
            'entry_price': entry_price_val,
            'qty': 1,
            'volume': float(best_match.get('volume') or 0),
            'lot_multiplier': int(leg_config.get('lotMultiplier', 1)),
            'status': 'OPEN',
            'exit_price': None,
            'exit_date': None,
            'exit_reason': None,
            'sl_config': sl_config,
            'tp_config': tp_config,
            'tsl_config': tsl_config,
            'tsl_watermark': None # Will be initialized on first check
        }
    
    def _check_exit_conditions(self, position, current_date, spot_price):
        """Check if position should be exited."""
        all_closed = True
        is_expiry = current_date >= position['expiry_date']
        
        exit_type = self.exit_config.get('type', 'DAYS_BEFORE_EXPIRY')
        
        # Decide if we hit the time-based exit condition
        should_exit_now = False
        
        if is_expiry:
            should_exit_now = True
        elif exit_type == 'DAYS_BEFORE_EXPIRY':
            days_to_expiry = (position['expiry_date'] - current_date).days
            target_days = int(self.exit_config.get('daysBeforeExpiry', 0))
            if days_to_expiry <= target_days:
                should_exit_now = True
        elif exit_type == 'DAILY':
            # DAILY exit logic
            if position.get('entry_date'):
                days_since_entry = (current_date - position['entry_date']).days
                daily_exit_type = self.exit_config.get('dailyExitType', 'SAME_DAY')
                daily_exit_days = int(self.exit_config.get('dailyExitDays', 0))
                
                if daily_exit_type == 'SAME_DAY' and days_since_entry >= 0:
                    should_exit_now = True
                elif daily_exit_type == 'FOLLOWING_DAYS' and days_since_entry >= daily_exit_days:
                    should_exit_now = True
        
        # --- PORTFOLIO LEVEL SL/TP CHECK ---
        total_pnl = 0
        total_entry_premium = 0
        active_legs = []
        
        for leg in position['legs']:
            if leg['status'] != 'OPEN': continue
            active_legs.append(leg)
            
            # Use nested cache lookup
            date_cache = self.option_data_cache.get(current_date, {})
            exp_cache = date_cache.get(position['expiry_date'], {})
            type_cache = exp_cache.get(leg['type'], {})
            opt_data = type_cache.get(leg['strike'])
            
            if opt_data:
                curr_price = float(opt_data['close_price'])
                lot_size = self.backtest_run.lot_size
                mult = leg.get('lot_multiplier', 1)
                
                if leg['action'] == 'BUY':
                    leg_pnl = (curr_price - leg['entry_price']) * lot_size * mult
                else:
                    leg_pnl = (leg['entry_price'] - curr_price) * lot_size * mult
                total_pnl += leg_pnl
                total_entry_premium += leg['entry_price'] * lot_size * mult

        # Check Portfolio Stop Loss (%)
        sl_cfg = self.exit_config.get('stopLoss', {})
        if sl_cfg and sl_cfg.get('enabled') and total_entry_premium > 0:
            val = float(sl_cfg.get('value', 0))
            # SL hit if total_pnl is negative and exceeds value % of entry premium
            if total_pnl < 0 and abs(total_pnl) >= (total_entry_premium * val / 100):
                for leg in active_legs:
                    # Close at current close price
                    opt_data = self.option_data_cache.get(current_date, {}).get(position['expiry_date'], {}).get(leg['type'], {}).get(leg['strike'])
                    exit_px = float(opt_data['close_price']) if opt_data else leg['entry_price']
                    self._close_leg(leg, exit_px, current_date, 'PORTFOLIO_SL_HIT')
                return True # All closed

        # Check Portfolio Take Profit (%)
        tp_cfg = self.exit_config.get('takeProfit', {})
        if tp_cfg and tp_cfg.get('enabled') and total_entry_premium > 0:
            val = float(tp_cfg.get('value', 0))
            if total_pnl > 0 and total_pnl >= (total_entry_premium * val / 100):
                for leg in active_legs:
                    opt_data = self.option_data_cache.get(current_date, {}).get(position['expiry_date'], {}).get(leg['type'], {}).get(leg['strike'])
                    exit_px = float(opt_data['close_price']) if opt_data else leg['entry_price']
                    self._close_leg(leg, exit_px, current_date, 'PORTFOLIO_TP_HIT')
                return True

        # Helper to get reference price(s)
        def get_refs(config, entry_pr=0):
            ref_type = config.get('ref', 'ENTRY') # Default to ENTRY for Positional SL/TP
            if ref_type == 'ENTRY': return [entry_pr]
            if ref_type == 'OPEN': return [open_pr]
            if ref_type == 'CLOSE': return [close_pr]
            if ref_type == 'BOTH': return [open_pr, close_pr]
            return [entry_pr]

        entry_spot = float(position.get('entry_spot_price') or 0)
        spot_change_pct = 0
        if entry_spot > 0:
            spot_change_pct = (spot_price - entry_spot) / entry_spot * 100

        for leg in position['legs']:
            if leg['status'] != 'OPEN':
                continue
            
            all_closed = False
            
            # Use nested cache lookup
            opt_data = self.option_data_cache.get(current_date, {}).get(position['expiry_date'], {}).get(leg['type'], {}).get(leg['strike'])
            
            if not opt_data:
                if is_expiry:
                    self._close_leg(leg, 0, current_date, 'EXPIRY_MISSING')
                continue
            
            high = float(opt_data['high_price'] or opt_data['close_price'])
            low = float(opt_data['low_price'] or opt_data['close_price'])
            
            # Decide which exit price to use
            exit_ref = self.exit_config.get('exitTimeRef', 'CLOSE')
            close = float(opt_data['close_price'] if exit_ref == 'CLOSE' else (opt_data['open_price'] or opt_data['close_price']))
            
            # Check time-based exit
            if should_exit_now:
                reason = 'EXPIRY' if is_expiry else ('DAYS_BEFORE_EXPIRY' if exit_type == 'DAYS_BEFORE_EXPIRY' else 'DAILY_EXIT')
                self._close_leg(leg, close, current_date, reason)
                continue
            
            # Risk Management (SL/TP/TSL)
            open_pr = float(opt_data['open_price'] or opt_data['close_price'])
            close_pr = float(opt_data['close_price'])
            
            # 1. Trailing Stop Loss (TSL)
            tsl_cfg = leg['tsl_config']
            if tsl_cfg and tsl_cfg.get('enabled'):
                val = float(tsl_cfg.get('value', 0))
                tsl_type = tsl_cfg.get('type', 'points')
                
                if tsl_type == 'Spot %' and entry_spot > 0:
                    # Trailing Spot logic: Trail the "favorable" Index price
                    is_bullish = (leg['type'] == 'CE' and leg['action'] == 'BUY') or \
                                 (leg['type'] == 'PE' and leg['action'] == 'SELL')
                    
                    if leg['tsl_watermark'] is None:
                        leg['tsl_watermark'] = entry_spot
                    
                    if is_bullish:
                        # Trail the highest spot seen so far
                        leg['tsl_watermark'] = max(leg['tsl_watermark'], spot_price)
                        # Exit if spot drops X% from that high
                        if spot_price <= leg['tsl_watermark'] * (1 - val / 100):
                            self._close_leg(leg, close, current_date, 'TSL_SPOT_HIT')
                            continue
                    else:
                        # Bearish: Trail the lowest spot seen so far
                        leg['tsl_watermark'] = min(leg['tsl_watermark'], spot_price)
                        # Exit if spot rises X% from that low
                        if spot_price >= leg['tsl_watermark'] * (1 + val / 100):
                            self._close_leg(leg, close, current_date, 'TSL_SPOT_HIT')
                            continue
                else:
                    # Original Premium-based TSL
                    current_high, current_low = high, low
                    if leg['tsl_watermark'] is None:
                        leg['tsl_watermark'] = open_pr
                    
                    if leg['action'] == 'BUY':
                        leg['tsl_watermark'] = max(leg['tsl_watermark'], current_high)
                        tsl_limit = leg['tsl_watermark'] - (val if tsl_type == 'points' else leg['tsl_watermark'] * val / 100)
                        if low <= tsl_limit:
                            self._close_leg(leg, tsl_limit, current_date, 'TSL_HIT')
                            continue
                    else:  # SELL
                        leg['tsl_watermark'] = min(leg['tsl_watermark'], current_low)
                        tsl_limit = leg['tsl_watermark'] + (val if tsl_type == 'points' else leg['tsl_watermark'] * val / 100)
                        if high >= tsl_limit:
                            self._close_leg(leg, tsl_limit, current_date, 'TSL_HIT')
                            continue

            # 2. Fixed Stop Loss
            sl_cfg = leg['sl_config']
            if sl_cfg and sl_cfg.get('enabled'):
                val = float(sl_cfg.get('value', 0))
                sl_type = sl_cfg.get('type', '%')
                sl_hit = False
                
                if sl_type == 'Spot %' and entry_spot > 0:
                    is_bullish = (leg['type'] == 'CE' and leg['action'] == 'BUY') or \
                                 (leg['type'] == 'PE' and leg['action'] == 'SELL')
                    if is_bullish and spot_change_pct <= -val: sl_hit = True
                    elif not is_bullish and spot_change_pct >= val: sl_hit = True
                    
                    if sl_hit:
                        self._close_leg(leg, close, current_date, 'SL_SPOT_HIT')
                else:
                    for ref_price in get_refs(sl_cfg, leg['entry_price']):
                        if leg['action'] == 'BUY':
                            sl_limit = ref_price - (ref_price * val / 100) if sl_type == '%' else ref_price - val
                            if low <= sl_limit:
                                self._close_leg(leg, sl_limit, current_date, 'SL_HIT')
                                sl_hit = True; break
                        else: # SELL
                            sl_limit = ref_price + (ref_price * val / 100) if sl_type == '%' else ref_price + val
                            print(f"DEBUG SL: Leg {leg['type']}, High: {high}, Limit: {sl_limit}, Ref: {ref_price}, Val: {val}")
                            if high >= sl_limit:
                                self._close_leg(leg, sl_limit, current_date, 'SL_HIT')
                                sl_hit = True; break
                if sl_hit: continue

            # 3. Take Profit
            tp_cfg = leg['tp_config']
            if tp_cfg and tp_cfg.get('enabled'):
                val = float(tp_cfg.get('value', 0))
                tp_type = tp_cfg.get('type', '%')
                tp_hit = False
                
                if tp_type == 'Spot %' and entry_spot > 0:
                    is_bullish = (leg['type'] == 'CE' and leg['action'] == 'BUY') or \
                                 (leg['type'] == 'PE' and leg['action'] == 'SELL')
                    if is_bullish and spot_change_pct >= val: tp_hit = True
                    elif not is_bullish and spot_change_pct <= -val: tp_hit = True
                    
                    if tp_hit:
                        self._close_leg(leg, close, current_date, 'TP_SPOT_HIT')
                else:
                    for ref_price in get_refs(tp_cfg, leg['entry_price']):
                        if leg['action'] == 'BUY':
                            tp_limit = ref_price + (ref_price * val / 100) if tp_type == '%' else ref_price + val
                            if high >= tp_limit:
                                self._close_leg(leg, tp_limit, current_date, 'TP_HIT')
                                tp_hit = True; break
                        else: # SELL
                            tp_limit = ref_price - (ref_price * val / 100) if tp_type == '%' else ref_price - val
                            if low <= tp_limit:
                                self._close_leg(leg, tp_limit, current_date, 'TP_HIT')
                                tp_hit = True; break
                if tp_hit: continue
        
        final_check_open = any(l['status'] == 'OPEN' for l in position['legs'])
        return not final_check_open
    
    def _close_leg(self, leg, price, date, reason):
        """Close a single leg - PnL is calculated per lot."""
        leg['status'] = 'CLOSED'
        leg['exit_price'] = price
        leg['exit_date'] = date
        leg['exit_reason'] = reason
        
        # Get lot size from backtest run
        lot_size = self.backtest_run.lot_size
        mult = leg.get('lot_multiplier', 1)
        
        # PnL calculation: (price difference) × lot_size × multiplier
        if leg['action'] == 'BUY':
            pnl = (price - leg['entry_price']) * lot_size * mult
        else:  # SELL
            pnl = (leg['entry_price'] - price) * lot_size * mult
        
        leg['pnl'] = pnl
    
    def _record_trade(self, position, exit_date):
        """Record completed trade to database."""
        total_pnl = sum(l.get('pnl', 0) for l in position['legs'])
        
        # Create OptionTrade record
        OptionTrade.objects.create(
            backtest_run=self.backtest_run,
            user=self.backtest_run.user,
            underlying_symbol=position['underlying_symbol'],
            entry_date=position['entry_date'],
            exit_date=exit_date,
            expiry_date=position['expiry_date'],
            legs_json=[{
                'type': l['type'],
                'action': l['action'],
                'strike': l['strike'],
                'entry': l['entry_price'],
                'exit': l['exit_price'],
                'pnl': l.get('pnl', 0),
                'reason': l.get('exit_reason')
            } for l in position['legs']],
            total_pnl=Decimal(total_pnl)
        )
        
        # Update stats
        self.stats['total_trades'] += 1
        self.stats['total_pnl'] += Decimal(total_pnl)
        if total_pnl > 0:
            self.stats['win_count'] += 1
        else:
            self.stats['loss_count'] += 1

    def _pre_fetch_data(self, start_date, end_date, expiries):
        """Fetch all required price data in bulk to avoid N+1 queries."""
        self.option_data_cache = {} # Structure: cache[date][expiry][type][strike] = data
        
        logger.info(f"Pre-fetching option data for {self.option_symbol} spanning {start_date} to {end_date}...")
        
        all_data_qs = OptionDailyData.objects.filter(
            underlying_symbol=self.option_symbol,
            date__range=[start_date, end_date],
            expiry_date__in=expiries
        ).values(
            'date', 'expiry_date', 'strike_price', 'option_type', 
            'open_price', 'close_price', 'high_price', 'low_price', 'volume'
        ).iterator(chunk_size=100000)
        
        count = 0
        for d in all_data_qs:
            dt, exp, otype = d['date'], d['expiry_date'], d['option_type']
            strike = float(d['strike_price'])
            
            if dt not in self.option_data_cache: self.option_data_cache[dt] = {}
            if exp not in self.option_data_cache[dt]: self.option_data_cache[dt][exp] = {}
            if otype not in self.option_data_cache[dt][exp]: self.option_data_cache[dt][exp][otype] = {}
            
            self.option_data_cache[dt][exp][otype][strike] = d
            count += 1
            
        logger.info(f"Cached {count} option data points for {len(self.option_data_cache)} dates.")

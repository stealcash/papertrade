import logging
from decimal import Decimal
from datetime import datetime, timedelta
from sqlalchemy.future import select
from sqlalchemy import update, insert
from app.models import OptionBacktestRun, OptionTrade, OptionDailyData, Stock, StockPriceDaily, OptionStrategy
from .market_schedule import MarketSchedule
import time

logger = logging.getLogger(__name__)

class OptionBacktestEngine:
    def __init__(self, db, run_id_int: int):
        self.db = db
        self.run_id = run_id_int
        self.option_data_cache = {}
        self.processed_expiries = set()
        self.results = []
        self.stats = {
            'total_trades': 0,
            'win_count': 0,
            'loss_count': 0,
            'total_pnl': Decimal(0),
            'total_buy_points': 0.0,
            'total_sell_points': 0.0,
        }
        self.last_close = 0
        self.last_open = 0
        self.price_history = []  # List of (open, close) tuples for Xth-day lookback

    async def execute(self):
        start_time = time.time()
        try:
            # 1. Fetch Run
            result = await self.db.execute(select(OptionBacktestRun).filter(OptionBacktestRun.id == self.run_id))
            run = result.scalar_one_or_none()
            if not run: raise ValueError("OptionBacktestRun not found")
            
            run.status = 'running'
            await self.db.commit()

            # 2. Fetch Strategy
            result = await self.db.execute(select(OptionStrategy).filter(OptionStrategy.id == run.strategy_id))
            strategy = result.scalar_one_or_none()
            if not strategy: raise ValueError("Strategy not found")
            self.strategy_config = strategy.configuration

            # Normalize entry/exit configs
            legs = self.strategy_config.get('legs', [{}])
            first_leg = legs[0] if legs else {}
            self.entry_config = self.strategy_config.get('entry') or first_leg.get('entry', {})
            self.exit_config = self.strategy_config.get('exit') or first_leg.get('exit', {})

            # 3. Fetch Spot Prices
            symbol = run.underlying_symbol
            result = await self.db.execute(select(Stock).filter(Stock.symbol == symbol))
            stock = result.scalar_one_or_none()
            if not stock: raise ValueError(f"Stock {symbol} not found")

            result = await self.db.execute(
                select(StockPriceDaily)
                .filter(StockPriceDaily.stock_id == stock.id, StockPriceDaily.date >= run.start_date, StockPriceDaily.date <= run.end_date)
                .order_by(StockPriceDaily.date)
            )
            spot_prices = result.scalars().all()
            if not spot_prices: raise ValueError("No spot price data found")

            # 4. Fetch Expiries
            option_symbol = symbol if symbol != 'NIFTY50' else 'NIFTY'
            result = await self.db.execute(
                select(OptionDailyData.expiry_date)
                .filter(OptionDailyData.underlying_symbol == option_symbol, OptionDailyData.expiry_date >= run.start_date)
                .distinct()
                .order_by(OptionDailyData.expiry_date)
            )
            expiries = [r[0] for r in result.all()]
            if not expiries: raise ValueError("No option expiries found")

            # 5. Pre-fetch Option Data
            await self._pre_fetch_data(option_symbol, run.start_date, run.end_date, expiries)

            # 6. Main Loop
            active_positions = []
            for i, spot in enumerate(spot_prices):
                curr_date = spot.date
                spot_price = float(spot.close_price)
                
                # Pulse-based check for multiple trades in a day if re-entry is allowed
                max_pulses = 5 
                pulse = 0
                
                while pulse < max_pulses:
                    pulse += 1
                    did_anything = False
                    
                    # Check Exits first
                    remaining = []
                    exited_this_pulse = False
                    for pos in active_positions:
                        is_closed = await self._check_exit_conditions(pos, curr_date, spot_price, run.lot_size)
                        if is_closed:
                            # Check if it was an expiry exit - if so, don't re-enter the same expiry
                            reentry_eligible = True
                            for leg in pos['legs']:
                                if leg.get('exit_reason') in ('EXPIRY', 'EXPIRY_MISSING'):
                                    reentry_eligible = False
                                    break
                            
                            await self._record_trade(pos, curr_date, run.user_id)
                            if reentry_eligible:
                                exited_this_pulse = True
                            did_anything = True
                        else:
                            remaining.append(pos)
                    active_positions = remaining

                    # Check Entry
                    if not active_positions:
                        # Only try entry if:
                        # 1. Pulse 1 (initial morning check)
                        # 2. Just exited a non-expiry position in THIS pulse
                        if pulse == 1 or exited_this_pulse:
                            is_reentry = exited_this_pulse
                            next_date = spot_prices[i+1].date if i+1 < len(spot_prices) else None
                            new_pos = await self._check_entry(option_symbol, curr_date, spot, expiries, next_date, is_reentry=is_reentry)
                            if new_pos:
                                active_positions.append(new_pos)
                                did_anything = True
                    
                    if not did_anything:
                        break
                
                self.last_close = float(spot.close_price)
                self.last_open = float(spot.open_price)
                self.price_history.append((float(spot.open_price), float(spot.close_price)))

            # 7. Finalize
            run.total_trades = self.stats['total_trades']
            run.win_count = self.stats['win_count']
            run.loss_count = self.stats['loss_count']
            run.win_rate = Decimal((self.stats['win_count'] / self.stats['total_trades'] * 100)) if self.stats['total_trades'] > 0 else 0
            run.total_pnl = self.stats['total_pnl']
            
            # Save extra stats in summary
            run.results_summary_json = {
                "total_buy_points": self.stats['total_buy_points'],
                "total_sell_points": self.stats['total_sell_points']
            }
            
            run.status = 'completed'
            run.error_message = ""
            run.time_taken = time.time() - start_time
            await self.db.commit()

        except Exception as e:
            logger.error(f"Option Backtest Engine Failed: {e}", exc_info=True)
            result = await self.db.execute(select(OptionBacktestRun).filter(OptionBacktestRun.id == self.run_id))
            run = result.scalar_one_or_none()
            if run:
                run.status = 'failed'
                run.error_message = str(e)
                await self.db.commit()
            raise

    async def _pre_fetch_data(self, symbol, start, end, expiries):
        result = await self.db.execute(
            select(OptionDailyData)
            .filter(OptionDailyData.underlying_symbol == symbol, OptionDailyData.date >= start, OptionDailyData.date <= end, OptionDailyData.expiry_date.in_(expiries))
        )
        for d in result.scalars().all():
            if d.date not in self.option_data_cache: self.option_data_cache[d.date] = {}
            if d.expiry_date not in self.option_data_cache[d.date]: self.option_data_cache[d.date][d.expiry_date] = {}
            if d.option_type not in self.option_data_cache[d.date][d.expiry_date]: self.option_data_cache[d.date][d.expiry_date][d.option_type] = {}
            self.option_data_cache[d.date][d.expiry_date][d.option_type][float(d.strike_price)] = d

    async def _check_entry(self, symbol, curr_date, spot, expiries, next_date, is_reentry):
        valid_expiries = [e for e in expiries if e >= curr_date]
        if not valid_expiries: return None
        target_exp = valid_expiries[0]
        days_to_exp = (target_exp - curr_date).days
        
        entry_conf = self.entry_config
        req_days = int(entry_conf.get('daysBeforeExpiry', 0))
        
        if not is_reentry and target_exp in self.processed_expiries: return None
        
        can_enter = is_reentry
        
        if not is_reentry:
            # 1. Determine Target Entry Day (Skipping Weekends)
            target_day = target_exp
            days_to_subtract = req_days
            while days_to_subtract > 0:
                target_day -= timedelta(days=1)
                if target_day.weekday() < 5:  # Mon-Fri
                    days_to_subtract -= 1
            
            # 2. Check if Target Day is a Market Holiday
            is_open, _ = MarketSchedule.is_market_open(target_day)
            actual_entry_day = target_day
            
            if not is_open:
                mode = entry_conf.get('holidayEntryMode', 'NONE')
                if mode == 'NONE':
                    actual_entry_day = None
                elif mode == 'PREVIOUS':
                    # Look back for nearest trading day
                    temp_day = target_day - timedelta(days=1)
                    while temp_day > curr_date - timedelta(days=10): # Safety limit
                        o, _ = MarketSchedule.is_market_open(temp_day)
                        if o:
                            actual_entry_day = temp_day
                            break
                        temp_day -= timedelta(days=1)
                elif mode == 'NEXT':
                    # Look forward for nearest trading day
                    temp_day = target_day + timedelta(days=1)
                    while temp_day <= target_exp:
                        o, _ = MarketSchedule.is_market_open(temp_day)
                        if o:
                            actual_entry_day = temp_day
                            break
                        temp_day += timedelta(days=1)
                    else:
                        actual_entry_day = None # No trading day found before/on expiry
            
            # 3. Check if today IS the actual entry day
            if actual_entry_day == curr_date:
                can_enter = True
                
                # 4. Safety Check for NEXT mode: Don't enter after exit time
                if entry_conf.get('holidayEntryMode') == 'NEXT' and actual_entry_day > target_day:
                    exit_conf = self.exit_config
                    exit_days = int(exit_conf.get('daysBeforeExpiry', 0))
                    exit_target_day = target_exp - timedelta(days=exit_days)
                    
                    # If actual entry is already after planned exit day, skip
                    if actual_entry_day > exit_target_day:
                        can_enter = False
                    # If same day, check timing
                    elif actual_entry_day == exit_target_day:
                        e_ref = entry_conf.get('priceRef', 'CLOSE')
                        x_ref = exit_conf.get('exitTimeRef', 'CLOSE')
                        if e_ref == 'CLOSE' and x_ref == 'OPEN':
                            can_enter = False # Entry at 3:30 PM, Exit was at 9:15 AM
            
            # 5. Legacy/Flexible Fallback (if holidayEntryMode not set)
            if not can_enter and entry_conf.get('flexibleEntry') and not entry_conf.get('holidayEntryMode'):
                 if next_date and (target_exp - next_date).days < req_days: can_enter = True
                 elif days_to_exp < req_days: can_enter = True
            
            # 6. Legacy Weekend Handling (Fallback)
            if not can_enter and not entry_conf.get('holidayEntryMode'):
                 if curr_date.weekday() == 4: # Friday
                     if days_to_exp == req_days + 1 or days_to_exp == req_days + 2:
                         can_enter = True
        else:
            # For re-entry, we allow it if we are already past the original entry window
            # and re-entry is explicitly allowed in exit config
            if self.exit_config.get('allowReentry'):
                # Basic check: don't enter on expiry after exit time if it's already closed
                if curr_date == target_exp and self.exit_config.get('exitTimeRef') == 'OPEN':
                    can_enter = False
                else:
                    can_enter = True

        if not can_enter: return None
        
        # Mark processed if not a re-entry
        if not is_reentry:
            self.processed_expiries.add(target_exp)

        pos = {
            'entry_date': curr_date,
            'expiry_date': target_exp,
            'underlying_symbol': symbol,
            'entry_spot_price': float(spot.open_price if entry_conf.get('priceRef') == 'OPEN' else spot.close_price),
            'entry_price_ref': entry_conf.get('priceRef', 'CLOSE'),
            'legs': [],
            'status': 'OPEN'
        }

        min_vol = float(entry_conf.get('minVolume') or 0)

        for leg_conf in self.strategy_config.get('legs', []):
            leg = self._build_leg(leg_conf, symbol, target_exp, curr_date, spot)
            if not leg: return None
            
            if min_vol > 0 and float(leg.get('volume', 0)) < min_vol:
                return None
                
            pos['legs'].append(leg)

        # Handle Wait and Trade
        wtt = entry_conf.get('waitAndTrade', {})
        if wtt and wtt.get('enabled'):
            wtt_type = wtt.get('type', 'INCREASE')
            wtt_val = float(wtt.get('value', 0))
            wtt_ref_type = wtt.get('ref', 'PREV_CLOSE')
            
            ref_price = 0
            if wtt_ref_type == 'PREV_CLOSE': ref_price = self.last_close or float(spot.open_price)
            elif wtt_ref_type == 'PREV_OPEN': ref_price = self.last_open or float(spot.open_price)
            elif wtt_ref_type == 'TODAY_OPEN': ref_price = float(spot.open_price)
            elif wtt_ref_type in ('XTH_DAY_OPEN', 'XTH_DAY_CLOSE'):
                days_back = int(wtt.get('refDays', 5))
                if len(self.price_history) >= days_back:
                    idx = len(self.price_history) - days_back
                    ref_price = self.price_history[idx][0] if wtt_ref_type == 'XTH_DAY_OPEN' else self.price_history[idx][1]
                else:
                    return None  # Not enough history yet
            
            if ref_price <= 0: return None
            
            trigger = ref_price * (1 + wtt_val / 100) if wtt_type == 'INCREASE' else ref_price * (1 - wtt_val / 100)
            high = float(spot.high_price or spot.close_price)
            low = float(spot.low_price or spot.close_price)
            
            hit = (wtt_type == 'INCREASE' and high >= trigger) or (wtt_type == 'DECREASE' and low <= trigger)
            if not hit: return None
            
            # Simulated entry price adjustment
            spot_ref = float(spot.open_price if entry_conf.get('priceRef') == 'OPEN' else spot.close_price)
            if spot_ref > 0:
                mult = trigger / spot_ref
                for leg in pos['legs']:
                    leg['entry_price'] *= mult
            pos['entry_price_simulated'] = trigger

        return pos

    def _build_leg(self, leg_conf, symbol, exp, curr_date, spot):
        ltype = leg_conf.get('type')
        action = leg_conf.get('action')
        select_by = leg_conf.get('selectBy', 'STRIKE')
        spot_ref_type = self.entry_config.get('priceRef', 'CLOSE')
        spot_ref = float(spot.open_price if spot_ref_type == 'OPEN' else spot.close_price)
        
        chain_all = self.option_data_cache.get(curr_date, {}).get(exp, {}).get(ltype, {})
        if not chain_all: return None
        
        best_match = None
        if select_by == 'STRIKE':
            offset = float(leg_conf.get('strikeOffset', 0))
            selection = leg_conf.get('strikeSelection', 'ATM')
            target = spot_ref
            
            if selection == 'ATM_PLUS':
                if leg_conf.get('strikeOffsetType') == '%': target *= (1 + offset / 100)
                else: target += offset
            elif selection == 'ATM_MINUS':
                if leg_conf.get('strikeOffsetType') == '%': target *= (1 - offset / 100)
                else: target -= offset
            
            rounding = leg_conf.get('strikeRounding', 'AUTO')
            if rounding == 'DOWN':
                candidates = [v for v in chain_all.values() if float(v.strike_price) <= target]
                if not candidates: candidates = list(chain_all.values())
                best_match = max(candidates, key=lambda x: float(x.strike_price))
            elif rounding == 'UP':
                candidates = [v for v in chain_all.values() if float(v.strike_price) >= target]
                if not candidates: candidates = list(chain_all.values())
                best_match = min(candidates, key=lambda x: float(x.strike_price))
            else:  # AUTO - nearest
                best_match = min(chain_all.values(), key=lambda x: abs(float(x.strike_price) - target))
        else: # PREMIUM
            target_px = float(leg_conf.get('targetPremium', 100))
            tolerance = float(leg_conf.get('premiumTolerance', 10))
            
            def get_px(x): return float(x.open_price if spot_ref_type == 'OPEN' and x.open_price else x.close_price)
            
            best_match = min(chain_all.values(), key=lambda x: abs(get_px(x) - target_px))
            if abs(get_px(best_match) - target_px) > tolerance:
                return None

        entry_px = float(best_match.open_price if spot_ref_type == 'OPEN' and best_match.open_price else best_match.close_price)
        
        # Premium Filters
        if select_by == 'STRIKE':
            min_p = float(leg_conf.get('minPremium') or 0)
            max_p = float(leg_conf.get('maxPremium') or 0)
            if min_p > 0 and entry_px < min_p: return None
            if max_p > 0 and entry_px > max_p: return None

        # Risk Config
        risk_mode = self.exit_config.get('riskManagementMode', 'GLOBAL')
        if risk_mode == 'LEG_WISE':
            sl = leg_conf.get('stopLoss', {})
            tp = leg_conf.get('takeProfit', {})
            tsl = leg_conf.get('trailingStopLoss', {})
        else:
            sl = self.exit_config.get('stopLoss', {})
            tp = self.exit_config.get('takeProfit', {})
            tsl = self.exit_config.get('trailingStopLoss', {})

        return {
            'type': ltype,
            'action': action,
            'strike': float(best_match.strike_price),
            'entry_price': entry_px,
            'status': 'OPEN',
            'volume': float(best_match.volume or 0),
            'lot_multiplier': int(leg_conf.get('lotMultiplier', 1)),
            'sl_config': sl,
            'tp_config': tp,
            'tsl_config': tsl,
            'tsl_watermark': None
        }

    async def _check_exit_conditions(self, pos, curr_date, spot_price, lot_size):
        is_expiry = curr_date >= pos['expiry_date']
        exit_type = self.exit_config.get('type', 'DAYS_BEFORE_EXPIRY')
        
        exit_reason_str = None
        should_exit_now = is_expiry
        if is_expiry: exit_reason_str = 'EXPIRY'
        
        if not should_exit_now and exit_type == 'DAYS_BEFORE_EXPIRY':
            if (pos['expiry_date'] - curr_date).days <= int(self.exit_config.get('daysBeforeExpiry', 0)):
                should_exit_now = True
                exit_reason_str = 'DAYS_BEFORE_EXPIRY'
        elif not should_exit_now and exit_type == 'DAILY':
            days_in = (curr_date - pos['entry_date']).days
            if self.exit_config.get('dailyExitType') == 'SAME_DAY' and days_in >= 0:
                should_exit_now = True
                exit_reason_str = 'DAILY_EXIT'
            elif self.exit_config.get('dailyExitType') == 'AFTER_DAYS' and days_in >= int(self.exit_config.get('dailyExitDays', 0)):
                should_exit_now = True
                exit_reason_str = 'DAILY_EXIT'

        total_pnl = 0
        total_entry = 0
        active = [l for l in pos['legs'] if l['status'] == 'OPEN']
        
        # Portfolio TP/SL check setup
        psl = self.exit_config.get('stopLoss', {})
        ptp = self.exit_config.get('takeProfit', {})
        
        p_sl_ref = psl.get('ref', 'CLOSE')
        p_tp_ref = ptp.get('ref', 'CLOSE')

        p_sl_total_pnl = 0
        p_tp_total_pnl = 0

        for leg in active:
            opt = self.option_data_cache.get(curr_date, {}).get(pos['expiry_date'], {}).get(leg['type'], {}).get(leg['strike'])
            if not opt: continue
            
            close = float(opt.close_price)
            # Default PnL (for reports / general tracking) is Close
            pnl = (close - leg['entry_price']) if leg['action'] == 'BUY' else (leg['entry_price'] - close)
            total_pnl += pnl * lot_size * leg['lot_multiplier']
            total_entry += leg['entry_price'] * lot_size * leg['lot_multiplier']

            # Portfolio SL PnL calc
            sl_px = float(opt.low_price if p_sl_ref == 'BOTH' else (opt.open_price if p_sl_ref == 'OPEN' else opt.close_price))
            sl_pnl = (sl_px - leg['entry_price']) if leg['action'] == 'BUY' else (leg['entry_price'] - sl_px)
            p_sl_total_pnl += sl_pnl * lot_size * leg['lot_multiplier']

            # Portfolio TP PnL calc
            tp_px = float(opt.high_price if p_tp_ref == 'BOTH' else (opt.open_price if p_tp_ref == 'OPEN' else opt.close_price))
            tp_pnl = (tp_px - leg['entry_price']) if leg['action'] == 'BUY' else (leg['entry_price'] - tp_px)
            p_tp_total_pnl += tp_pnl * lot_size * leg['lot_multiplier']

        # Portfolio SL/TP Execution
        risk_ref = None
        if ptp.get('enabled') and total_entry > 0:
            if p_tp_total_pnl > 0 and p_tp_total_pnl >= (total_entry * float(ptp.get('value', 0)) / 100):
                should_exit_now = True
                exit_reason_str = 'PORTFOLIO_TP_HIT'
                risk_ref = p_tp_ref
        
        # SL takes precedence if both hit? Usually we check both, but SL is more critical.
        # However, if TP hit at Open and SL hit at High/Low, Open (TP) happened first.
        # For simplicity, if TP hit, we take it. If not, check SL.
        if not should_exit_now and psl.get('enabled') and total_entry > 0:
            if p_sl_total_pnl < 0 and abs(p_sl_total_pnl) >= (total_entry * float(psl.get('value', 0)) / 100):
                should_exit_now = True
                exit_reason_str = 'PORTFOLIO_SL_HIT'
                risk_ref = p_sl_ref

        if should_exit_now:
            # If it's a risk hit, use the risk ref for execution price. 
            # Otherwise use the scheduled exit time ref.
            exec_ref = risk_ref if risk_ref else self.exit_config.get('exitTimeRef', 'CLOSE')
            
            for leg in active:
                opt = self.option_data_cache.get(curr_date, {}).get(pos['expiry_date'], {}).get(leg['type'], {}).get(leg['strike'])
                if not opt:
                    self._close_leg(leg, 0, curr_date, lot_size, exit_reason_str)
                    continue
                
                if exec_ref == 'OPEN':
                    px = float(opt.open_price or opt.close_price)
                elif exec_ref == 'BOTH':
                    # If BOTH triggered, it means either high (TP) or low (SL) hit.
                    # We approximate by using the limit price that triggered it.
                    if exit_reason_str == 'PORTFOLIO_TP_HIT':
                        # Target PnL per leg? No, portfolio. 
                        # Simple fallback: use high/low as proxy for "Intraday" hit.
                        px = float(opt.high_price if leg['action'] == 'BUY' else opt.low_price)
                    else:
                        px = float(opt.low_price if leg['action'] == 'BUY' else opt.high_price)
                else: # CLOSE
                    px = float(opt.close_price)
                
                self._close_leg(leg, px, curr_date, lot_size, exit_reason_str)
            return True

        # Individual Leg SL/TP/TSL
        if pos['entry_date'] == curr_date and pos.get('entry_price_ref') == 'CLOSE':
            return False
            
        entry_spot = pos['entry_spot_price']
        for leg in active:
            opt = self.option_data_cache.get(curr_date, {}).get(pos['expiry_date'], {}).get(leg['type'], {}).get(leg['strike'])
            if not opt: continue
            
            high = float(opt.high_price or opt.close_price)
            low = float(opt.low_price or opt.close_price)
            open_px = float(opt.open_price or opt.close_price)
            close = float(opt.close_price)
            
            # 1. TSL
            tsl = leg['tsl_config']
            if tsl.get('enabled'):
                val = float(tsl.get('value', 0))
                if tsl.get('type') == 'Spot %' and entry_spot > 0:
                    is_bull = (leg['type'] == 'CE' and leg['action'] == 'BUY') or (leg['type'] == 'PE' and leg['action'] == 'SELL')
                    leg['tsl_watermark'] = max(leg['tsl_watermark'] or entry_spot, spot_price) if is_bull else min(leg['tsl_watermark'] or entry_spot, spot_price)
                    if (is_bull and spot_price <= leg['tsl_watermark'] * (1 - val/100)) or (not is_bull and spot_price >= leg['tsl_watermark'] * (1 + val/100)):
                        self._close_leg(leg, close, curr_date, lot_size, 'TSL_SPOT_HIT')
                        continue
                else: # Premium TSL (Absolute or %)
                    if leg['action'] == 'BUY':
                        leg['tsl_watermark'] = max(leg['tsl_watermark'] or open_px, high)
                        limit = leg['tsl_watermark'] - (val if tsl.get('type') == 'points' else leg['tsl_watermark'] * val/100)
                        if low <= limit:
                            self._close_leg(leg, limit, curr_date, lot_size, 'TSL_HIT')
                            continue
                    else:
                        leg['tsl_watermark'] = min(leg['tsl_watermark'] or open_px, low)
                        limit = leg['tsl_watermark'] + (val if tsl.get('type') == 'points' else leg['tsl_watermark'] * val/100)
                        if high >= limit:
                            self._close_leg(leg, limit, curr_date, lot_size, 'TSL_HIT')
                            continue

            # 2. Leg SL
            sl = leg['sl_config']
            if sl.get('enabled'):
                val = float(sl.get('value', 0))
                ref = sl.get('ref', 'CLOSE')
                px = low if (leg['action'] == 'BUY' and ref == 'BOTH') else (high if (leg['action'] == 'SELL' and ref == 'BOTH') else (open_px if ref == 'OPEN' else close))
                
                limit = leg['entry_price'] - (val if sl.get('type') == 'points' else leg['entry_price'] * val/100) if leg['action'] == 'BUY' else leg['entry_price'] + (val if sl.get('type') == 'points' else leg['entry_price'] * val/100)
                if (leg['action'] == 'BUY' and px <= limit) or (leg['action'] == 'SELL' and px >= limit):
                    self._close_leg(leg, limit, curr_date, lot_size, 'LEG_SL_HIT')
                    continue

            # 3. Leg TP
            tp = leg['tp_config']
            if tp.get('enabled'):
                val = float(tp.get('value', 0))
                ref = tp.get('ref', 'CLOSE')
                px = high if (leg['action'] == 'BUY' and ref == 'BOTH') else (low if (leg['action'] == 'SELL' and ref == 'BOTH') else (open_px if ref == 'OPEN' else close))

                limit = leg['entry_price'] + (val if tp.get('type') == 'points' else leg['entry_price'] * val/100) if leg['action'] == 'BUY' else leg['entry_price'] - (val if tp.get('type') == 'points' else leg['entry_price'] * val/100)
                if (leg['action'] == 'BUY' and px >= limit) or (leg['action'] == 'SELL' and px <= limit):
                    self._close_leg(leg, limit, curr_date, lot_size, 'LEG_TP_HIT')
                    continue
        
        return all(l['status'] == 'CLOSED' for l in pos['legs'])

    def _close_leg(self, leg, exit_price, date, lot_size, reason=None):
        leg['exit_price'] = exit_price
        leg['exit_date'] = date
        leg['status'] = 'CLOSED'
        leg['exit_reason'] = reason
        diff = (exit_price - leg['entry_price']) if leg['action'] == 'BUY' else (leg['entry_price'] - exit_price)
        leg['pnl'] = diff * lot_size * leg['lot_multiplier']

    async def _record_trade(self, pos, exit_date, user_id):
        total_pnl = sum(l.get('pnl', 0) for l in pos['legs'])
        await self.db.execute(insert(OptionTrade).values(
            backtest_run_id=self.run_id,
            user_id=user_id,
            underlying_symbol=pos['underlying_symbol'],
            entry_date=pos['entry_date'],
            exit_date=exit_date,
            expiry_date=pos['expiry_date'],
            legs_json=[{
                'type': l['type'], 'action': l['action'], 'strike': l['strike'],
                'entry': l['entry_price'], 'exit': l['exit_price'], 'pnl': l.get('pnl', 0),
                'reason': l.get('exit_reason'),
                'lot_multiplier': l.get('lot_multiplier', 1)
            } for l in pos['legs']],
            total_pnl=Decimal(total_pnl)
        ))
        self.stats['total_trades'] += 1
        self.stats['total_pnl'] += Decimal(total_pnl)
        if total_pnl > 0: self.stats['win_count'] += 1
        else: self.stats['loss_count'] += 1
        
        # Track points
        for l in pos['legs']:
            if l['action'] == 'BUY':
                self.stats['total_buy_points'] += float(l['entry_price'])
                self.stats['total_sell_points'] += float(l['exit_price'])
            else:
                self.stats['total_sell_points'] += float(l['entry_price'])
                self.stats['total_buy_points'] += float(l['exit_price'])

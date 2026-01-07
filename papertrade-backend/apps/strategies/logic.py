from datetime import timedelta, datetime
from decimal import Decimal
import pandas as pd
import numpy as np
from django.db.models import F
from apps.stocks.models import Stock, StockPriceDaily
from apps.common.market_schedule import MarketSchedule
from .models import StrategyMaster, StrategySignal

class StrategyEngine:
    @staticmethod
    def calculate_technical_indicators(df):
        """
        Calculate standard technical indicators (RSI, MA).
        """
        # RSI 14
        delta = df['close_price'].diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
        rs = gain / loss
        df['RSI'] = 100 - (100 / (1 + rs))
        
        # SMA 5, 10, 20, 50
        df['SMA_5'] = df['close_price'].rolling(window=5).mean()
        df['SMA_10'] = df['close_price'].rolling(window=10).mean()
        df['SMA_20'] = df['close_price'].rolling(window=20).mean()
        df['SMA_50'] = df['close_price'].rolling(window=50).mean()
        
        return df

    @staticmethod
    def calculate_rule_based_strategy(stock_prices, rules_json):
        """
        Calculates signals based on JSON rules.
        Support for 'buy_blocks' (Else-If logic) and 'output_percentage'.
        """
        if not stock_prices:
            return []
            
        signals = []
        
        # Convert to Pandas DataFrame
        data = [{
            'date': p.date, 
            'close_price': float(p.close_price),
            'open_price': float(p.open_price),
            'high_price': float(p.high_price),
            'low_price': float(p.low_price),
            'volume': float(p.volume) if p.volume else 0
        } for p in stock_prices]
        
        df = pd.DataFrame(data)
        df.sort_values('date', inplace=True)
        df.reset_index(drop=True, inplace=True)
        
        # Calculate Indicators - Need to know which ones from ALL blocks
        needed_fields = set()
        
        # Unified Strategy Blocks
        strategy_blocks = rules_json.get('strategy_blocks', [])

        # Backward Compatibility: Convert legacy separate lists to unified blocks if needed
        if not strategy_blocks:
            buy_blocks = rules_json.get('buy_blocks', [])
            if not buy_blocks and 'buy_rules' in rules_json:
                 buy_blocks = [{'rules': rules_json['buy_rules'], 'output_percentage': 0}]
            
            sell_blocks = rules_json.get('sell_blocks', [])
            if not sell_blocks and 'sell_rules' in rules_json:
                 sell_blocks = [{'rules': rules_json['sell_rules'], 'output_percentage': 0}]
            
            # Note: In legacy mode, we don't know the user's intended order between Buy vs Sell.
            # We will append Sell after Buy (Standard priority: Buy then Sell check? Or User preference?)
            # Let's assume Buy check first, then Sell check. 
            for b in buy_blocks:
                b['action'] = 'BUY'
                strategy_blocks.append(b)
            for b in sell_blocks:
                b['action'] = 'SELL'
                strategy_blocks.append(b)
        
        all_rules = []
        for block in strategy_blocks:
            all_rules.extend(block.get('rules', []))

        for rule in all_rules:
            field = rule.get('field')
            if field in ['RSI']:
                needed_fields.add('RSI')
            elif field.startswith('SMA_'):
                needed_fields.add(field)

        if 'RSI' in needed_fields:
            delta = df['close_price'].diff()
            gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
            loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
            rs = gain / loss
            df['RSI'] = 100 - (100 / (1 + rs))
        
        # Always calculate Percentage Changes as they are core now
        df['CLOSE_PCT_CHANGE_0'] = df['close_price'].pct_change() * 100
        df['CLOSE_PCT_CHANGE_1'] = df['CLOSE_PCT_CHANGE_0'].shift(1)
        # New Rules: Day -1 vs Day -3 (Period=2) and Day -1 vs Day -7 (Period=6)
        df['CLOSE_PCT_CHANGE_1_3'] = df['close_price'].pct_change(periods=2) * 100
        df['CLOSE_PCT_CHANGE_1_7'] = df['close_price'].pct_change(periods=6) * 100

        for field in needed_fields:
            if field.startswith('SMA_'):
                period = int(field.split('_')[1])
                ma = df['close_price'].rolling(window=period).mean()
                # Store as Percentage of Close
                df[field] = (ma / df['close_price']) * 100

        # Iterate through Days
        for i in range(len(df)):
            if i < 1: continue # Need at least 1 day for Momentum/Change logic
            
            row = df.iloc[i]
            prev_row = df.iloc[i-1]
            
            # Helper to get value
            def get_val(field):
                field = field.upper()
                if field in row: return row[field]
                # Deprecated absolute fields, but keeping safely just in case
                if field == 'CLOSE': return row['close_price']
                if field == 'CLOSE_PCT_CHANGE_0': return row['CLOSE_PCT_CHANGE_0']
                if field == 'CLOSE_PCT_CHANGE_1': return row['CLOSE_PCT_CHANGE_1']
                if field == 'CLOSE_PCT_CHANGE_1_3': return row['CLOSE_PCT_CHANGE_1_3']
                if field == 'CLOSE_PCT_CHANGE_1_7': return row['CLOSE_PCT_CHANGE_1_7']
                return 0
                
            def check_conditions(rules):
                if not rules: return False
                all_match = True
                for rule in rules:
                    field = rule.get('field')
                    operator = rule.get('operator')
                    try:
                        value = float(rule.get('value'))
                    except:
                        value = 0
                        
                    current_val = get_val(field)
                    
                    if pd.isna(current_val):
                        all_match = False
                        break
                        
                    if operator == 'gt':
                        if not (current_val > value): all_match = False
                    elif operator == 'lt':
                        if not (current_val < value): all_match = False
                    elif operator == 'eq':
                        if not (current_val == value): all_match = False
                    elif operator == 'gte':
                        if not (current_val >= value): all_match = False
                    elif operator == 'lte':
                        if not (current_val <= value): all_match = False
                        
                    if not all_match: break
                return all_match

            direction = None
            output_pct = 0.0
            
            # Iterating through Unified Blocks
            # The FIRST block that matches triggers the signal.
            for block in strategy_blocks:
                if check_conditions(block.get('rules', [])):
                    action = block.get('action', 'BUY').upper()
                    if action == 'BUY':
                        direction = 'UP'
                    elif action == 'SELL':
                        direction = 'DOWN'
                    
                    try:
                        output_pct = float(block.get('output_percentage', 0))
                    except: 
                        output_pct = 0
                    break # Stop at first match
            
            if direction:
                # Find next trading day
                today_date = row['date']
                if i < len(df) - 1:
                    signal_date = df.iloc[i+1]['date']
                else:
                    signal_date = today_date + timedelta(days=1)
                    while True:
                        is_open, _ = MarketSchedule.is_market_open(signal_date)
                        if is_open: break
                        signal_date += timedelta(days=1)
                
                # Calculate Expected Value
                expected_price = 0.0
                
                if output_pct != 0:
                     if direction == 'UP':
                         expected_price = round(row['close_price'] * (1 + output_pct / 100), 2)
                     elif direction == 'DOWN':
                         # Down means price drop
                         expected_price = round(row['close_price'] * (1 - output_pct / 100), 2)
                else:
                     momentum = row['close_price'] - prev_row['close_price']
                     expected_price = round(row['close_price'] + momentum, 2)
                
                signals.append({
                    'date': signal_date,
                    'signal_direction': direction,
                    'expected_value': expected_price
                })

        
        return signals
    @staticmethod
    def calculate_one_day_trend(stock_prices):
        """
        Strategy 1: One-Day Close Price Trend
        - If today > yesterday: UP
        - If today < yesterday: DOWN
        - Expected % = today - yesterday (Wait, requirement says "percentage is today_close - yesterday_close"? 
          Usually percentage is (diff/yesterday)*100. 
          The prompt says: "The expected percentage for the next day is calculated as: today_close − yesterday_close."
          I will follow the prompt literally for now, but this looks like 'Price Difference' not 'Percentage'.
          Let's assume the user means "Expected Value" which is the difference? 
          Re-reading: "Expected price or expected percentage". 
          Prompt: "The expected percentage for the next day is calculated as: today_close − yesterday_close."
          Okay, I will store this difference as 'expected_value'.
        """
        signals = []
        # sort by date asc
        sorted_prices = sorted(stock_prices, key=lambda x: x.date)
        
        for i in range(1, len(sorted_prices)):
            today = sorted_prices[i]
            yesterday = sorted_prices[i-1]
            
            diff = today.close_price - yesterday.close_price
            direction = None
            if diff > 0:
                direction = 'UP'
            elif diff < 0:
                direction = 'DOWN'
            
            # If diff is 0, direction is None (implicit)
            
            if direction:
                # Expected Value = Current Price + Momentum (Diff)
                # Requirement: "stock price with calculation... maximum upto 2 decimal"
                expected_price = round(today.close_price + diff, 2)
                
                # Determine Signal Date
                if i < len(sorted_prices) - 1:
                    signal_date = sorted_prices[i+1].date
                else:
                    signal_date = today.date + timedelta(days=1)
                    while True:
                        is_open, _ = MarketSchedule.is_market_open(signal_date)
                        if is_open:
                            break
                        signal_date += timedelta(days=1)

                signals.append({
                    'date': signal_date, # Signal is for the NEXT TRADING day
                    'signal_direction': direction,
                    'expected_value': expected_price,
                    'entry_price': today.close_price
                })

                
        return signals

    @staticmethod
    def calculate_three_day_trend(stock_prices):
        """
        Strategy 2: Three-Day Trend Average
        """
        signals = []
        sorted_prices = sorted(stock_prices, key=lambda x: x.date)
        
        for i in range(2, len(sorted_prices)):
            today = sorted_prices[i]
            yesterday = sorted_prices[i-1]
            day_before = sorted_prices[i-2]
            
            diff1 = today.close_price - yesterday.close_price
            diff2 = yesterday.close_price - day_before.close_price
            
            direction = None
            avg_momentum = None
            
            if today.close_price > yesterday.close_price and yesterday.close_price > day_before.close_price:
                direction = 'UP'
                avg_momentum = (diff1 + diff2) / 2
            elif today.close_price < yesterday.close_price and yesterday.close_price < day_before.close_price:
                direction = 'DOWN'
                avg_momentum = (diff1 + diff2) / 2
            
            # If mixed, direction remains None
            
            if direction:
                 expected_price = round(today.close_price + avg_momentum, 2)
                 
                 # Determine Signal Date
                 if i < len(sorted_prices) - 1:
                     signal_date = sorted_prices[i+1].date
                 else:
                     signal_date = today.date + timedelta(days=1)
                     while True:
                         is_open, _ = MarketSchedule.is_market_open(signal_date)
                         if is_open:
                             break
                         signal_date += timedelta(days=1)

                 signals.append({
                    'date': signal_date,
                    'signal_direction': direction,
                    'expected_value': expected_price,
                    'entry_price': today.close_price
                })

            
        return signals
        return signals
    @staticmethod
    def calculate_oversold_reversal(stock_prices):
        """
        Strategy: Oversold Reversal (OVERSOLD_REVERSAL)
        Conditions:
        1. 20% Drop in last 10 sessions: (Price[-10] - Price[0]) / Price[-10] >= 0.20
        2. At least 5 Red candles in last 10 sessions.
        3. Last 2 days (Today, Yesterday) closing Green (Close > Prev Close).
        """
        signals = []
        sorted_prices = sorted(stock_prices, key=lambda x: x.date)
        
        # Need at least 11 days (Day -10 to Today)
        if len(sorted_prices) < 11:
            return []

        for i in range(10, len(sorted_prices)):
            current = sorted_prices[i]       # Day 0
            prev1 = sorted_prices[i-1]       # Day -1
            prev2 = sorted_prices[i-2]       # Day -2
            
            # Condition 3: Last 2 Days Green
            # Today must be Green (Close > Prev Close)
            # Yesterday must be Green (Close > Day Before Close)
            # Wait, user said "from last 2 days its closing in green". 
            # Implies Today (i) and Yesterday (i-1).
            is_today_green = current.close_price > prev1.close_price
            is_prev_green = prev1.close_price > prev2.close_price
            
            if not (is_today_green and is_prev_green):
                continue

            # Condition 1: 20% Drop in last 10 days
            # Start of window (Day -10)
            start_node = sorted_prices[i-10]
            
            # Use High of Start Node? or Close? Usually Close to Close.
            drop_pct = (start_node.close_price - current.close_price) / start_node.close_price
            if drop_pct < 0.20:
                continue
                
            # Condition 2: At least 5 Drop (Red) sessions in last 10 sessions
            # Window: from i-9 to i (current). 10 sessions including current?
            # User said "last 10 sessions", usually implies the window we checked the drop in.
            # Range: indices [i-9, ..., i] (10 days).
            # Note: We need to check if Day X < Day X-1.
            red_candles = 0
            for j in range(i-9, i+1): 
                # j is day index. Compare with j-1.
                day_j = sorted_prices[j]
                day_prev = sorted_prices[j-1]
                if day_j.close_price < day_prev.close_price:
                    red_candles += 1
            
            if red_candles < 5:
                continue
                
            # All conditions met -> REVERSAL UP
            direction = 'UP'
            # Expected Value: 5% Bounce Target
            expected_price = round(current.close_price * Decimal('1.05'), 2)
            # Stop Loss: 5% Down
            stop_loss = round(current.close_price * Decimal('0.95'), 2)
            
            # Determine Signal Date (Next Trading Day)
            if i < len(sorted_prices) - 1:
                signal_date = sorted_prices[i+1].date
            else:
                signal_date = current.date + timedelta(days=1)
                while True:
                    is_open, _ = MarketSchedule.is_market_open(signal_date)
                    if is_open: break
                    signal_date += timedelta(days=1)

            signals.append({
                'date': signal_date,
                'signal_direction': direction,
                'expected_value': expected_price,
                'stop_loss': stop_loss,
                'entry_price': current.close_price # Entry is Today's Close
            })
            
        return signals
    @staticmethod
    def calculate_auto_strategy(stock_prices, logic_string):
        """
        Execute dynamic logic based on strategy definition.
        Format expectation:
        UP: <python expression>
        DOWN: <python expression>
        
        Variables available: 
        CLOSE, OPEN, HIGH, LOW, VOLUME (Current Candle)
        CLOSE_1, OPEN_1, ... (Previous Candle)
        """
        if not logic_string:
            return []
            
        signals = []
        sorted_prices = sorted(stock_prices, key=lambda x: x.date)
        
        # Parse Logic
        up_condition = None
        down_condition = None
        
        lines = logic_string.split('\n')
        for line in lines:
            line = line.strip()
            if line.startswith('UP:'):
                up_condition = line.replace('UP:', '').strip()
            elif line.startswith('DOWN:'):
                down_condition = line.replace('DOWN:', '').strip()
        
        if not up_condition and not down_condition:
            # Fallback: assume the whole string is an UP condition (simple mode)
            up_condition = logic_string

        # Parse Expected Logic
        expected_logic = None
        for line in lines:
            if line.strip().startswith('EXPECTED:'):
                expected_logic = line.replace('EXPECTED:', '').strip()
                break
            
        for i in range(1, len(sorted_prices)):
            context = {}
            today = sorted_prices[i]
            prev = sorted_prices[i-1]
            prev2 = sorted_prices[i-2] if i >= 2 else None
            
            # Context Building
            context['CLOSE'] = float(today.close_price)
            context['OPEN'] = float(today.open_price)
            context['HIGH'] = float(today.high_price)
            context['LOW'] = float(today.low_price)
            context['VOLUME'] = float(today.volume) if today.volume else 0
            
            context['CLOSE_1'] = float(prev.close_price)
            context['OPEN_1'] = float(prev.open_price)
            context['HIGH_1'] = float(prev.high_price)
            context['LOW_1'] = float(prev.low_price)
            context['VOLUME_1'] = float(prev.volume) if prev.volume else 0

            # Day Before Yesterday (Handle elegantly if not enough history)
            if prev2:
                context['CLOSE_2'] = float(prev2.close_price)
                context['OPEN_2'] = float(prev2.open_price)
                context['HIGH_2'] = float(prev2.high_price)
                context['LOW_2'] = float(prev2.low_price)
                context['VOLUME_2'] = float(prev2.volume) if prev2.volume else 0
            else:
                 # Fallback to avoid crash if strategy attempts usage on day 1
                context['CLOSE_2'] = context['CLOSE_1'] 
                context['OPEN_2'] = context['OPEN_1']
                context['HIGH_2'] = context['HIGH_1']
                context['LOW_2'] = context['LOW_1']
                context['VOLUME_2'] = context['VOLUME_1']
            
            direction = None
            
            # Evaluate using eval() with Restricted Globals for safety
            # NOTE: This is an internal admin tool, but basic safety applied.
            safe_dict = {'__builtins__': None, 'abs': abs, 'round': round}
            safe_dict.update(context)
            
            # Evaluate Logic
            # 1. Custom Expected Logic (Implicit Mode)
            if expected_logic and not up_condition and not down_condition:
                try:
                    val = eval(expected_logic, safe_dict)
                    expected_price = round(float(val), 2)
                    
                    if expected_price > context['CLOSE']:
                        direction = 'UP'
                    elif expected_price < context['CLOSE']:
                        direction = 'DOWN'
                    # If equal, no signal
                    
                except Exception as e:
                    # print(f"Error evaluating expected logic: {e}")
                    continue

            # 2. Explicit UP/DOWN Logic (Legacy Mode)
            else:
                try:
                    if up_condition and eval(up_condition, safe_dict):
                        direction = 'UP'
                    elif down_condition and eval(down_condition, safe_dict):
                        direction = 'DOWN'
                except Exception as e:
                    continue
                
                # Calculate Expected Price for Explicit Mode
                # Custom Expected Value Logic
                if expected_logic:
                    try:
                        val = eval(expected_logic, safe_dict)
                        if val is None:
                            continue # Logic explicit returned None -> No Signal
                            
                        expected_price = round(float(val), 2)
                        
                        # Implicit Direction Check (Re-evaluate with new val)
                        # If we are in implicit mode (no up/down condition), we verify direction here again
                        # But 'direction' var is already set? 
                        # Wait, logic flow:
                        # 1. Implicit Mode loop: sets expected_price -> sets direction.
                        # 2. Explicit Mode loop: sets direction -> sets expected_price.
                        
                        # My previous edit put Implicit Mode check BEFORE this block, but this block is inside "if direction:".
                        # Let's check where I inserted the Implicit Logic.
                        
                        # In Step 1059:
                        # I replaced the "Evaluate Logic" block.
                        # The implicit mode block runs first.
                        # AND... it calculates expected_price right there.
                        
                        # So if I am in Implicit Mode, I am NOT reaching this "if direction:" block logic for expected_price?
                        # Ah, I see `if direction:` at the end.
                        
                        # Let's review the file content to be sure where I am editing.
                        pass 
                    except Exception:
                         # Fallback if evaluation fails
                        momentum = today.close_price - prev.close_price
                        expected_price = round(today.close_price + momentum, 2)
                else:
                    # Default momentum
                    expected_price = round(today.close_price + (today.close_price - prev.close_price), 2)

            if direction:
                # Determine Signal Date
                if i < len(sorted_prices) - 1:
                    signal_date = sorted_prices[i+1].date
                else:
                    signal_date = today.date + timedelta(days=1)
                    while True:
                        is_open, _ = MarketSchedule.is_market_open(signal_date)
                        if is_open:
                            break
                        signal_date += timedelta(days=1)

                signals.append({
                    'date': signal_date,
                    'signal_direction': direction,
                    'expected_value': expected_price,
                    'entry_price': context['CLOSE']
                })
                
        return signals
    @classmethod
    def run_strategy(cls, stock, strategy_code, mode='normal', start_date=None, end_date=None):
        """
        Run strategy for a stock.
        mode: 'normal' (append new), 'hard' (recalculate all or range)
        """
        try:
            strategy = StrategyMaster.objects.get(code=strategy_code)
        except StrategyMaster.DoesNotExist:
            print(f"Strategy {strategy_code} not found")
            return

        prices_queryset = StockPriceDaily.objects.filter(stock=stock).order_by('date')

        if mode == 'hard':
            # Hard sync with date range
            if start_date and end_date:
                # Delete existing signals in range
                StrategySignal.objects.filter(
                    stock=stock, 
                    strategy=strategy, 
                    date__range=[start_date, end_date]
                ).delete()
                
                # Fetch prices: We need buffer before start_date to calculate the first signal
                buffer_days = 5
                fetch_start = datetime.strptime(str(start_date), '%Y-%m-%d').date() - timedelta(days=buffer_days)
                prices = list(prices_queryset.filter(date__gte=fetch_start, date__lte=end_date))
                
            else:
                # Full wipe
                StrategySignal.objects.filter(stock=stock, strategy=strategy).delete()
                prices = list(prices_queryset)
                
        else:
            # Normal sync: fetch prices needed for latest calculation
            last_signal = StrategySignal.objects.filter(stock=stock, strategy=strategy).order_by('-date').first()
            query_start = None
            
            if last_signal:
                # Calculate for dates AFTER the last signal
                query_start = last_signal.date - timedelta(days=5) # 5 day buffer for trend calc
                prices = list(prices_queryset.filter(date__gte=query_start))
            else:
                prices = list(prices_queryset)

        if not prices:
            pass # Return 0 signals

        # Select Strategy Logic
        generated_signals = []
        
        if strategy.type == 'AUTO':
            generated_signals = cls.calculate_auto_strategy(prices, strategy.logic)
        elif strategy_code == 'DAILY_CLOSE_MOMENTUM':
            generated_signals = cls.calculate_one_day_trend(prices)
        elif strategy_code == 'TWO_DAY_CLOSE_MOMENTUM':
            generated_signals = cls.calculate_three_day_trend(prices)
        elif strategy_code == 'OVERSOLD_REVERSAL':
            generated_signals = cls.calculate_oversold_reversal(prices)
            
        # Save Signals
        new_signals = []
        for sig in generated_signals:
            # Filter if date range was specified
            if start_date and end_date:
                 if not (str(start_date) <= str(sig['date']) <= str(end_date)):
                     continue

            # Check if exists (for normal sync or if not deleted)
            if StrategySignal.objects.filter(stock=stock, strategy=strategy, date=sig['date']).exists():
                continue

            
            # Determine Entry Price (Closing Price of 'row' ie. Today)
            entry_price = round(sig.get('entry_price', 0), 2)
            # If not explicitly provided by strategy logic (e.g. limit order), default to current close
            if entry_price == 0 and 'entry_price' not in sig:
                # We need to find the price for the day the signal was generated (which is NOT sig['date'] necessarily)
                # sig['date'] is the Target Date (Next Day). 
                # The loop that generated this signal knows the current row price.
                # BUT 'sig' dictionary created in calculate methods does not store it currently.
                # Must update calculate methods to return entry_price.
                pass 

            new_signals.append(StrategySignal(
                stock=stock,
                strategy=strategy,
                date=sig['date'],
                signal_direction=sig['signal_direction'],
                expected_value=sig.get('expected_value'),
                stop_loss=sig.get('stop_loss'),
                entry_price=sig.get('entry_price')
            ))
        
        if new_signals:
            StrategySignal.objects.bulk_create(new_signals, batch_size=500)
            
        # RESOLVE PENDING SIGNALS
        # Check all PENDING signals for this stock/strategy that are in the past
        pending_signals = StrategySignal.objects.filter(
            stock=stock, 
            strategy=strategy, 
            status='PENDING',
            date__lt=datetime.now().date()
        )
        
        # We need prices for these dates.
        # Efficient: Get all dates needed
        pending_dates = [s.date for s in pending_signals]
        if pending_dates:
            price_map = {
                p.date: p.close_price 
                for p in StockPriceDaily.objects.filter(stock=stock, date__in=pending_dates)
            }
            
            updates = []
            for sig in pending_signals:
                if sig.date in price_map:
                    exit_price = price_map[sig.date]
                    sig.exit_price = exit_price
                    sig.pnl = exit_price - sig.entry_price if sig.entry_price else 0
                    
                    # PnL Percent
                    if sig.entry_price and sig.entry_price > 0:
                         sig.pnl_percent = (sig.pnl / sig.entry_price) * 100
                    
                    # Determine Status
                    if sig.signal_direction == 'UP':
                        if exit_price > sig.entry_price:
                            sig.status = 'WIN'
                        elif exit_price < sig.entry_price:
                            sig.status = 'LOSS'
                        else:
                            sig.status = 'NEUTRAL'
                    elif sig.signal_direction == 'DOWN':
                        if exit_price < sig.entry_price:
                            sig.status = 'WIN'
                        elif exit_price > sig.entry_price:
                            sig.status = 'LOSS'
                        else:
                            sig.status = 'NEUTRAL'
                            
                    updates.append(sig)
            
            if updates:
                StrategySignal.objects.bulk_update(updates, ['exit_price', 'status', 'pnl', 'pnl_percent'])

        return len(new_signals)

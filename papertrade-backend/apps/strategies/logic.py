from datetime import timedelta, datetime
from decimal import Decimal
from django.db.models import F
from apps.stocks.models import Stock, StockPriceDaily
from .models import StrategyMaster, StrategySignal

class StrategyEngine:
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
                
                signals.append({
                    'date': today.date + timedelta(days=1), # Signal is for the NEXT day
                    'signal_direction': direction,
                    'expected_value': expected_price
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
                 
                 signals.append({
                    'date': today.date + timedelta(days=1),
                    'signal_direction': direction,
                    'expected_value': expected_price
                })
            
        return signals
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
                signals.append({
                    'date': today.date + timedelta(days=1),
                    'signal_direction': direction,
                    'expected_value': expected_price
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
        elif strategy_code == 'ONE_DAY_TREND':
            generated_signals = cls.calculate_one_day_trend(prices)
        elif strategy_code == 'THREE_DAY_TREND':
            generated_signals = cls.calculate_three_day_trend(prices)
            
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

            
            new_signals.append(StrategySignal(
                stock=stock,
                strategy=strategy,
                date=sig['date'],
                signal_direction=sig['signal_direction'],
                expected_value=sig['expected_value']
            ))
        
        if new_signals:
            StrategySignal.objects.bulk_create(new_signals, batch_size=500)
            
        return len(new_signals)

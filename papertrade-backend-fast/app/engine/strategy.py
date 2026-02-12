from datetime import timedelta, datetime
from decimal import Decimal
import pandas as pd
import numpy as np
from app.engine.market_schedule import MarketSchedule

class StrategyEngine:
    @staticmethod
    def calculate_technical_indicators(df):
        """Standard technical indicators (RSI, MA)."""
        # RSI 14
        delta = df['close_price'].diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
        rs = gain / loss
        df['RSI'] = 100 - (100 / (1 + rs))
        
        # SMAs
        for p in [5, 10, 20, 50]:
            df[f'SMA_{p}'] = df['close_price'].rolling(window=p).mean()
        
        return df

    @staticmethod
    def calculate_rule_based_strategy(stock_prices, rules_json):
        """Calculates signals based on JSON rules."""
        if not stock_prices:
            return []
            
        # Convert to DataFrame (assuming stock_prices is list of objects with attributes)
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
        
        needed_fields = set()
        strategy_blocks = rules_json.get('strategy_blocks', [])

        # Backward Compatibility
        if not strategy_blocks:
            buy_blocks = rules_json.get('buy_blocks', [])
            if not buy_blocks and 'buy_rules' in rules_json:
                 buy_blocks = [{'rules': rules_json['buy_rules'], 'output_percentage': 0}]
            sell_blocks = rules_json.get('sell_blocks', [])
            if not sell_blocks and 'sell_rules' in rules_json:
                 sell_blocks = [{'rules': rules_json['sell_rules'], 'output_percentage': 0}]
            for b in buy_blocks:
                b['action'] = 'BUY'
                strategy_blocks.append(b)
            for b in sell_blocks:
                b['action'] = 'SELL'
                strategy_blocks.append(b)
        
        for block in strategy_blocks:
            for rule in block.get('rules', []):
                field = rule.get('field', '').upper()
                if field == 'RSI': needed_fields.add('RSI')
                elif field.startswith('SMA_'): needed_fields.add(field)

        if 'RSI' in needed_fields:
            delta = df['close_price'].diff()
            gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
            loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
            rs = gain / loss
            df['RSI'] = 100 - (100 / (1 + rs))
        
        df['CLOSE_PCT_CHANGE_0'] = df['close_price'].pct_change() * 100
        df['CLOSE_PCT_CHANGE_1'] = df['CLOSE_PCT_CHANGE_0'].shift(1)
        df['CLOSE_PCT_CHANGE_1_3'] = df['close_price'].pct_change(periods=2) * 100
        df['CLOSE_PCT_CHANGE_1_7'] = df['close_price'].pct_change(periods=6) * 100

        for field in needed_fields:
            if field.startswith('SMA_'):
                period = int(field.split('_')[1])
                ma = df['close_price'].rolling(window=period).mean()
                df[field] = (ma / df['close_price']) * 100

        signals = []
        for i in range(1, len(df)):
            row = df.iloc[i]
            prev_row = df.iloc[i-1]
            
            def get_val(f):
                f = f.upper()
                return row.get(f, row.get(f.lower(), 0))
                
            def check_conditions(rules):
                if not rules: return False
                for rule in rules:
                    f = rule.get('field')
                    op = rule.get('operator')
                    try: val = float(rule.get('value', 0))
                    except: val = 0
                    curr = get_val(f)
                    if pd.isna(curr): return False
                    if op == 'gt' and not (curr > val): return False
                    elif op == 'lt' and not (curr < val): return False
                    elif op == 'eq' and not (curr == val): return False
                    elif op == 'gte' and not (curr >= val): return False
                    elif op == 'lte' and not (curr <= val): return False
                return True

            direction = None
            output_pct = 0.0
            for block in strategy_blocks:
                if check_conditions(block.get('rules', [])):
                    act = block.get('action', 'BUY').upper()
                    direction = 'UP' if act == 'BUY' else 'DOWN'
                    try: output_pct = float(block.get('output_percentage', 0))
                    except: output_pct = 0
                    break
            
            if direction:
                today_date = row['date']
                if i < len(df) - 1:
                    signal_date = df.iloc[i+1]['date']
                else:
                    signal_date = today_date + timedelta(days=1)
                    while True:
                        is_open, _ = MarketSchedule.is_market_open(signal_date)
                        if is_open: break
                        signal_date += timedelta(days=1)
                
                if output_pct != 0:
                    mult = (1 + output_pct / 100) if direction == 'UP' else (1 - output_pct / 100)
                    expected_price = round(row['close_price'] * mult, 2)
                else:
                    momentum = row['close_price'] - prev_row['close_price']
                    expected_price = round(row['close_price'] + momentum, 2)
                
                signals.append({
                    'date': signal_date,
                    'signal_direction': direction,
                    'expected_value': expected_price,
                    'entry_price': float(row['close_price'])
                })
        return signals

    @staticmethod
    def calculate_one_day_trend(stock_prices):
        signals = []
        sorted_prices = sorted(stock_prices, key=lambda x: x.date)
        for i in range(1, len(sorted_prices)):
            t, y = sorted_prices[i], sorted_prices[i-1]
            diff = float(t.close_price) - float(y.close_price)
            direction = 'UP' if diff > 0 else ('DOWN' if diff < 0 else None)
            if direction:
                expected_price = round(float(t.close_price) + diff, 2)
                if i < len(sorted_prices) - 1:
                    signal_date = sorted_prices[i+1].date
                else:
                    signal_date = t.date + timedelta(days=1)
                    while True:
                        is_open, _ = MarketSchedule.is_market_open(signal_date)
                        if is_open: break
                        signal_date += timedelta(days=1)
                signals.append({
                    'date': signal_date,
                    'signal_direction': direction,
                    'expected_value': expected_price,
                    'entry_price': float(t.close_price)
                })
        return signals

    @staticmethod
    def calculate_three_day_trend(stock_prices):
        signals = []
        sorted_prices = sorted(stock_prices, key=lambda x: x.date)
        for i in range(2, len(sorted_prices)):
            t, y, db = sorted_prices[i], sorted_prices[i-1], sorted_prices[i-2]
            cp = [float(p.close_price) for p in [t, y, db]]
            diff1, diff2 = cp[0] - cp[1], cp[1] - cp[2]
            direction = 'UP' if cp[0] > cp[1] > cp[2] else ('DOWN' if cp[0] < cp[1] < cp[2] else None)
            if direction:
                avg_momentum = (diff1 + diff2) / 2
                expected_price = round(cp[0] + avg_momentum, 2)
                if i < len(sorted_prices) - 1:
                    signal_date = sorted_prices[i+1].date
                else:
                    signal_date = t.date + timedelta(days=1)
                    while True:
                        is_open, _ = MarketSchedule.is_market_open(signal_date)
                        if is_open: break
                        signal_date += timedelta(days=1)
                signals.append({
                    'date': signal_date,
                    'signal_direction': direction,
                    'expected_value': expected_price,
                    'entry_price': cp[0]
                })
        return signals

    @staticmethod
    def calculate_oversold_reversal(stock_prices):
        signals = []
        sorted_prices = sorted(stock_prices, key=lambda x: x.date)
        if len(sorted_prices) < 11: return []
        for i in range(10, len(sorted_prices)):
            curr, p1, p2 = sorted_prices[i], sorted_prices[i-1], sorted_prices[i-2]
            cp = [float(p.close_price) for p in [curr, p1, p2]]
            if not (cp[0] > cp[1] and cp[1] > cp[2]): continue
            start_node = sorted_prices[i-10]
            if (float(start_node.close_price) - cp[0]) / float(start_node.close_price) < 0.20: continue
            red_candles = sum(1 for j in range(i-9, i+1) if float(sorted_prices[j].close_price) < float(sorted_prices[j-1].close_price))
            if red_candles < 5: continue
            expected_price = round(cp[0] * 1.05, 2)
            stop_loss = round(cp[0] * 0.95, 2)
            if i < len(sorted_prices) - 1: signal_date = sorted_prices[i+1].date
            else:
                signal_date = curr.date + timedelta(days=1)
                while True:
                    is_open, _ = MarketSchedule.is_market_open(signal_date)
                    if is_open: break
                    signal_date += timedelta(days=1)
            signals.append({
                'date': signal_date,
                'signal_direction': 'UP',
                'expected_value': expected_price,
                'stop_loss': stop_loss,
                'entry_price': cp[0]
            })
        return signals

    @staticmethod
    def calculate_auto_strategy(stock_prices, logic_string):
        if not logic_string: return []
        signals = []
        sorted_prices = sorted(stock_prices, key=lambda x: x.date)
        up_cond = next((l.replace('UP:', '').strip() for l in logic_string.split('\n') if l.strip().startswith('UP:')), None)
        down_cond = next((l.replace('DOWN:', '').strip() for l in logic_string.split('\n') if l.strip().startswith('DOWN:')), None)
        if not up_cond and not down_cond: up_cond = logic_string
        exp_logic = next((l.replace('EXPECTED:', '').strip() for l in logic_string.split('\n') if l.strip().startswith('EXPECTED:')), None)
        
        for i in range(1, len(sorted_prices)):
            ctx = {}
            nodes = [sorted_prices[i], sorted_prices[i-1]]
            if i >= 2: nodes.append(sorted_prices[i-2])
            else: nodes.append(sorted_prices[i-1]) # Fallback
            
            for idx, p in enumerate(nodes):
                sfx = '' if idx == 0 else f'_{idx}'
                ctx.update({
                    f'CLOSE{sfx}': float(p.close_price),
                    f'OPEN{sfx}': float(p.open_price),
                    f'HIGH{sfx}': float(p.high_price),
                    f'LOW{sfx}': float(p.low_price),
                    f'VOLUME{sfx}': float(p.volume) if p.volume else 0
                })

            safe_dict = {'__builtins__': None, 'abs': abs, 'round': round}
            safe_dict.update(ctx)
            direction, expected_price = None, 0.0
            
            if exp_logic and not up_cond and not down_cond:
                try:
                    val = float(eval(exp_logic, safe_dict))
                    expected_price = round(val, 2)
                    direction = 'UP' if expected_price > ctx['CLOSE'] else ('DOWN' if expected_price < ctx['CLOSE'] else None)
                except: continue
            else:
                try:
                    if up_cond and eval(up_cond, safe_dict): direction = 'UP'
                    elif down_cond and eval(down_cond, safe_dict): direction = 'DOWN'
                except: continue
                if direction:
                    if exp_logic:
                        try:
                            val = eval(exp_logic, safe_dict)
                            if val is None: continue
                            expected_price = round(float(val), 2)
                        except:
                             expected_price = round(ctx['CLOSE'] + (ctx['CLOSE'] - ctx['CLOSE_1']), 2)
                    else:
                        expected_price = round(ctx['CLOSE'] + (ctx['CLOSE'] - ctx['CLOSE_1']), 2)
            
            if direction:
                if i < len(sorted_prices) - 1: signal_date = sorted_prices[i+1].date
                else:
                    signal_date = sorted_prices[i].date + timedelta(days=1)
                    while True:
                        is_open, _ = MarketSchedule.is_market_open(signal_date)
                        if is_open: break
                        signal_date += timedelta(days=1)
                signals.append({
                    'date': signal_date,
                    'signal_direction': direction,
                    'expected_value': expected_price,
                    'entry_price': ctx['CLOSE']
                })
        return signals

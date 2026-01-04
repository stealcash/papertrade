"""
Backtest engine for executing trading strategies.
"""
import logging
from datetime import datetime, timedelta
from decimal import Decimal
from typing import List, Dict, Any
import requests
from django.conf import settings
from django.utils import timezone
from .models import BacktestRun, Trade
from apps.stocks.models import Stock, StockPriceDaily
from apps.strategies.models import StrategyMaster, StrategyRuleBased
from apps.strategies.logic import StrategyEngine

logger = logging.getLogger(__name__)


class BacktestEngine:
    """Main backtest execution engine."""
    
    def __init__(self, backtest_run: BacktestRun):
        self.backtest_run = backtest_run
        self.results = []
        self.stats = {
            'total_signals': 0,
            'win_count': 0,
            'loss_count': 0,
        }
        
    def execute(self, stock_ids: List[int], execution_mode: str = 'signal_close'):
        """
        Execute backtest for given stocks.
        """
        start_time = timezone.now()
        
        try:
            self.backtest_run.status = 'running'
            self.backtest_run.save()
            
            # Get stocks
            stocks = Stock.objects.filter(id__in=stock_ids, status='active')
            if not stocks.exists():
                raise ValueError('No active stocks found')
            
            # Get date range with buffer (need prior days for indicators)
            start_date = self.backtest_run.start_date
            end_date = self.backtest_run.end_date
            fetch_start = start_date - timedelta(days=30)
            
            # Strategy Code
            strategy = self.backtest_run.strategy_predefined
            strategy_rule = self.backtest_run.strategy_rule_based
            
            if not strategy and not strategy_rule:
                raise ValueError("No strategy selected")
                
            # Process each stock
            for stock in stocks:
                self._process_stock(stock, strategy, fetch_start, end_date)
            
            # Calculate final stats
            self.backtest_run.total_signals = self.stats['total_signals']
            self.backtest_run.win_count = self.stats['win_count']
            self.backtest_run.loss_count = self.stats['loss_count']
            
            if self.stats['total_signals'] > 0:
                self.backtest_run.win_rate = (self.stats['win_count'] / self.stats['total_signals']) * 100
            else:
                self.backtest_run.win_rate = 0
            
            # --- PnL Calculation ---
            if self.backtest_run.trade_strategy and self.backtest_run.initial_wallet_amount > 0:
                 self._calculate_pnl(stocks, strategy, strategy_rule, fetch_start, end_date)
            
            # Save detailed results
            self.backtest_run.list_of_trades_json = self.results
            self.backtest_run.status = 'completed'
            self.backtest_run.time_taken = (timezone.now() - start_time).total_seconds()
            self.backtest_run.save()
            
            logger.info(f"Backtest {self.backtest_run.run_id} completed successfully")
            
        except Exception as e:
            logger.error(f"Backtest {self.backtest_run.run_id} failed: {str(e)}")
            self.backtest_run.status = 'failed'
            self.backtest_run.error_message = str(e)
            self.backtest_run.save()
            raise

    def _process_stock(self, stock, strategy, start_date, end_date):
        """Process a single stock: Generate signals & Verify."""
        
        # 1. Fetch Prices
        prices = list(StockPriceDaily.objects.filter(
            stock=stock,
            date__gte=start_date,
            date__lte=end_date
        ).order_by('date'))
        
        if not prices:
            return

        # 2. Generate Signals (Hypothetical)
        generated_signals = []
        
        if self.backtest_run.strategy_rule_based:
             generated_signals = StrategyEngine.calculate_rule_based_strategy(
                 prices, 
                 self.backtest_run.strategy_rule_based.rules_json
             )
        elif strategy.type == 'AUTO':
            if strategy.rule_based_strategy:
                generated_signals = StrategyEngine.calculate_rule_based_strategy(
                    prices, 
                    strategy.rule_based_strategy.rules_json
                )
        elif strategy.code == 'ONE_DAY_TREND':
            generated_signals = StrategyEngine.calculate_one_day_trend(prices)
        elif strategy.code == 'THREE_DAY_TREND':
            generated_signals = StrategyEngine.calculate_three_day_trend(prices)
            
        # 3. Verify Signals
        # Map prices by date for quick lookup
        price_map = {p.date: p for p in prices}
        
        # We also need 'previous day' lookup for verification (Change = Today - Yesterday)
        # Assuming prices list is sorted
        prev_price_map = {}
        for i in range(1, len(prices)):
            prev_price_map[prices[i].date] = prices[i-1]

        criteria = self.backtest_run.criteria_type
        
        for sig in generated_signals:
            sig_date = sig['date']
            
            # Filter: Check if signal falls in requested user range
            # (Note: generated_signals might include early dates from buffer)
            if not (self.backtest_run.start_date <= sig_date <= self.backtest_run.end_date):
                continue
            
            actual_price_obj = price_map.get(sig_date)
            prev_price_obj = prev_price_map.get(sig_date)
            
            if not actual_price_obj or not prev_price_obj:
                continue # Cannot verify without price data

            # Also validate expected value if it's required or provided
            expected_val = sig.get('expected_value')
            if expected_val is None or expected_val == 0:
                 # If criteria requires magnitude, we strictly need this.
                 # Even for direction, if prediction is incomplete, better to skip as per user request.
                 continue
                
            # Verification Logic
            is_win = False
            
            actual_close = float(actual_price_obj.close_price)
            prev_close = float(prev_price_obj.close_price)
            actual_change = actual_close - prev_close
            
            predicted_dir = sig['signal_direction']
            
            # Criteria 1: Direction Only
            direction_match = (predicted_dir == 'UP' and actual_change > 0) or \
                              (predicted_dir == 'DOWN' and actual_change < 0)
                              
            if criteria == 'direction':
                is_win = direction_match
            
            # Criteria 2: Magnitude (Dynamic %)
            elif criteria == 'magnitude':
                if direction_match:
                    predicted_val = float(sig['expected_value'])
                    predicted_change = abs(predicted_val - prev_close)
                    
                    # Prevent zero division / noise
                    if predicted_change == 0:
                        is_win = True # Accurate prediction of 0 change?
                    else:
                        actual_force = abs(actual_change)
                        # "at least X% ... in same side"
                        threshold_ratio = self.backtest_run.magnitude_threshold / 100.0
                        if actual_force >= (threshold_ratio * predicted_change):
                            is_win = True
                        else:
                            is_win = False
                else:
                    is_win = False
            
            # Record
            self.stats['total_signals'] += 1
            if is_win:
                self.stats['win_count'] += 1
            else:
                self.stats['loss_count'] += 1
                
            self.results.append({
                'stock_symbol': stock.symbol,
                'signal_date': sig_date.strftime('%Y-%m-%d'),
                'signal': predicted_dir,
                'expected_price': float(sig['expected_value']),
                'actual_close': actual_close,
                'prev_close': prev_close,
                'result': 'WIN' if is_win else 'LOSS'
            })

    def _calculate_pnl(self, stocks, strategy, strategy_rule, start_date, end_date):
        """
        Calculate PnL based on selected strategy (Re-Entry or Buy & Hold).
        Allocates equal capital to each stock.
        """
        initial_capital = float(self.backtest_run.initial_wallet_amount)
        if not stocks:
            return

        capital_per_stock = initial_capital / len(stocks)
        total_final_value = 0.0
        total_trades = 0
        
        mode = self.backtest_run.trade_strategy # 're_entry' or 'buy_hold'

        for stock in stocks:
            # 1. Fetch Prices again (Optimization: Could reuse if cached, but for now fetch cleanly)
            prices = list(StockPriceDaily.objects.filter(
                stock=stock,
                date__gte=start_date,
                date__lte=end_date
            ).order_by('date'))
            
            if not prices:
                total_final_value += capital_per_stock # No trade, keep capital
                continue

            price_map = {p.date: p for p in prices}
            ordered_dates = [p.date for p in prices] # Sorted list of dates avail in range

            # 2. Re-Generate Signals (To ensure we have the full sequence for trading)
            # (Logic duplicated from _process_stock, should ideally be shared but keeping isolated for safety now)
            generated_signals = []
            if strategy_rule:
                 generated_signals = StrategyEngine.calculate_rule_based_strategy(prices, strategy_rule.rules_json)
            elif strategy.type == 'AUTO' and strategy.rule_based_strategy:
                 generated_signals = StrategyEngine.calculate_rule_based_strategy(prices, strategy.rule_based_strategy.rules_json)
            elif strategy.code == 'ONE_DAY_TREND':
                 generated_signals = StrategyEngine.calculate_one_day_trend(prices)
            elif strategy.code == 'THREE_DAY_TREND':
                 generated_signals = StrategyEngine.calculate_three_day_trend(prices)
            
            # Sort signals by date
            generated_signals.sort(key=lambda x: x['date'])
            
            # Filter signals within user requested range ONLY
            # (Signals might cover 'fetch_start', but we only trade within 'run.start_date' to 'run.end_date')
            user_start = self.backtest_run.start_date
            user_end = self.backtest_run.end_date
            
            valid_signals = [
                s for s in generated_signals 
                if user_start <= s['date'] <= user_end
            ]

            # Simulation State
            cash = capital_per_stock
            holdings_qty = 0
            # active_trade = None # Not needed strictly if we just track cash/holdings

            # MODE: BUY & HOLD (Enter on First BUY, Exit on Last Day)
            if mode == 'buy_hold':
                first_buy = next((s for s in valid_signals if s['signal_direction'] == 'UP'), None)
                if first_buy:
                    # Enter
                    entry_date = first_buy['date']
                    entry_price_obj = price_map.get(entry_date)
                    if entry_price_obj:
                         entry_price = float(entry_price_obj.close_price) # Assume buy at Close of Signal Day
                         if entry_price > 0:
                             holdings_qty = int(cash // entry_price)
                             cash -= (holdings_qty * entry_price)
                             total_trades += 1
                             
                             # Exit at End of Period (Last available price)
                             last_price_obj = prices[-1]
                             exit_price = float(last_price_obj.close_price)
                             cash += (holdings_qty * exit_price)
                             holdings_qty = 0
                             total_trades += 1 # Exit count? User said "no of trade will be each buy and sell" -> yes 2 trades logic
                
                total_final_value += cash

            # MODE: RE-ENTRY (Signal Based)
            elif mode == 're_entry':
                 # Logic:
                 # Buy Signal -> Buy (if cash).
                 # Sell Signal -> Sell (if holding).
                 # Re-enter on next Buy.
                 
                 for sig in valid_signals:
                     sig_date = sig['date']
                     direction = sig['signal_direction']
                     price_obj = price_map.get(sig_date)
                     if not price_obj: continue
                     current_price = float(price_obj.close_price)
                     
                     if direction == 'UP':
                         if holdings_qty == 0 and cash > 0:
                             # Buy
                             holdings_qty = int(cash // current_price)
                             if holdings_qty > 0:
                                 cash -= (holdings_qty * current_price)
                                 total_trades += 1
                                 
                     elif direction == 'DOWN':
                         if holdings_qty > 0:
                             # Sell
                             cash += (holdings_qty * current_price)
                             holdings_qty = 0
                             total_trades += 1
                 
                 # Mark to Market at end (if still holding, liquidate at last price for Final Value calc)
                 if holdings_qty > 0:
                     last_price_obj = prices[-1]
                     last_price = float(last_price_obj.close_price)
                     cash += (holdings_qty * last_price)
                     # holdings_qty = 0 # Don't count as 'trade' if it's just valuation? Or forced exit?
                     # Usually forced exit is better for final PnL.
                     # "Exit at last trade day" applies to BuyHold. For Active? usually implied.
                     # Let's count it as final value but maybe not a 'trade' unless signaled?
                     # User said "exit the stock when we get sell signal".
                     # If no sell signal by end? PnL is usually unrealized + realized.
                     # We will calculate total Value = Cash + (Qty * LastPrice).
                 
                 total_final_value += cash

        # Final Aggregation
        self.backtest_run.final_wallet_amount = Decimal(total_final_value)
        self.backtest_run.total_pnl = Decimal(total_final_value - initial_capital)
        if initial_capital > 0:
            self.backtest_run.pnl_percentage = Decimal(((total_final_value - initial_capital) / initial_capital) * 100)
        
        self.backtest_run.number_of_trades = total_trades

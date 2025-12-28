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
            if not strategy:
                raise ValueError("No predefined strategy selected")
                
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
        if strategy.type == 'AUTO':
            generated_signals = StrategyEngine.calculate_auto_strategy(prices, strategy.logic)
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

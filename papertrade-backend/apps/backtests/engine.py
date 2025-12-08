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
from apps.strategies.models import StrategyPredefined, StrategyRuleBased

logger = logging.getLogger(__name__)


class BacktestEngine:
    """Main backtest execution engine."""
    
    def __init__(self, backtest_run: BacktestRun):
        self.backtest_run = backtest_run
        self.wallet_balance = Decimal(backtest_run.initial_wallet_amount)
        self.trades = []
        self.equity_curve = []
        self.positions = {}  # stock_id -> position info
        
    def execute(self, stock_ids: List[int], execution_mode: str = 'signal_close'):
        """
        Execute backtest for given stocks.
        
        Args:
            stock_ids: List of stock IDs to backtest
            execution_mode: 'signal_close' or 'next_open'
        """
        start_time = timezone.now()
        
        try:
            self.backtest_run.status = 'running'
            self.backtest_run.save()
            
            # Get stocks
            stocks = Stock.objects.filter(id__in=stock_ids, status='active')
            
            if not stocks.exists():
                raise ValueError('No active stocks found')
            
            # Get date range
            start_date = self.backtest_run.start_date
            end_date = self.backtest_run.end_date
            
            # Execute strategy for each day
            current_date = start_date
            while current_date <= end_date:
                # Get price data for all stocks for this date
                prices = StockPriceDaily.objects.filter(
                    stock__in=stocks,
                    date=current_date
                ).select_related('stock')
                
                if prices.exists():
                    # Execute strategy logic for this day
                    self._execute_day(current_date, prices, execution_mode)
                    
                    # Record equity curve
                    total_equity = self._calculate_total_equity(prices)
                    self.equity_curve.append({
                        'date': current_date.isoformat(),
                        'equity': float(total_equity)
                    })
                
                current_date += timedelta(days=1)
            
            # Close all open positions at end
            self._close_all_positions(end_date)
            
            # Calculate final results
            final_wallet = self.wallet_balance
            total_pnl = final_wallet - Decimal(self.backtest_run.initial_wallet_amount)
            pnl_percentage = (total_pnl / Decimal(self.backtest_run.initial_wallet_amount)) * 100
            
            # Update backtest run
            self.backtest_run.final_wallet_amount = final_wallet
            self.backtest_run.total_pnl = total_pnl
            self.backtest_run.pnl_percentage = pnl_percentage
            self.backtest_run.number_of_trades = len(self.trades)
            self.backtest_run.list_of_trades_json = self.trades
            self.backtest_run.equity_curve_json = self.equity_curve
            self.backtest_run.status = 'completed'
            self.backtest_run.time_taken = (timezone.now() - start_time).total_seconds()
            self.backtest_run.save()
            
            # Create trade records
            self._save_trades()
            
            logger.info(f"Backtest {self.backtest_run.run_id} completed successfully")
            
        except Exception as e:
            logger.error(f"Backtest {self.backtest_run.run_id} failed: {str(e)}")
            self.backtest_run.status = 'failed'
            self.backtest_run.error_message = str(e)
            self.backtest_run.save()
            raise
    
    def _execute_day(self, date, prices, execution_mode):
        """Execute strategy for a single day."""
        # Simple moving average crossover strategy (example)
        for price in prices:
            stock = price.stock
            
            # Get historical prices for indicators
            historical_prices = StockPriceDaily.objects.filter(
                stock=stock,
                date__lte=date
            ).order_by('-date')[:50]
            
            if historical_prices.count() < 20:
                continue  # Not enough data
            
            # Calculate simple moving averages
            sma_short = self._calculate_sma(historical_prices[:10])
            sma_long = self._calculate_sma(historical_prices[:20])
            
            # Generate signals
            if sma_short > sma_long and stock.id not in self.positions:
                # Buy signal
                self._execute_buy(stock, price, date, execution_mode)
            elif sma_short < sma_long and stock.id in self.positions:
                # Sell signal
                self._execute_sell(stock, price, date, execution_mode)
    
    def _calculate_sma(self, prices) -> Decimal:
        """Calculate simple moving average."""
        if not prices:
            return Decimal('0')
        total = sum(Decimal(str(p.close_price)) for p in prices)
        return total / len(prices)
    
    def _execute_buy(self, stock, price_data, date, execution_mode):
        """Execute buy order."""
        buy_price = Decimal(str(price_data.close_price if execution_mode == 'signal_close' 
                                else price_data.open_price))
        
        # Calculate quantity (use 10% of wallet)
        investment = self.wallet_balance * Decimal('0.1')
        quantity = int(investment / buy_price)
        
        if quantity <= 0:
            return
        
        cost = buy_price * quantity
        
        if cost > self.wallet_balance:
            return  # Insufficient funds
        
        # Execute trade
        self.wallet_balance -= cost
        self.positions[stock.id] = {
            'stock': stock,
            'quantity': quantity,
            'buy_price': buy_price,
            'buy_date': date,
        }
        
        logger.debug(f"BUY: {stock.symbol} x{quantity} @ {buy_price} on {date}")
    
    def _execute_sell(self, stock, price_data, date, execution_mode):
        """Execute sell order."""
        if stock.id not in self.positions:
            return
        
        position = self.positions[stock.id]
        sell_price = Decimal(str(price_data.close_price if execution_mode == 'signal_close' 
                                 else price_data.open_price))
        
        # Calculate P/L
        proceeds = sell_price * position['quantity']
        cost = position['buy_price'] * position['quantity']
        pnl = proceeds - cost
        
        # Update wallet
        self.wallet_balance += proceeds
        
        # Record trade
        self.trades.append({
            'stock_id': stock.id,
            'stock_symbol': stock.symbol,
            'buy_date': position['buy_date'].isoformat(),
            'buy_price': float(position['buy_price']),
            'sell_date': date.isoformat(),
            'sell_price': float(sell_price),
            'quantity': position['quantity'],
            'pnl': float(pnl),
        })
        
        # Remove position
        del self.positions[stock.id]
        
        logger.debug(f"SELL: {stock.symbol} x{position['quantity']} @ {sell_price} on {date}, P/L: {pnl}")
    
    def _close_all_positions(self, end_date):
        """Close all open positions at the end of backtest."""
        for stock_id, position in list(self.positions.items()):
            stock = position['stock']
            
            # Get last available price
            last_price = StockPriceDaily.objects.filter(
                stock=stock,
                date__lte=end_date
            ).order_by('-date').first()
            
            if last_price:
                sell_price = Decimal(str(last_price.close_price))
                proceeds = sell_price * position['quantity']
                cost = position['buy_price'] * position['quantity']
                pnl = proceeds - cost
                
                self.wallet_balance += proceeds
                
                self.trades.append({
                    'stock_id': stock.id,
                    'stock_symbol': stock.symbol,
                    'buy_date': position['buy_date'].isoformat(),
                    'buy_price': float(position['buy_price']),
                    'sell_date': last_price.date.isoformat(),
                    'sell_price': float(sell_price),
                    'quantity': position['quantity'],
                    'pnl': float(pnl),
                })
        
        self.positions.clear()
    
    def _calculate_total_equity(self, current_prices) -> Decimal:
        """Calculate total equity (cash + positions)."""
        equity = self.wallet_balance
        
        for stock_id, position in self.positions.items():
            # Find current price
            current_price = next(
                (p for p in current_prices if p.stock_id == stock_id),
                None
            )
            if current_price:
                equity += Decimal(str(current_price.close_price)) * position['quantity']
        
        return equity
    
    def _save_trades(self):
        """Save trade records to database."""
        for trade_data in self.trades:
            Trade.objects.create(
                user=self.backtest_run.user,
                stock_id=trade_data['stock_id'],
                stock_enum=trade_data['stock_symbol'],
                buy_date=trade_data['buy_date'],
                buy_price=trade_data['buy_price'],
                sell_date=trade_data['sell_date'],
                sell_price=trade_data['sell_price'],
                quantity=trade_data['quantity'],
                pnl=trade_data['pnl'],
                backtest_run=self.backtest_run,
            )

import logging
from datetime import datetime, timedelta
from decimal import Decimal
from typing import List, Dict, Any
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import update
from app.models import BacktestRun, Stock, StockPriceDaily, StrategyMaster, StrategyRuleBased
from app.engine.strategy import StrategyEngine
import pandas as pd
import time

logger = logging.getLogger(__name__)

class BacktestEngine:
    def __init__(self, db, backtest_run_id_int: int):
        self.db = db
        self.backtest_run_id = backtest_run_id_int
        self.results = []
        self.stats = {
            'total_signals': 0,
            'win_count': 0,
            'loss_count': 0,
        }
        
    async def execute(self, stock_ids: List[int]):
        start_time = time.time()
        try:
            # 1. Fetch Backtest Run
            result = await self.db.execute(select(BacktestRun).filter(BacktestRun.id == self.backtest_run_id))
            run = result.scalar_one_or_none()
            if not run: raise ValueError("BacktestRun not found")
            
            run.status = 'running'
            await self.db.commit()
            
            # 2. Fetch Stocks
            result = await self.db.execute(select(Stock).filter(Stock.id.in_(stock_ids), Stock.status == 'active'))
            stocks = result.scalars().all()
            if not stocks: raise ValueError("No active stocks found")
            
            # 3. Strategy Config
            strat_pre = None
            if run.strategy_predefined_id:
                strat_pre = (await self.db.execute(select(StrategyMaster).filter(StrategyMaster.id == run.strategy_predefined_id))).scalar_one_or_none()
            
            strat_rule = None
            if run.strategy_rule_based_id:
                strat_rule = (await self.db.execute(select(StrategyRuleBased).filter(StrategyRuleBased.id == run.strategy_rule_based_id))).scalar_one_or_none()
            
            fetch_start = run.start_date - timedelta(days=30)
            
            # 4. Process Stocks
            for stock in stocks:
                await self._process_stock(stock, run, strat_pre, strat_rule, fetch_start, run.end_date)
            
            # 5. Stats
            run.total_signals = self.stats['total_signals']
            run.win_count = self.stats['win_count']
            run.loss_count = self.stats['loss_count']
            run.win_rate = Decimal((self.stats['win_count'] / self.stats['total_signals'] * 100)) if self.stats['total_signals'] > 0 else 0
            
            # 6. PnL (Simplified port for now)
            if run.trade_strategy and float(run.initial_wallet_amount or 0) > 0:
                 # TODO: Port _calculate_pnl logic if needed, but core requirement is speed for signals
                 pass
            
            run.list_of_trades_json = self.results
            run.status = 'completed'
            run.time_taken = time.time() - start_time
            await self.db.commit()
            
        except Exception as e:
            logger.error(f"FastAPI Backtest failed: {e}")
            # Try to mark failed
            result = await self.db.execute(select(BacktestRun).filter(BacktestRun.id == self.backtest_run_id))
            run = result.scalar_one_or_none()
            if run:
                run.status = 'failed'
                run.error_message = str(e)
                await self.db.commit()
            raise

    async def _process_stock(self, stock, run, strat_pre, strat_rule, start_date, end_date):
        result = await self.db.execute(
            select(StockPriceDaily)
            .filter(StockPriceDaily.stock_id == stock.id, StockPriceDaily.date >= start_date, StockPriceDaily.date <= end_date)
            .order_by(StockPriceDaily.date)
        )
        prices = result.scalars().all()
        if not prices: return

        signals = []
        if strat_rule:
            signals = StrategyEngine.calculate_rule_based_strategy(prices, strat_rule.rules_json)
        elif strat_pre:
            if strat_pre.type == 'AUTO':
                 # In Django it fetched linked rule_based_strategy. Logic remains same.
                 pass
            elif strat_pre.code == 'DAILY_CLOSE_MOMENTUM':
                signals = StrategyEngine.calculate_one_day_trend(prices)
            elif strat_pre.code == 'TWO_DAY_CLOSE_MOMENTUM':
                signals = StrategyEngine.calculate_three_day_trend(prices)
            elif strat_pre.code == 'OVERSOLD_REVERSAL':
                signals = StrategyEngine.calculate_oversold_reversal(prices)

        price_map = {p.date: p for p in prices}
        prev_price_map = {prices[i].date: prices[i-1] for i in range(1, len(prices))}
        
        for sig in signals:
            sig_date = sig['date']
            if not (run.start_date <= sig_date <= run.end_date): continue
            
            actual = price_map.get(sig_date)
            prev = prev_price_map.get(sig_date)
            if not actual or not prev: continue
            
            expected_val = sig.get('expected_value')
            if expected_val is None or expected_val == 0: continue
            
            is_win = False
            a_close, p_close = float(actual.close_price), float(prev.close_price)
            a_change = a_close - p_close
            p_dir = sig['signal_direction']
            dir_match = (p_dir == 'UP' and a_change > 0) or (p_dir == 'DOWN' and a_change < 0)
            
            if run.criteria_type == 'direction':
                is_win = dir_match
            elif run.criteria_type == 'magnitude' and dir_match:
                p_val = float(expected_val)
                p_change = abs(p_val - p_close)
                if p_change == 0: is_win = True
                else:
                    threshold = run.magnitude_threshold / 100.0
                    is_win = abs(a_change) >= (threshold * p_change)
            
            self.stats['total_signals'] += 1
            if is_win: self.stats['win_count'] += 1
            else: self.stats['loss_count'] += 1
            
            self.results.append({
                'stock_symbol': stock.symbol,
                'signal_date': sig_date.strftime('%Y-%m-%d'),
                'signal': p_dir,
                'expected_price': float(expected_val),
                'actual_close': a_close,
                'prev_close': p_close,
                'result': 'WIN' if is_win else 'LOSS'
            })

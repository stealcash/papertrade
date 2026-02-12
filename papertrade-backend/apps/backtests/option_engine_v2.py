"""
Option Backtest Engine V2 - Uses new OptionBacktestRun and OptionTrade models.
This is wrapper around the existing logic but stores to the correct separate tables.
"""
import logging
from decimal import Decimal
from django.utils import timezone
from apps.stocks.models import StockPriceDaily
from apps.options.models import OptionDailyData
from django.conf import settings
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
        """
        Execute the backtest by delegating to FastAPI compute engine.
        """
        try:
            self.backtest_run.status = 'running'
            self.backtest_run.save()
            
            # Call FastAPI Service
            fastapi_url = settings.FASTAPI_SERVICE_URL
            secret = settings.INTERNAL_API_SECRET
            
            payload = {
                "run_id": self.backtest_run.id,
                "stock_ids": [] # Not used for index options, but keeping schema consistent
            }
            
            headers = {
                "X-Internal-Secret": secret
            }
            
            import requests
            response = requests.post(
                f"{fastapi_url}/compute/option-backtest",
                json=payload,
                headers=headers,
                timeout=5
            )
            response.raise_for_status()
            
            logger.info(f"Option Backtest {self.backtest_run.run_id} delegated to FastAPI successfully")
            
        except Exception as e:
            logger.error(f"Failed to delegate option backtest {self.backtest_run.run_id} to FastAPI: {str(e)}")
            self.backtest_run.status = 'failed'
            self.backtest_run.error_message = f"Delegation error: {str(e)}"
            self.backtest_run.save()
            raise
    
    
    # REMOVED: Old python-based implementation. 
    # All logic is now handled by FastAPI service via execute() above.

from django.db import models
from apps.users.models import User
from apps.stocks.models import Stock
from apps.sectors.models import Sector
from apps.strategies.models import StrategyMaster, StrategyRuleBased


class BacktestRun(models.Model):
    """Backtest run model storing results."""
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('running', 'Running'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]
    
    run_id = models.CharField(max_length=100, unique=True, db_index=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='backtest_runs')
    
    # Strategy reference (can be predefined, rule-based, or custom script)
    strategy_predefined = models.ForeignKey(StrategyMaster, on_delete=models.CASCADE, 
                                           null=True, blank=True)
    strategy_rule_based = models.ForeignKey(StrategyRuleBased, on_delete=models.CASCADE, 
                                           null=True, blank=True)
    strategy_custom_script = models.TextField(blank=True, help_text='Custom script (not persisted)')
    
    # Selection Mode
    SELECTION_MODE_CHOICES = [
        ('stock', 'Specific Stocks'),
        ('sector', 'Sector'),
        ('category', 'Category'),
        ('watchlist', 'My Watchlist'),
    ]
    selection_mode = models.CharField(max_length=20, choices=SELECTION_MODE_CHOICES, default='stock')
    selection_config = models.JSONField(default=dict, blank=True, help_text='IDs of selected stocks/sectors/categories')
    
    CRITERIA_TYPE_CHOICES = [
        ('direction', 'Direction Only (UP/DOWN)'),
        ('magnitude', 'Direction + Magnitude (50%)'),
    ]
    criteria_type = models.CharField(max_length=20, choices=CRITERIA_TYPE_CHOICES, default='direction')
    magnitude_threshold = models.IntegerField(default=50, help_text='Percentage verification threshold (0-100)')

    # PnL Configuration
    TRADE_STRATEGY_CHOICES = [
        ('re_entry', 'Active Trading (Re-Entry at Signal)'),
        ('buy_hold', 'Buy & Hold (First Signal to End)'),
    ]
    trade_strategy = models.CharField(max_length=20, choices=TRADE_STRATEGY_CHOICES, null=True, blank=True)
    
    # Backtest parameters
    start_date = models.DateField()
    end_date = models.DateField()
    initial_wallet_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    
    # Results (Accuracy Metrics)
    total_signals = models.IntegerField(default=0)
    win_count = models.IntegerField(default=0)
    loss_count = models.IntegerField(default=0)
    win_rate = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    
    # Detailed results
    list_of_trades_json = models.JSONField(default=list, blank=True) # Renamed conceptually to "predictions" but keeping field name for now
    equity_curve_json = models.JSONField(default=list, blank=True)
    
    # Deprecated / Legacy
    instrument_type = models.CharField(max_length=10, default='stock')
    instrument_identifier = models.CharField(max_length=100, default='')
    final_wallet_amount = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    total_pnl = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    pnl_percentage = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    number_of_trades = models.IntegerField(default=0)
    
    # Execution metadata
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    time_taken = models.FloatField(null=True, blank=True, help_text='Execution time in seconds')
    error_message = models.TextField(blank=True)
    
    extra = models.JSONField(default=dict, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'backtest_runs'
        verbose_name = 'Backtest Run'
        verbose_name_plural = 'Backtest Runs'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.run_id} - {self.user.email}"


class Trade(models.Model):
    """Individual trade record."""
    
    TRADE_TYPE_CHOICES = [
        ('long', 'Long'),
        ('short', 'Short'),
    ]
    
    INSTRUMENT_TYPE_CHOICES = [
        ('stock', 'Stock'),
        ('sector', 'Sector'),
        ('option', 'Option'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='trades')
    
    # Instrument references (nullable to support different instrument types)
    stock = models.ForeignKey(Stock, on_delete=models.SET_NULL, related_name='trades', 
                             null=True, blank=True)
    sector = models.ForeignKey(Sector, on_delete=models.SET_NULL, related_name='trades',
                              null=True, blank=True)
    
    # Multi-instrument support
    instrument_type = models.CharField(
        max_length=10,
        choices=INSTRUMENT_TYPE_CHOICES,
        default='stock',
        help_text='Type of instrument'
    )
    instrument_identifier = models.CharField(
        max_length=100,
        default='',
        help_text='Stock enum, sector enum, or option contract identifier'
    )
    
    # Legacy field for backward compatibility
    stock_enum = models.CharField(max_length=50, blank=True)
    
    buy_date = models.DateField()
    buy_price = models.DecimalField(max_digits=15, decimal_places=2)
    sell_date = models.DateField(null=True, blank=True)
    sell_price = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    quantity = models.IntegerField()
    trade_type = models.CharField(max_length=10, choices=TRADE_TYPE_CHOICES, default='long')
    pnl = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    
    strategy_id = models.CharField(max_length=100, blank=True)
    backtest_run = models.ForeignKey(BacktestRun, on_delete=models.CASCADE, 
                                    related_name='trades', null=True, blank=True)
    
    extra = models.JSONField(default=dict, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'trades'
        verbose_name = 'Trade'
        verbose_name_plural = 'Trades'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.stock_enum} - {self.buy_date}"

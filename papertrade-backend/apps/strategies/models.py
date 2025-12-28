from django.db import models
from apps.users.models import User


class StrategyMaster(models.Model):
    """Master table for all strategies (Predefined)."""
    
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('inactive', 'Inactive'),
    ]

    TYPE_CHOICES = [
        ('MANUAL', 'Manual'),
        ('AUTO', 'Auto'),
    ]
    
    code = models.CharField(max_length=50, unique=True, help_text='Unique code for the strategy (e.g., ONE_DAY_TREND)')
    name = models.CharField(max_length=200)
    description = models.TextField()
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_strategies')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')

    type = models.CharField(max_length=10, choices=TYPE_CHOICES, default='MANUAL')
    logic = models.TextField(blank=True, null=True, help_text="Strategy logic for AUTO type")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'strategies_master'
        verbose_name = 'Strategy Master'
        verbose_name_plural = 'Strategy Masters'
    
    def __str__(self):
        return f"{self.name} ({self.code})"


class StrategySignal(models.Model):
    """Generated signals for stocks based on strategies."""

    DIRECTION_CHOICES = [
        ('UP', 'UP'),
        ('DOWN', 'DOWN'),
    ]

    stock = models.ForeignKey('stocks.Stock', on_delete=models.CASCADE, related_name='strategy_signals')
    strategy = models.ForeignKey(StrategyMaster, on_delete=models.CASCADE, related_name='signals')
    date = models.DateField(db_index=True)
    
    signal_direction = models.CharField(max_length=10, choices=DIRECTION_CHOICES, null=True, blank=True)
    expected_value = models.DecimalField(max_digits=15, decimal_places=4, null=True, blank=True, help_text='Expected price or percentage')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'strategies_signal'
        unique_together = ['stock', 'strategy', 'date']
        indexes = [
            models.Index(fields=['stock', 'strategy', '-date']),
        ]
        verbose_name = 'Strategy Signal'
        verbose_name_plural = 'Strategy Signals'

    def __str__(self):
        return f"{self.stock.symbol} - {self.strategy.code} - {self.date}"


class StrategyRuleBased(models.Model):
    """User-created rule-based strategies."""
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='rule_strategies')
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    rules_json = models.JSONField(help_text='Strategy rules in JSON format')
    is_public = models.BooleanField(default=False, help_text='Share with community')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'strategies_rule_based'
        verbose_name = 'Rule-Based Strategy'
        verbose_name_plural = 'Rule-Based Strategies'
    
    def __str__(self):
        return f"{self.name} by {self.user.email}"

from django.db import models


class Option5Min(models.Model):
    """
    5-minute candle data for options contracts.
    Stores CE/PE premiums at 5-min resolution.
    """
    
    UNDERLYING_TYPE_CHOICES = [
        ('stock', 'Stock'),
        ('sector', 'Sector'),
    ]
    
    OPTION_TYPE_CHOICES = [
        ('CE', 'Call Option (CE)'),
        ('PE', 'Put Option (PE)'),
    ]
    
    underlying_type = models.CharField(
        max_length=10,
        choices=UNDERLYING_TYPE_CHOICES,
        help_text='Stock or Sector'
    )
    underlying_symbol = models.CharField(
        max_length=50,
        db_index=True,
        help_text='e.g. RELIANCE, NIFTY50'
    )
    expiry_date = models.DateField(
        db_index=True,
        help_text='Contract expiry date'
    )
    option_type = models.CharField(
        max_length=3,
        choices=OPTION_TYPE_CHOICES,
        help_text='CE or PE'
    )
    option_strike = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text='Strike price'
    )
    
    # 5-min candles for the day
    candles_json = models.JSONField(
        default=dict,
        help_text='5-min bars: {"09:15": {open, high, low, close, volume}, ...}'
    )
    
    extra = models.JSONField(default=dict, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'options_5min'
        verbose_name = 'Option 5-Minute Data'
        verbose_name_plural = 'Options 5-Minute Data'
        unique_together = [
            ('underlying_symbol', 'expiry_date', 'option_type', 'option_strike')
        ]
        indexes = [
            models.Index(fields=['underlying_symbol', 'expiry_date']),
            models.Index(fields=['expiry_date']),
        ]
        ordering = ['-expiry_date', 'option_strike']
    
    def __str__(self):
        return f"{self.underlying_symbol} {self.expiry_date} {self.option_type} {self.option_strike}"
    
    @property
    def contract_identifier(self):
        """Generate unique contract identifier"""
        return f"{self.underlying_symbol}-{self.expiry_date}-{self.option_type}-{self.option_strike}"

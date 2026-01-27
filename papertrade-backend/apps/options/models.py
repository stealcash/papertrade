from django.db import models


class OptionDailyData(models.Model):
    """
    Daily option data for each strike.
    Each row represents one strike on one trading date.
    Data sourced from NSE historical option chain.
    """
    
    OPTION_TYPE_CHOICES = [
        ('CE', 'Call Option'),
        ('PE', 'Put Option'),
    ]
    
    # Contract identifiers
    # contract 
    stock = models.ForeignKey(
        'stocks.Stock',
        on_delete=models.CASCADE,
        related_name='option_data',
        null=True,
        blank=True,
        db_index=True
    )
    
    underlying_symbol = models.CharField(
        max_length=50, 
        db_index=True,
        help_text='NIFTY, BANKNIFTY, etc.'
    )
    expiry_date = models.DateField(
        db_index=True,
        help_text='Contract expiry date'
    )
    strike_price = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        help_text='Strike price'
    )
    option_type = models.CharField(
        max_length=2,
        choices=OPTION_TYPE_CHOICES,
        help_text='CE (Call) or PE (Put)'
    )
    
    # Date for this particular data point
    date = models.DateField(
        db_index=True,
        help_text='Trading date for this record'
    )
    
    # Price data (OHLC)
    open_price = models.DecimalField(
        max_digits=15, 
        decimal_places=2, 
        null=True, 
        blank=True,
        help_text='Opening price'
    )
    high_price = models.DecimalField(
        max_digits=15, 
        decimal_places=2, 
        null=True, 
        blank=True,
        help_text='High price'
    )
    low_price = models.DecimalField(
        max_digits=15, 
        decimal_places=2, 
        null=True, 
        blank=True,
        help_text='Low price'
    )
    close_price = models.DecimalField(
        max_digits=15, 
        decimal_places=2, 
        null=True, 
        blank=True,
        help_text='Closing price'
    )
    ltp = models.DecimalField(
        max_digits=15, 
        decimal_places=2, 
        null=True, 
        blank=True,
        help_text='Last traded price'
    )
    
    # Additional price fields
    prev_close = models.DecimalField(
        max_digits=15, 
        decimal_places=2, 
        null=True, 
        blank=True,
        help_text='Previous day close'
    )
    settle_price = models.DecimalField(
        max_digits=15, 
        decimal_places=2, 
        null=True, 
        blank=True,
        help_text='Settlement price'
    )
    
    # Volume & OI
    volume = models.BigIntegerField(
        null=True, 
        blank=True,
        help_text='Total traded quantity'
    )
    traded_value = models.DecimalField(
        max_digits=20, 
        decimal_places=2, 
        null=True, 
        blank=True,
        help_text='Total traded value in lakhs'
    )
    open_interest = models.BigIntegerField(
        null=True, 
        blank=True,
        help_text='Open interest'
    )
    change_in_oi = models.BigIntegerField(
        null=True, 
        blank=True,
        help_text='Change in open interest'
    )
    
    # Underlying data
    underlying_value = models.DecimalField(
        max_digits=15, 
        decimal_places=2, 
        null=True, 
        blank=True,
        help_text='Spot price of underlying at close'
    )
    
    # Greeks/Calculated
    calculated_premium = models.DecimalField(
        max_digits=15, 
        decimal_places=2, 
        null=True, 
        blank=True,
        help_text='Calculated premium value'
    )
    
    # Metadata
    market_lot = models.IntegerField(
        default=25,
        help_text='Market lot size'
    )
    extra = models.JSONField(
        default=dict, 
        blank=True,
        help_text='Additional data from NSE or calculated fields'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'option_daily_data'
        verbose_name = 'Option Daily Data'
        verbose_name_plural = 'Option Daily Data'
        unique_together = [
            ('underlying_symbol', 'expiry_date', 'strike_price', 'option_type', 'date')
        ]
        indexes = [
            models.Index(fields=['stock', 'expiry_date', 'date']),
            models.Index(fields=['underlying_symbol', 'expiry_date', 'date']),
            models.Index(fields=['underlying_symbol', 'date']),
            models.Index(fields=['date']),
            models.Index(fields=['expiry_date']),
        ]
        ordering = ['-date', 'strike_price']
    
    def __str__(self):
        return f"{self.underlying_symbol} {self.strike_price} {self.option_type} Exp:{self.expiry_date} @ {self.date}"
    
    @property
    def contract_identifier(self):
        """Generate unique contract identifier"""
        return f"{self.underlying_symbol}-{self.expiry_date}-{self.option_type}-{self.strike_price}"

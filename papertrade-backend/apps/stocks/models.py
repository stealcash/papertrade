from django.db import models
from django.contrib.postgres.fields import ArrayField


class StockCategory(models.Model):
    """Stock category model (e.g., Large Cap, Mid Cap, IT, Banking)."""
    
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'stocks_category'
        verbose_name = 'Stock Category'
        verbose_name_plural = 'Stock Categories'
    
    def __str__(self):
        return self.name


class Stock(models.Model):
    """Stock master data model."""
    
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('inactive', 'Inactive'),
    ]
    
    symbol = models.CharField(max_length=50, unique=True, db_index=True)
    name = models.CharField(max_length=100, blank=True, default='')
    exchange_suffix = models.CharField(max_length=10, default='NSE')
    
    categories = models.ManyToManyField(StockCategory, related_name='stocks', blank=True)
    sectors = models.ManyToManyField('sectors.Sector', related_name='stocks', blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    
    last_synced_at = models.DateTimeField(null=True, blank=True)
    extra = models.JSONField(default=dict, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'stocks_stock'
        verbose_name = 'Stock'
        verbose_name_plural = 'Stocks'
        ordering = ['symbol']
    
    def __str__(self):
        return self.symbol


class StockPriceDaily(models.Model):
    """Daily stock price data (OHLCV + IV)."""
    
    stock = models.ForeignKey(Stock, on_delete=models.CASCADE, related_name='daily_prices')
    date = models.DateField(db_index=True)
    
    open_price = models.DecimalField(max_digits=15, decimal_places=2)
    high_price = models.DecimalField(max_digits=15, decimal_places=2)
    low_price = models.DecimalField(max_digits=15, decimal_places=2)
    close_price = models.DecimalField(max_digits=15, decimal_places=2)
    volume = models.BigIntegerField()
    iv = models.DecimalField(max_digits=10, decimal_places=4, null=True, blank=True, 
                            help_text='Implied Volatility')
    
    timewise_json = models.JSONField(null=True, blank=True, 
                                    help_text='Intraday timewise data if available')
    extra = models.JSONField(default=dict, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'stock_price_daily'
        unique_together = ['stock', 'date']
        ordering = ['-date']
        indexes = [
            models.Index(fields=['stock', '-date']),
        ]
    
    def __str__(self):
        return f"{self.stock.symbol} - {self.date}"


class Stock5MinByDay(models.Model):
    """5-minute candle data stored per day as JSON."""
    
    stock = models.ForeignKey(Stock, on_delete=models.CASCADE, related_name='intraday_candles')
    date = models.DateField(db_index=True)
    
    candles_json = models.JSONField(help_text='Map of time -> OHLCV data')
    extra = models.JSONField(default=dict, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'stock_5min_by_day'
        unique_together = ['stock', 'date']
        ordering = ['-date']
    
    def __str__(self):
        return f"{self.stock.symbol} - {self.date} (5min)"

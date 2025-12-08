from django.db import models


class Sector(models.Model):
    """Sector model (e.g., NIFTY50, BANKNIFTY, NIFTYIT)."""
    
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('inactive', 'Inactive'),
    ]
    
    enum = models.CharField(max_length=50, unique=True, db_index=True)
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    last_synced_at = models.DateTimeField(null=True, blank=True)
    extra = models.JSONField(default=dict, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'sectors_sector'
        verbose_name = 'Sector'
        verbose_name_plural = 'Sectors'
    
    def __str__(self):
        return f"{self.name} ({self.enum})"


class SectorPriceDaily(models.Model):
    """Daily sector price data."""
    
    sector = models.ForeignKey(Sector, on_delete=models.CASCADE, related_name='daily_prices')
    date = models.DateField(db_index=True)
    
    open_price = models.DecimalField(max_digits=15, decimal_places=2)
    high_price = models.DecimalField(max_digits=15, decimal_places=2)
    low_price = models.DecimalField(max_digits=15, decimal_places=2)
    close_price = models.DecimalField(max_digits=15, decimal_places=2)
    volume = models.BigIntegerField()
    iv = models.DecimalField(max_digits=10, decimal_places=4, null=True, blank=True)
    
    timewise_json = models.JSONField(null=True, blank=True)
    extra = models.JSONField(default=dict, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'sector_price_daily'
        unique_together = ['sector', 'date']
        ordering = ['-date']
    
    def __str__(self):
        return f"{self.sector.name} - {self.date}"

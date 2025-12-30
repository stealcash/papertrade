from django.db import models


class Sector(models.Model):
    """Sector model (e.g., NIFTY50, BANKNIFTY, NIFTYIT)."""
    
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('inactive', 'Inactive'),
    ]
    
    symbol = models.CharField(max_length=50, unique=True, db_index=True)
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
        return f"{self.name} ({self.symbol})"




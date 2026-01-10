from django.db import models
from django.conf import settings

class StockPrediction(models.Model):
    """
    Model to store user predictions for stock movements (Buy/Sell).
    Used to track 'paper' decisions without executing trades.
    """
    
    DIRECTION_CHOICES = [
        ('BUY', 'Buy'),
        ('SELL', 'Sell'),
    ]
    
    STATUS_CHOICES = [
        ('ACTIVE', 'Active'),
        ('ARCHIVED', 'Archived'),
    ]
    
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='predictions')
    stock = models.ForeignKey('stocks.Stock', on_delete=models.CASCADE, related_name='predictions')
    
    direction = models.CharField(max_length=4, choices=DIRECTION_CHOICES)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='ACTIVE')
    
    entry_price = models.DecimalField(max_digits=15, decimal_places=2, help_text="Price of stock at the time of prediction")
    description = models.TextField(blank=True, help_text="User's rationale for this prediction")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'predictions_stock_prediction'
        ordering = ['-created_at']
        verbose_name = 'Stock Prediction'
        verbose_name_plural = 'Stock Predictions'
        
    def __str__(self):
        return f"{self.user} - {self.stock.symbol} - {self.direction}"

from django.db import models
from django.conf import settings
from apps.stocks.models import Stock

class UserStock(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='watchlist')
    stock = models.ForeignKey(Stock, on_delete=models.CASCADE, related_name='watched_by')
    order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'watchlist_user_stock'
        ordering = ['order', 'created_at']
        unique_together = ['user', 'stock']

    def __str__(self):
        return f"{self.user.email} - {self.stock.symbol}"

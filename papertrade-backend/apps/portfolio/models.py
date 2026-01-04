from django.db import models
from django.conf import settings
from apps.stocks.models import Stock

class Portfolio(models.Model):
    """
    Represents the current holdings of a user for a specific stock.
    """
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='portfolio')
    stock = models.ForeignKey(Stock, on_delete=models.CASCADE, related_name='portfolios')
    quantity = models.IntegerField(default=0)
    average_buy_price = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'portfolio_portfolio'
        unique_together = ['user', 'stock']
        verbose_name = 'Portfolio'
        verbose_name_plural = 'Portfolios'

    def __str__(self):
        return f"{self.user.email} - {self.stock.symbol} ({self.quantity})"

    @property
    def invested_value(self):
        return self.quantity * self.average_buy_price


class Transaction(models.Model):
    """
    Records the history of buy/sell transactions.
    """
    TRANSACTION_TYPES = [
        ('BUY', 'Buy'),
        ('SELL', 'Sell'),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='transactions')
    stock = models.ForeignKey(Stock, on_delete=models.CASCADE, related_name='transactions')
    type = models.CharField(max_length=4, choices=TRANSACTION_TYPES)
    quantity = models.IntegerField()
    price = models.DecimalField(max_digits=15, decimal_places=2, help_text="Price per share at execution")
    amount = models.DecimalField(max_digits=15, decimal_places=2, help_text="Total value (qty * price)")
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'portfolio_transaction'
        ordering = ['-created_at']
        verbose_name = 'Transaction'
        verbose_name_plural = 'Transactions'

    def __str__(self):
        return f"{self.type} {self.stock.symbol} - {self.quantity} @ {self.price}"

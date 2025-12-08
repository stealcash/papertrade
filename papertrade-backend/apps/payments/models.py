from django.db import models
from apps.users.models import User


class PaymentRecord(models.Model):
    """Payment transaction records."""
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('success', 'Success'),
        ('failed', 'Failed'),
        ('refunded', 'Refunded'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='payments')
    payment_gateway = models.CharField(max_length=50)
    payment_id = models.CharField(max_length=200, unique=True)
    order_id = models.CharField(max_length=200)
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    currency = models.CharField(max_length=10, default='INR')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    extra = models.JSONField(default=dict, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'payment_records'
        verbose_name = 'Payment Record'
        verbose_name_plural = 'Payment Records'
    
    def __str__(self):
        return f"{self.payment_id} - {self.user.email}"

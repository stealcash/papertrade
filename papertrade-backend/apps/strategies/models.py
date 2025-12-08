from django.db import models
from apps.users.models import User


class StrategyPredefined(models.Model):
    """Predefined strategies created by admins."""
    
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('inactive', 'Inactive'),
    ]
    
    name = models.CharField(max_length=200)
    description = models.TextField()
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_strategies')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'strategies_predefined'
        verbose_name = 'Predefined Strategy'
        verbose_name_plural = 'Predefined Strategies'
    
    def __str__(self):
        return self.name


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

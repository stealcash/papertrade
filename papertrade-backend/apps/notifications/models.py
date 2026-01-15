from django.db import models
from apps.users.models import User


class Notification(models.Model):
    """In-app notification model."""
    
    TYPE_CHOICES = [
        ('info', 'Info'),
        ('success', 'Success'),
        ('warning', 'Warning'),
        ('error', 'Error'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    title = models.CharField(max_length=200)
    message = models.TextField()
    notification_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='info')
    is_read = models.BooleanField(default=False)
    extra = models.JSONField(default=dict, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    read_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'notifications'
        verbose_name = 'Notification'
        verbose_name_plural = 'Notifications'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.title} - {self.user.email}"


class BroadcastNotification(models.Model):
    """Notification sent to multiple users (All or per Plan)."""
    
    AUDIENCE_CHOICES = [
        ('all', 'All Users'),
        ('plan', 'Specific Plan'),
    ]
    
    TYPE_CHOICES = [
        ('info', 'Info'),
        ('success', 'Success'),
        ('warning', 'Warning'),
        ('error', 'Error'),
    ]
    
    title = models.CharField(max_length=200)
    message = models.TextField()
    notification_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='info')
    
    target_audience = models.CharField(max_length=20, choices=AUDIENCE_CHOICES, default='all')
    target_plan = models.ForeignKey('subscriptions.Plan', on_delete=models.SET_NULL, null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'notifications_broadcast'
        verbose_name = 'Broadcast Notification'
        verbose_name_plural = 'Broadcast Notifications'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.title} ({self.get_target_audience_display()})"

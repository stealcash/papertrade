from django.db import models
from apps.users.models import User


class SyncLog(models.Model):
    """Sync operation logs."""
    
    SYNC_TYPE_CHOICES = [
        ('stock', 'Stock'),
        ('sector', 'Sector'),
        ('option', 'Option'),
    ]
    
    SYNC_MODE_CHOICES = [
        ('normal', 'Normal Sync'),
        ('hard', 'Hard Sync'),
    ]
    
    sync_type = models.CharField(max_length=20, choices=SYNC_TYPE_CHOICES)
    mode = models.CharField(
        max_length=20,
        choices=SYNC_MODE_CHOICES,
        default='normal',
        help_text='Normal sync uses last_synced_at, Hard sync uses specific date range'
    )
    is_auto_sync = models.BooleanField(default=False)
    triggered_by_user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    
    start_time = models.DateTimeField()
    end_time = models.DateTimeField(null=True, blank=True)
    
    total_items = models.IntegerField(default=0)
    success_count = models.IntegerField(default=0)
    failed_count = models.IntegerField(default=0)
    error_details = models.JSONField(default=dict, blank=True)
    extra = models.JSONField(default=dict, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'sync_logs'
        verbose_name = 'Sync Log'
        verbose_name_plural = 'Sync Logs'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.sync_type} - {self.start_time}"




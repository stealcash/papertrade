from celery import shared_task
from django.utils import timezone
from datetime import timedelta
from .models import Notification, BroadcastNotification

@shared_task
def delete_old_notifications():
    """Delete notifications older than 30 days."""
    cutoff = timezone.now() - timedelta(days=30)
    
    deleted_personal, _ = Notification.objects.filter(created_at__lt=cutoff).delete()
    deleted_broadcast, _ = BroadcastNotification.objects.filter(created_at__lt=cutoff).delete()
    
    return f"Deleted {deleted_personal} personal and {deleted_broadcast} broadcast notifications older than 30 days."

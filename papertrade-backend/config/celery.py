"""
Celery configuration for PaperTrade project.
"""
import os
from celery import Celery
from celery.schedules import crontab

# Set default Django settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

app = Celery('papertrade')

# Load configuration from Django settings
app.config_from_object('django.conf:settings', namespace='CELERY')

# Auto-discover tasks from all installed apps
app.autodiscover_tasks()

# Celery Beat Schedule (for periodic tasks)
# Celery Beat Schedule (for periodic tasks)
# Note: This is evaluated at startup. Dynamic changes require restart.
try:
    from apps.adminpanel.utils import ConfigManager
    auto_sync_time = ConfigManager.get_auto_sync_time()
    hour, minute = map(int, auto_sync_time.split(':'))
except Exception:
    hour, minute = 3, 0  # Default fallback

app.conf.beat_schedule = {
    'auto-sync-daily': {
        'task': 'apps.sync.tasks.auto_sync_daily',
        'schedule': crontab(hour=hour, minute=minute),
    },
}

@app.task(bind=True)
def debug_task(self):
    print(f'Request: {self.request!r}')

from django.contrib import admin
from .models import SyncLog


@admin.register(SyncLog)
class SyncLogAdmin(admin.ModelAdmin):
    list_display = ['sync_type', 'is_auto_sync', 'start_time', 'success_count', 'failed_count']
    list_filter = ['sync_type', 'is_auto_sync']




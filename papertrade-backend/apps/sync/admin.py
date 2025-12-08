from django.contrib import admin
from .models import SyncLog, MarketStatus


@admin.register(SyncLog)
class SyncLogAdmin(admin.ModelAdmin):
    list_display = ['sync_type', 'is_auto_sync', 'start_time', 'success_count', 'failed_count']
    list_filter = ['sync_type', 'is_auto_sync']


@admin.register(MarketStatus)
class MarketStatusAdmin(admin.ModelAdmin):
    list_display = ['date', 'is_market_open', 'reason']
    list_filter = ['is_market_open']
    date_hierarchy = 'date'

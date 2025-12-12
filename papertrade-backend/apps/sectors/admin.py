from django.contrib import admin
from .models import Sector, SectorPriceDaily


@admin.register(Sector)
class SectorAdmin(admin.ModelAdmin):
    list_display = ['symbol', 'name', 'status', 'last_synced_at']
    list_filter = ['status']
    search_fields = ['symbol', 'name']


@admin.register(SectorPriceDaily)
class SectorPriceDailyAdmin(admin.ModelAdmin):
    list_display = ['sector', 'date', 'close_price', 'volume']
    list_filter = ['date']
    date_hierarchy = 'date'

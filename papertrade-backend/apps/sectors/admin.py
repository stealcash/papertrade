from django.contrib import admin
from .models import Sector, SectorPriceDaily


@admin.register(Sector)
class SectorAdmin(admin.ModelAdmin):
    list_display = ['name', 'enum', 'status', 'created_at']
    list_filter = ['status']
    search_fields = ['name', 'enum']


@admin.register(SectorPriceDaily)
class SectorPriceDailyAdmin(admin.ModelAdmin):
    list_display = ['sector', 'date', 'close_price', 'volume']
    list_filter = ['date']
    date_hierarchy = 'date'

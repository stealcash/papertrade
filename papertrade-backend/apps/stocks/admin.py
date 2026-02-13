from django.contrib import admin
from .models import Stock, StockCategory, StockPriceDaily


@admin.register(StockCategory)
class StockCategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'created_at']
    search_fields = ['name']


@admin.register(Stock)
class StockAdmin(admin.ModelAdmin):
    list_display = ['symbol', 'name', 'exchange_suffix', 'status', 'last_synced_at']
    list_filter = ['status', 'exchange_suffix']
    search_fields = ['symbol', 'name']
    filter_horizontal = ['categories']


@admin.register(StockPriceDaily)
class StockPriceDailyAdmin(admin.ModelAdmin):
    list_display = ['stock', 'date', 'open_price', 'close_price', 'volume']
    list_filter = ['date']
    search_fields = ['stock__symbol']
    date_hierarchy = 'date'




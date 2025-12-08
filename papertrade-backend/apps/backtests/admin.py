from django.contrib import admin
from .models import BacktestRun, Trade


@admin.register(BacktestRun)
class BacktestRunAdmin(admin.ModelAdmin):
    list_display = ['run_id', 'user', 'status', 'start_date', 'end_date', 'total_pnl', 'created_at']
    list_filter = ['status', 'created_at']
    search_fields = ['run_id', 'user__email']


@admin.register(Trade)
class TradeAdmin(admin.ModelAdmin):
    list_display = ['stock_enum', 'user', 'buy_date', 'sell_date', 'pnl', 'created_at']
    list_filter = ['trade_type', 'created_at']
    search_fields = ['stock_enum', 'user__email']

from django.contrib import admin
from .models import StrategyMaster, StrategySignal, StrategyRuleBased


@admin.register(StrategyMaster)
class StrategyMasterAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'created_by', 'status', 'created_at']
    list_filter = ['status', 'created_by']


@admin.register(StrategySignal)
class StrategySignalAdmin(admin.ModelAdmin):
    list_display = ('stock', 'strategy', 'date', 'signal_direction', 'expected_value')
    list_filter = ('strategy', 'signal_direction', 'date')
    search_fields = ('stock__symbol', 'strategy__code')


@admin.register(StrategyRuleBased)
class StrategyRuleBasedAdmin(admin.ModelAdmin):
    list_display = ['name', 'user', 'is_public', 'created_at']
    list_filter = ['is_public']

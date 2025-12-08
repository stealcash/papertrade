from django.contrib import admin
from .models import StrategyPredefined, StrategyRuleBased


@admin.register(StrategyPredefined)
class StrategyPredefinedAdmin(admin.ModelAdmin):
    list_display = ['name', 'created_by', 'status', 'created_at']
    list_filter = ['status']


@admin.register(StrategyRuleBased)
class StrategyRuleBasedAdmin(admin.ModelAdmin):
    list_display = ['name', 'user', 'is_public', 'created_at']
    list_filter = ['is_public']

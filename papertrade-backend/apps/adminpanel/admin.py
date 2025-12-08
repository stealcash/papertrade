from django.contrib import admin
from .models import SystemConfig, AdminActivityLog


@admin.register(SystemConfig)
class SystemConfigAdmin(admin.ModelAdmin):
    list_display = ['key', 'description', 'updated_at']
    search_fields = ['key', 'description']


@admin.register(AdminActivityLog)
class AdminActivityLogAdmin(admin.ModelAdmin):
    list_display = ['action', 'admin_user', 'created_at']
    list_filter = ['created_at']
    search_fields = ['action', 'description']

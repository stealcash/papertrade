from django.contrib import admin
from .models import User, Permission, RolePermission


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ['email', 'role', 'is_active', 'wallet_balance', 'created_at']
    list_filter = ['role', 'is_active']
    search_fields = ['email', 'mobile']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(Permission)
class PermissionAdmin(admin.ModelAdmin):
    list_display = ['code', 'name', 'category', 'created_at']
    list_filter = ['category']
    search_fields = ['code', 'name']


@admin.register(RolePermission)
class RolePermissionAdmin(admin.ModelAdmin):
    list_display = ['role', 'permission', 'created_at']
    list_filter = ['role']

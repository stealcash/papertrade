from django.contrib import admin
from .models import Option5Min


@admin.register(Option5Min)
class Option5MinAdmin(admin.ModelAdmin):
    list_display = ['underlying_symbol', 'expiry_date', 'option_type', 'option_strike', 'underlying_type', 'created_at']
    list_filter = ['underlying_type', 'option_type', 'expiry_date']
    search_fields = ['underlying_symbol']
    readonly_fields = ['created_at', 'updated_at']
    ordering = ['-expiry_date', 'option_strike']
    
    fieldsets = [
        ('Contract Details', {
            'fields': ('underlying_type', 'underlying_symbol', 'expiry_date', 'option_type', 'option_strike')
        }),
        ('Price Data', {
            'fields': ('candles_json',)
        }),
        ('Metadata', {
            'fields': ('extra', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    ]

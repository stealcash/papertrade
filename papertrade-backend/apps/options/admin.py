from django.contrib import admin
from .models import OptionDailyData


@admin.register(OptionDailyData)
class OptionDailyDataAdmin(admin.ModelAdmin):
    list_display = [
        'underlying_symbol', 'strike_price', 'option_type', 
        'expiry_date', 'date', 'close_price', 'volume', 
        'open_interest'
    ]
    list_filter = ['underlying_symbol', 'option_type', 'expiry_date', 'date']
    search_fields = ['underlying_symbol']
    readonly_fields = ['created_at', 'updated_at']
    ordering = ['-date', 'strike_price']
    date_hierarchy = 'date'
    
    fieldsets = [
        ('Contract Details', {
            'fields': ('underlying_symbol', 'expiry_date', 'strike_price', 'option_type', 'date')
        }),
        ('Price Data (OHLC)', {
            'fields': ('open_price', 'high_price', 'low_price', 'close_price', 'ltp', 'prev_close', 'settle_price')
        }),
        ('Volume & Open Interest', {
            'fields': ('volume', 'traded_value', 'open_interest', 'change_in_oi')
        }),
        ('Underlying & Calculated', {
            'fields': ('underlying_value', 'calculated_premium', 'market_lot')
        }),
        ('Metadata', {
            'fields': ('extra', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    ]

import os
import django
from datetime import date

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.backtests.models import OptionDailyData

def check_data():
    symbol = 'NIFTY'
    start = date(2026, 1, 1)
    end = date(2026, 1, 31)
    
    count = OptionDailyData.objects.filter(
        underlying_symbol=symbol,
        date__range=[start, end]
    ).count()
    
    print(f"OptionDailyData count for {symbol} in Jan 2026: {count}")
    
    if count > 0:
        first = OptionDailyData.objects.filter(
            underlying_symbol=symbol,
            date__range=[start, end]
        ).order_by('date').first()
        print(f"First data point date: {first.date}")
        
    # Check expiries
    expiries = OptionDailyData.objects.filter(
        underlying_symbol=symbol,
        expiry_date__gte=start
    ).values_list('expiry_date', flat=True).distinct().order_by('expiry_date')[:10]
    
    print(f"Upcoming expiries: {list(expiries)}")

if __name__ == "__main__":
    check_data()

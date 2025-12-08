import os
import django
import requests
import datetime
from django.conf import settings

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.stocks.models import Stock, StockPriceDaily

def debug_sync():
    print("Starting debug sync...")
    
    # 1. Get a stock
    try:
        stock = Stock.objects.get(symbol='RELIANCE')
        print(f"Found stock: {stock.symbol} (Enum: {stock.enum})")
    except Stock.DoesNotExist:
        print("RELIANCE stock not found!")
        return

    # 2. Define params
    date_str = '2025-12-07'
    current_date = datetime.datetime.strptime(date_str, '%Y-%m-%d').date()
    
    url = f"http://localhost:8080/api/v1/stock/data"
    params = {
        'stock_enum': stock.enum,
        'date': date_str,
        'timewise': 'true'
    }
    headers = {'X-API-KEY': 'shared-secret-for-go-service-change-this'}
    
    # 3. Call Go Service
    print(f"Calling Go Service: {url} with params {params}")
    try:
        response = requests.get(url, params=params, headers=headers, timeout=10)
        print(f"Response Status: {response.status_code}")
    except Exception as e:
        print(f"Request failed: {e}")
        return

    if response.status_code != 200:
        print(f"Error response: {response.text}")
        return

    data = response.json().get('data')
    if not data:
        print("No data in response!")
        return
        
    print(f"Data received. Open Price: {data.get('open_price')}")

    # 4. Try Saving to DB
    print("Attempting to save to DB...")
    try:
        obj, created = StockPriceDaily.objects.update_or_create(
            stock=stock,
            date=current_date,
            defaults={
                'open_price': data['open_price'],
                'high_price': data['high_price'],
                'low_price': data['low_price'],
                'close_price': data['close_price'],
                'volume': data['volume'],
                'iv': data.get('iv'),
                'extra': data.get('extra', {}),
            }
        )
        print(f"Success! Object created? {created}. ID: {obj.id}")
        
    except Exception as e:
        print(f"DB Save Failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    debug_sync()

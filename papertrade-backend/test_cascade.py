import os
import django
from django.conf import settings

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.stocks.models import Stock, StockPriceDaily
import datetime

def test_cascade():
    print("Testing Cascade Deletion...")
    
    # 1. Create Dummy Stock
    stock_symbol = "TEST_CASCADE_STOCK"
    try:
        stock = Stock.objects.create(
            enum=stock_symbol,
            symbol=stock_symbol,
            full_symbol="Test Stock for Cascade"
        )
        print(f"Created Stock: {stock.id}")
    except Exception as e:
        print(f"Failed to create stock: {e}")
        return

    # 2. Create Dummy Price
    try:
        price = StockPriceDaily.objects.create(
            stock=stock,
            date=datetime.date(2025, 1, 1),
            open_price=100,
            high_price=110,
            low_price=90,
            close_price=105,
            volume=1000
        )
        print(f"Created Price: {price.id}")
    except Exception as e:
        print(f"Failed to create price: {e}")
        stock.delete()
        return

    # 3. Verify Existence
    if not StockPriceDaily.objects.filter(stock=stock).exists():
        print("Error: Price not found matching stock!")
        stock.delete()
        return

    # 4. Delete Stock
    print("Deleting Stock...")
    stock.delete()
    
    # 5. Check if Price is gone
    if StockPriceDaily.objects.filter(id=price.id).exists():
        print("❌ FAILURE: StockPriceDaily record STILL EXISTS after Stock deletion.")
        print("Cascade delete is NOT working.")
        # Cleanup
        StockPriceDaily.objects.filter(id=price.id).delete()
    else:
        print("✅ SUCCESS: StockPriceDaily record was deleted automatically.")
        print("Cascade delete IS working.")

if __name__ == "__main__":
    test_cascade()

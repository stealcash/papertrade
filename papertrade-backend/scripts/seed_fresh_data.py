import os
import sys
import django
from django.utils import timezone
from decimal import Decimal

# Add project root to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def seed():
    # Setup Django
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
    django.setup()

    from django.contrib.auth import get_user_model
    User = get_user_model()
    from apps.stocks.models import Stock, StockCategory
    from apps.sectors.models import Sector

    print("Seeding data...")

    # 1. Create Superadmin
    if not User.objects.filter(email="superadmin@example.com").exists():
        User.objects.create_superuser(
            email="superadmin@example.com",
            password="password123",
            mobile="1234567890"
        )
        print("Created Superadmin: superadmin@example.com / password123")
    
    # 2. Create Regular User
    if not User.objects.filter(email="user@example.com").exists():
        User.objects.create_user(
            email="user@example.com",
            password="password123",
            role="user",
            mobile="9876543210"
        )
        print("Created User: user@example.com / password123")

    # 3. Create Sectors
    it_sector, _ = Sector.objects.get_or_create(
        symbol="NIFTY IT",
        defaults={
            "name": "IT Services",
            "description": "Information Technology Services"
        }
    )
    print(f"Created/Get Sector: {it_sector.name}")

    banking_sector, _ = Sector.objects.get_or_create(
        symbol="BANKNIFTY",
        defaults={
            "name": "Banking", 
            "description": "Banking and Financial Services"
        }
    )
    print(f"Created/Get Sector: {banking_sector.name}")

    # 4. Create Stock Categories
    large_cap, _ = StockCategory.objects.get_or_create(
        name="Large Cap",
        defaults={"description": "Top 100 companies by market capitalization"}
    )
    print(f"Created/Get Category: {large_cap.name}")

    # 5. Create Stocks
    if not Stock.objects.filter(symbol="RELIANCE").exists():
        Stock.objects.create(
            symbol="RELIANCE",
            name="Reliance Industries Ltd",
            exchange_suffix="NSE",
            status="active"
        )
        print("Created Stock: RELIANCE")
    
    if not Stock.objects.filter(symbol="TCS").exists():
        tcs = Stock.objects.create(
            symbol="TCS",
            name="Tata Consultancy Services",
            exchange_suffix="NSE",
            status="active"
        )
        tcs.sectors.add(it_sector)
        tcs.categories.add(large_cap)
        print("Created Stock: TCS")

    if not Stock.objects.filter(symbol="HDFCBANK").exists():
        hdfc = Stock.objects.create(
            symbol="HDFCBANK",
            name="HDFC Bank Ltd",
            exchange_suffix="NSE",
            status="active"
        )
        hdfc.sectors.add(banking_sector)
        hdfc.categories.add(large_cap)
        print("Created Stock: HDFCBANK")

    print("Seeding complete.")

if __name__ == "__main__":
    seed()

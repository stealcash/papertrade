import os
import django
from django.conf import settings

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.sectors.models import Sector, SectorPriceDaily
import datetime

def test_cascade_sector():
    print("Testing Sector Cascade Deletion...")
    
    # 1. Create Dummy Sector
    sector_enum = "TEST_CASCADE_SECTOR"
    try:
        sector = Sector.objects.create(
            enum=sector_enum,
            name="Test Sector for Cascade"
        )
        print(f"Created Sector: {sector.id}")
    except Exception as e:
        print(f"Failed to create sector: {e}")
        return

    # 2. Create Dummy Price
    try:
        price = SectorPriceDaily.objects.create(
            sector=sector,
            date=datetime.date(2025, 1, 1),
            open_price=10000,
            high_price=11000,
            low_price=9000,
            close_price=10500,
            volume=500000
        )
        print(f"Created Sector Price: {price.id}")
    except Exception as e:
        print(f"Failed to create price: {e}")
        sector.delete()
        return

    # 3. Verify Existence
    if not SectorPriceDaily.objects.filter(sector=sector).exists():
        print("Error: Price not found matching sector!")
        sector.delete()
        return

    # 4. Delete Sector
    print("Deleting Sector...")
    sector.delete()
    
    # 5. Check if Price is gone
    if SectorPriceDaily.objects.filter(id=price.id).exists():
        print("❌ FAILURE: SectorPriceDaily record STILL EXISTS after Sector deletion.")
        print("Cascade delete is NOT working.")
        # Cleanup
        SectorPriceDaily.objects.filter(id=price.id).delete()
    else:
        print("✅ SUCCESS: SectorPriceDaily record was deleted automatically.")
        print("Cascade delete IS working.")

if __name__ == "__main__":
    test_cascade_sector()

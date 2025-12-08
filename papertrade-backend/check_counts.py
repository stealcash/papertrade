import os
import django
import sys

# Add the project directory to the sys.path
sys.path.append('/Users/chat360team/Documents/papertrade/papertrade-backend')

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.users.models import User
from apps.stocks.models import Stock
from apps.sectors.models import Sector
from apps.backtests.models import BacktestRun

print(f"Total Users: {User.objects.count()}")
print(f"Total Stocks: {Stock.objects.count()}")
print(f"Total Sectors: {Sector.objects.count()}")
print(f"Total Backtests: {BacktestRun.objects.count()}")

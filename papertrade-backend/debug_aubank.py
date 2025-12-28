import os
import django
import sys
from datetime import date

# Setup Django
sys.path.append('/Users/chat360team/Documents/papertrade/papertrade-backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.stocks.models import Stock, StockPriceDaily
from apps.strategies.logic import StrategyEngine
from decimal import Decimal

# Find AUBANK
stocks = Stock.objects.filter(symbol__icontains='AUBANK')
if not stocks.exists():
    print("AUBANK not found in Stock table.")
    sys.exit()

stock = stocks.first()
print(f"Stock: {stock.symbol} (ID: {stock.id})")

# Check Prices
start_date = date(2025, 12, 16)
end_date = date(2025, 12, 28)
fetch_start = date(2025, 11, 16) # 30 days prior

prices = list(StockPriceDaily.objects.filter(
    stock=stock, 
    date__gte=fetch_start, 
    date__lte=end_date
).order_by('date'))

print(f"Total Price Records (Nov 16 - Dec 28): {len(prices)}")
for p in prices:
    if p.date >= start_date:
        print(f"  {p.date}: Close={p.close_price}")

if not prices:
    print("No prices found.")
    sys.exit()

# Actual Strategy 6 Logic
rules_json = {
  "strategy_blocks": [
    {
      "rules": [
        {
          "field": "CLOSE_PCT_CHANGE_0",
          "value": ".1",
          "operator": "gt"
        }
      ],
      "action": "BUY",
      "output_percentage": 3
    }
  ]
}

print("\n--- Running Strategy Simulation ---")
try:
    signals = StrategyEngine.calculate_rule_based_strategy(prices, rules_json)
    print(f"Generated Signals: {len(signals)}")
    for s in signals:
        print(f"  Signal Date: {s['date']}")
        print(f"  Direction: {s['signal_direction']}")
        print(f"  Expected Value: {s.get('expected_value')}")
        
        if start_date <= s['date'] <= end_date:
            print("    -> IN BACKTEST RANGE")
        else:
            print("    -> OUT OF RANGE")
except Exception as e:
    print(f"Error executing strategy: {e}")
    import traceback
    traceback.print_exc()

import os
import django
import sys
import json

sys.path.append('/Users/chat360team/Documents/papertrade/papertrade-backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.strategies.models import StrategyRuleBased
try:
    s = StrategyRuleBased.objects.get(id=6)
    print(f"Strategy 6: {s.name}")
    print(json.dumps(s.rules_json, indent=2))
except StrategyRuleBased.DoesNotExist:
    print("Strategy 6 not found")

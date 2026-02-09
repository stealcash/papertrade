import os
import django
import sys

# Setup Django Environment
sys.path.append('/Users/chat360team/Documents/papertrade/papertrade-backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.strategies.models import OptionStrategy

strategies = [
    {
        "name": "Long Straddle (ATM)",
        "description": "Buy both CE and PE at the money. Profitable on large moves in either direction.",
        "configuration": {
            "legs": [
                {
                    "type": "CE",
                    "action": "BUY",
                    "entry": {"price_ref": "CLOSE", "strike_criteria": "ATM", "strike_offset": 0, "time_to_expiry": "0"},
                    "exit": {"type": "EXPIRY_CLOSE"}
                },
                {
                    "type": "PE",
                    "action": "BUY",
                    "entry": {"price_ref": "CLOSE", "strike_criteria": "ATM", "strike_offset": 0, "time_to_expiry": "0"},
                    "exit": {"type": "EXPIRY_CLOSE"}
                }
            ]
        }
    },
    {
        "name": "Short Straddle (ATM)",
        "description": "Sell both CE and PE at the money. Profitable if market stays sideways.",
        "configuration": {
            "legs": [
                {
                    "type": "CE",
                    "action": "SELL",
                    "entry": {"price_ref": "CLOSE", "strike_criteria": "ATM", "strike_offset": 0, "time_to_expiry": "0"},
                    "exit": {"type": "EXPIRY_CLOSE"}
                },
                {
                    "type": "PE",
                    "action": "SELL",
                    "entry": {"price_ref": "CLOSE", "strike_criteria": "ATM", "strike_offset": 0, "time_to_expiry": "0"},
                    "exit": {"type": "EXPIRY_CLOSE"}
                }
            ]
        }
    },
     {
        "name": "Bull Call Spread",
        "description": "Buy ATM CE, Sell OTM CE. Limits profit but reduces cost.",
        "configuration": {
            "legs": [
                {
                    "type": "CE",
                    "action": "BUY",
                    "entry": {"price_ref": "CLOSE", "strike_criteria": "ATM", "strike_offset": 0, "time_to_expiry": "0"},
                    "exit": {"type": "EXPIRY_CLOSE"}
                },
                {
                    "type": "CE",
                    "action": "SELL",
                    "entry": {"price_ref": "CLOSE", "strike_criteria": "ATM_PLUS_PCT", "strike_offset": 2.0, "time_to_expiry": "0"},
                    "exit": {"type": "EXPIRY_CLOSE"}
                }
            ]
        }
    }
]

for s in strategies:
    obj, created = OptionStrategy.objects.get_or_create(
        name=s['name'],
        defaults={
            'description': s['description'],
            'configuration': s['configuration'],
            'is_system': True
        }
    )
    if created:
        print(f"Created: {s['name']}")
    else:
        print(f"Exists: {s['name']}")

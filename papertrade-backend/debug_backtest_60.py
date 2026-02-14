import os
import django
import json
from decimal import Decimal

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.backtests.models import OptionBacktestRun

def debug_run(run_id):
    try:
        run = OptionBacktestRun.objects.get(id=run_id)
        print(f"Run ID: {run.id}")
        print(f"Status: {run.status}")
        print(f"Strategy Name: {run.snapshot_name or run.strategy.name}")
        print(f"Underlying: {run.underlying_symbol}")
        print(f"Start Date: {run.start_date}")
        print(f"End Date: {run.end_date}")
        print(f"Error Message: {run.error_message}")
        
        print("\nSnapshot Config (Entry):")
        if run.snapshot_config:
            print(json.dumps(run.snapshot_config.get('entry', {}), indent=2))
        else:
            print("No snapshot config found.")
        
        print("\nResults Summary:")
        print(json.dumps(run.results_summary_json, indent=2))
        
        # Check trades count
        from apps.backtests.models import OptionTrade
        trades_count = OptionTrade.objects.filter(backtest_run=run).count()
        print(f"\nTrades Count: {trades_count}")
        
    except OptionBacktestRun.DoesNotExist:
        print(f"Run {run_id} not found.")

if __name__ == "__main__":
    debug_run(64)
    debug_run(65)

import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.backtests.models import OptionBacktestRun

def list_runs():
    runs = OptionBacktestRun.objects.all().order_by('-id')[:5]
    for run in runs:
        print(f"ID: {run.id} | Status: {run.status} | Underlying: {run.underlying_symbol} | Created: {run.created_at}")
        if run.snapshot_config:
            entry = run.snapshot_config.get('entry', {})
            print(f"  Entry: {entry}")

if __name__ == "__main__":
    list_runs()

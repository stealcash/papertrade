import os
import sys
import django

# Add the project root to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.backtests.models import OptionBacktestRun, OptionTrade

def update_backtest_data_v2():
    runs = OptionBacktestRun.objects.all()
    print(f"Found {runs.count()} backtest runs to update logic.")
    
    for run in runs:
        print(f"Updating Run {run.id} ({run.run_id})...")
        trades = OptionTrade.objects.filter(backtest_run=run)
        
        buy_points = 0.0
        sell_points = 0.0
        
        for trade in trades:
            for leg in trade.legs_json:
                entry = float(leg.get('entry', 0))
                exit = float(leg.get('exit', 0))
                action = leg.get('action', 'BUY')
                
                if action == 'BUY':
                    # Entry is a Buy transaction
                    buy_points += entry
                    # Exit is a Sell transaction
                    sell_points += exit
                else:
                    # Entry is a Sell transaction
                    sell_points += entry
                    # Exit is a Buy transaction
                    buy_points += exit
        
        summary = run.results_summary_json or {}
        summary['total_buy_points'] = round(buy_points, 2)
        summary['total_sell_points'] = round(sell_points, 2)
        
        run.results_summary_json = summary
        run.save()
        print(f"  Result: Buy Points: {summary['total_buy_points']}, Sell Points: {summary['total_sell_points']}")

if __name__ == "__main__":
    update_backtest_data_v2()

from django.core.management.base import BaseCommand
from apps.strategies.models import StrategyMaster

class Command(BaseCommand):
    help = 'Seeds initial strategies'

    def handle(self, *args, **kwargs):
        strategies = [
            {
                'code': 'DAILY_CLOSE_MOMENTUM',
                'name': 'One-Day Close Price Trend',
                'description': 'If today > yesterday -> UP with expected val = diff. If today < yesterday -> DOWN.'
            },
            {
                'code': 'TWO_DAY_CLOSE_MOMENTUM',
                'name': 'Three-Day Trend Average',
                'description': 'If Up > Up > Up -> UP. If Down > Down > Down -> DOWN. Else NULL.'
            },
            {
                'code': 'OVERSOLD_REVERSAL',
                'name': 'Oversold Reversal (20% Drop)',
                'description': 'Reversal signal after a 20% drop in 10 sessions with 5+ red candles. SL: 5%, Target: 5%.'
            }
        ]
        
        for strat in strategies:
            obj, created = StrategyMaster.objects.get_or_create(
                code=strat['code'],
                defaults={
                    'name': strat['name'],
                    'description': strat['description']
                }
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f'Created strategy: {strat["name"]}'))
            else:
                self.stdout.write(self.style.WARNING(f'Strategy already exists: {strat["name"]}'))

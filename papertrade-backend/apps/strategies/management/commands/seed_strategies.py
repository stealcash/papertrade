from django.core.management.base import BaseCommand
from apps.strategies.models import StrategyMaster

class Command(BaseCommand):
    help = 'Seeds initial strategies'

    def handle(self, *args, **kwargs):
        strategies = [
            {
                'code': 'ONE_DAY_TREND',
                'name': 'One-Day Close Price Trend',
                'description': 'If today > yesterday -> UP with expected val = diff. If today < yesterday -> DOWN.'
            },
            {
                'code': 'THREE_DAY_TREND',
                'name': 'Three-Day Trend Average',
                'description': 'If Up > Up > Up -> UP. If Down > Down > Down -> DOWN. Else NULL.'
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

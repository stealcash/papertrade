from django.core.management.base import BaseCommand
from apps.subscriptions.models import Plan

class Command(BaseCommand):
    help = 'Seed default subscription plans and features'

    def handle(self, *args, **kwargs):
        self.stdout.write('Seeding plans and features...')

        # Define Plans
        plans = [
            {
                'name': 'Trial',
                'description': 'Free trial for new users (30 days)',
                'priority': 0,
                'monthly_price': 0,
                'yearly_price': 0,
                'features': {
                    'STRATEGY_CREATE': {'enabled': True, 'limit': 1, 'period_days': 30},
                    'BACKTEST_RUN': {'enabled': True, 'limit': 5, 'period_days': 30},
                    'TRADE_EXECUTE': {'enabled': True, 'limit': 10, 'period_days': 30}
                }
            },
            {
                'name': 'Silver',
                'description': 'Basic plan for beginners',
                'priority': 1,
                'monthly_price': 499,
                'yearly_price': 4999,
                'features': {
                    'STRATEGY_CREATE': {'enabled': True, 'limit': 5, 'period_days': 30},
                    'BACKTEST_RUN': {'enabled': True, 'limit': 20, 'period_days': 30},
                    'TRADE_EXECUTE': {'enabled': True, 'limit': 50, 'period_days': 30}
                }
            },
            {
                'name': 'Gold',
                'description': 'For serious traders',
                'priority': 2,
                'monthly_price': 999,
                'yearly_price': 9999,
                'features': {
                    'STRATEGY_CREATE': {'enabled': True, 'limit': 20, 'period_days': 30},
                    'BACKTEST_RUN': {'enabled': True, 'limit': 100, 'period_days': 30},
                    'TRADE_EXECUTE': {'enabled': True, 'limit': 200, 'period_days': 30}
                }
            },
            {
                'name': 'Platinum',
                'description': 'Unlimited access',
                'priority': 3,
                'monthly_price': 1999,
                'yearly_price': 19999,
                'features': {
                    'STRATEGY_CREATE': {'enabled': True, 'limit': -1, 'period_days': 30},
                    'BACKTEST_RUN': {'enabled': True, 'limit': -1, 'period_days': 30},
                    'TRADE_EXECUTE': {'enabled': True, 'limit': -1, 'period_days': 30}
                }
            }
        ]
        
        for p_data in plans:
            plan, created = Plan.objects.get_or_create(
                slug=p_data['name'].lower(),
                defaults={
                    'name': p_data['name'],
                    'description': p_data['description'],
                    'monthly_price': p_data['monthly_price'],
                    'yearly_price': p_data['yearly_price'],
                    'is_active': True
                }
            )
            
            if created:
                self.stdout.write(self.style.SUCCESS(f'Created plan: {plan.name}'))
            else:
                # Update existing
                plan.monthly_price = p_data['monthly_price']
                plan.yearly_price = p_data['yearly_price']
                plan.description = p_data['description']
                plan.features = p_data['features'] # Update JSON features
                plan.priority = p_data['priority']
                plan.save()
                self.stdout.write(self.style.SUCCESS(f'Updated plan: {plan.name}'))

        self.stdout.write(self.style.SUCCESS('Successfully seeded subscriptions data'))

from django.core.management.base import BaseCommand
from apps.adminpanel.models import SystemConfig


class Command(BaseCommand):
    help = 'Seed default systemconfig keys as per master prompt requirements'

    def handle(self, *args, **options):
        """Seed all required systemconfig keys with default values."""
        
        configs = {
            # Backtest Configuration
            'backtest.max_concurrent_per_user': {
                'value': '3',
                'description': 'Maximum concurrent backtests allowed per user',
                'is_public': False
            },
            'backtest.global_max_concurrent': {
                'value': '10',
                'description': 'Global maximum concurrent backtests across all users',
                'is_public': False
            },
            
            # Options Configuration
            'options.strike_interval': {
                'value': '50',
                'description': 'Strike price interval for option contract generation',
                'is_public': True
            },
            'options.atm_levels': {
                'value': '5',
                'description': 'Number of ATM levels above and below current price',
                'is_public': True
            },
            'options.expiry_mode': {
                'value': 'auto_squareoff',
                'description': 'Option expiry behavior: auto_squareoff or manual',
                'is_public': True
            },
            
            # Historical Data Configuration
            'history.start_date': {
                'value': '2023-01-01',
                'description': 'Earliest date for historical data sync',
                'is_public': True
            },
            
            # Sync Configuration
            'sync.allowed_roles': {
                'value': 'admin,superadmin',
                'description': 'Roles allowed to trigger manual sync (comma-separated)',
                'is_public': False
            },
            'sync.schedule.cron': {
                'value': '0 3 * * *',
                'description': 'Cron expression for auto sync schedule (3 AM IST daily)',
                'is_public': False
            },
            
            # Admin Feature Toggles
            'admin.can_manage_stocks': {
                'value': 'true',
                'description': 'Allow admins to create/update/delete stocks',
                'is_public': False
            },
            'admin.can_manage_sectors': {
                'value': 'true',
                'description': 'Allow admins to create/update/delete sectors',
                'is_public': False
            },
            'admin.can_trigger_hard_sync': {
                'value': 'false',
                'description': 'Allow admins (non-superadmin) to trigger hard sync',
                'is_public': False
            },
            
            # Subscription Configuration
            'subscription.enabled': {
                'value': 'true',
                'description': 'Enable subscription requirement after trial',
                'is_public': True
            },
            'subscription.monthly_price': {
                'value': '999',
                'description': 'Monthly subscription price in INR',
                'is_public': True
            },
            'subscription.yearly_price': {
                'value': '9999',
                'description': 'Yearly subscription price in INR',
                'is_public': True
            },
            
            # Wallet Configuration
            'wallet.default_amount': {
                'value': '100000',
                'description': 'Default wallet balance for new users',
                'is_public': True
            },
            'wallet.refill_unlimited': {
                'value': 'true',
                'description': 'Allow unlimited wallet refills',
                'is_public': True
            },
            
            # Rate Limiting
            'ratelimit.requests_per_minute': {
                'value': '100',
                'description': 'API requests allowed per user per minute',
                'is_public': False
            },
        }
        
        created_count = 0
        updated_count = 0
        
        for key, config_data in configs.items():
            obj, created = SystemConfig.objects.update_or_create(
                key=key,
                defaults={
                    'value': config_data['value'],
                    'description': config_data['description'],
                    'is_public': config_data['is_public']
                }
            )
            
            if created:
                created_count += 1
                self.stdout.write(self.style.SUCCESS(f'✓ Created: {key}'))
            else:
                updated_count += 1
                self.stdout.write(self.style.WARNING(f'↻ Updated: {key}'))
        
        self.stdout.write(self.style.SUCCESS(f'\n✅ Seeding complete!'))
        self.stdout.write(self.style.SUCCESS(f'   Created: {created_count}'))
        self.stdout.write(self.style.SUCCESS(f'   Updated: {updated_count}'))
        self.stdout.write(self.style.SUCCESS(f'   Total: {len(configs)}'))

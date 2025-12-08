from django.core.management.base import BaseCommand
from apps.adminpanel.models import SystemConfig
from django.conf import settings


class Command(BaseCommand):
    help = 'Seed initial system configurations'
    
    def handle(self, *args, **options):
        configs = [
            {
                'key': 'auto_sync_time',
                'value': settings.DEFAULT_AUTO_SYNC_TIME,
                'description': 'Daily auto-sync time for stock/sector data (HH:MM format, IST)',
                'is_public': False,
            },
            {
                'key': 'sync_enabled',
                'value': 'true',
                'description': 'Enable/disable automatic daily sync',
                'is_public': False,
            },
            {
                'key': 'default_wallet_amount',
                'value': str(settings.DEFAULT_WALLET_AMOUNT),
                'description': 'Default wallet balance for new users (in ₹)',
                'is_public': True,
            },
            {
                'key': 'rate_limit_per_minute',
                'value': str(settings.RATE_LIMIT_PER_MINUTE),
                'description': 'API rate limit per minute per user',
                'is_public': False,
            },
            {
                'key': 'response_size_limit_mb', 
                'value': str(settings.DEFAULT_RESPONSE_SIZE_LIMIT_MB),
                'description': 'Maximum API response size in MB',
                'is_public': False,
            },
            {
                'key': 'backtest_retention_days',
                'value': str(settings.DEFAULT_BACKTEST_RETENTION_DAYS) if settings.DEFAULT_BACKTEST_RETENTION_DAYS else 'null',
                'description': 'Days to retain backtest results (null = keep forever)',
                'is_public': False,
            },
            {
                'key': 'go_service_url',
                'value': settings.GO_SERVICE_URL,
                'description': 'Go backend service URL for stock data',
                'is_public': False,
            },
            {
                'key': 'internal_api_secret',
                'value': settings.INTERNAL_API_SECRET,
                'description': 'Shared secret for Go service communication (DO NOT EXPOSE)',
                'is_public': False,
            },
            {
                'key': 'maintenance_mode',
                'value': 'false',
                'description': 'Enable maintenance mode (disables API access)',
                'is_public': True,
            },
        ]
        
        created_count = 0
        updated_count = 0
        
        for config_data in configs:
            config, created = SystemConfig.objects.update_or_create(
                key=config_data['key'],
                defaults={
                    'value': config_data['value'],
                    'description': config_data['description'],
                    'is_public': config_data['is_public'],
                }
            )
            if created:
                created_count += 1
                self.stdout.write(self.style.SUCCESS(f'✓ Created config: {config.key}'))
            else:
                updated_count += 1
                self.stdout.write(self.style.WARNING(f'↻ Updated config: {config.key}'))
        
        self.stdout.write(self.style.SUCCESS(
            f'\nSeeding complete! Created: {created_count}, Updated: {updated_count}'
        ))

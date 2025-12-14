import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.adminpanel.models import SystemConfig
from django.conf import settings

def seed_configs():
    defaults = {
        'AUTO_SYNC_TIME': getattr(settings, 'DEFAULT_AUTO_SYNC_TIME', '03:00'),
        'WALLET_AMOUNT': str(getattr(settings, 'DEFAULT_WALLET_AMOUNT', 100000)),
        'RESPONSE_SIZE_LIMIT_MB': str(getattr(settings, 'DEFAULT_RESPONSE_SIZE_LIMIT_MB', 5)),
        'BACKTEST_RETENTION_DAYS': str(getattr(settings, 'DEFAULT_BACKTEST_RETENTION_DAYS', '')),
    }
    
    configs = [
        {'key': 'auto_sync_time', 'value': '03:00', 'description': 'Time to auto-sync daily data (IST)', 'is_public': True},
        {'key': 'sync.default_start_date', 'value': '2020-01-01', 'description': 'Start date for historical data sync', 'is_public': True},
        {'key': 'sync_enabled', 'value': 'true', 'description': 'Enable automatic daily sync', 'is_public': True},
        {'key': 'default_wallet_amount', 'value': '100000', 'description': 'Starting wallet balance for new users', 'is_public': True},
        {'key': 'rate_limit_per_minute', 'value': '100', 'description': 'API rate limit per minute', 'is_public': False},
        {'key': 'response_size_limit_mb', 'value': '5', 'description': 'API response size limit in MB', 'is_public': False},
        {'key': 'backtest_retention_days', 'value': '30', 'description': 'Days to retain backtest results', 'is_public': False},
        {'key': 'maintenance_mode', 'value': 'false', 'description': 'Enable system maintenance mode', 'is_public': True},
        {'key': 'go_service_url', 'value': 'http://localhost:8080/api/v1', 'description': 'URL for the Go backend service', 'is_public': False},
        {'key': 'ADMIN_CAN_MANAGE_CONFIG', 'value': 'true', 'description': 'Allow admins to change system config', 'is_public': False},
    ]

    print("Seeding configurations...")
    for config in configs:
        obj, created = SystemConfig.objects.get_or_create(
            key=config['key'],
            defaults={
                'value': config['value'],
                'description': config['description'],
                'is_public': config['is_public']
            }
        )
        if created:
            print(f"Created config: {config['key']}")
        else:
            print(f"Config already exists: {config['key']}")
    print("Seeding complete.")

if __name__ == '__main__':
    seed_configs()

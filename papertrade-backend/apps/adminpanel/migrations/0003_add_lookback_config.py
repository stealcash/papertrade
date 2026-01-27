from django.db import migrations

def create_lookback_config(apps, schema_editor):
    SystemConfig = apps.get_model('adminpanel', 'SystemConfig')
    
    if not SystemConfig.objects.filter(key='option_sync_lookback_days').exists():
        SystemConfig.objects.create(
            key='option_sync_lookback_days',
            value='30',
            description='Number of days of historical data to fetch for each option expiry',
            is_public=False
        )

class Migration(migrations.Migration):

    dependencies = [
        ('adminpanel', '0002_init_option_configs'),
    ]

    operations = [
        migrations.RunPython(create_lookback_config),
    ]

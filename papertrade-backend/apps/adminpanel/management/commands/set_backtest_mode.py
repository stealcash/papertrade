from django.core.management.base import BaseCommand
from apps.adminpanel.models import SystemConfig

class Command(BaseCommand):
    help = 'Set backtest execution mode (direct or background)'

    def add_arguments(self, parser):
        parser.add_argument('mode', type=str, choices=['direct', 'background'], help='Execution mode')

    def handle(self, *args, **options):
        mode = options['mode']
        config, created = SystemConfig.objects.get_or_create(
            key='BACKTEST_EXECUTION_MODE',
            defaults={'description': 'Backtest execution mode (direct=sync, background=celery)'}
        )
        config.value = mode
        config.save()
        
        self.stdout.write(self.style.SUCCESS(f'Successfully set BACKTEST_EXECUTION_MODE to "{mode}"'))

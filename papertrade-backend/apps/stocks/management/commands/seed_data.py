from django.core.management.base import BaseCommand
from apps.stocks.models import Stock
from apps.stocks.models import Stock
from apps.sectors.models import Sector
from apps.adminpanel.models import SystemConfig


class Command(BaseCommand):
    help = 'Seed sample stocks and sectors'
    
    def handle(self, *args, **options):
        # Seed sample stocks
        stocks_data = [
            {'enum': 'RELIANCE', 'symbol': 'RELIANCE', 'exchange_suffix': 'NSE', 
             'full_symbol': 'RELIANCE.NSE', 'status': 'active'},
            {'enum': 'TCS', 'symbol': 'TCS', 'exchange_suffix': 'NSE', 
             'full_symbol': 'TCS.NSE', 'status': 'active'},
            {'enum': 'INFY', 'symbol': 'INFY', 'exchange_suffix': 'NSE', 
             'full_symbol': 'INFY.NSE', 'status': 'active'},
        ]
        
        for stock_data in stocks_data:
            stock, created = Stock.objects.get_or_create(
                enum=stock_data['enum'],
                defaults=stock_data
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f'Created stock: {stock.symbol}'))
            else:
                self.stdout.write(self.style.WARNING(f'Stock already exists: {stock.symbol}'))
        
        # Seed sample sectors
        sectors_data = [
            {'enum': 'NIFTY50', 'name': 'NIFTY 50', 
             'description': 'NSE NIFTY 50 Index', 'status': 'active'},
            {'enum': 'NIFTYIT', 'name': 'NIFTY IT', 
             'description': 'NSE NIFTY IT Index', 'status': 'active'},
            {'enum': 'BANKNIFTY', 'name': 'BANK NIFTY', 
             'description': 'NSE BANK NIFTY Index', 'status': 'active'},
        ]
        
        for sector_data in sectors_data:
            sector, created = Sector.objects.get_or_create(
                enum=sector_data['enum'],
                defaults=sector_data
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f'Created sector: {sector.name}'))
            else:
                self.stdout.write(self.style.WARNING(f'Sector already exists: {sector.name}'))
        
        
        # Seed System Config
        configs = [
            {'key': 'ADMIN_CAN_MANAGE_CONFIG', 'value': 'false', 
             'description': 'Allow admins to manage system configuration', 'is_public': False},
        ]
        
        for config in configs:
            obj, created = SystemConfig.objects.get_or_create(
                key=config['key'],
                defaults=config
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f'Created config: {obj.key}'))
            else:
                self.stdout.write(self.style.WARNING(f'Config already exists: {obj.key}'))

        self.stdout.write(self.style.SUCCESS('Data seeding completed!'))

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
            {'symbol': 'RELIANCE', 'name': 'Reliance Industries', 'exchange_suffix': 'NSE', 'status': 'active'},
            {'symbol': 'TCS', 'name': 'Tata Consultancy Services', 'exchange_suffix': 'NSE', 'status': 'active'},
            {'symbol': 'INFY', 'name': 'Infosys', 'exchange_suffix': 'NSE', 'status': 'active'},
        ]
        
        for stock_data in stocks_data:
            stock, created = Stock.objects.get_or_create(
                symbol=stock_data['symbol'],
                defaults=stock_data
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f'Created stock: {stock.symbol}'))
            else:
                self.stdout.write(self.style.WARNING(f'Stock already exists: {stock.symbol}'))
        
        # Seed sample sectors
        sectors_data = [
            {'symbol': 'NIFTY50', 'name': 'NIFTY 50', 
             'description': 'NSE NIFTY 50 Index', 'status': 'active'},
            {'symbol': 'NIFTYIT', 'name': 'NIFTY IT', 
             'description': 'NSE NIFTY IT Index', 'status': 'active'},
            {'symbol': 'BANKNIFTY', 'name': 'BANK NIFTY', 
             'description': 'NSE BANK NIFTY Index', 'status': 'active'},
        ]
        
        for sector_data in sectors_data:
            sector, created = Sector.objects.get_or_create(
                symbol=sector_data['symbol'],
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

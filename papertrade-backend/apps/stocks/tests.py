import pytest
from django.test import TestCase
from apps.stocks.models import Stock, StockPriceDaily
from datetime import date


class StockModelTest(TestCase):
    """Test Stock model."""
    
    def setUp(self):
        self.stock = Stock.objects.create(
            enum='TEST',
            symbol='TEST',
            exchange_suffix='NSE',
            full_symbol='TEST.NSE',
            status='active'
        )
    
    def test_create_stock(self):
        """Test creating a stock."""
        self.assertEqual(self.stock.enum, 'TEST')
        self.assertEqual(self.stock.symbol, 'TEST')
        self.assertEqual(self.stock.status, 'active')
    
    def test_stock_price_daily(self):
        """Test creating daily price data."""
        price = StockPriceDaily.objects.create(
            stock=self.stock,
            date=date(2024, 1, 1),
            open_price=100.00,
            high_price=105.00,
            low_price=98.00,
            close_price=103.00,
            volume=1000000
        )
        
        self.assertEqual(price.stock, self.stock)
        self.assertEqual(price.close_price, 103.00)

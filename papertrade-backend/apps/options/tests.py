from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from datetime import date, timedelta
from decimal import Decimal

from apps.users.models import User
from .models import Option5Min


class Option5MinModelTest(TestCase):
    """Test Option5Min model."""
    
    def setUp(self):
        self.option = Option5Min.objects.create(
            underlying_type='stock',
            underlying_symbol='RELIANCE',
            expiry_date=date.today() + timedelta(days=30),
            option_type='CE',
            option_strike=Decimal('2500.00'),
            candles_json={'09:15': {'open': 120, 'high': 125, 'low': 118, 'close': 123, 'volume': 15000}}
        )
    
    def test_option_creation(self):
        """Test option contract is created correctly."""
        self.assertEqual(self.option.underlying_symbol, 'RELIANCE')
        self.assertEqual(self.option.option_type, 'CE')
        self.assertEqual(self.option.option_strike, Decimal('2500.00'))
    
    def test_contract_identifier(self):
        """Test contract identifier generation."""
        expected = f"RELIANCE-{self.option.expiry_date}-CE-2500.00"
        self.assertEqual(self.option.contract_identifier, expected)
    
    def test_unique_constraint(self):
        """Test unique constraint on contract details."""
        from django.db import IntegrityError
        
        with self.assertRaises(IntegrityError):
            Option5Min.objects.create(
                underlying_type='stock',
                underlying_symbol='RELIANCE',
                expiry_date=self.option.expiry_date,
                option_type='CE',
                option_strike=Decimal('2500.00')
            )


class OptionAPITest(APITestCase):
    """Test Options API endpoints."""
    
    def setUp(self):
        # Create test user
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123'
        )
        self.client.force_authenticate(user=self.user)
        
        # Create test options
        expiry = date.today() + timedelta(days=30)
        self.option_ce = Option5Min.objects.create(
            underlying_type='stock',
            underlying_symbol='RELIANCE',
            expiry_date=expiry,
            option_type='CE',
            option_strike=Decimal('2500.00'),
            candles_json={'09:15': {'open': 120, 'high': 125, 'low': 118, 'close': 123, 'volume': 15000}}
        )
        self.option_pe = Option5Min.objects.create(
            underlying_type='stock',
            underlying_symbol='RELIANCE',
            expiry_date=expiry,
            option_type='PE',
            option_strike=Decimal('2500.00'),
            candles_json={'09:15': {'open': 80, 'high': 85, 'low': 78, 'close': 82, 'volume': 12000}}
        )
    
    def test_list_option_contracts(self):
        """Test listing option contracts."""
        url = reverse('options:contract-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'success')
        self.assertEqual(len(response.data['data']), 2)
    
    def test_filter_by_option_type(self):
        """Test filtering contracts by option type."""
        url = reverse('options:contract-list')
        response = self.client.get(url, {'option_type': 'CE'})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['data']), 1)
        self.assertEqual(response.data['data'][0]['option_type'], 'CE')
    
    def test_get_option_candles(self):
        """Test retrieving 5-min candles for specific contract."""
        url = reverse('options:candles-5min')
        params = {
            'underlying_type': 'stock',
            'underlying': 'RELIANCE',
            'expiry_date': self.option_ce.expiry_date,
            'option_type': 'CE',
            'strike': '2500.00'
        }
        response = self.client.get(url, params)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'success')
        self.assertIn('candles', response.data['data'])
    
    def test_get_candles_contract_not_found(self):
        """Test getting candles for non-existent contract."""
        url = reverse('options:candles-5min')
        params = {
            'underlying_type': 'stock',
            'underlying': 'INVALID',
            'expiry_date': date.today(),
            'option_type': 'CE',
            'strike': '9999.00'
        }
        response = self.client.get(url, params)
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data['code'], 'CONTRACT_NOT_FOUND')

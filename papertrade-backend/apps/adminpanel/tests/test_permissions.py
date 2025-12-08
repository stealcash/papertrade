from django.test import TestCase
from rest_framework.test import APIClient
from apps.users.models import User
from apps.adminpanel.models import AdminUser, SystemConfig
from apps.stocks.models import Stock

class AdminPermissionTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        
        # Create Superadmin
        self.superadmin = AdminUser.objects.create(
            email='super@test.com',
            role='superadmin',
            is_active=True
        )
        self.superadmin.set_password('password')
        self.superadmin.save()
        
        # Create Admin
        self.admin = AdminUser.objects.create(
            email='admin@test.com',
            role='admin',
            is_active=True
        )
        self.admin.set_password('password')
        self.admin.save()
        
        # Create Stock
        self.stock = Stock.objects.create(
            enum='TEST',
            symbol='TEST',
            full_symbol='TEST.NSE'
        )

    def test_superadmin_can_manage_stocks(self):
        self.client.force_authenticate(user=self.superadmin)
        response = self.client.post('/stocks/', {
            'enum': 'NEW',
            'symbol': 'NEW',
            'full_symbol': 'NEW.NSE',
            'status': 'active'
        })
        self.assertEqual(response.status_code, 201)

    def test_admin_cannot_manage_stocks_by_default(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post('/stocks/', {
            'enum': 'NEW2',
            'symbol': 'NEW2',
            'full_symbol': 'NEW2.NSE',
            'status': 'active'
        })
        self.assertEqual(response.status_code, 403)

    def test_admin_can_manage_stocks_with_permission(self):
        # Enable permission
        self.admin.can_manage_stocks = True
        self.admin.save()
        
        self.client.force_authenticate(user=self.admin)
        response = self.client.post('/stocks/', {
            'enum': 'NEW3',
            'symbol': 'NEW3',
            'full_symbol': 'NEW3.NSE',
            'status': 'active'
        })
        self.assertEqual(response.status_code, 201)

    def test_admin_cannot_manage_config_by_default(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.put('/admin-panel/config/TEST_KEY/', {'value': 'test'})
        self.assertEqual(response.status_code, 403)

    def test_admin_can_manage_config_with_permission(self):
        # Enable permission
        SystemConfig.objects.create(key='ADMIN_CAN_MANAGE_CONFIG', value='true')
        
        # Create config to update
        SystemConfig.objects.create(key='TEST_KEY', value='old')
        
        self.client.force_authenticate(user=self.admin)
        response = self.client.put('/admin-panel/config/TEST_KEY/', {'value': 'new'})
        self.assertEqual(response.status_code, 200)
        
        # Verify update
        config = SystemConfig.objects.get(key='TEST_KEY')
        self.assertEqual(config.value, 'new')

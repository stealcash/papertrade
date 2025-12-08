import pytest
from django.test import TestCase
from django.contrib.auth import get_user_model
from apps.users.utils import generate_access_token, decode_access_token

User = get_user_model()


class UserModelTest(TestCase):
    """Test User model."""
    
    def setUp(self):
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123'
        )
    
    def test_create_user(self):
        """Test creating a user."""
        self.assertEqual(self.user.email, 'test@example.com')
        self.assertTrue(self.user.check_password('testpass123'))
        self.assertEqual(self.user.role, 'user')
        self.assertTrue(self.user.is_active)
    
    def test_create_superuser(self):
        """Test creating a superuser."""
        admin = User.objects.create_superuser(
            email='admin@example.com',
            password='admin123'
        )
        self.assertEqual(admin.role, 'superadmin')
        self.assertTrue(admin.is_staff)
        self.assertTrue(admin.is_superuser)
    
    def test_wallet_balance_default(self):
        """Test default wallet balance."""
        self.assertEqual(self.user.wallet_balance, 100000.00)


class JWTUtilsTest(TestCase):
    """Test JWT utilities."""
    
    def setUp(self):
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123'
        )
    
    def test_generate_token(self):
        """Test token generation."""
        token = generate_access_token(self.user)
        self.assertIsNotNone(token)
        self.assertIsInstance(token, str)
    
    def test_decode_token(self):
        """Test token decoding."""
        token = generate_access_token(self.user)
        payload = decode_access_token(token)
        
        self.assertEqual(payload['user_id'], self.user.id)
        self.assertEqual(payload['email'], self.user.email)
        self.assertEqual(payload['role'], self.user.role)

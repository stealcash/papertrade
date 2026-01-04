from rest_framework import serializers
from .models import User, Permission, RolePermission
from django.contrib.auth.password_validation import validate_password


class UserSerializer(serializers.ModelSerializer):
    """Serializer for User model."""
    
    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'mobile', 'role', 'is_active', 'wallet_balance',
                 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at', 'wallet_balance']


class SignupSerializer(serializers.Serializer):
    """Serializer for user signup."""
    
    email = serializers.EmailField()
    first_name = serializers.CharField(required=False, allow_blank=True)
    last_name = serializers.CharField(required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, validators=[validate_password])
    mobile = serializers.CharField(required=False, allow_blank=True)
    
    def validate_email(self, value):
        """Check if email already exists."""
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError('User with this email already exists')
        return value
    
    def create(self, validated_data):
        """Create new user."""
        user = User.objects.create_user(
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            mobile=validated_data.get('mobile', ''),
        )
        
        # Get default balance from SystemConfig (User requested: default_wallet_amount=1002)
        initial_balance = 100000.00 # Default fallback
        try:
            from apps.adminpanel.models import SystemConfig
            # Check for 'default_wallet_amount' first as user specified 1002
            config = SystemConfig.objects.filter(key='default_wallet_amount').first()
            if not config:
                 config = SystemConfig.objects.filter(key='default_wallet_balance').first()
            
            if config:
                initial_balance = float(config.value)
        except Exception:
            pass # Fallback to default
        
        # Update user balance
        user.wallet_balance = initial_balance
        user.save()

        # Record initial wallet balance transaction
        if user.wallet_balance > 0:
            from apps.payments.models import WalletTransaction
            WalletTransaction.objects.create(
                user=user,
                transaction_type='CREDIT',
                amount=user.wallet_balance,
                balance_after=user.wallet_balance,
                description='Initial Signup Bonus'
            )
            
        return user


class LoginSerializer(serializers.Serializer):
    """Serializer for user login."""
    
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)


class PasswordResetRequestSerializer(serializers.Serializer):
    """Serializer for password reset request."""
    
    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    """Serializer for password reset confirmation."""
    
    token = serializers.CharField()
    new_password = serializers.CharField(write_only=True, validators=[validate_password])


class PermissionSerializer(serializers.ModelSerializer):
    """Serializer for Permission model."""
    
    class Meta:
        model = Permission
        fields = ['id', 'code', 'name', 'description', 'category', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class RolePermissionSerializer(serializers.ModelSerializer):
    """Serializer for RolePermission model."""
    
    permission_details = PermissionSerializer(source='permission', read_only=True)
    
    class Meta:
        model = RolePermission
        fields = ['id', 'role', 'permission', 'permission_details', 'created_at']
        read_only_fields = ['id', 'created_at']

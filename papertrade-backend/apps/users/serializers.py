from rest_framework import serializers
from .models import User, Permission, RolePermission
from django.contrib.auth.password_validation import validate_password


class UserSerializer(serializers.ModelSerializer):
    """Serializer for User model."""
    
    class Meta:
        model = User
        fields = ['id', 'email', 'mobile', 'role', 'is_active', 'wallet_balance',
                 'trial_start_date', 'trial_end_date', 'subscription_start_date',
                 'subscription_end_date', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at', 'wallet_balance']


class SignupSerializer(serializers.Serializer):
    """Serializer for user signup."""
    
    email = serializers.EmailField()
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
            mobile=validated_data.get('mobile', ''),
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

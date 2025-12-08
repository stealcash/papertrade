from rest_framework import serializers
from .models import AdminUser

class AdminLoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

class AdminUserSerializer(serializers.ModelSerializer):
    can_manage_config = serializers.SerializerMethodField()

    password = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = AdminUser
        fields = ['id', 'email', 'name', 'password', 'role', 'is_active', 'last_login', 'can_manage_stocks', 'can_manage_config']
        read_only_fields = ['id', 'is_active', 'last_login']

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        instance = super().update(instance, validated_data)
        if password:
            instance.set_password(password)
            instance.save()
        return instance

    def get_can_manage_config(self, obj):
        from apps.adminpanel.views import can_manage_config
        return can_manage_config(obj)

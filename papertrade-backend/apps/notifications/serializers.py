from rest_framework import serializers
from .models import Notification, BroadcastNotification


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = '__all__'
        read_only_fields = ['user']

class BroadcastNotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = BroadcastNotification
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']

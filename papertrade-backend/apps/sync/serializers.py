from rest_framework import serializers
from .models import SyncLog, MarketStatus


class SyncLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = SyncLog
        fields = '__all__'


class MarketStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = MarketStatus
        fields = '__all__'

from rest_framework import serializers
from .models import PaymentRecord


class PaymentRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentRecord
        fields = '__all__'
        read_only_fields = ['user']


class WalletTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        from .models import WalletTransaction
        model = WalletTransaction
        fields = '__all__'
        read_only_fields = ['user']

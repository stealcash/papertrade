from rest_framework import serializers
from .models import PaymentRecord


class PaymentRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentRecord
        fields = '__all__'
        read_only_fields = ['user']

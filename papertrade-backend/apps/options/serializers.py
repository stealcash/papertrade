from rest_framework import serializers
from .models import Option5Min


class Option5MinSerializer(serializers.ModelSerializer):
    """Serializer for Option5Min model."""
    
    contract_identifier = serializers.CharField(read_only=True)
    
    class Meta:
        model = Option5Min
        fields = [
            'id',
            'underlying_type',
            'underlying_symbol',
            'expiry_date',
            'option_type',
            'option_strike',
            'contract_identifier',
            'candles_json',
            'extra',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class OptionContractSerializer(serializers.Serializer):
    """Serializer for option contract listings."""
    
    underlying_type = serializers.ChoiceField(choices=['stock', 'sector'])
    underlying_symbol = serializers.CharField(max_length=50)
    expiry_date = serializers.DateField()
    option_type = serializers.ChoiceField(choices=['CE', 'PE'])
    option_strike = serializers.DecimalField(max_digits=10, decimal_places=2)
    contract_identifier = serializers.CharField(read_only=True)


class OptionCandlesRequestSerializer(serializers.Serializer):
    """Request serializer for fetching 5-min candles."""
    
    underlying_type = serializers.ChoiceField(choices=['stock', 'sector'], required=True)
    underlying_symbol = serializers.CharField(max_length=50, required=True)
    expiry_date = serializers.DateField(required=True)
    option_type = serializers.ChoiceField(choices=['CE', 'PE'], required=True)
    strike = serializers.DecimalField(max_digits=10, decimal_places=2, required=True)
    date = serializers.DateField(required=False, help_text='Date for intraday candles')


class OptionCandlesResponseSerializer(serializers.Serializer):
    """Response serializer for option 5-min candles."""
    
    contract = OptionContractSerializer()
    date = serializers.DateField()
    candles = serializers.JSONField()

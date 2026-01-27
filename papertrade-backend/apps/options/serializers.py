from rest_framework import serializers
from .models import OptionDailyData


class OptionDailyDataSerializer(serializers.ModelSerializer):
    """Serializer for OptionDailyData model."""
    
    contract_identifier = serializers.CharField(read_only=True)
    
    class Meta:
        model = OptionDailyData
        fields = [
            'id',
            'stock',
            'underlying_symbol',
            'expiry_date',
            'strike_price',
            'option_type',
            'date',
            'open_price',
            'high_price',
            'low_price',
            'close_price',
            'ltp',
            'prev_close',
            'settle_price',
            'volume',
            'traded_value',
            'open_interest',
            'change_in_oi',
            'underlying_value',
            'calculated_premium',
            'market_lot',
            'contract_identifier',
            'extra',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'contract_identifier']

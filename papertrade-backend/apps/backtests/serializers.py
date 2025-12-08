from rest_framework import serializers
from .models import BacktestRun, Trade


class BacktestRunSerializer(serializers.ModelSerializer):
    class Meta:
        model = BacktestRun
        fields = '__all__'
        read_only_fields = ['user', 'run_id', 'status', 'final_wallet_amount', 
                           'total_pnl', 'pnl_percentage', 'time_taken']


class TradeSerializer(serializers.ModelSerializer):
    stock_symbol = serializers.CharField(source='stock.symbol', read_only=True)
    
    class Meta:
        model = Trade
        fields = '__all__'


class BacktestRunRequestSerializer(serializers.Serializer):
    """Serializer for backtest run request."""
    
    stock_ids = serializers.ListField(child=serializers.IntegerField())
    start_date = serializers.DateField()
    end_date = serializers.DateField()
    initial_wallet = serializers.DecimalField(max_digits=15, decimal_places=2, default=100000)
    strategy_type = serializers.ChoiceField(choices=['predefined', 'rule_based', 'custom'])
    strategy_id = serializers.IntegerField(required=False)
    custom_script = serializers.CharField(required=False, allow_blank=True)
    execution_mode = serializers.ChoiceField(choices=['signal_close', 'next_open'], default='signal_close')

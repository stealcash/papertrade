from rest_framework import serializers
from .models import BacktestRun, Trade


class BacktestRunSerializer(serializers.ModelSerializer):
    strategy_details = serializers.SerializerMethodField()

    class Meta:
        model = BacktestRun
        fields = '__all__'
        read_only_fields = ['user', 'run_id', 'status', 'final_wallet_amount', 
                           'total_pnl', 'pnl_percentage', 'time_taken']

    def get_strategy_details(self, obj):
        if obj.strategy_predefined:
            return {
                'id': obj.strategy_predefined.id,
                'name': obj.strategy_predefined.name,
                'code': obj.strategy_predefined.code
            }
        return None


class TradeSerializer(serializers.ModelSerializer):
    stock_symbol = serializers.CharField(source='stock.symbol', read_only=True)
    
    class Meta:
        model = Trade
        fields = '__all__'


class BacktestRunRequestSerializer(serializers.Serializer):
    """Serializer for backtest run request."""
    
    # Strategy (One of them is required)
    strategy_id = serializers.IntegerField(required=False, help_text="ID of StrategyMaster (System/Auto)")
    strategy_rule_based = serializers.IntegerField(required=False, help_text="ID of StrategyRuleBased (User Custom)")

    def validate(self, attrs):
        if not attrs.get('strategy_id') and not attrs.get('strategy_rule_based'):
            raise serializers.ValidationError("Must provide either 'strategy_id' or 'strategy_rule_based'.")
        return attrs
    
    # Selection
    selection_mode = serializers.ChoiceField(choices=['stock', 'sector', 'category', 'watchlist'])
    selection_config = serializers.JSONField(default=dict) # e.g. {ids: [1,2]}
    
    # Criteria
    criteria_type = serializers.ChoiceField(choices=['direction', 'magnitude'], default='direction')
    magnitude_threshold = serializers.IntegerField(required=False, default=50, min_value=0, max_value=100)
    
    # Range
    start_date = serializers.DateField()
    end_date = serializers.DateField()
    
    # Legacy / Optional
    initial_wallet = serializers.DecimalField(max_digits=15, decimal_places=2, default=100000)
    execution_mode = serializers.ChoiceField(choices=['signal_close', 'next_open'], default='signal_close')

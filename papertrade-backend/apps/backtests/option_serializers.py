from rest_framework import serializers
from .models import OptionBacktestRun, OptionTrade


class OptionTradeSerializer(serializers.ModelSerializer):
    """Serializer for individual option trades."""
    
    class Meta:
        model = OptionTrade
        fields = [
            'id', 'underlying_symbol', 'entry_date', 'exit_date',
            'expiry_date', 'legs_json', 'total_pnl', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class OptionBacktestRunSerializer(serializers.ModelSerializer):
    """Serializer for option backtest runs."""
    
    strategy_name = serializers.CharField(source='strategy.name', read_only=True)
    strategy_id = serializers.IntegerField(source='strategy.id', read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)
    
    # Include trades when retrieving a single run
    trades = OptionTradeSerializer(many=True, read_only=True)
    
    class Meta:
        model = OptionBacktestRun
        fields = [
            'id', 'run_id', 'user', 'user_email',
            'strategy', 'strategy_id', 'strategy_name',
            'snapshot_name', 'snapshot_description', 'snapshot_config',
            'underlying_symbol', 'start_date', 'end_date', 'lot_size',
            'total_trades', 'win_count', 'loss_count', 'win_rate',
            'total_pnl', 'results_summary_json',
            'status', 'time_taken', 'error_message',
            'created_at', 'updated_at', 'trades'
        ]
        read_only_fields = [
            'id', 'run_id', 'user', 'lot_size', 'total_trades', 'win_count',
            'loss_count', 'win_rate', 'total_pnl', 'results_summary_json',
            'status', 'time_taken', 'error_message', 'created_at', 'updated_at'
        ]


class OptionBacktestRunListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list view (no trades)."""
    
    strategy_name = serializers.CharField(source='strategy.name', read_only=True)
    leg_actions = serializers.SerializerMethodField()
    
    class Meta:
        model = OptionBacktestRun
        fields = [
            'id', 'run_id', 'strategy_name', 'snapshot_name', 'snapshot_description',
            'underlying_symbol', 'start_date', 'end_date', 'lot_size',
            'total_trades', 'win_rate', 'total_pnl', 'results_summary_json',
            'status', 'created_at', 'leg_actions'
        ]

    def get_leg_actions(self, obj):
        if not obj.snapshot_config or 'legs' not in obj.snapshot_config:
            return ""
        legs = obj.snapshot_config.get('legs', [])
        actions = [leg.get('action', '').lower() for leg in legs if leg.get('action')]
        return ", ".join(actions)


class OptionBacktestRunRequestSerializer(serializers.Serializer):
    """Serializer for creating a new option backtest."""
    
    strategy_id = serializers.IntegerField(required=True, help_text="ID of OptionStrategy")
    underlying_symbol = serializers.CharField(
        max_length=20,
        required=True,
        help_text="Symbol to backtest (Index or Stock)"
    )
    lot_size = serializers.IntegerField(
        default=50,
        min_value=1,
        help_text="Lot size/quantity per trade (e.g., 50 for NIFTY, 25 for BANKNIFTY)"
    )
    start_date = serializers.DateField(required=True)
    end_date = serializers.DateField(required=True)
    
    def validate(self, data):
        """Validate date range and strategy exists."""
        if data['start_date'] >= data['end_date']:
            raise serializers.ValidationError("start_date must be before end_date")
        
        from apps.strategies.models import OptionStrategy
        try:
            OptionStrategy.objects.get(id=data['strategy_id'])
        except OptionStrategy.DoesNotExist:
            raise serializers.ValidationError("Invalid strategy_id")
        
        return data

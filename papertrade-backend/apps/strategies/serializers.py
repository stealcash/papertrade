from rest_framework import serializers
from .models import StrategyMaster, StrategyRuleBased, StrategySignal

class StrategyMasterSerializer(serializers.ModelSerializer):
    class Meta:
        model = StrategyMaster
        fields = ['id', 'code', 'name', 'description', 'status', 'type', 'rule_based_strategy', 'created_at']

class StrategySignalSerializer(serializers.ModelSerializer):
    strategy_name = serializers.CharField(source='strategy.name', read_only=True)

    class Meta:
        model = StrategySignal
        fields = ['id', 'stock', 'strategy', 'strategy_name', 'date', 'signal_direction', 'expected_value']

class StrategyRuleBasedSerializer(serializers.ModelSerializer):
    code = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = StrategyRuleBased
        fields = '__all__'
        read_only_fields = ['user']

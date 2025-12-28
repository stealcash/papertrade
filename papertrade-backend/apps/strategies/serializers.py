from rest_framework import serializers
from .models import StrategyMaster, StrategyRuleBased, StrategySignal

class StrategyMasterSerializer(serializers.ModelSerializer):
    rules_json = serializers.SerializerMethodField()
    
    class Meta:
        model = StrategyMaster
        fields = ['id', 'code', 'name', 'description', 'status', 'type', 'rule_based_strategy', 'created_at', 'rules_json']

    def get_rules_json(self, obj):
        if obj.rule_based_strategy:
            return obj.rule_based_strategy.rules_json
        return None

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

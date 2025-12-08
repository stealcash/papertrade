from rest_framework import serializers
from .models import StrategyPredefined, StrategyRuleBased


class StrategyPredefinedSerializer(serializers.ModelSerializer):
    class Meta:
        model = StrategyPredefined
        fields = '__all__'


class StrategyRuleBasedSerializer(serializers.ModelSerializer):
    class Meta:
        model = StrategyRuleBased
        fields = '__all__'
        read_only_fields = ['user']

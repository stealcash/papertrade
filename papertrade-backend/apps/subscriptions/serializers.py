from rest_framework import serializers
from .models import Plan, UserSubscription, Coupon

class PlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = Plan
        fields = ['id', 'name', 'slug', 'description', 'monthly_price', 'yearly_price', 'priority', 'features', 'is_active', 'available_period', 'is_default', 'default_period_days']

class CouponSerializer(serializers.ModelSerializer):
    class Meta:
        model = Coupon
        fields = ['id', 'code', 'discount_percent', 'valid_from', 'valid_until', 'max_usage', 'used_count', 'applicable_periods', 'applicable_plan']

class UserSubscriptionSerializer(serializers.ModelSerializer):
    plan = PlanSerializer(read_only=True)
    
    class Meta:
        model = UserSubscription
        fields = ['id', 'plan', 'status', 'start_date', 'end_date', 'is_active', 'created_at']

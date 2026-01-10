from django.utils import timezone
from .models import UserSubscription

# Import other models lazily to avoid circular imports?
# Actually SubscriptionService will be imported BY views, so models are fine.

class SubscriptionService:
    @staticmethod
    def get_active_subscription(user):
        now = timezone.now()
        return UserSubscription.objects.filter(
            user=user,
            status='active',
            is_active=True,
            end_date__gte=now
        ).select_related('plan').first()

    @staticmethod
    def get_feature_limit(user, feature_code):
        sub = SubscriptionService.get_active_subscription(user)
        plan = sub.plan if sub else None
        
        # Default fallback
        default_limit = {'enabled': False, 'limit': 0}

        if not plan:
            return default_limit

        # New JSON Logic
        # features is a dict: "CODE": {"enabled": true, "limit": 10}
        feature_config = plan.features.get(feature_code, default_limit)
        
        # Normalize config
        return {
            'enabled': feature_config.get('enabled', False),
            'limit': feature_config.get('limit', 0),
            'period_days': feature_config.get('period_days', 30) # Default 30 days if not set
        }

    @staticmethod
    def check_limit(user, feature_code):
        """
        Returns (is_allowed, message)
        """
        limit_info = SubscriptionService.get_feature_limit(user, feature_code)
        
        if not limit_info['enabled']:
            return False, "This feature is not enabled in your current plan."
            
        limit = limit_info['limit']
        if limit == -1: # Unlimited
            return True, "Allowed"
            
        # Count Usage
        usage = SubscriptionService.get_usage_count(user, feature_code, limit_info.get('period_days', 30))
        
        if usage >= limit:
            return False, f"Limit reached ({usage}/{limit}). Upgrade your plan."
            
        return True, "Allowed"

    @staticmethod
    def get_usage_count(user, feature_code, period_days):
        now = timezone.now()
        
        if feature_code == 'STRATEGY_CREATE':
            # STRATEGIES: Count active items (Storage Limit)
            # Deleting a strategy FREES up the limit.
            from apps.strategies.models import StrategyRuleBased
            return StrategyRuleBased.objects.filter(user=user).count()
            
        elif feature_code in ['BACKTEST_RUN', 'TRADE_EXECUTE', 'PREDICTION_ADD']:
            # ACTIONS: Count usage records (Rate Limit)
            # Deleting the result DOES NOT free up the limit.
            from .models import SubscriptionUsage
            
            # Find current active window
            # Logic: We check for a Usage Record that covers TODAY.
            # If period_days=30, we look for a record where end_date > now > start_date?
            # actually we simply define a new period if one doesn't exist, but here we just READ.
            # To simplify "Rolling Window" simulation with discrete records:
            # We look for records that are still 'valid' (period_end > now).
            # But usually for Rate Limits people use "Monthly Reset". 
            
            # Simplified Approach:
            # check_limit checks the SUM of usage in the last X days?
            # OR we just use fixed windows (e.g. this month).
            # The USER asked for "Period Days" so let's try to honor rolling window if possible OR fixed blocks.
            
            # HYBRID ACCURATE APPROACH:
            # We count the actual SubscriptionUsage entry for the "Current Period".
            # We'll assume the usage entry is created/updated by increment_usage().
            # If we want a strict "Rolling 30 Days", we can't easily use a simple counter model without many rows.
            # Compromise: We use Fixed Windows of `period_days` length, starting from the first action.
            
            usage_record = SubscriptionUsage.objects.filter(
                user=user,
                feature_code=feature_code,
                period_end__gte=now # Current active period
            ).first()
            
            return usage_record.count if usage_record else 0
            
        return 0

    @staticmethod
    def increment_usage(user, feature_code):
        """
        Increments usage count for a feature.
        Creates a new period if none exists or previous expired.
        """
        now = timezone.now()
        
        # Only track for Rate-Limited features
        if feature_code not in ['BACKTEST_RUN', 'TRADE_EXECUTE', 'PREDICTION_ADD']:
            return

        from .models import SubscriptionUsage
        
        # Get period length
        limit_info = SubscriptionService.get_feature_limit(user, feature_code)
        days = limit_info.get('period_days', 30)
        
        # Try to find Active Period
        usage = SubscriptionUsage.objects.filter(
            user=user,
            feature_code=feature_code,
            period_end__gte=now
        ).first()

        if usage:
            usage.count += 1
            usage.save()
        else:
            # Start new period
            SubscriptionUsage.objects.create(
                user=user,
                feature_code=feature_code,
                period_start=now,
                period_end=now + timezone.timedelta(days=days),
                count=1
            )

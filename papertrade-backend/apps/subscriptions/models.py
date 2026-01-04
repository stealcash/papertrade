from django.db import models
from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone

User = get_user_model()

class Plan(models.Model):
    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True)
    is_active = models.BooleanField(default=True)
    description = models.TextField(blank=True, null=True)
    priority = models.IntegerField(default=0, help_text="Higher value = Higher tier")
    monthly_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    yearly_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    
    # Features Config (JSON)
    # Structure:
    # {
    #    "FEATURE_CODE": {"enabled": true, "limit": 10},
    #    "ANOTHER_FEATURE": {"enabled": false}
    # }
    features = models.JSONField(default=dict, blank=True)

    # Availability Config
    PERIOD_CHOICES = [
        ('monthly', 'Monthly Only'),
        ('yearly', 'Yearly Only'),
        ('both', 'Both Monthly & Yearly'),
    ]
    available_period = models.CharField(
        max_length=20, 
        choices=PERIOD_CHOICES, 
        default='both',
        help_text="Restrict this plan to specific billing intervals."
    )

    # Auto-assign on signup
    is_default = models.BooleanField(default=False, help_text="If true, this plan is assigned to new users.")
    default_period_days = models.IntegerField(default=30, help_text="Duration in days if assigned as default.")

    def __str__(self):
        return self.name

class Coupon(models.Model):
    code = models.CharField(max_length=50, unique=True)
    discount_percent = models.DecimalField(max_digits=5, decimal_places=2) # 0-100
    valid_from = models.DateField()
    valid_until = models.DateField()
    applicable_plan = models.ForeignKey(Plan, on_delete=models.SET_NULL, null=True, blank=True, help_text="Specific plan this coupon applies to. Leave blank for all plans.")
    applicable_periods = models.CharField(max_length=100, blank=True, help_text="Comma separated: monthly,yearly")
    max_usage = models.IntegerField(default=0, help_text="0 for unlimited")
    used_count = models.IntegerField(default=0)
    
    def is_valid(self):
        now = timezone.now().date()
        if self.valid_from > now or self.valid_until < now:
            return False
        if self.max_usage > 0 and self.used_count >= self.max_usage:
            return False
        return True

    def __str__(self):
        return self.code

class UserSubscription(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='subscriptions')
    plan = models.ForeignKey(Plan, on_delete=models.CASCADE)
    status = models.CharField(max_length=20, default='active')
    start_date = models.DateTimeField(default=timezone.now)
    end_date = models.DateTimeField()
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    used_coupon = models.ForeignKey(Coupon, on_delete=models.SET_NULL, null=True, blank=True)

    @property
    def is_valid(self):
        return self.is_active and self.end_date > timezone.now()

        return f"{self.user.email} - {self.plan.name if self.plan else 'No Plan'}"

class SubscriptionUsage(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='subscription_usage')
    feature_code = models.CharField(max_length=50)
    period_start = models.DateTimeField()
    period_end = models.DateTimeField()
    count = models.IntegerField(default=0)
    
    class Meta:
        unique_together = ('user', 'feature_code', 'period_start')
        indexes = [
            models.Index(fields=['user', 'feature_code', 'period_end']),
        ]

    def __str__(self):
        return f"{self.user.email} - {self.feature_code}: {self.count}"

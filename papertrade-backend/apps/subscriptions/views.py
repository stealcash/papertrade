from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from django.utils import timezone
from .models import Plan, UserSubscription, Coupon
from .serializers import PlanSerializer, UserSubscriptionSerializer, CouponSerializer
from apps.users.utils import get_success_response, get_error_response

class SubscriptionViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'], permission_classes=[AllowAny])
    def plans(self, request):
        """List all available plans."""
        # Order by priority (Ascending): 0 (Trial/Free) -> 1 (Silver) -> 2 (Gold)
        plans = Plan.objects.filter(is_active=True).order_by('priority')
        serializer = PlanSerializer(plans, many=True)
        return get_success_response(serializer.data)

    @action(detail=False, methods=['get'])
    def current(self, request):
        """Get current user's subscription."""
        now = timezone.now()
        sub = UserSubscription.objects.filter(
            user=request.user, 
            status='active',
            is_active=True,
            end_date__gte=now
        ).select_related('plan').first()
        
        if not sub:
            # Return 200 with null data if no subscription logic is strictly needed
            return get_success_response(None)
            
        serializer = UserSubscriptionSerializer(sub)
        return get_success_response(serializer.data)

    @action(detail=False, methods=['post'])
    def validate_coupon(self, request):
        """Validate a coupon code."""
        code = request.data.get('code')
        plan_id = request.data.get('plan_id')
        period = request.data.get('period') # monthly/yearly
        
        if not code:
             return get_error_response('MISSING_CODE', 'Coupon code is required', status_code=400)
             
        try:
            coupon = Coupon.objects.get(code=code)
            if not coupon.is_valid():
                 return get_error_response('INVALID_COUPON', 'Coupon is expired or limit reached', status_code=400)
            
            # Check applicability
            if plan_id:
                try:
                     plan = Plan.objects.get(id=plan_id)
                     if coupon.applicable_plan and coupon.applicable_plan != plan:
                          return get_error_response('INVALID_COUPON', 'Coupon not applicable for this plan', status_code=400)
                except Plan.DoesNotExist:
                     pass
            
            if period and coupon.applicable_periods:
                 periods = [p.strip() for p in coupon.applicable_periods.split(',')]
                 if period not in periods:
                      return get_error_response('INVALID_COUPON', f'Coupon not applicable for {period} billing', status_code=400)

            return get_success_response({
                'code': coupon.code,
                'discount_percent': coupon.discount_percent,
                'message': 'Coupon applied successfully'
            })
            
        except Coupon.DoesNotExist:
             return get_error_response('INVALID_COUPON', 'Invalid coupon code', status_code=400)

    @action(detail=False, methods=['post'])
    def subscribe(self, request):
        """Subscribe or Upgrade plan."""
        plan_id = request.data.get('plan_id')
        period_str = request.data.get('period') # 'monthly' or 'yearly'
        coupon_code = request.data.get('coupon_code')
        
        if not plan_id or not period_str:
            return get_error_response('MISSING_DATA', 'plan_id and period are required', status_code=400)
            
        try:
            plan = Plan.objects.get(id=plan_id)
            
            # Get Price
            price = 0
            if period_str == 'monthly':
                price = plan.monthly_price
            elif period_str == 'yearly':
                price = plan.yearly_price
            else:
                 return get_error_response('INVALID_PERIOD', 'Invalid period. Use monthly or yearly.', status_code=400)
            
            if price is None:
                return get_error_response('INVALID_PERIOD', 'This plan does not support the selected period.', status_code=400)

            discount = 0
            used_coupon = None
            
            if coupon_code:
                try:
                    coupon = Coupon.objects.get(code=coupon_code)
                    if coupon.is_valid():
                        if coupon.applicable_plan and coupon.applicable_plan != plan:
                            return get_error_response('INVALID_COUPON', 'Coupon not applicable', status_code=400)
                            
                        discount = (price * coupon.discount_percent) / 100
                        price = price - discount
                        used_coupon = coupon
                except Coupon.DoesNotExist:
                    pass
            
            # Deactivate current subscription
            now = timezone.now()
            UserSubscription.objects.filter(user=request.user, is_active=True).update(is_active=False, status='inactive', end_date=now)
            
            # Create new
            duration_days = 30 if period_str == 'monthly' else 365
            
            new_sub = UserSubscription.objects.create(
                user=request.user,
                plan=plan,
                status='active',
                start_date=now,
                end_date=now + timezone.timedelta(days=duration_days),
                used_coupon=used_coupon
            )
            
            if used_coupon:
                used_coupon.used_count += 1
                used_coupon.save()

            # RESET USAGE HISTORY
            # New plan means new limits, so we clear the old usage counters for rate-limited features.
            # This prevents old usage from blocking new plan features immediately.
            from .models import SubscriptionUsage
            SubscriptionUsage.objects.filter(user=request.user).delete()
            
            return get_success_response({
                'subscription': UserSubscriptionSerializer(new_sub).data,
                'message': f'Successfully subscribed to {plan.name}'
            })

        except Plan.DoesNotExist:
            return get_error_response('INVALID_PLAN', 'Plan not found', status_code=404)

from .permissions import IsAdmin

class BaseAdminViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdmin]
    pagination_class = None

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        return get_success_response(response.data)

    def retrieve(self, request, *args, **kwargs):
        response = super().retrieve(request, *args, **kwargs)
        return get_success_response(response.data)

    def create(self, request, *args, **kwargs):
        response = super().create(request, *args, **kwargs)
        # Using 200 to be safe with get_success_response default, or can pass 201
        return get_success_response(response.data, message='Created successfully', status_code=201)

    def update(self, request, *args, **kwargs):
        response = super().update(request, *args, **kwargs)
        return get_success_response(response.data, message='Updated successfully')
        
    def destroy(self, request, *args, **kwargs):
        super().destroy(request, *args, **kwargs)
        return get_success_response({}, message='Deleted successfully')

class PlanAdminViewSet(BaseAdminViewSet):
    queryset = Plan.objects.all()
    serializer_class = PlanSerializer

class CouponAdminViewSet(BaseAdminViewSet):
    queryset = Coupon.objects.all()
    serializer_class = CouponSerializer

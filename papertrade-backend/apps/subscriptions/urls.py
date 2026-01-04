from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SubscriptionViewSet, PlanAdminViewSet, CouponAdminViewSet

router = DefaultRouter()
router.register(r'admin/plans', PlanAdminViewSet, basename='admin-plans')
router.register(r'admin/coupons', CouponAdminViewSet, basename='admin-coupons')
router.register(r'', SubscriptionViewSet, basename='subscription')

urlpatterns = [
    path('', include(router.urls)),
]

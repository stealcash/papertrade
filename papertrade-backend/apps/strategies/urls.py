from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'predefined', views.StrategyPredefinedViewSet, basename='strategy-predefined')
router.register(r'rule-based', views.StrategyRuleBasedViewSet, basename='strategy-rule-based')

urlpatterns = [
    path('', include(router.urls)),
]

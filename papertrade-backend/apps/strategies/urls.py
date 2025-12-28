from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'master', views.StrategyMasterViewSet, basename='strategy-master')
router.register(r'signals', views.StrategySignalViewSet, basename='strategy-signal')
router.register(r'rule-based', views.StrategyRuleBasedViewSet, basename='strategy-rule-based')

urlpatterns = [
    path('', include(router.urls)),
    path('sync/', views.SyncStrategiesView.as_view(), name='strategy-sync'),
]

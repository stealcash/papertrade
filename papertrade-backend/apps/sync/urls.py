from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'logs', views.SyncLogViewSet, basename='sync-log')
router.register(r'market-status', views.MarketStatusViewSet, basename='market-status')

urlpatterns = [
    path('trigger-normal/', views.trigger_normal_sync, name='trigger-normal-sync'),
    path('trigger-hard/', views.trigger_hard_sync, name='trigger-hard-sync'),
    path('external-logs/', views.list_external_logs, name='list-external-logs'),
    path('external-logs/<str:filename>/', views.get_external_log, name='get-external-log'),
    path('', include(router.urls)),
]

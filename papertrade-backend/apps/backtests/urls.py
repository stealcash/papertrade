from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'runs', views.BacktestRunViewSet, basename='backtest-run')
router.register(r'trades', views.TradeViewSet, basename='trade')

urlpatterns = [
    path('run/', views.run_backtest, name='run-backtest'),
    path('', include(router.urls)),
]

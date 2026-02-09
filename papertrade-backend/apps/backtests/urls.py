from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from . import option_views

router = DefaultRouter()
router.register(r'runs', views.BacktestRunViewSet, basename='backtest-run')
router.register(r'trades', views.TradeViewSet, basename='trade')

# Option Backtest Router (Separate from Stock Backtesting)
option_router = DefaultRouter()
option_router.register(r'', option_views.OptionBacktestRunViewSet, basename='option-backtest')

urlpatterns = [
    # Stock Backtesting
    path('run/', views.run_backtest, name='run-backtest'),
    path('', include(router.urls)),
    
    # Option Backtesting (Separate System)
    path('option-backtest/run/', option_views.run_option_backtest, name='run-option-backtest'),
    path('option-backtest/', include(option_router.urls)),
]

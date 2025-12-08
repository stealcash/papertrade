from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'categories', views.StockCategoryViewSet, basename='stock-category')
router.register(r'', views.StockViewSet, basename='stock')
router.register(r'prices/daily', views.StockPriceDailyViewSet, basename='stock-price-daily')
router.register(r'prices/5min', views.Stock5MinByDayViewSet, basename='stock-5min')

urlpatterns = [
    path('', include(router.urls)),
]

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'', views.SectorViewSet, basename='sector')
router.register(r'prices/daily', views.SectorPriceDailyViewSet, basename='sector-price-daily')

urlpatterns = [
    path('', include(router.urls)),
]

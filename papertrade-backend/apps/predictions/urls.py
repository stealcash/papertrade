from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import StockPredictionViewSet

router = DefaultRouter()
router.register(r'', StockPredictionViewSet, basename='prediction')

urlpatterns = [
    path('', include(router.urls)),
]

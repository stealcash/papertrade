from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import WatchlistViewSet

router = DefaultRouter()
router.register(r'', WatchlistViewSet, basename='watchlist')

urlpatterns = [
    path('', include(router.urls)),
]

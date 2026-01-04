from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'records', views.WalletTransactionViewSet, basename='wallet-transaction')

urlpatterns = [
    path('wallet/refill/', views.refill_wallet, name='refill-wallet'),
    path('', include(router.urls)),
]

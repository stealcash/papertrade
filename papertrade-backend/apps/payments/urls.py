from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'records', views.PaymentRecordViewSet, basename='payment-record')

urlpatterns = [
    path('wallet/refill', views.refill_wallet, name='refill-wallet'),
    path('', include(router.urls)),
]

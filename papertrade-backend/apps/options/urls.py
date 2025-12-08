from django.urls import path
from . import views

app_name = 'options'

urlpatterns = [
    path('contracts/', views.OptionContractListView.as_view(), name='contract-list'),
    path('contracts/<int:pk>/', views.OptionContractDetailView.as_view(), name='contract-detail'),
    path('candles/5min/', views.OptionCandlesView.as_view(), name='candles-5min'),
]

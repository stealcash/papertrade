from django.urls import path
from .views import PatternFinderView

urlpatterns = [
    path('find/', PatternFinderView.as_view(), name='pattern-find'),
]

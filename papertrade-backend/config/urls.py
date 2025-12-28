"""
URL configuration for PaperTrade project.
"""
from django.contrib import admin
from django.urls import path, include
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # API v1
    path('api/v1/', include([
        # API Schema and Documentation
        path('schema/', SpectacularAPIView.as_view(), name='schema'),
        path('docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
        path('redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
        
        # App URLs
        path('auth/', include('apps.users.urls')),
        path('stocks/', include('apps.stocks.urls')),
        path('sectors/', include('apps.sectors.urls')),
        path('options/', include('apps.options.urls')),
        path('strategies/', include('apps.strategies.urls')),
        path('backtest/', include('apps.backtests.urls')),
        path('payments/', include('apps.payments.urls')),
        path('sync/', include('apps.sync.urls')),
        path('notifications/', include('apps.notifications.urls')),
        path('watchlist/', include('apps.watchlist.urls')),
        path('admin-panel/', include('apps.adminpanel.urls')),
    ])),
]

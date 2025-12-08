from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from . import otp_views

router = DefaultRouter()
router.register(r'permissions', views.PermissionViewSet, basename='permission')
router.register(r'role-permissions', views.RolePermissionViewSet, basename='role-permission')

urlpatterns = [
    path('signup', views.signup, name='signup'),
    path('login', views.login, name='login'),
    path('profile', views.profile, name='profile'),
    path('profile/update', views.update_profile, name='update-profile'),
    path('password-reset/request', views.password_reset_request, name='password-reset-request'),
    path('password-reset/confirm', views.password_reset_confirm, name='password-reset-confirm'),
    # OTP endpoints
    path('otp/request', otp_views.request_otp, name='otp-request'),
    path('otp/verify', otp_views.verify_otp_login, name='otp-verify'),
    path('', include(router.urls)),
]

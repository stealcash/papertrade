from django.urls import path
from . import views

urlpatterns = [
    path('auth/login/', views.admin_login, name='admin-login'),
    path('auth/profile/', views.admin_profile, name='admin-profile'),
    path('users/', views.list_users, name='admin-list-users'),
    path('config/', views.list_configs, name='admin-list-configs'),
    path('config/create/', views.create_config, name='admin-create-config'),
    path('config/<str:key>/', views.update_config, name='admin-update-config'),
    path('config/<str:key>/delete/', views.delete_config, name='admin-delete-config'),
    path('admin/create/', views.create_admin, name='admin-create-admin'),
    path('admins/', views.list_admins, name='admin-list-admins'),
    path('admins/<int:admin_id>/', views.update_admin, name='admin-update-admin'),
    path('admins/<int:admin_id>/delete/', views.delete_admin, name='admin-delete-admin'),
    path('users/<int:user_id>/toggle-status/', views.toggle_user_status, name='admin-toggle-user-status'),
    path('dashboard/stats/', views.dashboard_stats, name='dashboard_stats'),
    path('database/tables/', views.get_tables, name='database_tables'),
    path('database/tables/<str:table_name>/', views.get_table_schema, name='database_table_schema'),
    path('database/query/', views.execute_query, name='database_run_query'),
]

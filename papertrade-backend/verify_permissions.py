
import os
import django
import sys

sys.path.append('/Users/chat360team/Documents/papertrade/papertrade-backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.adminpanel.models import AdminUser

print(f"{'Email':<30} {'Role':<15} {'Manage Stocks':<15}")
print("-" * 60)
for admin in AdminUser.objects.all():
    print(f"{admin.email:<30} {admin.role:<15} {admin.can_manage_stocks!s:<15}")

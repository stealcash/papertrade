import os, django
import sys
# Add project root to sys.path
sys.path.append(os.getcwd())

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from apps.users.models import User
from apps.adminpanel.models import AdminUser
from apps.users.utils import generate_access_token, decode_access_token

email = 'pawansaini312@gmail.com'
u = User.objects.filter(email=email).first()
if u:
    print(f"User found: ID={u.id}, Email={u.email}, Role={u.role}, Active={u.is_active}")
    token = generate_access_token(u)
    print(f"FULL_TOKEN:{token}")
    decoded = decode_access_token(token)
    print(f"Decoded: {decoded}")
else:
    print("User NOT found in User table")

a = AdminUser.objects.filter(email=email).first()
if a:
    print(f"AdminUser found: ID={a.id}, Email={a.email}, Role={a.role}, Active={a.is_active}")
else:
    print("AdminUser NOT found")

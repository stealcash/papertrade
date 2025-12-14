from django.contrib.auth import get_user_model
from apps.adminpanel.models import AdminUser

def fix_emails():
    User = get_user_model()
    try:
        u = User.objects.get(email__icontains='pawanpawan')
        print(f"Found corrupted User email: {u.email}")
        u.email = 'pawansaini312@gmail.com'
        u.save()
        print(f"Fixed User email to: {u.email}")
    except User.DoesNotExist:
        print("No corrupted User found.")

    try:
        a = AdminUser.objects.get(email__icontains='pawanpawan')
        print(f"Found corrupted AdminUser email: {a.email}")
        a.email = 'pawansaini312@gmail.com'
        a.save()
        print(f"Fixed AdminUser email to: {a.email}")
    except AdminUser.DoesNotExist:
        print("No corrupted AdminUser found.")

if __name__ == '__main__':
    fix_emails()

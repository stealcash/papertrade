from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from .models import AdminUser

User = get_user_model()

@receiver(post_save, sender=User)
def create_admin_user_for_superuser(sender, instance, created, **kwargs):
    """
    Signal to automatically create an AdminUser when a superuser is created.
    This ensures that 'python manage.py createsuperuser' works for the Admin Panel.
    """
    if created and instance.is_superuser:
        # Check if AdminUser already exists
        if not AdminUser.objects.filter(email=instance.email).exists():
            print(f"Signal: Creating AdminUser for superuser {instance.email}")
            admin = AdminUser.objects.create(
                email=instance.email,
                name=f"Admin {instance.email.split('@')[0]}",
                role='superadmin',
                is_active=True,
                can_manage_stocks=True
            )
            # Copy the password hash directly so they share the same password
            admin.password = instance.password
            admin.save()
            print(f"Signal: AdminUser created successfully.")

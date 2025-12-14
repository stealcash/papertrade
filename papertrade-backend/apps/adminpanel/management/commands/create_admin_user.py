from django.core.management.base import BaseCommand
from apps.adminpanel.models import AdminUser

class Command(BaseCommand):
    help = 'Create a new AdminUser (separate from User model)'

    def add_arguments(self, parser):
        parser.add_argument('--email', type=str, required=True, help='Admin email')
        parser.add_argument('--password', type=str, required=True, help='Admin password')
        parser.add_argument('--name', type=str, required=False, default='Admin', help='Admin name')
        parser.add_argument('--role', type=str, required=False, default='superadmin', help='Role (admin/superadmin)')

    def handle(self, *args, **options):
        email = options['email']
        password = options['password']
        name = options['name']
        role = options['role']

        if AdminUser.objects.filter(email=email).exists():
            self.stdout.write(self.style.WARNING(f'AdminUser with email {email} already exists.'))
            return

        admin = AdminUser.objects.create(
            email=email,
            name=name,
            role=role,
            is_active=True,
            can_manage_stocks=True
        )
        admin.set_password(password)
        admin.save()

        self.stdout.write(self.style.SUCCESS(f'Successfully created AdminUser: {email} ({role})'))

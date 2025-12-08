from django.core.management.base import BaseCommand
from apps.adminpanel.models import AdminUser


class Command(BaseCommand):
    help = 'Create a superadmin user'
    
    def add_arguments(self, parser):
        parser.add_argument('--email', type=str, help='Superadmin email')
        parser.add_argument('--password', type=str, help='Superadmin password')
    
    def handle(self, *args, **options):
        email = options.get('email')
        password = options.get('password')
        
        if not email:
            email = input('Enter superadmin email: ')
        
        if not password:
            password = input('Enter superadmin password: ')
        
        if AdminUser.objects.filter(email=email).exists():
            self.stdout.write(self.style.WARNING(f'AdminUser with email {email} already exists'))
            return
        
        admin = AdminUser(
            email=email,
            role='superadmin',
            is_active=True
        )
        admin.set_password(password)
        admin.save()
        
        self.stdout.write(self.style.SUCCESS(f'Superadmin user created successfully: {email}'))

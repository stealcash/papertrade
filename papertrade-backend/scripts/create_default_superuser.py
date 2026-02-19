import os
import sys
import django
from django.contrib.auth import get_user_model

# Setup Django environment
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

def create_superuser():
    User = get_user_model()
    email = "pawansaini312@gmail.com"
    password = "Game@123"
    
    if not User.objects.filter(email=email).exists():
        print(f"Creating superuser: {email}")
        User.objects.create_superuser(email, password)
        print("Superuser created successfully.")
    else:
        print("Superuser already exists.")

if __name__ == "__main__":
    create_superuser()

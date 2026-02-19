import os
import sys
import django

# Setup Django environment
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.db import connection

def reset_db_schema():
    """
    Drops the 'public' schema and recreates it.
    This effectively wipes all tables in a PostgreSQL database.
    """
    print("WARNING: This will drop the entire 'public' schema and all data!")
    print("Database: ", connection.settings_dict['NAME'])
    
    with connection.cursor() as cursor:
        print("Dropping schema public...")
        cursor.execute("DROP SCHEMA public CASCADE;")
        print("Creating schema public...")
        cursor.execute("CREATE SCHEMA public;")
        print("Granting permissions...")
        cursor.execute("GRANT ALL ON SCHEMA public TO public;")
        # Depending on the user role, you might need to grant to specific users, 
        # but 'public' usually covers the basics for a fresh start.
    
    print("Database schema reset successfully.")

if __name__ == "__main__":
    reset_db_schema()

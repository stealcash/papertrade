import os
import django
from django.db import connection

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

def verify_schema_logic():
    table_name = 'stock_price_daily'
    print(f"Verifying schema for table: {table_name}")
    
    with connection.cursor() as cursor:
        # Fetch Foreign Keys (Logic copied from updated views.py)
        cursor.execute("""
            SELECT
                kcu.column_name,
                ccu.table_name AS foreign_table_name,
                ccu.column_name AS foreign_column_name
            FROM 
                information_schema.key_column_usage AS kcu
            JOIN 
                information_schema.constraint_column_usage AS ccu
                ON kcu.constraint_name = ccu.constraint_name
                AND kcu.table_schema = ccu.table_schema
            WHERE 
                kcu.table_schema = 'public'
                AND kcu.table_name = %s
                AND kcu.constraint_name IN (
                    SELECT constraint_name 
                    FROM information_schema.table_constraints 
                    WHERE constraint_type = 'FOREIGN KEY'
                );
        """, [table_name])

        foreign_keys = []
        for row in cursor.fetchall():
            fk = {
                'column': row[0],
                'foreign_table': row[1],
                'foreign_column': row[2]
            }
            foreign_keys.append(fk)
            print(f"Found FK: {fk}")

    if len(foreign_keys) > 0:
        print("✅ SUCCESS: Foreign keys detected!")
    else:
        print("❌ FAILURE: No foreign keys detected.")

if __name__ == "__main__":
    verify_schema_logic()

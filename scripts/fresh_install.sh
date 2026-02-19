#!/bin/bash
set -e

# Get the absolute path to the project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$PROJECT_ROOT/papertrade-backend"

echo "=================================================="
echo "      PaperTrade: FRESH DATABASE INSTALL          "
echo "=================================================="
echo "WARNING: This will DELETE ALL DATA and reset migrations."
echo "Starting in 3 seconds..."
sleep 3

cd "$BACKEND_DIR"

# 1. Clean Migration Files
echo "[1/5] Cleaning old migration files..."
# Find and delete migration files in apps/ directories, keeping __init__.py
find apps -type f -path "*/migrations/*.py" -not -name "__init__.py" -delete
find apps -type f -path "*/migrations/*.pyc" -delete
find apps -type d -path "*/migrations/__pycache__" -exec rm -rf {} +

echo "      Migration files cleaned."

# 1.5 Setup Virtual Environment
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3.14 -m venv venv
fi

echo "Activating virtual environment..."
source venv/bin/activate

echo "Installing dependencies..."
pip install -r requirements.txt

# 2. Reset Database Schema
echo "[2/5] Resetting Database Schema (Dropping all tables)..."
# Using the python script we created
python3 scripts/reset_db_schema.py

# 3. Make Migrations
echo "[3/5] Creating fresh migrations..."
python3 manage.py makemigrations

# 4. Migrate
echo "[4/5] Applying migrations..."
python3 manage.py migrate


# 5. Create Default Superuser - REMOVED per user request (Manual Step)
# echo "[5/5] Creating default superuser..."
# python3 scripts/create_default_superuser.py

echo "=================================================="
echo "      Fresh Install COMPLETED                     "
echo "=================================================="
echo "Superadmin: superadmin@example.com / password123"
echo "User:       user@example.com / password123"
echo "=================================================="

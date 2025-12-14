#!/bin/bash
set -e

# Get the absolute path to the project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$PROJECT_ROOT/papertrade-backend"

echo "=================================================="
echo "      PaperTrade: CLEAN DATABASE RESET            "
echo "=================================================="
echo "WARNING: This will DELETE ALL DATA and reset migrations."
echo "         NO DATA will be seeded."
echo "Starting in 3 seconds..."
sleep 3

cd "$BACKEND_DIR"

# 1. Clean Migration Files
echo "[1/4] Cleaning old migration files..."
# Find and delete migration files in apps/ directories, keeping __init__.py
find apps -type f -path "*/migrations/*.py" -not -name "__init__.py" -delete
find apps -type f -path "*/migrations/*.pyc" -delete
find apps -type d -path "*/migrations/__pycache__" -exec rm -rf {} +

echo "      Migration files cleaned."

# 2. Reset Database Schema
echo "[2/4] Resetting Database Schema (Dropping all tables)..."
# Using the python script we created
python3 scripts/reset_db_schema.py

# 3. Make Migrations
echo "[3/4] Creating fresh migrations..."
python3 manage.py makemigrations

# 4. Migrate
echo "[4/4] Applying migrations..."
python3 manage.py migrate

echo "=================================================="
echo "      Clean Reset COMPLETED                       "
echo "=================================================="
echo "Database is now empty with fresh schema."
echo "You can now create your superadmin manually."
echo "=================================================="

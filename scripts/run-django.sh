#!/bin/bash

# Django Backend Startup Script
set -e

# echo "========================================="
# echo "Starting Django Backend"
# echo "========================================="

# Navigate to Django directory
cd "$(dirname "$0")/../papertrade-backend"

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    # echo "ERROR: Virtual environment not found!"
    # echo "Please run './restart.sh' first to set up the environment."
    exit 1
fi

# Activate virtual environment
# echo "Activating virtual environment..."
source venv/bin/activate

# Check if migrations are applied
# echo "Checking database migrations..."
python manage.py showmigrations | grep "\[ \]" && {
    # echo "WARNING: Some migrations are not applied!"
    # echo "Run: python manage.py migrate"
    : # Bash no-op if echo is commented
}

# Start Django
# echo ""
# echo "Starting Django development server on http://localhost:8000"
# echo "Admin: http://localhost:8000/admin/"
# echo "API Docs: http://localhost:8000/api/v1/docs"
# echo ""
# echo "Press Ctrl+C to stop"
# echo ""

python manage.py runserver 0.0.0.0:8000

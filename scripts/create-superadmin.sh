#!/bin/bash

# Create Superadmin Script
set -e

# echo "========================================="
# echo "Create Superadmin User"
# echo "========================================="

# Navigate to Django directory
cd "$(dirname "$0")/../papertrade-backend"

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    # echo "Creating virtual environment..."
    python3.14 -m venv venv
fi

# Activate virtual environment
# echo "Activating virtual environment..."
source venv/bin/activate

# Create superadmin
# echo ""
# echo "Creating superadmin user..."
# echo "You will be prompted to enter email and password."
# echo ""

python3 scripts/create_default_superuser.py

# echo ""
# echo "========================================="
# echo "Superadmin created successfully!"
# echo "========================================="
# echo ""
# echo "You can now login at:"
# echo "http://localhost:8000/admin/"
# echo ""

#!/bin/bash

# Admin Frontend Startup Script
set -e

# echo "========================================="
# echo "Starting Admin Frontend"
# echo "========================================="

# Navigate to admin frontend directory
cd "$(dirname "$0")/../papertrade-frontend-admin"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    # echo "WARNING: node_modules not found!"
    # echo "Installing dependencies..."
    npm install
fi

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    # echo "WARNING: .env.local file not found!"
    # echo "Creating default .env.local file..."
    echo "NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1" > .env.local
fi

# Start Admin Frontend
# echo ""
# echo "Starting Admin Frontend on http://localhost:4000"
# echo ""
# echo "Admin Login: http://localhost:4000/login"
# echo ""
# echo "Press Ctrl+C to stop"
# echo ""

npm run dev

#!/bin/bash

# Next.js Frontend Startup Script
set -e

echo "========================================="
echo "Starting Next.js Frontend"
echo "========================================="

# Navigate to frontend directory
cd "$(dirname "$0")/../papertrade-frontend"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "WARNING: node_modules not found!"
    echo "Installing dependencies..."
    npm install
fi

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo "WARNING: .env.local file not found!"
    echo "Creating default .env.local file..."
    cp .env.example .env.local
fi

# Start Next.js
echo ""
echo "Starting Next.js development server on http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop"
echo ""

npm run dev

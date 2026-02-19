#!/bin/bash

# Expo App Startup Script
set -e

# Navigate to app directory
cd "$(dirname "$0")/../papertrade-app"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    # echo "WARNING: node_modules not found!"
    # echo "Installing dependencies..."
    npm install
fi

# Start Expo
npm start

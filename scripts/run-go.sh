#!/bin/bash

# Go Service Startup Script
set -e

echo "========================================="
echo "Starting Go Data Service"
echo "========================================="

# Navigate to Go directory
cd "$(dirname "$0")/../papertrade-backend-go"

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "WARNING: .env file not found!"
    echo "Creating default .env file..."
    cp .env.example .env
fi

# Ensure dependencies are installed
echo "Checking Go dependencies..."
go mod tidy

# Start Go service
echo ""
echo "Starting Go service on http://localhost:8080"
echo "Health: http://localhost:8080/api/v1/health"
echo "Stocks: http://localhost:8080/api/v1/stocks/daily"
echo ""
echo "Press Ctrl+C to stop"
echo ""

go run cmd/main.go

#!/bin/bash

set -e

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# print_step() {
#     echo ""
#     echo "==> $1"
# }

# Function to check if a port is in use
check_port() {
    lsof -i :$1 > /dev/null 2>&1
}

# echo "=========================================
# PaperTrade - Complete Setup & Run Script
# ========================================="

# Kill existing processes on ports if running
# print_step "Checking for existing processes..."
for port in 8000 8080 3000 4000; do
    if check_port $port; then
        # echo "Port $port is in use. Killing process..."
        lsof -ti :$port | xargs kill -9 2>/dev/null || true
        # sleep 1
    fi
done

# Django Backend
# print_step "Setting up Django backend..."
cd "$PROJECT_ROOT/papertrade-backend"

if [ ! -d "venv" ]; then
    # print_step "Creating virtual environment..."
    python3 -m venv venv
fi

# print_step "Activating virtual environment..."
source venv/bin/activate

# print_step "Upgrading pip and setuptools..."
pip install --upgrade pip setuptools wheel

# print_step "Installing Python dependencies..."
pip install -r requirements.txt

# Run migrations
# print_step "Running Django migrations..."
# python manage.py makemigrations users stocks sectors strategies backtests payments sync notifications adminpanel
python manage.py migrate

# Seed data
# print_step "Seeding sample data..."
# python manage.py seed_data || true

# Go Backend
# print_step "Setting up Go service..."
cd "$PROJECT_ROOT/papertrade-backend-go"

# print_step "Installing Go dependencies..."
go mod tidy

# Frontend (User)
# print_step "Setting up Next.js frontend (User)..."
cd "$PROJECT_ROOT/papertrade-frontend"

# print_step "Installing npm dependencies..."
npm install --legacy-peer-deps

# Frontend (Admin)
# print_step "Setting up Next.js frontend (Admin)..."
cd "$PROJECT_ROOT/papertrade-frontend-admin"

# print_step "Installing npm dependencies..."
npm install --legacy-peer-deps

# Done with setup
cd "$PROJECT_ROOT"

# print_step "Setup complete! Now starting all services..."

# echo ""
# echo "========================================="
# echo "Starting All Services"
# echo "========================================="
# echo ""

# Start Django Backend in background
# print_step "Starting Django Backend (port 8000)..."
cd "$PROJECT_ROOT"
bash scripts/run-django.sh > logs/django.log 2>&1 &
DJANGO_PID=$!
# echo "Django started with PID: $DJANGO_PID"
# sleep 5

# Start Celery Worker in background
# print_step "Starting Celery Worker..."
cd "$PROJECT_ROOT/papertrade-backend"
source venv/bin/activate
celery -A config worker -l info > ../logs/celery-worker.log 2>&1 &
CELERY_WORKER_PID=$!
# echo "Celery Worker started with PID: $CELERY_WORKER_PID"
# sleep 2

# Start Celery Beat in background
# print_step "Starting Celery Beat..."
celery -A config beat -l info > ../logs/celery-beat.log 2>&1 &
CELERY_BEAT_PID=$!
# echo "Celery Beat started with PID: $CELERY_BEAT_PID"
# sleep 2

# Start Go Backend in background
# print_step "Starting Go Backend (port 8080)..."
cd "$PROJECT_ROOT"
bash scripts/run-go.sh > logs/go.log 2>&1 &
GO_PID=$!
# echo "Go service started with PID: $GO_PID"
# sleep 2

# Start User Frontend in background
# print_step "Starting User Frontend (port 3000)..."
cd "$PROJECT_ROOT"
bash scripts/run-frontend.sh > logs/frontend.log 2>&1 &
FRONTEND_PID=$!
# echo "User Frontend started with PID: $FRONTEND_PID"
# sleep 2

# Start Admin Frontend in background
# print_step "Starting Admin Frontend (port 4000)..."
cd "$PROJECT_ROOT"
bash scripts/run-admin-frontend.sh > logs/admin-frontend.log 2>&1 &
ADMIN_FRONTEND_PID=$!
# echo "Admin Frontend started with PID: $ADMIN_FRONTEND_PID"
# sleep 2

# echo ""
# echo "========================================="
# echo "✅ All Services Started Successfully!"
# echo "========================================="
# echo ""
# echo "📍 Access Points:"
# echo "  User Frontend:   http://localhost:3000"
# echo "  Admin Frontend:  http://localhost:4000"
# echo "  Django API:      http://localhost:8000/api/v1"
# echo "  Swagger Docs:    http://localhost:8000/api/v1/docs"
# echo "  Go Service:      http://localhost:8080/api/v1"
# echo ""
# echo "📝 Process IDs:"
# echo "  Django:          $DJANGO_PID"
# echo "  Celery Worker:   $CELERY_WORKER_PID"
# echo "  Celery Beat:     $CELERY_BEAT_PID"
# echo "  Go Service:      $GO_PID"
# echo "  User Frontend:   $FRONTEND_PID"
# echo "  Admin Frontend:  $ADMIN_FRONTEND_PID"
# echo ""
# echo "📋 Logs are available in:"
# echo "  Django:          logs/django.log"
# echo "  Celery Worker:   logs/celery-worker.log"
# echo "  Celery Beat:     logs/celery-beat.log"
# echo "  Go Service:      logs/go.log"
# echo "  User Frontend:   logs/frontend.log"
# echo "  Admin Frontend:  logs/admin-frontend.log"
# echo ""
# echo "🛑 To stop all services:"
# echo "  kill $DJANGO_PID $GO_PID $FRONTEND_PID $ADMIN_FRONTEND_PID $CELERY_WORKER_PID $CELERY_BEAT_PID"
# echo "  OR run: lsof -ti :8000,:8080,:3000,:4000 | xargs kill -9"
# echo "========================================="
# echo ""

# print_step "All systems running! Press Ctrl+C to stop monitoring."
# echo "Services are running in background. You can close this terminal."

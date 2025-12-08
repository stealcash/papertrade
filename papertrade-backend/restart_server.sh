#!/bin/bash
# Kill all Django server processes
echo "Killing old Django processes..."
pkill -9 -f "manage.py runserver"
sleep 1

# Start fresh server
echo "Starting fresh Django server..."
cd /Users/chat360team/Documents/papertrade/papertrade-backend
nohup /Users/chat360team/Documents/papertrade/papertrade-backend/venv/bin/python manage.py runserver 0.0.0.0:8000 > django_server.log 2>&1 &

sleep 2
echo "✓ Django server restarted (PID: $!)"
echo "Check logs: tail -f django_server.log"

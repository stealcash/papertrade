#!/bin/bash

# Port 8001
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT/papertrade-backend-fast"

# Setup venv if not exists
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi

source venv/bin/activate
pip install -r requirements.txt

# Run uvicorn
exec uvicorn main:app --host 0.0.0.0 --port 8001 --reload

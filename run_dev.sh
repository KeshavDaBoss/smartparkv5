#!/bin/bash

# Trap Ctrl+C to kill all background processes
trap "trap - SIGTERM && kill -- -$$" SIGINT SIGTERM EXIT

echo "Starting SmartPark..."

# Start Backend
echo "Starting Backend (FastAPI)..."
source venv/bin/activate
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

# Wait for backend to be ready (dumb wait)
sleep 2

# Start Frontend
echo "Starting Frontend (Vite)..."
cd frontend
npm run dev &
FRONTEND_PID=$!

echo "SmartPark is running!"
echo "Backend: http://localhost:8000"
echo "Frontend: http://localhost:5173"
echo "Press Ctrl+C to stop."

wait

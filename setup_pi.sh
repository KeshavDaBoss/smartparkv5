#!/bin/bash

# Setup script for SmartPark on Raspberry Pi

echo "Setting up SmartPark environment..."

# 1. System Dependencies (Optional, user might need sudo)
# echo "Installing system dependencies..."
# sudo apt-get update && sudo apt-get install -y python3-venv python3-pip nodejs npm

# 2. Python Setup
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
    
    echo "activating venv..."
    source venv/bin/activate
    
    echo "Installing backend requirements..."
    pip install -r backend/requirements.txt
    
    # RPi.GPIO is needed on Pi, but usually pre-installed or needs specific install.
    # It's not in requirements.txt because we developed on Mac.
    pip install RPi.GPIO
else
    echo "venv already exists."
fi

# 3. Frontend Setup
if [ -d "frontend" ]; then
    echo "Installing frontend dependencies..."
    cd frontend
    if [ ! -d "node_modules" ]; then
        npm install
    else
        echo "node_modules exists."
    fi
    cd ..
else
    echo "Error: frontend directory not found!"
    exit 1
fi

echo "Setup Complete! You can now run ./run_dev.sh"

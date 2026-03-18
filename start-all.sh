#!/bin/bash

# Start backend in background
echo "🚀 Starting backend on port 3000..."
node src/server.js &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 2

# Start frontend
echo "🎨 Starting frontend on port 5173..."
cd client && npm run dev

# Cleanup on exit
trap "kill $BACKEND_PID" EXIT

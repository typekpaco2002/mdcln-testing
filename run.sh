#!/bin/bash

echo "🚀 Starting ModelClone..."

# Install frontend dependencies if needed
if [ ! -d "client/node_modules" ]; then
  echo "📦 Installing frontend dependencies..."
  cd client && npm install --legacy-peer-deps && cd ..
fi

# Start backend on port 3000
echo "🔧 Starting backend on port 3000..."
PORT=3000 node src/server.js &
BACKEND_PID=$!

# Wait for backend to be ready
sleep 3

# Start frontend on port 5000 (Replit webview port)
echo "🎨 Starting frontend on port 5000..."
cd client && PORT=5000 npm run dev

# Cleanup on exit
trap "kill $BACKEND_PID" EXIT

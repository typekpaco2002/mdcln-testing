#!/bin/bash
# Production startup script - runs database migrations then starts the app

echo "Running database migrations..."
npx prisma migrate deploy

if [ $? -ne 0 ]; then
  echo "Migration failed! Exiting..."
  exit 1
fi

echo "Migrations complete. Starting application..."
NODE_ENV=production node dist/index.js

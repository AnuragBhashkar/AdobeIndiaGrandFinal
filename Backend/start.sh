#!/bin/bash
set -e

# Start Redis in background
echo "Starting Redis..."
redis-server /usr/local/etc/redis/redis.conf &
REDIS_PID=$!

# Wait for Redis to be ready
echo "Waiting for Redis..."
until redis-cli ping &>/dev/null; do
  sleep 1
done
echo "✅ Redis is ready!"

# Start backend
echo "Starting FastAPI..."
exec uvicorn main:app --host 0.0.0.0 --port 8080 --reload

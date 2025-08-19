#!/bin/bash
set -e

# If Adobe key is provided at runtime, export it so frontend can use it
if [ -n "$ADOBE_EMBED_API_KEY" ]; then
  export REACT_APP_ADOBE_CLIENT_ID=$ADOBE_EMBED_API_KEY
fi

# Start Redis in background, saving to the /data volume
redis-server --dir /data &

# Start Uvicorn in foreground
exec uvicorn main:app --host 0.0.0.0 --port 8080
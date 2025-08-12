# redis_client.py
import os
import redis
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# This variable will hold the single Redis client instance
redis_client = None

def get_redis_client():
    """
    Initializes and returns a singleton Redis client instance.
    This ensures that only one connection is made to the Redis server.
    """
    global redis_client
    if redis_client is None:
        try:
            # Initialize the connection
            redis_client = redis.Redis(
                host=os.getenv("REDIS_HOST", "localhost"),
                port=int(os.getenv("REDIS_PORT", 6379)),
                db=0,
                decode_responses=True # Ensure responses are strings, not bytes
            )
            # Test the connection
            redis_client.ping()
            print("✅ Connected to Redis successfully.")
        except redis.exceptions.ConnectionError as e:
            print(f"❌ CRITICAL ERROR: Could not connect to Redis. Chat history will not be available. Error: {e}")
            # Set to None so the application can handle the failure gracefully
            redis_client = None
    return redis_client

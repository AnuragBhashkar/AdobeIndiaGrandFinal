# session_manager.py
import json
import uuid
import logging
from typing import List, Dict, Any, Optional

from redis_client import get_redis_client

# --- Constants for Redis Keys ---
# Using constants avoids "magic strings" and makes key management easier.
SESSION_META_PREFIX = "session:meta:"
SESSION_HISTORY_PREFIX = "session:history:"
SESSION_ANALYSIS_PREFIX = "session:analysis:"

# --- Setup Logging ---
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def create_session(analysis_result: Dict[str, Any]) -> Optional[str]:
    """
    Creates a new chat session in Redis using an optimized data structure.

    Instead of one large JSON blob, we use:
    - A Hash for metadata (fast field access).
    - A List for chat history (fast appends).
    - A String for the large analysis result.

    Args:
        analysis_result: The initial analysis data for the session.

    Returns:
        The unique session ID, or None if Redis is unavailable.
    """
    redis = get_redis_client()
    if not redis:
        logger.error("❌ Redis client is not available. Failed to create session.")
        return None

    session_id = str(uuid.uuid4())
    metadata = analysis_result.get("metadata", {})

    # Use a Redis transaction (pipeline) for atomicity.
    # This ensures all commands succeed or none do.
    with redis.pipeline() as pipe:
        # 1. Store metadata in a Hash for efficient field retrieval
        meta_key = f"{SESSION_META_PREFIX}{session_id}"
        pipe.hset(meta_key, mapping={
            "persona": metadata.get("persona", ""),
            "job_to_be_done": metadata.get("job_to_be_done", ""),
            "processing_timestamp": metadata.get("processing_timestamp", ""),
            "language": metadata.get("language", "en"),
            "doc_count": len(metadata.get("input_documents", []))
        })

        # 2. Store the large, read-only analysis result in a simple key
        analysis_key = f"{SESSION_ANALYSIS_PREFIX}{session_id}"
        pipe.set(analysis_key, json.dumps(analysis_result))
        
        # 3. Initialize the chat history (not strictly needed, but good practice)
        history_key = f"{SESSION_HISTORY_PREFIX}{session_id}"
        # This command is commented out as it is not necessary to initialize an empty list
        # pipe.rpush(history_key, "INIT") 
        # pipe.lpop(history_key, "INIT")
        
        pipe.execute()

    logger.info(f"✅ New session created with optimized structure. ID: {session_id}")
    return session_id


def get_session(session_id: str) -> Optional[Dict[str, Any]]:
    """
    Retrieves and reconstructs a full session from Redis.

    Args:
        session_id: The ID of the session to retrieve.

    Returns:
        A dictionary containing the session data, or None if not found.
    """
    redis = get_redis_client()
    if not redis:
        return None
    
    analysis_key = f"{SESSION_ANALYSIS_PREFIX}{session_id}"
    history_key = f"{SESSION_HISTORY_PREFIX}{session_id}"

    analysis_data_json = redis.get(analysis_key)
    if not analysis_data_json:
        return None  # Session does not exist

    # Fetch chat history and decode messages from JSON
    chat_history_raw = redis.lrange(history_key, 0, -1)
    chat_history = [json.loads(msg) for msg in chat_history_raw]

    return {
        "analysis": json.loads(analysis_data_json),
        "chat_history": chat_history
    }


def add_message_to_history(session_id: str, message: Dict[str, str]):
    """
    Adds a new message to a session's chat history efficiently using RPUSH.
    This avoids the slow read-modify-write pattern.

    Args:
        session_id: The ID of the session to update.
        message: The message to add (e.g., {"role": "user", "content": "..."}).
    """
    redis = get_redis_client()
    if not redis:
        return

    history_key = f"{SESSION_HISTORY_PREFIX}{session_id}"
    redis.rpush(history_key, json.dumps(message))


def get_all_sessions_metadata() -> List[Dict[str, Any]]:
    """
    Retrieves metadata for all sessions efficiently.
    
    - Uses SCAN instead of KEYS to avoid blocking production servers.
    - Fetches only the small metadata hashes, not the entire session objects.
    """
    redis = get_redis_client()
    if not redis:
        return []

    sessions_metadata = []
    # Use scan_iter for safe iteration over keys in production
    # The variable is renamed to 'key' since it's now a string.
    for key in redis.scan_iter(f"{SESSION_META_PREFIX}*"):
        # The key is already a string, so we just replace the prefix.
        session_id = key.replace(SESSION_META_PREFIX, "")
        
        # Fetch the metadata hash. The keys and values will also be strings.
        metadata = redis.hgetall(key)
        
        # Build the dictionary using string keys and values (no .decode() needed)
        sessions_metadata.append({
            "id": session_id,
            "persona": metadata.get('persona', ''),
            "job": metadata.get('job_to_be_done', ''),
            "timestamp": metadata.get('processing_timestamp', ''),
            "doc_count": int(metadata.get('doc_count', 0))
        })
    
    # Robustly sort by timestamp, newest first
    sessions_metadata.sort(
        key=lambda x: x.get('timestamp') or '1970-01-01T00:00:00Z', 
        reverse=True
    )
    
    return sessions_metadata
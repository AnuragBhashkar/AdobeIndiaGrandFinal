# session_manager.py
import json
import uuid
from typing import List, Dict, Any

# Import the function to get the Redis client instance
from redis_client import get_redis_client

def create_session(analysis_result: Dict[str, Any]) -> str:
    """
    Creates a new chat session in Redis.

    Args:
        analysis_result: The initial analysis data for the session.

    Returns:
        The unique session ID for the newly created session, or None if failed.
    """
    redis = get_redis_client()
    if not redis:
        return None

    session_id = str(uuid.uuid4())
    session_data = {
        "analysis": analysis_result,
        "chat_history": []  # Initialize with an empty chat history
    }
    
    # Store the session data in Redis with a key like "session:your-uuid-here"
    redis.set(f"session:{session_id}", json.dumps(session_data))
    print(f"✅ New session started. ID: {session_id}")
    return session_id

def get_session(session_id: str) -> Dict[str, Any]:
    """
    Retrieves a full session (analysis and chat history) from Redis.

    Args:
        session_id: The ID of the session to retrieve.

    Returns:
        A dictionary containing the session data, or None if not found.
    """
    redis = get_redis_client()
    if not redis:
        return None
    
    session_data_json = redis.get(f"session:{session_id}")
    return json.loads(session_data_json) if session_data_json else None

def add_message_to_history(session_id: str, message: Dict[str, str]):
    """
    Adds a new message to a session's chat history in Redis.

    Args:
        session_id: The ID of the session to update.
        message: The message to add (e.g., {"role": "user", "content": "..."}).
    """
    redis = get_redis_client()
    if not redis:
        return

    session_data = get_session(session_id)
    if session_data:
        session_data["chat_history"].append(message)
        redis.set(f"session:{session_id}", json.dumps(session_data))

def get_all_sessions_metadata() -> List[Dict[str, Any]]:
    """
    Retrieves metadata for all stored chat sessions to display in the history list.

    Returns:
        A list of dictionaries, each containing metadata for a session.
    """
    redis = get_redis_client()
    if not redis:
        return []

    session_keys = redis.keys("session:*")
    sessions_metadata = []
    for key in session_keys:
        session_data = get_session(key.replace("session:", ""))
        if session_data:
            metadata = session_data.get("analysis", {}).get("metadata", {})
            sessions_metadata.append({
                "id": key.replace("session:", ""),
                "persona": metadata.get("persona"),
                "job": metadata.get("job_to_be_done"),
                "timestamp": metadata.get("processing_timestamp"),
                "doc_count": len(metadata.get("input_documents", []))
            })
    # Sort by timestamp, newest first
    sessions_metadata.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
    return sessions_metadata

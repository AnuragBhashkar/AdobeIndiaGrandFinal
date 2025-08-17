import os
import json
import time
import shutil
import fitz
import uuid
import asyncio
import random
from typing import List, Dict, Any
from fastapi.staticfiles import StaticFiles
import httpx
from dotenv import load_dotenv
from pydantic import BaseModel
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, BackgroundTasks, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse

# --- Local Imports ---
from redis_client import get_redis_client
from session_manager import (
    create_session,
    get_session,
    add_message_to_history,
    get_all_sessions_metadata_for_user,
    update_session,
    create_user,
    get_user,
    authenticate_user
)
from auth import get_password_hash

# --- TTS Library Imports ---
import azure.cognitiveservices.speech as speechsdk
import pyttsx3

load_dotenv()

# --- Pydantic Models ---
class ChatRequest(BaseModel):
    sessionId: str
    query: str

class PodcastRequest(BaseModel):
    analysis_data: Dict[str, Any]
    language: str = "en"

class TranslateInsightsRequest(BaseModel):
    sessionId: str

class SelectionInsightsRequest(BaseModel):
    text: str

class UserCreate(BaseModel):
    email: str
    password: str
    name: str

class UserLogin(BaseModel):
    email: str
    password: str

# --- Initialize FastAPI App ---
app = FastAPI(
    title="PDF Intelligence API",
    description="API for persona-driven PDF analysis, chat, and multi-language audio summaries, powered by Gemini 1.5 Flash.",
    version="3.0.2" # Version bump for bug fix
)
SESSION_FILES_DIR = "session_files"
os.makedirs(SESSION_FILES_DIR, exist_ok=True)

app.mount("/session_files", StaticFiles(directory=SESSION_FILES_DIR), name="session_files")

# --- Add CORS Middleware ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Global Variables & Constants ---
SUPPORTED_LANGUAGES = { "en": "English", "hi": "Hindi" }
AZURE_VOICE_MAP = { "en": "en-US-JennyNeural", "hi": "hi-IN-SwaraNeural" }
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")

# --- App Startup Event ---
@app.on_event("startup")
async def startup_event():
    get_redis_client()
    if not GEMINI_API_KEY:
        print("CRITICAL WARNING: GEMINI_API_KEY environment variable is not set!")
    print("Application startup complete.")

# ==============================================================================
# Authentication Dependency
# ==============================================================================

async def get_current_user(authorization: str = Header(...)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header missing")
    
    user_email = authorization
    user = get_user(user_email)
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    return user

# ==============================================================================
# Helper Functions
# ==============================================================================

def deep_merge_dicts(d1: dict, d2: dict) -> dict:
    for k, v in d2.items():
        if k in d1 and isinstance(d1[k], dict) and isinstance(v, dict):
            deep_merge_dicts(d1[k], v)
        else:
            d1[k] = v
    return d1

# ==============================================================================
# Centralized Gemini API Caller with Exponential Backoff
# ==============================================================================

async def call_gemini_api(payload: Dict[str, Any], timeout: float = 120.0) -> Dict[str, Any]:
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="Gemini API key is not configured on the server.")

    api_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key={GEMINI_API_KEY}"
    max_retries = 5
    base_wait_time = 1

    for attempt in range(max_retries):
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                response = await client.post(api_url, json=payload)
                if response.status_code == 429:
                    wait_time = (base_wait_time * (2 ** attempt)) + random.uniform(0, 1)
                    print(f"WARNING: Rate limit exceeded (429). Retrying in {wait_time:.2f} seconds...")
                    await asyncio.sleep(wait_time)
                    continue
                response.raise_for_status()
                return response.json()
        except httpx.ReadTimeout:
            if attempt < max_retries - 1:
                await asyncio.sleep(1)
                continue
            raise HTTPException(status_code=504, detail="The request to the AI model timed out.")
        except httpx.RequestError as e:
            if attempt < max_retries - 1:
                await asyncio.sleep(1)
                continue
            raise HTTPException(status_code=503, detail=f"Could not connect to the AI service: {e}")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {e}")
    raise HTTPException(status_code=503, detail="The AI service is currently unavailable after multiple retries.")

# ==============================================================================
# Core Analysis Function (Single Prompt)
# ==============================================================================

async def generate_comprehensive_analysis(full_text_context: str, persona: str, job_to_be_done: str) -> Dict[str, Any]:
    json_schema = {
        "type": "OBJECT",
        "properties": {
            "top_sections": {
                "type": "ARRAY",
                "items": {
                    "type": "OBJECT",
                    "properties": {
                        "importance_rank": {"type": "INTEGER"},
                        "document": {"type": "STRING"},
                        "page_number": {"type": "INTEGER"},
                        "section_title": {"type": "STRING"},
                        "subsection_analysis": {"type": "STRING", "description": "A relevant snippet from the section."},
                        "reasoning": {"type": "STRING"}
                    },
                    "required": ["importance_rank", "document", "page_number", "section_title", "subsection_analysis", "reasoning"]
                }
            },
            "llm_insights": {
                "type": "OBJECT",
                "properties": {
                    "key_insights": {"type": "ARRAY", "items": {"type": "STRING"}},
                    "did_you_know": {"type": "ARRAY", "items": {"type": "STRING"}},
                    "cross_document_connections": {"type": "ARRAY", "items": {"type": "STRING"}}
                },
                "required": ["key_insights", "did_you_know", "cross_document_connections"]
            }
        },
        "required": ["top_sections", "llm_insights"]
    }

    prompt = f"""
    You are an expert research assistant acting as a '{persona}' whose goal is to '{job_to_be_done}'.
    Analyze the full text from the documents provided below.

    **Your Tasks:**
    1.  **Identify Top 3 Sections:** From all the text, identify the top 3 most relevant sections that directly help with your goal. For each, provide the document name, a likely page number, a title for the section, a direct quote for the 'subsection_analysis' of 4-5 lines, and a brief reasoning for its importance.
    2.  **Generate Insights:** Based on your analysis of the entire document set, provide the following, with each category's content being 10-20 lines long:
        - **key_insights**: 2-3 crucial takeaways.
        - **did_you_know**: 2-3 surprising or interesting facts, phrased as questions.
        - **cross_document_connections**: 1-2 connections, contradictions, or counterpoints you found by comparing information across the different documents. If none exist, state that clearly.

    **Full Text from Documents:**
    {full_text_context}

    **Instructions:**
    Respond ONLY with a single JSON object that strictly adheres to the specified schema. Do not include any additional text, explanations, or markdown formatting.
    """

    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"responseMimeType": "application/json", "responseSchema": json_schema}
    }

    try:
        response_json = await call_gemini_api(payload)
        return json.loads(response_json['candidates'][0]['content']['parts'][0]['text'])
    except Exception as e:
        return {
            "top_sections": [],
            "llm_insights": {
                "key_insights": [f"Failed to generate insights: {e}"],
                "did_you_know": [],
                "cross_document_connections": []
            }
        }

async def run_pipeline(persona: str, job_to_be_done: str, pdf_dir: str) -> Dict[str, Any]:
    full_text_parts = []
    file_names = []
    for filename in os.listdir(pdf_dir):
        if filename.lower().endswith(".pdf"):
            file_path = os.path.join(pdf_dir, filename)
            file_names.append(filename)
            try:
                doc = fitz.open(file_path)
                full_text_parts.append(f"--- START OF DOCUMENT: {filename} ---\n")
                for page_num, page in enumerate(doc):
                    full_text_parts.append(f"== Page {page_num + 1} ==\n")
                    full_text_parts.append(page.get_text())
                full_text_parts.append(f"\n--- END OF DOCUMENT: {filename} ---\n\n")
            except Exception as e:
                print(f"❌ Error reading {file_path}: {e}")
                full_text_parts.append(f"--- ERROR READING DOCUMENT: {filename} ---")
    
    full_text_context = "".join(full_text_parts)

    final_result = {
        "metadata": {
            "input_documents": file_names,
            "persona": persona,
            "job_to_be_done": job_to_be_done,
            "processing_timestamp": time.strftime("%Y-%m-%dT%H:%M:%S")
        },
        "top_sections": [],
        "llm_insights": {
            "key_insights": [],
            "did_you_know": [],
            "cross_document_connections": []
        }
    }

    analysis_result = await generate_comprehensive_analysis(full_text_context, persona, job_to_be_done)

    if analysis_result:
        final_result = deep_merge_dicts(final_result, analysis_result)
    return final_result

# ==============================================================================
#  API Endpoints
# ==============================================================================

@app.post("/register")
async def register_user(user: UserCreate):
    db_user = get_user(user.email)
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = get_password_hash(user.password)
    create_user(user.email, hashed_password, user.name)
    return {"message": "User created successfully"}

@app.post("/login")
async def login_for_access_token(user: UserLogin):
    authenticated_user = authenticate_user(user.email, user.password)
    if not authenticated_user:
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    
    return {"access_token": user.email, "token_type": "bearer", "user_name": authenticated_user['name']}

@app.post("/analyze/")
async def analyze_documents(
    files: List[UploadFile] = File(...), 
    persona: str = Form(...), 
    job_to_be_done: str = Form(...), 
    sessionId: str = Form(None),
    current_user: dict = Depends(get_current_user)
):
    if not get_redis_client():
        raise HTTPException(status_code=503, detail="Redis service is unavailable.")

    user_email = current_user['email']
    session_dir_name = sessionId if sessionId else str(uuid.uuid4())
    session_path = os.path.join(SESSION_FILES_DIR, session_dir_name)
    os.makedirs(session_path, exist_ok=True)

    file_paths = []
    temp_dir = f"temp_{uuid.uuid4()}"
    os.makedirs(temp_dir)
    try:
        for file in files:
            file_location = os.path.join(session_path, file.filename)
            with open(file_location, "wb+") as file_object:
                file_object.write(file.file.read())
            file_paths.append(f"/session_files/{session_dir_name}/{file.filename}")

            temp_file_location = os.path.join(temp_dir, file.filename)
            with open(temp_file_location, "wb") as buffer:
                 with open(file_location, "rb") as f:
                    buffer.write(f.read())

        analysis_result = await run_pipeline(persona=persona, job_to_be_done=job_to_be_done, pdf_dir=temp_dir)
        analysis_result["metadata"]["file_paths"] = file_paths

        if sessionId:
            update_session(sessionId, analysis_result)
            current_session_id = sessionId
        else:
            current_session_id = create_session(analysis_result, user_email)
            if not current_session_id:
                raise HTTPException(status_code=500, detail="Failed to create a new session.")

        return JSONResponse(content={"sessionId": current_session_id, "analysis": analysis_result})
    finally:
        if os.path.exists(temp_dir):
            shutil.rmtree(temp_dir)

@app.post("/chat/")
async def chat_with_documents(request: ChatRequest, current_user: dict = Depends(get_current_user)):
    session_data = get_session(request.sessionId)
    if not session_data:
        raise HTTPException(status_code=404, detail="Chat session not found.")

    add_message_to_history(request.sessionId, {"role": "user", "content": request.query})
    updated_session_data = get_session(request.sessionId)

    prompt = f"You are a helpful assistant. Based on the initial analysis context and the conversation history, answer the user's last query. Do not give the results from outside the documents uploaded.\n\nContext: {json.dumps(updated_session_data['analysis'])}\n\nHistory: {updated_session_data['chat_history']}\n\nUser Query: {request.query}"
    payload = {"contents": [{"parts": [{"text": prompt}]}]}
    
    response_json = await call_gemini_api(payload)
    bot_response_content = response_json['candidates'][0]['content']['parts'][0]['text']
    
    bot_message = {"role": "bot", "content": bot_response_content}
    add_message_to_history(request.sessionId, bot_message)
    return JSONResponse(content=bot_message)

@app.post("/insights-on-selection")
async def get_insights_on_selection(request: SelectionInsightsRequest, current_user: dict = Depends(get_current_user)):
    prompt = f"""
    You are an expert research assistant. Your task is to analyze the provided documents and deliver a structured analysis of related sections and subsections across all the documents.

    **Instructions:**
    1.  **Identify Core Themes:** Read through the documents to identify the main themes or topics that connect different sections.
    2.  **Group and Analyze:** For each theme, group together all the relevant sections and subsections from the documents.
    3.  **Provide a Cohesive Summary:** Synthesize the information from the grouped sections into a concise analysis that explains the theme and how the different sections relate to it.

    **Text for Analysis:**
    ---
    {request.text}
    ---

    Respond ONLY with a single JSON object with the keys "summary", "key_takeaways" (as an array of strings), and "potential_questions" (as an array of strings). Do not include any other text or markdown.
    """

    json_schema = {
        "type": "OBJECT",
        "properties": {
            "summary": {"type": "STRING"},
            "key_takeaways": {"type": "ARRAY", "items": {"type": "STRING"}},
            "potential_questions": {"type": "ARRAY", "items": {"type": "STRING"}}
        },
        "required": ["summary", "key_takeaways", "potential_questions"]
    }

    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"responseMimeType": "application/json", "responseSchema": json_schema}
    }

    try:
        response_json = await call_gemini_api(payload)
        insights = json.loads(response_json['candidates'][0]['content']['parts'][0]['text'])
        return JSONResponse(content=insights)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate insights: {e}")

@app.get("/sessions/")
async def get_sessions_list(current_user: dict = Depends(get_current_user)):
    user_email = current_user['email']
    metadata = get_all_sessions_metadata_for_user(user_email)
    return JSONResponse(content=metadata)

@app.get("/sessions/{session_id}")
async def get_session_details(session_id: str, current_user: dict = Depends(get_current_user)):
    session_data = get_session(session_id)
    if not session_data:
        raise HTTPException(status_code=404, detail="Session not found.")
    
    if session_data['analysis']['metadata'].get('user_id') != current_user['email']:
        raise HTTPException(status_code=403, detail="Not authorized to access this session")

    return JSONResponse(content=session_data)

# ==============================================================================
#  Translation & Podcast Endpoints
# ==============================================================================

async def translate_batch_gemini(insights_dict: Dict[str, List[str]], target_language: str) -> Dict[str, List[str]]:
    language_name = SUPPORTED_LANGUAGES.get(target_language)
    if not language_name: return {"error": "Unsupported language."}

    prompt = f"Translate all the text values in the following JSON object into {language_name}. Maintain the exact same JSON structure and keys. Respond ONLY with the final JSON object.\n\nInput JSON:\n{json.dumps(insights_dict, indent=2)}"
    json_schema = {
        "type": "OBJECT",
        "properties": {key: {"type": "ARRAY", "items": {"type": "STRING"}} for key in insights_dict.keys()},
        "required": list(insights_dict.keys())
    }
    payload = {"contents": [{"parts": [{"text": prompt}]}],"generationConfig": {"responseMimeType": "application/json","responseSchema": json_schema}}

    try:
        response_json = await call_gemini_api(payload)
        return json.loads(response_json['candidates'][0]['content']['parts'][0]['text'])
    except Exception as e:
        return {"error": f"Failed to translate batch: {e}"}

@app.post("/translate-insights/")
async def translate_insights_endpoint(request: TranslateInsightsRequest, current_user: dict = Depends(get_current_user)):
    session_data = get_session(request.sessionId)
    if not session_data or "analysis" not in session_data:
        raise HTTPException(status_code=404, detail="Session or analysis data not found.")

    llm_insights = session_data["analysis"].get("llm_insights")
    if not llm_insights:
        raise HTTPException(status_code=400, detail="No insights found in this session to translate.")

    keys_to_translate = ['key_insights', 'did_you_know', 'cross_document_connections']
    insights_for_translation = {key: llm_insights.get(key, []) for key in keys_to_translate if llm_insights.get(key)}

    if not insights_for_translation:
        return JSONResponse(content={"message": "No text found in insights to translate."})

    translated_insights = await translate_batch_gemini(insights_for_translation, "hi")
    if "error" in translated_insights:
        raise HTTPException(status_code=500, detail=translated_insights["error"])
    return JSONResponse(content={"translated_insights": translated_insights})

async def generate_podcast_summary_script(analysis_data: dict) -> str:
    metadata = analysis_data.get("metadata", {})
    llm_insights = analysis_data.get("llm_insights", {})
    if not llm_insights: return "No insights were generated for this analysis."

    prompt = f"You are a podcast host. Create an engaging, narrative-style podcast script of 400-500 words based on the provided JSON data. The target audience is a '{metadata.get('persona', 'professional')}' who wants to '{metadata.get('job_to_be_done', 'understand key topics')}'. Structure your script with an introduction, a body that weaves the insights into a cohesive story, and a conclusion. Respond ONLY with the text of the podcast script.\n\nData: {json.dumps(llm_insights, indent=2)}"
    payload = {"contents": [{"parts": [{"text": prompt}]}]}
    response_json = await call_gemini_api(payload)
    return response_json['candidates'][0]['content']['parts'][0]['text']

async def translate_text_gemini(text: str, target_language: str) -> str:
    language_name = SUPPORTED_LANGUAGES.get(target_language)
    if not language_name: return "Error: Unsupported language."
    prompt = f"Translate the following text into {language_name}. Provide only the translated text.\n\n---\n\n{text}"
    payload = {"contents": [{"parts": [{"text": prompt}]}]}
    response_json = await call_gemini_api(payload)
    return response_json['candidates'][0]['content']['parts'][0]['text']

@app.post("/generate-podcast/")
async def generate_podcast_endpoint(request: PodcastRequest, background_tasks: BackgroundTasks, current_user: dict = Depends(get_current_user)):
    lang = request.language
    if lang not in SUPPORTED_LANGUAGES:
        raise HTTPException(status_code=400, detail=f"Unsupported language '{lang}'.")

    script = await generate_podcast_summary_script(request.analysis_data)
    if "Error:" in script or not script:
        raise HTTPException(status_code=500, detail=script or "Failed to generate podcast script.")

    final_script = script
    if lang != "en":
        translated_script = await translate_text_gemini(script, lang)
        if "Error:" in translated_script or not translated_script:
            raise HTTPException(status_code=500, detail=translated_script or "Failed to translate script.")
        final_script = translated_script

    output_filename = f"temp_{uuid.uuid4()}.mp3"
    tts_provider = os.environ.get("TTS_PROVIDER", "offline")
    
    success = text_to_speech_azure(final_script, output_filename, language=lang) if tts_provider == 'azure' else text_to_speech_offline(final_script, output_filename)

    if not success:
        if os.path.exists(output_filename): os.remove(output_filename)
        raise HTTPException(status_code=500, detail="Failed to synthesize audio.")
    
    background_tasks.add_task(os.remove, output_filename)
    return FileResponse(path=output_filename, media_type='audio/mpeg', filename=f"podcast_summary_{lang}.mp3")

# --- TTS Functions ---
def text_to_speech_azure(text: str, output_filename: str, language: str = "en"):
    speech_key = os.environ.get("AZURE_TTS_KEY")
    service_region_endpoint = os.environ.get("AZURE_TTS_ENDPOINT")
    if not speech_key or not service_region_endpoint: return False
    try:
        region = service_region_endpoint.split('.')[0].replace('https://', '')
        voice_name = AZURE_VOICE_MAP.get(language, AZURE_VOICE_MAP["en"])
        speech_config = speechsdk.SpeechConfig(subscription=speech_key, region=region)
        speech_config.speech_synthesis_voice_name = voice_name
        audio_config = speechsdk.audio.AudioOutputConfig(filename=output_filename)
        synthesizer = speechsdk.SpeechSynthesizer(speech_config=speech_config, audio_config=audio_config)
        result = synthesizer.speak_text_async(text).get()
        return result.reason == speechsdk.ResultReason.SynthesizingAudioCompleted
    except Exception as e:
        print(f"❌ Error with Azure TTS: {e}")
        return False

def text_to_speech_offline(text: str, output_filename: str):
    try:
        engine = pyttsx3.init()
        engine.save_to_file(text, output_filename)
        engine.runAndWait()
        return True
    except Exception as e:
        print(f"❌ Error with offline TTS: {e}")
        return False

# --- Add a simple root endpoint for health checks ---
@app.get("/")
def read_root():
    return {"status": "ok", "version": app.version}
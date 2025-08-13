import os
import json
import time
import shutil
import spacy
import re
import fitz
import uuid
from typing import List, Dict, Any
import httpx
import asyncio
from dotenv import load_dotenv
from pydantic import BaseModel
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse

# --- Local Imports ---
from redis_client import get_redis_client
from session_manager import (
    create_session,
    get_session,
    add_message_to_history,
    get_all_sessions_metadata
)
from scripts.round1a_main import process_all_pdfs

# --- TTS Library Imports ---
import azure.cognitiveservices.speech as speechsdk
import pyttsx3

# --- ML Model Imports ---
from sentence_transformers import SentenceTransformer
from scipy.spatial.distance import cosine
from rapidfuzz import fuzz

# Load environment variables from .env file
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

# --- Initialize FastAPI App ---
app = FastAPI(
    title="PDF Intelligence API",
    description="API for persona-driven PDF analysis, chat, and multi-language audio summaries.",
    version="2.1.0" # Version bump for on-demand architecture
)

# --- Add CORS Middleware ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Global Variables & Constants ---
nlp = None
embedding_model = None
# Simplified to only include Hindi as the translation target
SUPPORTED_LANGUAGES = { "en": "English", "hi": "Hindi" }
AZURE_VOICE_MAP = { "en": "en-US-JennyNeural", "hi": "hi-IN-SwaraNeural" }


# --- App Startup Event ---
@app.on_event("startup")
async def startup_event():
    """Initializes the Redis client and loads ML models when the application starts."""
    get_redis_client()

    global nlp, embedding_model
    try:
        print("INFO: Loading spaCy model 'en_core_web_sm'...")
        nlp = spacy.load("en_core_web_sm")
    except OSError:
        print("WARNING: spaCy model not found. Downloading...")
        from spacy.cli import download
        download("en_core_web_sm")
        nlp = spacy.load("en_core_web_sm")

    model_name = 'all-MiniLM-L6-v2'
    local_model_path = './model'
    if os.path.exists(local_model_path):
        print(f"INFO: Loading SentenceTransformer model from local path: {local_model_path}")
        embedding_model = SentenceTransformer(local_model_path)
    else:
        print(f"WARNING: Local model not found. Downloading '{model_name}'...")
        embedding_model = SentenceTransformer(model_name)
        embedding_model.save(local_model_path)

    print("✅ All models loaded successfully.")
    print("Application startup complete.")

# ==============================================================================
#  Core Analysis and LLM Functions
# ==============================================================================

def extract_and_rank_keywords(text):
    if not nlp: return []
    doc = nlp(text)
    entities = {ent.text.lower() for ent in doc.ents if len(ent.text.strip()) > 1}
    noun_chunks = {chunk.text.lower() for chunk in doc.noun_chunks if len(chunk.text.strip()) > 1}
    noun_chunks = noun_chunks - entities
    sorted_noun_chunks = sorted(noun_chunks, key=lambda x: len(x), reverse=True)
    keywords = list(entities) + sorted_noun_chunks
    return keywords

def rank_headings_and_titles(outline_list, persona, job, model, keywords, top_n=5):
    query = persona + ". " + job
    query_emb = model.encode(query)
    all_candidates = []
    for doc in outline_list:
        doc_name = doc["document"]
        title_text = doc.get("title", "")
        if title_text:
            title_emb = model.encode(title_text.lower())
            base_score = 1 - cosine(query_emb, title_emb)
            boost = sum(0.8 for kw in keywords if kw in title_text.lower()) + sum(0.4 for kw in keywords if any(k in title_text.lower() for k in kw.split()) and kw not in title_text.lower())
            final_score = (base_score + boost) * 3.0
            all_candidates.append({"document": doc_name, "page_number": 0, "section_title": title_text, "level": "TITLE", "similarity": float(final_score), "keywords": [kw for kw in keywords if kw in title_text.lower() or any(k in title_text.lower() for k in kw.split())]})
        for h in doc["outline"]:
            heading_text = h["text"].lower()
            heading_emb = model.encode(heading_text)
            base_score = 1 - cosine(query_emb, heading_emb)
            matched_keywords = [kw for kw in keywords if kw in heading_text or any(k in heading_text for k in kw.split())]
            boost = sum(0.8 for kw in matched_keywords if kw in heading_text) + sum(0.4 for kw in matched_keywords if kw not in heading_text)
            weight = {"H1": 2.0, "H2": 1.5, "H3": 1.2, "H4": 1.0}.get(h["level"], 1.0)
            final_score = (base_score + boost) * weight
            all_candidates.append({"document": doc_name, "page_number": h["page"], "section_title": h["text"], "level": h["level"], "similarity": float(final_score), "keywords": matched_keywords})
    selected = []
    used_texts = set()
    for kw in keywords:
        kw_candidates = [c for c in all_candidates if kw in c["keywords"] and c["section_title"] not in used_texts]
        if kw_candidates:
            best = max(kw_candidates, key=lambda x: x["similarity"])
            selected.append(best)
            used_texts.add(best["section_title"])
        if len(selected) >= top_n: break
    if len(selected) < top_n:
        remaining = sorted([c for c in all_candidates if c["section_title"] not in used_texts], key=lambda x: x["similarity"], reverse=True)
        selected.extend(c for c in remaining if len(selected) < top_n and not used_texts.add(c["section_title"]))
    for idx, item in enumerate(selected):
        item["importance_rank"] = idx + 1
    return selected

def extract_subsections(top_sections, pdf_dir, job_to_be_done):
    results = []
    for sec in top_sections[:5]:
        pdf_path = os.path.join(pdf_dir, sec["document"])
        try:
            doc = fitz.open(pdf_path)
            page = doc[sec["page_number"]]
            text = page.get_text()
            paragraphs = [p.strip() for p in text.split('\n\n') if p.strip()]
            snippet = next((p for p in paragraphs if sec["section_title"].lower() in p.lower()), paragraphs[0] if paragraphs else "")
            reason = f"This section, '{sec['section_title']}', was chosen for its relevance to '{job_to_be_done}'."
            if sec.get('keywords'):
                reason += f" It relates to keywords: {', '.join(sec['keywords'][:2])}."
            results.append({"document": sec["document"], "page_number": sec["page_number"], "section_title": sec["section_title"], "refined_text": snippet[:1000], "reason": reason})
        except Exception as e:
            print(f"❌ Error reading {pdf_path}: {e}")
    return results

async def call_gemini_for_chat(prompt: str):
    """Generic function to call Gemini for a chat response."""
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key: return "Error: Gemini API key not configured."
    api_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key={api_key}"
    payload = {"contents": [{"parts": [{"text": prompt}]}]}
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(api_url, json=payload)
            response.raise_for_status()
            return response.json()['candidates'][0]['content']['parts'][0]['text']
    except Exception as e:
        return f"Error communicating with LLM: {e}"



async def generate_podcast_summary_script(analysis_data: dict) -> str:
    """
    Takes analysis insights and uses Gemini to generate a narrative podcast script.
    """
    metadata = analysis_data.get("metadata", {})
    llm_insights = analysis_data.get("llm_insights", {})

    # If there are no insights, return a simple message.
    if not llm_insights:
        return "No insights were generated for this analysis."

    # Construct a detailed prompt for Gemini
    prompt = f"""
    You are a podcast host. Your task is to create an engaging, narrative-style podcast script of 400-500 words based on the provided JSON data.
    
    The target audience is a '{metadata.get("persona", "professional")}' who wants to '{metadata.get("job_to_be_done", "understand key topics")}'.
    
    Structure your script with a brief introduction, a body that weaves together the key insights and interesting facts into a cohesive story, and a concluding summary. Do not just list the bullet points.
    
    Here is the data to summarize:
    {json.dumps(llm_insights, indent=2)}

    Respond ONLY with the text of the podcast script.
    """
    
    # Use the existing helper to call the Gemini API
    script = await call_gemini_for_chat(prompt)
    return script



async def generate_llm_insights(subsections: List[dict], persona: str, job_to_be_done: str):
    context = "\n\n".join(f"--- Snippet from {sub['document']} ---\n{sub['refined_text']}" for sub in subsections)
    prompt = f"""
    As a '{persona}' aiming to '{job_to_be_done}', analyze these snippets. Provide:
    1. **key_insights**: 2-3 crucial takeaways.
    2. **did_you_know**: 2-3 surprising facts as questions.
    3. **cross_document_connections**: A list of 1-2 connections. It is crucial that you identify any contradictions or counterpoints you find by comparing information across the different snippets. If none exist, state that clearly.

    Context from documents:
    {context}
    """
    json_schema = {"type": "OBJECT", "properties": {"key_insights": {"type": "ARRAY", "items": {"type": "STRING"}}, "did_you_know": {"type": "ARRAY", "items": {"type": "STRING"}}, "cross_document_connections": {"type": "ARRAY", "items": {"type": "STRING"}}}}
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key: return {"key_insights": ["Gemini API key not configured."], "did_you_know": [], "cross_document_connections": []}
    api_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key={api_key}"
    payload = {"contents": [{"parts": [{"text": prompt}]}], "generationConfig": {"responseMimeType": "application/json", "responseSchema": json_schema}}
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(api_url, json=payload)
            response.raise_for_status()
            return json.loads(response.json()['candidates'][0]['content']['parts'][0]['text'])
    except Exception as e:
        return {"key_insights": [f"Failed to generate insights: {e}"], "did_you_know": [], "cross_document_connections": []}

async def run_pipeline(persona: str, job_to_be_done: str, pdf_dir: str):
    """
    Simplified pipeline that ONLY performs analysis in English.
    Translation is now handled by a separate on-demand endpoint.
    """
    if not embedding_model or not nlp:
        raise HTTPException(status_code=500, detail="A required ML model failed to load.")

    outline_output_dir = os.path.join(pdf_dir, "outlines")
    os.makedirs(outline_output_dir, exist_ok=True)
    process_all_pdfs(pdf_dir, outline_output_dir)
    keywords = extract_and_rank_keywords(persona + " " + job_to_be_done)
    outlines = []
    for filename in os.listdir(outline_output_dir):
        if filename.endswith(".json"):
            with open(os.path.join(outline_output_dir, filename), 'r', encoding='utf-8') as f:
                data = json.load(f)
                outlines.append({"document": filename.replace(".json", ".pdf"), "title": data.get("title", ""), "outline": data.get("outline", [])})
    ranked = rank_headings_and_titles(outlines, persona, job_to_be_done, embedding_model, keywords)
    subsections = extract_subsections(ranked, pdf_dir, job_to_be_done)
    llm_insights = await generate_llm_insights(subsections, persona, job_to_be_done)

    return {
        "metadata": {
            "input_documents": [o["document"] for o in outlines],
            "persona": persona,
            "job_to_be_done": job_to_be_done,
            "processing_timestamp": time.strftime("%Y-%m-%dT%H:%M:%S")
        },
        "subsection_analysis": subsections,
        "llm_insights": llm_insights
    }

# ==============================================================================
#  API Endpoints
# ==============================================================================

@app.post("/analyze/")
async def analyze_documents(
    files: List[UploadFile] = File(...),
    persona: str = Form(...),
    job_to_be_done: str = Form(...)
):
    """
    Analyzes uploaded PDFs and creates a new session. Always returns results in English.
    """
    if not get_redis_client():
        raise HTTPException(status_code=503, detail="Redis service is unavailable.")

    temp_dir = f"temp_{uuid.uuid4()}"
    os.makedirs(temp_dir)
    try:
        for file in files:
            file_path = os.path.join(temp_dir, file.filename)
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)

        analysis_result = await run_pipeline(
            persona=persona,
            job_to_be_done=job_to_be_done,
            pdf_dir=temp_dir,
        )

        session_id = create_session(analysis_result)
        if not session_id:
            raise HTTPException(status_code=500, detail="Failed to create a new session.")

        return JSONResponse(content={"sessionId": session_id, "analysis": analysis_result})
    finally:
        if os.path.exists(temp_dir):
            shutil.rmtree(temp_dir)

@app.post("/chat/")
async def chat_with_documents(request: ChatRequest):
    session_data = get_session(request.sessionId)
    if not session_data:
        raise HTTPException(status_code=404, detail="Chat session not found.")

    add_message_to_history(request.sessionId, {"role": "user", "content": request.query})
    updated_session_data = get_session(request.sessionId)

    prompt = f"You are a helpful assistant. Based on the initial analysis context and the conversation history, answer the user's last query.\n\nContext: {json.dumps(updated_session_data['analysis'])}\n\nHistory: {updated_session_data['chat_history']}\n\nUser Query: {request.query}"
    bot_response_content = await call_gemini_for_chat(prompt)

    bot_message = {"role": "bot", "content": bot_response_content}
    add_message_to_history(request.sessionId, bot_message)

    return JSONResponse(content=bot_message)

@app.get("/sessions/")
async def get_sessions_list():
    metadata = get_all_sessions_metadata()
    return JSONResponse(content=metadata)

@app.get("/sessions/{session_id}")
async def get_session_details(session_id: str):
    session_data = get_session(session_id)
    if not session_data:
        raise HTTPException(status_code=404, detail="Session not found.")
    return JSONResponse(content=session_data)


# ==============================================================================
#  Translation & Podcast Endpoints
# ==============================================================================

async def translate_batch_gemini(insights_dict: Dict[str, List[str]], target_language: str) -> Dict[str, List[str]]:
    """Translates a batch of insights in a single API call using JSON mode."""
    language_name = SUPPORTED_LANGUAGES.get(target_language)
    if not language_name:
        return {"error": "Unsupported language."}

    prompt = f"""
    Translate all the text values in the following JSON object into {language_name}.
    Maintain the exact same JSON structure and keys in your response.
    Only provide the final JSON object, with no additional text or explanation.

    Input JSON:
    {json.dumps(insights_dict, indent=2)}
    """
    json_schema = {
        "type": "OBJECT",
        "properties": {
            "key_insights": {"type": "ARRAY", "items": {"type": "STRING"}},
            "did_you_know": {"type": "ARRAY", "items": {"type": "STRING"}},
            "cross_document_connections": {"type": "ARRAY", "items": {"type": "STRING"}},
        },
        "required": list(insights_dict.keys())
    }
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key: return {"error": "Gemini API key not configured."}
    api_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key={api_key}"
    payload = {"contents": [{"parts": [{"text": prompt}]}],"generationConfig": {"responseMimeType": "application/json","responseSchema": json_schema}}

    try:
        async with httpx.AsyncClient(timeout=90.0) as client:
            response = await client.post(api_url, json=payload)
            response.raise_for_status()
            return json.loads(response.json()['candidates'][0]['content']['parts'][0]['text'])
    except Exception as e:
        print(f"❌ Batch translation error: {e}")
        return {"error": f"Failed to translate batch: {e}"}

@app.post("/translate-insights/")
async def translate_insights_endpoint(request: TranslateInsightsRequest):
    """
    Fetches an existing session's insights and translates them to Hindi on-demand.
    """
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

    # The target language is now hardcoded to Hindi ("hi")
    translated_insights = await translate_batch_gemini(insights_for_translation, "hi")

    if "error" in translated_insights:
        raise HTTPException(status_code=500, detail=translated_insights["error"])

    return JSONResponse(content={"translated_insights": translated_insights})


# --- Podcast and TTS Functions ---

def text_to_speech_azure(text: str, output_filename: str, language: str = "en"):
    speech_key = os.environ.get("AZURE_TTS_KEY")
    service_region_endpoint = os.environ.get("AZURE_TTS_ENDPOINT")
    if not speech_key or not service_region_endpoint: return False
    try:
        region = service_region_endpoint.split('.')[0].replace('https://', '')
    except Exception: return False
    voice_name = AZURE_VOICE_MAP.get(language, AZURE_VOICE_MAP["en"])
    speech_config = speechsdk.SpeechConfig(subscription=speech_key, region=region)
    speech_config.speech_synthesis_voice_name = voice_name
    audio_config = speechsdk.audio.AudioOutputConfig(filename=output_filename)
    synthesizer = speechsdk.SpeechSynthesizer(speech_config=speech_config, audio_config=audio_config)
    result = synthesizer.speak_text_async(text).get()
    return result.reason == speechsdk.ResultReason.SynthesizingAudioCompleted

def text_to_speech_offline(text: str, output_filename: str):
    try:
        engine = pyttsx3.init()
        engine.save_to_file(text, output_filename)
        engine.runAndWait()
        return True
    except Exception as e:
        print(f"❌ Error with offline TTS: {e}")
        return False

# This function is now only used for translating the podcast script, if needed.
async def translate_text_gemini(text: str, target_language: str):
    language_name = SUPPORTED_LANGUAGES.get(target_language)
    if not language_name: return "Error: Unsupported language."
    prompt = f"Translate the following text into {language_name}. Provide only the translated text, without any additional commentary or preamble.\n\n---\n\n{text}"
    return await call_gemini_for_chat(prompt)

@app.post("/generate-podcast/")
async def generate_podcast_endpoint(request: PodcastRequest):
    lang = request.language
    if lang not in SUPPORTED_LANGUAGES:
        raise HTTPException(status_code=400, detail=f"Unsupported language '{lang}'.")

    # The key change is here: We now call Gemini to generate a proper script.
    script = await generate_podcast_summary_script(request.analysis_data)
    
    if "Error:" in script:
        raise HTTPException(status_code=500, detail=script)

    final_script = script
    # Translation logic for the newly generated script remains the same.
    if lang != "en":
        translated_script = await translate_text_gemini(script, lang)
        if "Error:" in translated_script:
            raise HTTPException(status_code=500, detail=translated_script)
        final_script = translated_script

    # Text-to-speech logic remains the same.
    output_filename = f"temp_{uuid.uuid4()}.mp3"
    tts_provider = os.environ.get("TTS_PROVIDER", "offline")
    success = (
        text_to_speech_azure(final_script, output_filename, language=lang)
        if tts_provider == 'azure'
        else text_to_speech_offline(final_script, output_filename)
    )

    if not success:
        if os.path.exists(output_filename):
            os.remove(output_filename)
        raise HTTPException(status_code=500, detail="Failed to synthesize audio.")

    return FileResponse(path=output_filename, media_type='audio/mpeg', filename=f"podcast_summary_{lang}.mp3")
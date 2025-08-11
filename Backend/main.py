import os
import json
import time
import shutil
import spacy
import re
import fitz
import uuid
from typing import List, Dict, Any
import httpx # Using httpx for async requests
from dotenv import load_dotenv
from pydantic import BaseModel

from sentence_transformers import SentenceTransformer
from scipy.spatial.distance import cosine
from rapidfuzz import fuzz
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

# Your existing logic from round1a_main is likely used within run_pipeline
from scripts.round1a_main import process_all_pdfs

# --- TTS Library Imports ---
# This will be used for the new Podcast Mode feature
import azure.cognitiveservices.speech as speechsdk
import pyttsx3 # NEW: Library for offline TTS

# Load environment variables from .env file (for local development)
load_dotenv()

# --- Initialize FastAPI App ---
app = FastAPI(
    title="PDF Intelligence API",
    description="API for persona-driven PDF analysis and audio summary generation.",
    version="1.1.0"
)

# --- Add CORS Middleware ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==============================================================================
#  ROBUST MODEL LOADING (No changes here)
# ==============================================================================
nlp = None
embedding_model = None
try:
    try:
        print("INFO: Loading spaCy model 'en_core_web_sm'...")
        nlp = spacy.load("en_core_web_sm")
        print("✅ spaCy model loaded successfully.")
    except OSError:
        print("WARNING: spaCy model 'en_core_web_sm' not found.")
        print("INFO: Downloading 'en_core_web_sm'. This may take a moment...")
        from spacy.cli import download
        download("en_core_web_sm")
        nlp = spacy.load("en_core_web_sm")
        print("✅ spaCy model downloaded and loaded successfully.")

    model_name = 'all-MiniLM-L6-v2'
    local_model_path = './model'

    if os.path.exists(local_model_path):
        print(f"INFO: Loading SentenceTransformer model from local path: {local_model_path}")
        embedding_model = SentenceTransformer(local_model_path)
    else:
        print(f"WARNING: Local SentenceTransformer model not found at '{local_model_path}'.")
        print(f"INFO: Downloading '{model_name}' from Hugging Face...")
        embedding_model = SentenceTransformer(model_name)
        print(f"INFO: Saving model to '{local_model_path}' for faster startup next time.")
        embedding_model.save(local_model_path)

    print("✅ All models loaded successfully.")

except Exception as e:
    print(f"❌ CRITICAL ERROR: Could not load models. The server may not function correctly.")
    print(f"   Error details: {e}")


# ==============================================================================
#  EXISTING ANALYSIS FUNCTIONS (No changes here)
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
            boost = 0
            title_lower = title_text.lower()
            for kw in keywords:
                if kw in title_lower:
                    boost += 0.8
                elif any(k in title_lower for k in kw.split()):
                    boost += 0.4
            final_score = (base_score + boost) * 3.0
            all_candidates.append({
                "document": doc_name, "page_number": 0, "section_title": title_text,
                "level": "TITLE", "similarity": float(final_score),
                "keywords": [kw for kw in keywords if kw in title_lower or any(k in title_lower for k in kw.split())]
            })

        for h in doc["outline"]:
            heading_text = h["text"].lower()
            heading_emb = model.encode(heading_text)
            base_score = 1 - cosine(query_emb, heading_emb)
            boost, matched_keywords = 0, []
            for kw in keywords:
                if kw in heading_text:
                    boost += 0.8
                    matched_keywords.append(kw)
                elif any(k in heading_text for k in kw.split()):
                    boost += 0.4
                    matched_keywords.append(kw)
            weight = {"H1": 2.0, "H2": 1.5, "H3": 1.2, "H4": 1.0}.get(h["level"], 1.0)
            final_score = (base_score + boost) * weight
            all_candidates.append({
                "document": doc_name, "page_number": h["page"], "section_title": h["text"],
                "level": h["level"], "similarity": float(final_score), "keywords": matched_keywords
            })

    selected, used_texts = [], set()
    for kw in keywords:
        kw_candidates = [c for c in all_candidates if kw in c["keywords"] and c["section_title"] not in used_texts]
        if kw_candidates:
            best = max(kw_candidates, key=lambda x: x["similarity"])
            selected.append(best)
            used_texts.add(best["section_title"])
        if len(selected) >= top_n: break

    if len(selected) < top_n:
        remaining = sorted([c for c in all_candidates if c["section_title"] not in used_texts], key=lambda x: x["similarity"], reverse=True)
        for c in remaining:
            selected.append(c)
            used_texts.add(c["section_title"])
            if len(selected) >= top_n: break

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
            snippet = ""
            for para in paragraphs:
                if sec["section_title"].lower() in para.lower():
                    snippet = para
                    break
            if not snippet and paragraphs:
                snippet = paragraphs[0]
            
            reason = f"This section, '{sec['section_title']}', was chosen because it is highly relevant to your task of '{job_to_be_done}'."
            if sec.get('keywords'):
                display_keywords = ", ".join(sec['keywords'][:2])
                reason += f" It directly relates to keywords such as: {display_keywords}."

            results.append({
                "document": sec["document"],
                "page_number": sec["page_number"],
                "section_title": sec["section_title"],
                "refined_text": snippet[:1000],
                "reason": reason
            })
        except Exception as e:
            print(f"❌ Error reading {pdf_path}: {e}")
    return results

# ==============================================================================
#  GEMINI LLM INSIGHTS GENERATION (No changes here)
# ==============================================================================
async def generate_llm_insights(subsections: List[dict], persona: str, job_to_be_done: str):
    print("🧠 Calling Gemini API for enhanced insights...")
    context = ""
    for i, sub in enumerate(subsections):
        context += f"--- Document Snippet {i+1} (from {sub['document']}) ---\n"
        context += f"{sub['refined_text']}\n\n"

    prompt = f"""
    You are an expert analyst. Your persona is a '{persona}' and your goal is to '{job_to_be_done}'.
    Analyze the following text snippets extracted from multiple documents. Based *only* on the information provided in these snippets, generate the following:
    1.  **key_insights**: A list of 2-3 of the most important takeaways or conclusions.
    2.  **did_you_know**: A list of 2-3 surprising or interesting facts presented as "Did you know...?"
    3.  **cross_document_connections**: A list of 1-2 connections, contradictions, or counterpoints you found by comparing information across the different snippets.

    Context from documents:
    {context}
    """
    json_schema = {
        "type": "OBJECT",
        "properties": {
            "key_insights": {"type": "ARRAY", "items": {"type": "STRING"}},
            "did_you_know": {"type": "ARRAY", "items": {"type": "STRING"}},
            "cross_document_connections": {"type": "ARRAY", "items": {"type": "STRING"}}
        }
    }
    api_key = os.environ.get("GEMINI_API_KEY", "")
    if not api_key:
        print("WARNING: GEMINI_API_KEY environment variable not set.")
        return {"key_insights": ["Gemini API key not configured."], "did_you_know": [], "cross_document_connections": []}
        
    api_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key={api_key}"
    payload = {"contents": [{"parts": [{"text": prompt}]}], "generationConfig": {"responseMimeType": "application/json", "responseSchema": json_schema}}

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(api_url, json=payload)
            response.raise_for_status()
            result = response.json()
            json_text = result['candidates'][0]['content']['parts'][0]['text']
            parsed_json = json.loads(json_text)
            print("✅ Successfully received and parsed insights from Gemini.")
            return parsed_json
    except Exception as e:
        print(f"❌ Error calling or parsing Gemini API: {e}")
        return {"key_insights": ["Failed to generate insights from the LLM."], "did_you_know": [], "cross_document_connections": []}


# ==============================================================================
#  THE MAIN PIPELINE (No changes here)
# ==============================================================================
async def run_pipeline(persona: str, job_to_be_done: str, pdf_dir: str):
    if not embedding_model or not nlp:
        raise HTTPException(status_code=500, detail="A required ML model failed to load. Please check the server logs.")

    outline_output_dir = os.path.join(pdf_dir, "outlines")
    os.makedirs(outline_output_dir, exist_ok=True)

    print(f"📄 Extracting outlines from PDFs in {pdf_dir}...")
    process_all_pdfs(pdf_dir, outline_output_dir)

    keywords = list(set(re.findall(r'\w+', (persona + " " + job_to_be_done).lower())))
    print(f"🧠 Extracted keywords: {keywords}")

    outlines = []
    for filename in os.listdir(outline_output_dir):
        if filename.endswith(".json"):
            with open(os.path.join(outline_output_dir, filename), 'r', encoding='utf-8') as f:
                data = json.load(f)
                outlines.append({"document": filename.replace(".json", ".pdf"), "title": data.get("title", ""), "outline": data.get("outline", [])})

    ranked = rank_headings_and_titles(outlines, persona, job_to_be_done, embedding_model, keywords)
    topN = ranked[:20]
    subsections = extract_subsections(topN, pdf_dir, job_to_be_done)
    llm_insights = await generate_llm_insights(subsections, persona, job_to_be_done)

    final_output = {
        "metadata": {"input_documents": [o["document"] for o in outlines], "persona": persona, "job_to_be_done": job_to_be_done, "processing_timestamp": time.strftime("%Y-%m-%dT%H:%M:%S")},
        "subsection_analysis": subsections,
        "llm_insights": llm_insights
    }
    
    print("✅ Pipeline complete!")
    return final_output


# ==============================================================================
#  THE /analyze/ API ENDPOINT (No changes here)
# ==============================================================================
@app.post("/analyze/")
async def analyze_documents(files: List[UploadFile] = File(...), persona: str = Form(...), job_to_be_done: str = Form(...)):
    temp_dir = f"temp_{uuid.uuid4()}"
    os.makedirs(temp_dir)
    try:
        for file in files:
            file_path = os.path.join(temp_dir, file.filename)
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
        analysis_result = await run_pipeline(persona=persona, job_to_be_done=job_to_be_done, pdf_dir=temp_dir)
        return analysis_result
    except Exception as e:
        print(f"An error occurred during analysis: {e}")
        if isinstance(e, HTTPException): raise e
        raise HTTPException(status_code=500, detail=f"An internal error occurred: {e}")
    finally:
        if os.path.exists(temp_dir): shutil.rmtree(temp_dir)

# ==============================================================================
#  MODIFIED: TTS FUNCTIONS AND ENDPOINT FOR PODCAST MODE
# ==============================================================================

# --- Pydantic model for the podcast request body ---
class PodcastRequest(BaseModel):
    analysis_data: Dict[str, Any]

# --- Azure TTS Function (for evaluation) ---
def text_to_speech_azure(text: str, output_filename: str):
    """Generates audio using Azure's Text-to-Speech service."""
    speech_key = os.environ.get("AZURE_TTS_KEY")
    service_region_endpoint = os.environ.get("AZURE_TTS_ENDPOINT")
    
    if not speech_key or not service_region_endpoint:
        print("❌ Azure TTS credentials (AZURE_TTS_KEY, AZURE_TTS_ENDPOINT) not found in environment variables.")
        return False
        
    try:
        region = service_region_endpoint.split('.')[0].replace('https://', '')
    except Exception:
        print(f"❌ Invalid AZURE_TTS_ENDPOINT format: {service_region_endpoint}")
        return False

    speech_config = speechsdk.SpeechConfig(subscription=speech_key, region=region)
    speech_config.speech_synthesis_voice_name = "en-US-JennyNeural"
    audio_config = speechsdk.audio.AudioOutputConfig(filename=output_filename)
    synthesizer = speechsdk.SpeechSynthesizer(speech_config=speech_config, audio_config=audio_config)
    
    result = synthesizer.speak_text_async(text).get()
    if result.reason == speechsdk.ResultReason.SynthesizingAudioCompleted:
        print(f"✅ Azure speech synthesized to [{output_filename}]")
        return True
    elif result.reason == speechsdk.ResultReason.Canceled:
        cancellation = result.cancellation_details
        print(f"❌ Azure speech synthesis canceled: {cancellation.reason}")
        if cancellation.reason == speechsdk.CancellationReason.Error:
            print(f"   Error details: {cancellation.error_details}")
        return False
    return False

# --- Offline TTS Function (for local development) ---
def text_to_speech_offline(text: str, output_filename: str):
    """Generates audio using the system's built-in TTS voices."""
    try:
        engine = pyttsx3.init()
        engine.save_to_file(text, output_filename)
        engine.runAndWait()
        print(f"✅ Offline speech synthesized to [{output_filename}]")
        return True
    except Exception as e:
        print(f"❌ Error with offline TTS: {e}")
        return False

# --- Gemini Function to Generate Podcast Script ---
async def generate_podcast_script(analysis_data: dict):
    """Uses Gemini to synthesize analysis results into a podcast script."""
    print("🎙️ Generating podcast script with Gemini...")
    
    persona = analysis_data.get("metadata", {}).get("persona", "user")
    job = analysis_data.get("metadata", {}).get("job_to_be_done", "understand documents")
    
    context = f"Here are the initial findings for a '{persona}' trying to '{job}':\n\n"
    
    for sub in analysis_data.get("subsection_analysis", []):
        context += f"- A key section from '{sub['document']}' discusses '{sub['section_title']}'. It says: \"{sub['refined_text'][:200]}...\"\n"
        
    llm_insights = analysis_data.get("llm_insights", {})
    context += "\nFurther AI analysis revealed these key insights:\n"
    for insight in llm_insights.get("key_insights", []):
        context += f"- {insight}\n"
    context += "\nAnd these interesting facts:\n"
    for fact in llm_insights.get("did_you_know", []):
        context += f"- {fact}\n"
        
    prompt = f"""
    You are a podcast host. Your task is to create a short, engaging 2-3 minute audio script based on the provided analysis.
    The script should be a narrated overview that synthesizes the information.
    - Start with a friendly greeting.
    - Summarize the key findings in a conversational, easy-to-understand way.
    - Weave in the "Did you know?" facts naturally.
    - Conclude with a brief summary.
    - The tone should be informative and engaging.
    - Do NOT just list the points. Create a flowing narrative.

    Here is the analysis to use for the script:
    {context}
    """
    
    api_key = os.environ.get("GEMINI_API_KEY", "")
    if not api_key: return "Error: Gemini API key not configured."
        
    api_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key={api_key}"
    payload = {"contents": [{"parts": [{"text": prompt}]}]}

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(api_url, json=payload)
            response.raise_for_status()
            result = response.json()
            script = result['candidates'][0]['content']['parts'][0]['text']
            print("✅ Podcast script generated successfully.")
            return script
    except Exception as e:
        print(f"❌ Error generating podcast script: {e}")
        return "There was an error creating the audio summary."

# --- Podcast Generation Endpoint ---
@app.post("/generate-podcast/")
async def generate_podcast_endpoint(request: PodcastRequest):
    """
    Generates a podcast audio summary from the analysis data.
    """
    script = await generate_podcast_script(request.analysis_data)
    
    output_filename = f"temp_{uuid.uuid4()}.mp3"
    
    tts_provider = os.environ.get("TTS_PROVIDER")
    success = False

    if tts_provider == 'azure':
        print("INFO: Using Azure TTS for audio generation.")
        success = text_to_speech_azure(script, output_filename)
    else:
        print("INFO: Using offline TTS for local development.")
        success = text_to_speech_offline(script, output_filename)
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to synthesize audio.")

    return FileResponse(path=output_filename, media_type='audio/mpeg', filename="podcast_summary.mp3")

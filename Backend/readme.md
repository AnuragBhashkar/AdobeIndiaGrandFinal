# How to run this repository:
git clone https://github.com/anshgupta1903/round-1b


# 🔍 Round-1B: Persona-Driven PDF Intelligence | Adobe India Hackathon 2025

This project is built for **Round-1B** of the Adobe India Hackathon 2025. It transforms a collection of unstructured PDFs into intelligent, persona-focused summaries — highlighting only what matters most based on a user's role and goal.

---

## 🚀 What This Does

- Extracts titles and headings (H1–H4) from multiple PDFs.
- Accepts a **persona** and **job-to-be-done** from a text file (`input.txt`).
- Ranks the most relevant sections across all documents using semantic similarity and keyword overlap.
- Extracts key paragraph-level snippets from the most relevant sections.
- Outputs everything into a single, well-structured JSON file.

---

## 🧠 Challenge Theme

> **Connect What Matters — For the User Who Matters**

This project reimagines reading by understanding documents **as a machine would** — surfacing insights that matter to a specific user performing a specific task.

---

## 📁 Folder Structure

├── Dockerfile
├── main.py # Main Round-1B logic
├── input.txt # Persona and job-to-be-done
├── output/ # Output JSON saved here
├── pdfs/ # Input PDFs go here
├── scripts/
│ └── round1a_main.py # Outline extractor (Title, H1–H3)
├── requirements.txt
└── README.md



---

## 📥 How to Provide Input

Edit the `input.txt` file in the root directory like this:

Travel Planner
Plan a trip for 4 days for a friends group of 10.




Also, place 3–10 PDF documents into the `pdfs/` directory.

---

## 📤 Output Format

The output is saved as:
output/challenge1b_output.json

It contains:
- Metadata (documents, persona, job, timestamp)
- Ranked sections with level and importance
- Snippet analysis from top 3 sections

---

# to install model locally :
if model is not getting downloaded by docker command then 
pip install sentence_transformers
python download_model.py
so that model gets saved loacally

## 🐳 Docker Instructions

### 1️⃣ Build Image + Download Model

Run this **only once** to build and prepare the environment:

```powershell
docker build -t pdf-outline-app .


docker run --rm -v ${PWD}/pdfs:/app/pdfs -v ${PWD}/output:/app/output -v ${PWD}/input.txt:/app/input.txt pdf-outline-app


📦 Dependencies
All dependencies are listed in requirements.txt and include:

sentence-transformers

spacy (en_core_web_sm)

PyMuPDF

rapidfuzz

scipy, pandas, joblib

All are installed inside the container during build.

Model: all-mini-lm-v6

💡 Key Highlights
✅ Works fully offline

✅ Runs on CPU (no GPU required)

✅ Model size < 1GB

✅ Processes 3–5 PDFs in < 60 seconds

🎯 Example Use Case
Persona: Travel Planner
Job: Plan a 4-day trip for a friends group of 10
PDFs: Travel guides for South of France

🔎 Output: Ranked and extracted sections like "Best 4-day itinerary", "Group travel tips", and "Top attractions" — all neatly packaged into a JSON.

🔒 Note
This project was created for the Adobe India Hackathon 2025. Please keep the repository private until the organizers request a public release.

🤝 Authors
Built with ❤️ by Team Bit Brains.
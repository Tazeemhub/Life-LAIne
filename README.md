# Life-LAIne — AI-Powered Personal Health Copilot

> ByteXL / Altrix Labs Hackathon · Built with Azure AI & Gemini 2.5 Flash

Turn fragmented medical paperwork into clear, actionable, patient-friendly insights.

---

## Quick Start

### Prerequisites
- **Python 3.11+**
- **Node.js 18+**
- **Docker** (for PostgreSQL)

### 1. Start the database

```bash
docker compose up postgres -d
```

### 2. Backend

```bash
cd backend

# Copy and configure environment
cp .env.example .env
# Edit .env — leave Azure keys empty to use mock AI (works without Azure!)

# Create virtual environment
python -m venv venv
.\venv\Scripts\activate  # Windows
# source venv/bin/activate  # Mac/Linux

# Install dependencies
pip install -r requirements.txt

# Start the API
uvicorn app.main:app --reload --port 8000
```

API docs: http://localhost:8000/docs

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

App: http://localhost:5173

---

## Environment Variables

See [`backend/.env.example`](backend/.env.example). 

**Works without any Azure credentials** — mock AI responses are used automatically for development.

| Variable | Required for Azure | Description |
|---|---|---|
| `DATABASE_URL` | ✅ Always | PostgreSQL connection string |
| `AZURE_OPENAI_ENDPOINT` | Azure AI | Azure OpenAI endpoint |
| `AZURE_OPENAI_API_KEY` | Azure AI | Azure OpenAI key |
| `AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT` | Azure AI | Document Intelligence endpoint |
| `AZURE_DOCUMENT_INTELLIGENCE_KEY` | Azure AI | Document Intelligence key |
| `AZURE_STORAGE_CONNECTION_STRING` | Azure Storage | Blob storage (uses local `./uploads` if not set) |
| `USE_AZURE_OPENAI` | Flag | Set `true` to enable Azure OpenAI |
| `USE_AZURE_DOC_INTELLIGENCE` | Flag | Set `true` to enable Azure Document Intelligence |
| `USE_AZURE_STORAGE` | Flag | Set `true` to use Azure Blob Storage |

---

## Architecture

```
React (Vite + Tailwind)  →  FastAPI  →  Azure Document Intelligence
                                     →  Azure OpenAI GPT-4o
                                     →  Azure Blob Storage
                                     →  PostgreSQL
```

### Processing Pipeline
1. Upload → FastAPI validates + saves to storage
2. Azure Document Intelligence → raw OCR text
3. Azure OpenAI GPT-4o (JSON mode) → structured `ExtractedData`
4. Azure OpenAI GPT-4o → plain-language health summary
5. Timeline events created in PostgreSQL
6. Frontend polls → displays results

---

## Features

- ✅ Upload PDF, JPG, PNG medical documents  
- ✅ OCR extraction (medicines, lab results, diagnoses, patient info)  
- ✅ AI health summary in plain language (8th–10th grade reading level)  
- ✅ Chronological health timeline  
- ✅ Document confidence scores + abnormal lab value highlighting  
- ✅ Medical disclaimer on all AI-generated content  
- ✅ Guest / Demo mode (no login required)  
- ✅ Microsoft Entra ID support  
- ✅ Multi-language summaries (EN / HI / TE / TA)  
- ✅ Mock ABHA ID linking  
- ✅ FHIR R4 Bundle export  

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/upload` | Upload document |
| `GET` | `/api/documents` | List all documents |
| `GET` | `/api/documents/{id}` | Get document + extracted data + summary |
| `POST` | `/api/documents/{id}/reprocess` | Re-run extraction |
| `GET` | `/api/patients/me` | Patient profile |
| `PATCH` | `/api/patients/me` | Update profile / link ABHA |
| `GET` | `/api/timeline` | Health timeline |
| `GET` | `/api/patients/me/fhir` | FHIR R4 Bundle |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS |
| Backend | FastAPI + Pydantic v2 + SQLAlchemy 2.0 |
| AI/OCR | Azure OpenAI GPT-4o + Azure Document Intelligence |
| Storage | Azure Blob Storage (local `./uploads` fallback) |
| Database | PostgreSQL 16 |
| Auth | Microsoft Entra ID + Guest Demo mode |
| Deploy | Azure Container Apps + ACR |

---

## Safety & Disclaimer

All AI-generated summaries include a prominent medical disclaimer. The system **never** provides medical advice or diagnosis claims. Low-confidence extractions (< 60%) are visually flagged. No full document text is logged to monitoring systems.

---

## 📚 Deliverables & Documentation

- 📐 [**Technical Architecture & Mermaid Diagrams**](docs/ARCHITECTURE.md): End-to-end system topology, sequence flows, ER model, and FHIR R4 mapping.
- 🎯 [**Presentation Slides & Pitch Deck**](docs/PRESENTATION_SLIDES.md): Round 1 hackathon pitch, value proposition, AI utilization, and demo script.
- 🧪 [**Demo & Testing Guide**](docs/DEMO_GUIDE.md): Step-by-step evaluation guide for judges (0-config local testing and Azure AI testing).
- 📁 [**Sample Clinical Records**](samples/): Ready-to-use sample prescriptions, lab reports, and discharge summaries in PDF and TXT.

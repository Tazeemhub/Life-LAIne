# Hackathon Demo & Testing Guide

> **AI-Powered Personal Health Copilot**  
> **ByteXL / Altrix Labs Hackathon**

This guide provides instructions to run, test, and evaluate the prototype. The application includes both **Azure AI Cloud mode** and **Zero-Config Local Mock mode** (works out-of-the-box without Azure keys).

---

## 🚀 Option 1: Running with Zero External Credentials (Local Dev / Offline Demo)

No Azure keys or Docker setup required.

### 1. Backend Setup

```bash
cd backend

# Create & activate a virtual environment
python -m venv venv
.\venv\Scripts\activate   # Windows
# source venv/bin/activate  # macOS / Linux

# Install dependencies (fastapi, uvicorn, sqlalchemy, aiosqlite, etc.)
pip install -r requirements.txt

# Create .env with SQLite (zero-config)
echo DATABASE_URL=sqlite+aiosqlite:///./healthcopilot.db > .env

# Run FastAPI backend
uvicorn app.main:app --reload --port 8000
```

Backend will be running at:
- API Base: `http://localhost:8000`
- Interactive Swagger Docs: `http://localhost:8000/docs`

---

### 2. Frontend Setup

In a separate terminal:

```bash
cd frontend

# Install npm dependencies
npm install

# Start Vite dev server
npm run dev
```

Frontend will be running at:
- Web Application: `http://localhost:5173`

---

## ☁️ Option 2: Running with Azure AI Services & Docker PostgreSQL

If you have Azure AI keys:

1. **Start PostgreSQL:**
   ```bash
   docker compose up postgres -d
   ```

2. **Configure `backend/.env`:**
   ```ini
   DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/healthcopilot

   # Azure OpenAI
   AZURE_OPENAI_ENDPOINT=https://<your-resource>.openai.azure.com/
   AZURE_OPENAI_API_KEY=<your-azure-openai-key>
   AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o
   AZURE_OPENAI_API_VERSION=2024-08-01-preview
   USE_AZURE_OPENAI=true

   # Azure Document Intelligence
   AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=https://<your-resource>.cognitiveservices.azure.com/
   AZURE_DOCUMENT_INTELLIGENCE_KEY=<your-doc-intel-key>
   USE_AZURE_DOC_INTELLIGENCE=true

   # Optional: Azure Blob Storage
   AZURE_STORAGE_CONNECTION_STRING=<your-storage-connection-string>
   USE_AZURE_STORAGE=true
   ```

3. **Start backend and frontend** as described in Option 1.

---

## 🧪 Quick Test Scenarios (Using Built-in Sample Records)

The app includes 3 realistic clinical test records right on the upload screen:

### Scenario 1: Prescription Parsing & Multilingual Summary
1. Open `http://localhost:5173`.
2. Under **"Or test with a sample record:"**, click **"Apollo Clinic Prescription"** (or upload `samples/sample_prescription.pdf` / `sample_prescription.txt`).
3. Notice the status change: `Uploading` → `Processing with AI…` → `✓ Ready`.
4. Click on the document card in the list to open **Document Details**:
   - **Tab 1: Extracted Data**: Notice extracted medications (Metformin 500mg, Lisinopril 10mg, Atorvastatin 20mg, Aspirin 75mg) with dosages, frequencies, and confidence scores.
   - **Tab 2: AI Health Summary**: View the plain-language 8th-grade summary explaining the daily schedule and lifestyle instructions.
   - **Tab 3: Raw OCR Text**: View the extracted document text.
5. In **Profile** page, change preferred language to **Hindi (हिंदी)** or **Telugu (తెలుగు)**, re-check summary to see instant regional language explanation.

### Scenario 2: Abnormal Lab Detection & Critical Value Flags
1. Click **"Metropolis Diagnostics Lab Report"** (or upload `samples/sample_lab_report.pdf` / `sample_lab_report.txt`).
2. Open Document Details:
   - Notice red/amber **HIGH ⚠️** flags on Fasting Blood Sugar (148 mg/dL), HbA1c (8.2%), Total Cholesterol (224 mg/dL), and LDL (147.6 mg/dL).
   - Notice normal indicators on Kidney function (Creatinine 0.95 mg/dL) and Hemoglobin.
   - Review the summary section explaining what HbA1c 8.2% means for glycemic control.

### Scenario 3: Discharge Summary & Health Timeline
1. Click **"Manipal Hospital Discharge Summary"** (or upload `samples/sample_discharge_summary.pdf` / `sample_discharge_summary.txt`).
2. Navigate to **Timeline** in the top navigation bar (`/timeline`):
   - Review chronological events compiled across all uploaded records.
   - Diagnoses, prescribed medications, and hospital admissions are sequenced by date with severity badges.

### Scenario 4: FHIR R4 Bundle Export & ABDM Profile
1. Navigate to **Profile** in the top navigation bar (`/profile`).
2. View the linked **Mock ABHA ID** (`91-8472-9102-4412`).
3. Click **"View FHIR R4 Bundle"**:
   - Inspect the standard HL7 FHIR R4 JSON bundle containing `Patient`, `Condition`, `MedicationStatement`, and `Observation` resources.
   - Click **"Download Bundle (.json)"** to export the standardized record.

---

## 📁 Repository Structure Overview

```
MED-DEV-1/
├── backend/
│   ├── app/
│   │   ├── models/            # SQLAlchemy domain models & Pydantic schemas
│   │   ├── routers/           # /api/upload, /api/documents, /api/patients, /api/timeline
│   │   ├── services/          # Azure Document Intelligence, OpenAI, Blob Storage, FHIR R4, Auth
│   │   ├── prompts/           # LLM extraction & plain-language summary prompt templates
│   │   ├── config.py          # App settings & feature flags
│   │   ├── database.py        # Async SQLAlchemy engine (Postgres + SQLite fallback)
│   │   └── main.py            # FastAPI application entrypoint
│   ├── requirements.txt       # Python dependencies
│   └── Dockerfile             # Container definition for Azure Container Apps
├── frontend/
│   ├── src/
│   │   ├── components/        # UploadZone, DocumentCard, ExtractedFieldsPanel, HealthSummaryCard, Timeline
│   │   ├── pages/             # Home, Dashboard, DocumentDetail, Timeline, Profile
│   │   ├── lib/               # API client, Zustand store, sample document presets
│   │   └── App.tsx            # React router
│   ├── package.json           # React 18, Vite, Tailwind CSS
│   └── vite.config.ts         # Vite configuration
├── samples/                   # Sample clinical PDFs & text files (Prescriptions, Labs, Discharge summaries)
├── docs/                      # ARCHITECTURE.md, PRESENTATION_SLIDES.md, DEMO_GUIDE.md
└── docker-compose.yml         # Local PostgreSQL container
```

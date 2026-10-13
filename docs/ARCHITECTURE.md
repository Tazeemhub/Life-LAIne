# Technical Architecture: AI-Powered Personal Health Copilot

> **ByteXL / Altrix Labs Hackathon**  
> **Team:** MED-DEV  
> **Target:** Round 1 Prototype & Technical Blueprint

---

## 1. High-Level Architecture Diagram

```mermaid
graph TB
    subgraph ClientLayer["Frontend Client (React 18 + Vite + Tailwind CSS)"]
        UI[Web UI / Responsive Dashboard]
        UploadComponent[Upload Zone & Drag-Drop]
        DocDetail[Document Detail & OCR Viewer]
        TimelineView[Chronological Health Timeline]
        ProfileView[Patient Profile & ABHA / FHIR R4]
        StateStore[Zustand Store + Axios API Client]
    end

    subgraph ApiGateway["API & Backend Services (FastAPI + Pydantic v2)"]
        API[FastAPI Application Gateway]
        AuthService[Auth Service: Entra ID + Guest/Demo Mode]
        UploadRouter[Upload Router]
        DocRouter[Document & Reprocess Router]
        TimelineRouter[Timeline Aggregation Router]
        FHIRService[FHIR R4 Bundle Generator]
        PipelineEngine[Async Background Pipeline Worker]
    end

    subgraph AzureAI["Azure AI Cloud & Cognitive Services"]
        DocIntel[Azure AI Document Intelligence<br/>(Prebuilt-Layout OCR Engine)]
        AzureOpenAI[Azure OpenAI Service<br/>(GPT-4o JSON Mode & Summarization)]
        AzureBlob[Azure Blob Storage<br/>(Container: medical-documents)]
    end

    subgraph LocalFallback["Local Development Fallback Engines"]
        LocalOCR[PyMuPDF / Stream OCR Parser]
        MockAI[Schema-Guarded Intelligent Mock AI]
        LocalStorage[Local File Storage ./uploads]
    end

    subgraph StorageLayer["Persistence & Database Layer"]
        Postgres[(PostgreSQL 16 / Async SQLAlchemy 2.0)]
        SQLite[(SQLite + aiosqlite Dev Fallback)]
    end

    UI --> UploadComponent & DocDetail & TimelineView & ProfileView
    UploadComponent & DocDetail & TimelineView & ProfileView --> StateStore
    StateStore -->|REST JSON + JWT / Guest-ID| API

    API --> AuthService
    API --> UploadRouter & DocRouter & TimelineRouter
    UploadRouter --> PipelineEngine
    PipelineEngine --> AzureBlob
    PipelineEngine --> DocIntel
    PipelineEngine --> AzureOpenAI
    DocRouter --> FHIRService

    %% Fallback paths
    DocIntel -.->|Fallback if no Azure keys| LocalOCR
    AzureOpenAI -.->|Fallback if no Azure keys| MockAI
    AzureBlob -.->|Fallback if no Azure keys| LocalStorage

    %% Persistence
    API --> Postgres
    Postgres -.->|Optional dev mode| SQLite
    PipelineEngine --> Postgres
```

---

## 2. End-to-End Processing Pipeline

The ingestion and intelligence pipeline converts raw scanned medical documents or PDFs into verified, patient-friendly insights in 6 deterministic stages:

```mermaid
sequenceDiagram
    autonumber
    actor Patient as User / Patient
    participant FE as React Frontend
    participant BE as FastAPI Backend
    participant Blob as Azure Blob Storage
    participant OCR as Azure Document Intelligence
    participant LLM as Azure OpenAI (GPT-4o)
    participant DB as PostgreSQL Database

    Patient->>FE: Upload Document (PDF / Image / TXT)
    FE->>BE: POST /api/upload (Multipart Form)
    BE->>Blob: Stream bytes & save document
    BE->>DB: Insert Document (status="processing")
    BE-->>FE: HTTP 200 { document_id, status: "processing" }
    
    par Background Task Execution
        BE->>OCR: Begin Analyze Document ("prebuilt-layout")
        OCR-->>BE: Raw Layout Text & Line Tokens
        BE->>DB: Update ocr_text
        
        BE->>LLM: Extraction Prompt with JSON Schema Enforcement
        Note over BE,LLM: Temperature: 0.2, Structured Output JSON
        LLM-->>BE: ExtractedData (Medications, Labs, Diagnoses, Flags)
        BE->>DB: Update extracted_data, confidence, doc_type
        
        BE->>LLM: Summarization Prompt (8th-Grade Plain Language)
        Note over BE,LLM: Localization: EN, HI, TE, TA
        LLM-->>BE: Plain-Language Health Summary
        BE->>DB: Insert HealthSummary
        
        BE->>DB: Generate TimelineEvents (Diagnoses, Prescriptions, Labs)
        BE->>DB: Update Document (status="completed")
    and Frontend Polling
        loop Every 3 seconds
            FE->>BE: GET /api/documents/{id}
            BE-->>FE: DocumentStatus (processing / completed)
        end
    end
    
    FE->>Patient: Render Extracted Fields, Highlight Abnormal Flags, Health Summary
```

---

## 3. Database Entity Relationship (ER) Model

```mermaid
erDiagram
    PATIENTS ||--o{ DOCUMENTS : "owns"
    PATIENTS ||--o{ TIMELINE_EVENTS : "has"
    DOCUMENTS ||--o{ HEALTH_SUMMARIES : "generates"
    DOCUMENTS ||--o{ TIMELINE_EVENTS : "creates"

    PATIENTS {
        string id PK
        string entra_id UK
        string guest_id UK
        string name
        string mock_abha_id
        string preferred_language
        datetime created_at
        datetime updated_at
    }

    DOCUMENTS {
        string id PK
        string patient_id FK
        string filename
        string blob_url
        string local_path
        string document_type
        string status
        text ocr_text
        json extracted_data
        float overall_confidence
        text error_message
        datetime created_at
        datetime updated_at
    }

    HEALTH_SUMMARIES {
        string id PK
        string document_id FK
        string language
        text summary_text
        datetime created_at
    }

    TIMELINE_EVENTS {
        string id PK
        string patient_id FK
        string document_id FK
        string event_type
        date event_date
        string title
        text description
        string severity
        datetime created_at
    }
```

---

## 4. FHIR R4 Bundle Mapping Standards

To ensure interoperability with national digital health standards (such as India's Ayushman Bharat Digital Mission - ABDM, and HL7 FHIR R4 international standards), extracted patient data is mapped directly into an official FHIR R4 Transaction/Collection Bundle:

| Domain Entity | FHIR R4 Resource | Key Mappings |
|---|---|---|
| Patient Profile | `Patient` | `id`, `name`, `identifier` (ABHA ID), `telecom` |
| Prescribed Drug | `MedicationStatement` | `medicationCodeableConcept`, `dosage.text`, `dosage.timing`, `effectivePeriod` |
| Lab Investigation | `Observation` | `code.coding` (LOINC concept), `valueQuantity`, `referenceRange`, `interpretation` (Abnormal flag) |
| Clinical Diagnosis | `Condition` | `code.text`, `clinicalStatus`, `recordedDate` |
| Document Context | `DiagnosticReport` | `status`, `category`, `presentedForm` (OCR snippet reference) |

Endpoint: `GET /api/patients/me/fhir` provides the standard JSON Bundle ready for export.

---

## 5. Security, Privacy & Safety Guardrails

1. **Medical Disclaimer Enforcement**:
   - Every summary generated or displayed includes mandatory disclaimer banners advising consultation with licensed healthcare practitioners.
   - The AI explicitly refrains from speculative medical diagnosis or therapeutic prescription modifications.

2. **Abnormal Lab Result Highlighting**:
   - Out-of-range clinical biomarkers (`H`, `HH`, `L`, `LL`) are surfaced with visual caution indicators so patients immediately notice values requiring physician review.

3. **Confidence Scoring Thresholds**:
   - Extractions with overall confidence below 60% are visibly flagged to prompt manual review of the underlying OCR document text.

4. **Authentication & Tenant Isolation**:
   - Production support for Microsoft Entra ID (Azure Active Directory) OAuth 2.0 Bearer tokens.
   - Built-in zero-friction Guest/Demo Mode for hackathon judging and evaluations without requiring OAuth client registration.
   - All database queries strictly scope records by `patient_id`.

5. **Data Protection**:
   - Zero full-document leakage into application monitoring logs.
   - Clean separation of OCR text, structured JSON, and customer metadata.

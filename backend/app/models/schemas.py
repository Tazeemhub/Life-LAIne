from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Literal, Any, Dict
from datetime import date, datetime
import uuid


# ─── Core Extraction Schema (single source of truth) ─────────────────────────

class Medication(BaseModel):
    name: str
    dosage: Optional[str] = None
    frequency: Optional[str] = None
    duration: Optional[str] = None
    route: Optional[str] = None
    instructions: Optional[str] = None
    confidence: float = Field(default=1.0, ge=0, le=1)


class LabResult(BaseModel):
    test_name: str
    value: Optional[str] = None
    unit: Optional[str] = None
    reference_range: Optional[str] = None
    flag: Optional[Literal["H", "L", "N", "HH", "LL"]] = None
    date: Optional[str] = None
    confidence: float = Field(default=1.0, ge=0, le=1)


class Diagnosis(BaseModel):
    name: str
    date: Optional[str] = None
    confidence: float = Field(default=1.0, ge=0, le=1)


class PatientInfo(BaseModel):
    name: Optional[str] = None
    age: Optional[str] = None
    gender: Optional[str] = None
    confidence: float = Field(default=1.0, ge=0, le=1)


class ExtractedData(BaseModel):
    document_type: Literal["prescription", "lab_report", "discharge_summary", "diagnostic", "other"]
    patient_info: Optional[PatientInfo] = None
    medications: List[Medication] = []
    lab_results: List[LabResult] = []
    diagnoses: List[Diagnosis] = []
    document_date: Optional[str] = None
    notes: Optional[str] = None
    overall_confidence: float = Field(default=0.8, ge=0, le=1)


# ─── API Schemas ──────────────────────────────────────────────────────────────

class UploadResponse(BaseModel):
    document_id: str
    status: str = "processing"
    message: str = "Document uploaded successfully and is being processed."


class DocumentStatus(BaseModel):
    id: str
    patient_id: str
    filename: str
    blob_url: Optional[str] = None
    document_type: Optional[str] = None
    folder: Optional[str] = "prescriptions"
    tags: Optional[List[str]] = []
    is_xerox: Optional[bool] = False
    uploaded_by: Optional[str] = "patient"
    status: str  # processing | completed | failed
    ocr_text: Optional[str] = None
    extracted_data: Optional[ExtractedData] = None
    summary: Optional[str] = None
    summary_language: Optional[str] = None
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None


class DocumentListItem(BaseModel):
    id: str
    filename: str
    document_type: Optional[str] = None
    folder: Optional[str] = "prescriptions"
    tags: Optional[List[str]] = []
    is_xerox: Optional[bool] = False
    uploaded_by: Optional[str] = "patient"
    status: str
    overall_confidence: Optional[float] = None
    created_at: datetime


class DriveFolderInfo(BaseModel):
    id: str
    label: str
    icon: str
    count: int
    color: str


class UpdateDocumentFolderRequest(BaseModel):
    folder: str
    tags: Optional[List[str]] = None
    is_xerox: Optional[bool] = None


class DoctorInsightCreate(BaseModel):
    patient_id: str
    doctor_name: str
    doctor_specialty: Optional[str] = None
    document_id: Optional[str] = None
    title: str = "Clinical Consultation Note"
    clinical_notes: str
    prescriptions_advice: Optional[str] = None
    soap_subjective: Optional[str] = None
    soap_objective: Optional[str] = None
    soap_assessment: Optional[str] = None
    soap_plan: Optional[str] = None


class DoctorInsightOut(BaseModel):
    id: str
    patient_id: str
    patient_name: Optional[str] = None
    doctor_name: str
    doctor_specialty: Optional[str] = None
    document_id: Optional[str] = None
    title: str
    clinical_notes: str
    prescriptions_advice: Optional[str] = None
    soap_subjective: Optional[str] = None
    soap_objective: Optional[str] = None
    soap_assessment: Optional[str] = None
    soap_plan: Optional[str] = None
    created_at: datetime


class DoctorPatientSummary(BaseModel):
    id: str
    name: Optional[str] = "Anonymous Patient"
    mock_abha_id: Optional[str] = None
    preferred_language: str = "en"
    document_count: int = 0
    last_activity: Optional[datetime] = None
    recent_diagnoses: List[str] = []


class ClinicalTranscriptionRequest(BaseModel):
    transcript_text: str
    doctor_name: Optional[str] = "Dr. Clinician"
    patient_context: Optional[str] = None


class ClinicalTranscriptionResponse(BaseModel):
    title: str
    clinical_notes: str
    prescriptions_advice: Optional[str] = None
    soap_subjective: Optional[str] = None
    soap_objective: Optional[str] = None
    soap_assessment: Optional[str] = None
    soap_plan: Optional[str] = None
    extracted_medications: List[Dict[str, Any]] = []


class PatientProfile(BaseModel):
    id: str
    name: Optional[str] = None
    mock_abha_id: Optional[str] = None
    preferred_language: str = "en"
    created_at: datetime


class PatientUpdate(BaseModel):
    preferred_language: Optional[str] = None
    mock_abha_id: Optional[str] = None
    name: Optional[str] = None


class TimelineEventOut(BaseModel):
    id: str
    patient_id: str
    event_type: str
    event_date: Optional[date] = None
    title: str
    description: Optional[str] = None
    related_document_id: Optional[str] = None
    data: Optional[Dict[str, Any]] = None
    created_at: datetime


class HealthSummaryOut(BaseModel):
    id: str
    document_id: str
    language: str
    summary_text: str
    created_at: datetime


class ErrorResponse(BaseModel):
    detail: str


# ─── Chat & Consultation Schemas ─────────────────────────────────────────────

class ChatMessageCreate(BaseModel):
    message: str
    category: Optional[str] = "doubt"  # doubt | feeling | medication | general
    doctor_id: Optional[str] = None
    target_mode: Optional[str] = "ai"  # "ai" | "doctor"


class DoctorReplyCreate(BaseModel):
    patient_id: str
    message: str
    doctor_name: Optional[str] = "Dr. Rajesh Sharma, MD"
    category: Optional[str] = "doubt"


class ChatMessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    patient_id: str
    sender_role: str  # patient | doctor | ai
    sender_name: str
    message: str
    category: Optional[str] = None
    doctor_id: Optional[str] = None
    created_at: datetime


class ChatConversationResponse(BaseModel):
    user_message: ChatMessageOut
    reply_message: ChatMessageOut
    suggested_followups: List[str] = []

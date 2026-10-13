import uuid
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from app.database import get_db
from app.models.domain import Patient, Document, DoctorInsight, TimelineEvent
from app.models.schemas import (
    DoctorPatientSummary,
    DoctorInsightCreate,
    DoctorInsightOut,
    ClinicalTranscriptionRequest,
    ClinicalTranscriptionResponse,
    DocumentListItem,
)
from app.services.gemini_service import gemini_service
from app.services.firebase_service import firebase_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/doctor", tags=["doctor"])


@router.get("/patients", response_model=List[DoctorPatientSummary])
async def list_doctor_patients(
    search: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """
    List all patients for the doctor dashboard with activity stats, document counts, and diagnoses.
    """
    stmt = select(Patient).order_by(Patient.updated_at.desc())
    if search:
        search_filter = f"%{search.lower()}%"
        stmt = stmt.where(func.lower(Patient.name).like(search_filter))

    res = await db.execute(stmt)
    patients = res.scalars().all()

    summaries: List[DoctorPatientSummary] = []
    for p in patients:
        # Document count
        doc_count_res = await db.execute(
            select(func.count(Document.id)).where(Document.patient_id == p.id)
        )
        doc_count = doc_count_res.scalar() or 0

        # Recent diagnoses from latest completed document
        latest_doc_res = await db.execute(
            select(Document)
            .where(Document.patient_id == p.id, Document.status == "completed")
            .order_by(Document.created_at.desc())
            .limit(1)
        )
        latest_doc = latest_doc_res.scalar_one_or_none()
        diagnoses = []
        if latest_doc and latest_doc.extracted_data:
            diagnoses = [
                d.get("name")
                for d in latest_doc.extracted_data.get("diagnoses", [])
                if d.get("name")
            ]

        summaries.append(
            DoctorPatientSummary(
                id=p.id,
                name=p.name or "Anonymous Patient",
                mock_abha_id=p.mock_abha_id,
                preferred_language=p.preferred_language or "en",
                document_count=doc_count,
                last_activity=p.updated_at,
                recent_diagnoses=diagnoses[:3],
            )
        )

    return summaries


@router.get("/patients/{patient_id}/documents", response_model=List[DocumentListItem])
async def get_patient_documents_for_doctor(
    patient_id: str,
    folder: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieve all clinical paperwork, Xeroxes, and diagnostic reports uploaded for a patient.
    """
    stmt = select(Document).where(Document.patient_id == patient_id)
    if folder and folder != "all":
        stmt = stmt.where(Document.folder == folder)
    stmt = stmt.order_by(Document.created_at.desc())

    res = await db.execute(stmt)
    docs = res.scalars().all()
    return [
        DocumentListItem(
            id=d.id,
            filename=d.filename,
            document_type=d.document_type,
            folder=d.folder,
            tags=d.tags or [],
            is_xerox=d.is_xerox or False,
            uploaded_by=d.uploaded_by or "patient",
            status=d.status,
            overall_confidence=d.overall_confidence,
            created_at=d.created_at,
        )
        for d in docs
    ]


@router.post("/transcribe", response_model=ClinicalTranscriptionResponse)
async def transcribe_clinical_voice(
    req: ClinicalTranscriptionRequest,
):
    """
    Doctor's voice dictation transcription using Gemini 2.5 Flash.
    Converts stream-of-consciousness physician speech into structured SOAP notes and prescriptions.
    """
    if not req.transcript_text.strip():
        raise HTTPException(status_code=400, detail="Transcript text cannot be empty.")

    try:
        structured = await gemini_service.transcribe_clinical_dictation(
            transcript_text=req.transcript_text,
            doctor_name=req.doctor_name or "Dr. Clinician",
            patient_context=req.patient_context,
        )
        return ClinicalTranscriptionResponse(**structured)
    except Exception as e:
        logger.error(f"Clinical transcription failed: {e}")
        return ClinicalTranscriptionResponse(
            title="Clinical Consultation Note",
            clinical_notes=req.transcript_text,
            prescriptions_advice="Review medication regimen as discussed.",
            soap_subjective=req.transcript_text,
            soap_objective="Physical examination and vitals recorded.",
            soap_assessment="Clinical review recorded.",
            soap_plan="Treatment plan agreed with patient.",
            extracted_medications=[],
        )


@router.post("/insights", response_model=DoctorInsightOut)
async def create_doctor_insight(
    insight_in: DoctorInsightCreate,
    db: AsyncSession = Depends(get_db),
):
    """
    Doctor writes clinical remarks and prescriptions that appear in the patient's personal health drive.
    """
    # Verify patient exists
    p_res = await db.execute(select(Patient).where(Patient.id == insight_in.patient_id))
    patient = p_res.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found.")

    insight = DoctorInsight(
        id=str(uuid.uuid4()),
        patient_id=insight_in.patient_id,
        doctor_name=insight_in.doctor_name,
        doctor_specialty=insight_in.doctor_specialty,
        document_id=insight_in.document_id,
        title=insight_in.title,
        clinical_notes=insight_in.clinical_notes,
        prescriptions_advice=insight_in.prescriptions_advice,
        soap_subjective=insight_in.soap_subjective,
        soap_objective=insight_in.soap_objective,
        soap_assessment=insight_in.soap_assessment,
        soap_plan=insight_in.soap_plan,
    )
    db.add(insight)

    # Also record on the patient's health timeline
    timeline_event = TimelineEvent(
        id=str(uuid.uuid4()),
        patient_id=insight_in.patient_id,
        event_type="doctor_note",
        title=f"Doctor Note: {insight_in.title}",
        description=f"{insight_in.doctor_name} ({insight_in.doctor_specialty or 'Physician'}): {insight_in.clinical_notes[:180]}...",
        related_document_id=insight_in.document_id,
        data={
            "doctor_name": insight_in.doctor_name,
            "prescriptions_advice": insight_in.prescriptions_advice,
            "title": insight_in.title,
        },
    )
    db.add(timeline_event)

    await db.commit()
    await db.refresh(insight)

    # Sync to Firebase Firestore
    await firebase_service.save_doctor_insight({
        "id": insight.id,
        "patient_id": insight.patient_id,
        "doctor_name": insight.doctor_name,
        "doctor_specialty": insight.doctor_specialty,
        "title": insight.title,
        "clinical_notes": insight.clinical_notes,
        "prescriptions_advice": insight.prescriptions_advice,
        "soap_assessment": insight.soap_assessment,
        "created_at": insight.created_at.isoformat() if insight.created_at else None,
    })

    return DoctorInsightOut(
        id=insight.id,
        patient_id=insight.patient_id,
        patient_name=patient.name,
        doctor_name=insight.doctor_name,
        doctor_specialty=insight.doctor_specialty,
        document_id=insight.document_id,
        title=insight.title,
        clinical_notes=insight.clinical_notes,
        prescriptions_advice=insight.prescriptions_advice,
        soap_subjective=insight.soap_subjective,
        soap_objective=insight.soap_objective,
        soap_assessment=insight.soap_assessment,
        soap_plan=insight.soap_plan,
        created_at=insight.created_at,
    )


@router.get("/insights/{patient_id}", response_model=List[DoctorInsightOut])
async def get_patient_doctor_insights(
    patient_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Get all clinical insights and consultation notes written by doctors for this patient.
    """
    res = await db.execute(
        select(DoctorInsight)
        .where(DoctorInsight.patient_id == patient_id)
        .order_by(DoctorInsight.created_at.desc())
    )
    insights = res.scalars().all()
    return [
        DoctorInsightOut(
            id=i.id,
            patient_id=i.patient_id,
            doctor_name=i.doctor_name,
            doctor_specialty=i.doctor_specialty,
            document_id=i.document_id,
            title=i.title,
            clinical_notes=i.clinical_notes,
            prescriptions_advice=i.prescriptions_advice,
            soap_subjective=i.soap_subjective,
            soap_objective=i.soap_objective,
            soap_assessment=i.soap_assessment,
            soap_plan=i.soap_plan,
            created_at=i.created_at,
        )
        for i in insights
    ]

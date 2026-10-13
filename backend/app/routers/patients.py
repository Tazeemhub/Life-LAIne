import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.config import get_settings
from app.models.domain import Patient, Document
from app.models.schemas import PatientProfile, PatientUpdate
from app.services.auth import get_current_patient
from app.services.fhir import build_fhir_bundle
from app.services.firebase_service import firebase_service

logger = logging.getLogger(__name__)
settings = get_settings()
router = APIRouter(prefix="/api/patients", tags=["patients"])


@router.get("/me", response_model=PatientProfile)
async def get_patient_profile(
    patient: Patient = Depends(get_current_patient),
):
    return PatientProfile(
        id=patient.id,
        name=patient.name,
        mock_abha_id=patient.mock_abha_id,
        preferred_language=patient.preferred_language,
        created_at=patient.created_at,
    )


@router.patch("/me", response_model=PatientProfile)
async def update_patient_profile(
    update: PatientUpdate,
    patient: Patient = Depends(get_current_patient),
    db: AsyncSession = Depends(get_db),
):
    if update.preferred_language is not None:
        patient.preferred_language = update.preferred_language
    if update.mock_abha_id is not None:
        cleaned_abha = update.mock_abha_id.strip()
        patient.mock_abha_id = cleaned_abha if cleaned_abha else None
    if update.name is not None:
        patient.name = update.name.strip() if update.name else None

    db.add(patient)
    await db.commit()
    await db.refresh(patient)

    if settings.is_firebase_active:
        await firebase_service.save_patient({
            "id": patient.id,
            "name": patient.name,
            "mock_abha_id": patient.mock_abha_id,
            "preferred_language": patient.preferred_language,
            "created_at": patient.created_at.isoformat() if patient.created_at else None,
        })

    return PatientProfile(
        id=patient.id,
        name=patient.name,
        mock_abha_id=patient.mock_abha_id,
        preferred_language=patient.preferred_language,
        created_at=patient.created_at,
    )


@router.get("/me/fhir")
async def get_fhir_bundle(
    patient: Patient = Depends(get_current_patient),
    db: AsyncSession = Depends(get_db),
):
    """Export FHIR R4 Bundle for all completed documents."""
    result = await db.execute(
        select(Document)
        .where(Document.patient_id == patient.id, Document.status == "completed")
    )
    documents = result.scalars().all()
    bundle = build_fhir_bundle(patient, list(documents))
    return bundle

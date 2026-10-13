import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database import get_db
from app.models.domain import Document, Patient, DoctorInsight
from app.models.schemas import (
    DriveFolderInfo,
    UpdateDocumentFolderRequest,
    DocumentListItem,
    DoctorInsightOut,
)
from app.services.auth import get_current_patient

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/drive", tags=["drive"])

FOLDER_CONFIG = [
    {"id": "all", "label": "All Files", "icon": "Files", "color": "cyan"},
    {"id": "prescriptions", "label": "Prescriptions", "icon": "Pill", "color": "emerald"},
    {"id": "lab_reports", "label": "Lab & Diagnostics", "icon": "FlaskConical", "color": "purple"},
    {"id": "scans_xerox", "label": "Scans & Xerox Images", "icon": "Camera", "color": "amber"},
    {"id": "discharge_summaries", "label": "Discharge Summaries", "icon": "FileText", "color": "blue"},
    {"id": "insurance", "label": "Insurance & ABHA", "icon": "ShieldCheck", "color": "indigo"},
]


@router.get("/folders", response_model=List[DriveFolderInfo])
async def get_drive_folders(
    patient: Patient = Depends(get_current_patient),
    db: AsyncSession = Depends(get_db),
):
    """
    Get DigiLocker-style folder catalog with live document count for the patient.
    """
    # Total count
    total_res = await db.execute(
        select(func.count(Document.id)).where(Document.patient_id == patient.id)
    )
    total_count = total_res.scalar() or 0

    folders: List[DriveFolderInfo] = []
    for f in FOLDER_CONFIG:
        if f["id"] == "all":
            folders.append(
                DriveFolderInfo(
                    id="all",
                    label=f["label"],
                    icon=f["icon"],
                    count=total_count,
                    color=f["color"],
                )
            )
        else:
            c_res = await db.execute(
                select(func.count(Document.id)).where(
                    Document.patient_id == patient.id,
                    Document.folder == f["id"],
                )
            )
            count = c_res.scalar() or 0
            folders.append(
                DriveFolderInfo(
                    id=f["id"],
                    label=f["label"],
                    icon=f["icon"],
                    count=count,
                    color=f["color"],
                )
            )

    return folders


@router.get("/documents", response_model=List[DocumentListItem])
async def list_drive_documents(
    folder: Optional[str] = Query(None),
    tag: Optional[str] = Query(None),
    is_xerox: Optional[bool] = Query(None),
    search: Optional[str] = Query(None),
    patient: Patient = Depends(get_current_patient),
    db: AsyncSession = Depends(get_db),
):
    """
    Fetch filtered documents for DigiLocker-style drive view.
    """
    stmt = select(Document).where(Document.patient_id == patient.id)

    if folder and folder != "all":
        stmt = stmt.where(Document.folder == folder)

    if is_xerox is not None:
        stmt = stmt.where(Document.is_xerox == is_xerox)

    if search:
        search_filter = f"%{search.lower()}%"
        stmt = stmt.where(func.lower(Document.filename).like(search_filter))

    stmt = stmt.order_by(Document.created_at.desc())
    res = await db.execute(stmt)
    docs = res.scalars().all()

    # Filter by tag in memory if specified
    if tag and tag != "all":
        docs = [d for d in docs if d.tags and tag.lower() in [t.lower() for t in d.tags]]

    return [
        DocumentListItem(
            id=d.id,
            filename=d.filename,
            document_type=d.document_type,
            folder=d.folder or "prescriptions",
            tags=d.tags or [],
            is_xerox=d.is_xerox or False,
            uploaded_by=d.uploaded_by or "patient",
            status=d.status,
            overall_confidence=d.overall_confidence,
            created_at=d.created_at,
        )
        for d in docs
    ]


@router.patch("/documents/{document_id}", response_model=DocumentListItem)
async def update_document_metadata(
    document_id: str,
    update: UpdateDocumentFolderRequest,
    patient: Patient = Depends(get_current_patient),
    db: AsyncSession = Depends(get_db),
):
    """
    Move a document into a different DigiLocker folder, update tags or xerox status.
    """
    res = await db.execute(
        select(Document).where(Document.id == document_id, Document.patient_id == patient.id)
    )
    doc = res.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    doc.folder = update.folder
    if update.tags is not None:
        doc.tags = update.tags
    if update.is_xerox is not None:
        doc.is_xerox = update.is_xerox

    await db.commit()
    await db.refresh(doc)

    return DocumentListItem(
        id=doc.id,
        filename=doc.filename,
        document_type=doc.document_type,
        folder=doc.folder,
        tags=doc.tags or [],
        is_xerox=doc.is_xerox,
        uploaded_by=doc.uploaded_by,
        status=doc.status,
        overall_confidence=doc.overall_confidence,
        created_at=doc.created_at,
    )


@router.get("/insights", response_model=List[DoctorInsightOut])
async def get_patient_shared_insights(
    patient: Patient = Depends(get_current_patient),
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieve clinical notes and prescriptions published by doctors directly into this patient's drive.
    """
    res = await db.execute(
        select(DoctorInsight)
        .where(DoctorInsight.patient_id == patient.id)
        .order_by(DoctorInsight.created_at.desc())
    )
    insights = res.scalars().all()
    return [
        DoctorInsightOut(
            id=i.id,
            patient_id=i.patient_id,
            patient_name=patient.name,
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

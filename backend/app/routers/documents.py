import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db, AsyncSessionLocal
from app.models.domain import Document, Patient, HealthSummary
from app.models.schemas import DocumentStatus, DocumentListItem, ExtractedData
from app.services.auth import get_current_patient
from app.services.extraction import process_document
from app.services.blob_storage import blob_storage_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/documents", tags=["documents"])


@router.get("", response_model=List[DocumentListItem])
async def list_documents(
    patient: Patient = Depends(get_current_patient),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Document)
        .where(Document.patient_id == patient.id)
        .order_by(Document.created_at.desc())
    )
    docs = result.scalars().all()
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


@router.get("/{document_id}", response_model=DocumentStatus)
async def get_document(
    document_id: str,
    patient: Patient = Depends(get_current_patient),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Document).where(Document.id == document_id, Document.patient_id == patient.id)
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    # Get latest summary
    sum_result = await db.execute(
        select(HealthSummary)
        .where(HealthSummary.document_id == document_id)
        .order_by(HealthSummary.created_at.desc())
        .limit(1)
    )
    summary_row = sum_result.scalar_one_or_none()

    extracted = None
    if doc.extracted_data:
        try:
            extracted = ExtractedData(**doc.extracted_data)
        except Exception:
            pass

    return DocumentStatus(
        id=doc.id,
        patient_id=doc.patient_id,
        filename=doc.filename,
        blob_url=doc.blob_url,
        document_type=doc.document_type,
        folder=doc.folder or "prescriptions",
        tags=doc.tags or [],
        is_xerox=doc.is_xerox or False,
        uploaded_by=doc.uploaded_by or "patient",
        status=doc.status,
        ocr_text=doc.ocr_text,
        extracted_data=extracted,
        summary=summary_row.summary_text if summary_row else None,
        summary_language=summary_row.language if summary_row else None,
        error_message=doc.error_message,
        created_at=doc.created_at,
        updated_at=doc.updated_at,
    )


@router.post("/{document_id}/reprocess")
async def reprocess_document(
    document_id: str,
    background_tasks: BackgroundTasks,
    language: Optional[str] = Query(default=None),
    patient: Patient = Depends(get_current_patient),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Document).where(Document.id == document_id, Document.patient_id == patient.id)
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    # Get file bytes
    path = doc.blob_url or doc.local_path
    if not path:
        raise HTTPException(status_code=400, detail="No file associated with this document.")

    file_bytes = await blob_storage_service.get_file_bytes(path)

    # Detect content type from filename
    content_type = _guess_content_type(doc.filename)

    doc.status = "processing"
    doc.error_message = None
    await db.commit()

    target_language = language or patient.preferred_language or "en"

    background_tasks.add_task(
        process_document,
        document_id,
        file_bytes,
        content_type,
        target_language,
        AsyncSessionLocal,
    )

    return {
        "document_id": document_id,
        "status": "processing",
        "language": target_language,
        "message": f"Reprocessing started in language '{target_language}'.",
    }


@router.delete("/{document_id}")
async def delete_document(
    document_id: str,
    patient: Patient = Depends(get_current_patient),
    db: AsyncSession = Depends(get_db),
):
    """Delete a document, its stored file, and associated summaries/timeline events."""
    result = await db.execute(
        select(Document).where(Document.id == document_id, Document.patient_id == patient.id)
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    path = doc.blob_url or doc.local_path
    if path:
        try:
            await blob_storage_service.delete_file(path)
        except Exception as e:
            logger.warning(f"Could not delete storage file {path}: {e}")

    await db.delete(doc)
    await db.commit()
    logger.info(f"Document {document_id} deleted successfully.")
    return {"message": "Document deleted successfully", "id": document_id}


def _guess_content_type(filename: str) -> str:
    name = filename.lower()
    if name.endswith(".pdf"):
        return "application/pdf"
    if name.endswith((".jpg", ".jpeg")):
        return "image/jpeg"
    if name.endswith(".png"):
        return "image/png"
    if name.endswith(".txt"):
        return "text/plain"
    return "application/octet-stream"

import uuid
import logging
from fastapi import APIRouter, UploadFile, File, Form, Depends, BackgroundTasks, HTTPException
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db, AsyncSessionLocal
from app.models.domain import Document, Patient
from app.models.schemas import UploadResponse
from app.services.blob_storage import blob_storage_service, StorageUnavailableError
from app.services.extraction import process_document
from app.services.auth import get_current_patient

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["upload"])

ALLOWED_CONTENT_TYPES = {
    "application/pdf",
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/tiff",
    "text/plain",
}
MAX_FILE_SIZE = 20 * 1024 * 1024  # 20 MB


@router.post("/upload", response_model=UploadResponse)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    folder: Optional[str] = Form(None),
    is_xerox: Optional[bool] = Form(False),
    tags: Optional[str] = Form(None),
    uploaded_by: Optional[str] = Form("patient"),
    patient: Patient = Depends(get_current_patient),
    db: AsyncSession = Depends(get_db),
):
    """Upload a medical document, scan, or xerox for processing and storage in DigiLocker drive."""
    content_type = file.content_type or "application/octet-stream"
    if content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {content_type}. Allowed: PDF, JPEG, PNG, TIFF.",
        )

    file_bytes = await file.read()
    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File too large. Maximum size is 20 MB.")

    # Determine default folder if none specified
    target_folder = folder
    if not target_folder:
        target_folder = "scans_xerox" if is_xerox else "prescriptions"

    # Process tags
    tag_list = [t.strip() for t in tags.split(",") if t.strip()] if tags else []
    if is_xerox and "xerox" not in [t.lower() for t in tag_list]:
        tag_list.append("xerox")

    blob_url: Optional[str] = None
    try:
        # Upload to storage
        blob_url = await blob_storage_service.upload_file(file_bytes, file.filename, content_type)
    except StorageUnavailableError as exc:
        logger.exception("Storage upload failed for patient=%s filename=%s", patient.id, file.filename)
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Unexpected upload storage error for patient=%s filename=%s", patient.id, file.filename)
        raise HTTPException(status_code=500, detail="Failed to upload document file.") from exc

    # Create document record
    doc_id = str(uuid.uuid4())
    document = Document(
        id=doc_id,
        patient_id=patient.id,
        filename=file.filename,
        blob_url=blob_url if blob_url.startswith("https://") else None,
        local_path=blob_url if not blob_url.startswith("https://") else None,
        folder=target_folder,
        tags=tag_list,
        is_xerox=bool(is_xerox),
        uploaded_by=uploaded_by or "patient",
        status="processing",
    )
    try:
        db.add(document)
        await db.commit()
    except Exception as exc:
        await db.rollback()
        if blob_url:
            try:
                await blob_storage_service.delete_file(blob_url)
            except Exception as cleanup_exc:
                logger.warning("Failed to cleanup uploaded file after DB error for document %s: %s", doc_id, cleanup_exc)
        logger.exception("DB commit failed for uploaded document %s", doc_id)
        raise HTTPException(status_code=500, detail="Failed to save uploaded document.") from exc

    logger.info(f"Document {doc_id} created in folder '{target_folder}' for patient {patient.id}")

    # Kick off background processing
    background_tasks.add_task(
        process_document,
        doc_id,
        file_bytes,
        content_type,
        patient.preferred_language,
        AsyncSessionLocal,
    )

    return UploadResponse(document_id=doc_id, status="processing")

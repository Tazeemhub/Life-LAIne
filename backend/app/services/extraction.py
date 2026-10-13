import uuid
import logging
from datetime import datetime, date
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.config import get_settings
from app.models.domain import Document, HealthSummary, TimelineEvent
from app.models.schemas import ExtractedData
from app.services.document_intelligence import document_intelligence_service
from app.services.openai_service import openai_service
from app.services.gemini_service import gemini_service
from app.services.blob_storage import blob_storage_service
from app.services.firebase_service import firebase_service

logger = logging.getLogger(__name__)
settings = get_settings()


async def process_document(
    document_id: str,
    file_bytes: bytes,
    content_type: str,
    language: str,
    db_session_factory,
) -> None:
    """
    Full processing pipeline:
    1. OCR via Document Intelligence / local parser
    2. Structured extraction via Gemini API or Azure OpenAI / mock fallback
    3. Plain-language health summary generation in specified language (EN, HI, TE, TA)
    4. Clinical timeline events generation
    5. Update document status and sync with Firebase (if active)
    """
    async with db_session_factory() as db:
        try:
            # Fetch document
            result = await db.execute(select(Document).where(Document.id == document_id))
            document = result.scalar_one_or_none()
            if not document:
                logger.error(f"Document {document_id} not found for processing.")
                return

            logger.info(f"Processing document {document_id} ({document.filename})")

            # Step 1: OCR
            blob_url = document.blob_url or document.local_path
            if blob_url:
                file_bytes = await blob_storage_service.get_file_bytes(blob_url)

            ocr_text = await document_intelligence_service.extract_text(file_bytes, content_type)
            document.ocr_text = ocr_text
            await db.commit()
            logger.info(f"OCR complete for {document_id}: {len(ocr_text)} chars")

            # Step 2: Structured extraction (Gemini API priority -> Azure OpenAI -> Mock fallback)
            extracted: Optional[ExtractedData] = None
            if settings.is_gemini_active:
                try:
                    logger.info("Using Gemini API for structured extraction...")
                    extracted = await gemini_service.extract_structured_data(ocr_text, file_bytes, content_type)
                except Exception as e:
                    logger.warning(f"Gemini extraction encountered error, falling back to secondary: {e}")

            if extracted is None:
                extracted = await openai_service.extract_structured_data(ocr_text)

            document.extracted_data = extracted.model_dump(mode="json")
            document.document_type = extracted.document_type
            document.overall_confidence = extracted.overall_confidence
            await db.commit()
            logger.info(f"Extraction complete for {document_id}, confidence={extracted.overall_confidence}")

            # Step 3: Plain-language summary (Gemini API -> Azure OpenAI -> Mock localized summary)
            summary_text: Optional[str] = None
            if settings.is_gemini_active:
                try:
                    logger.info(f"Generating summary via Gemini API in language '{language}'...")
                    summary_text = await gemini_service.generate_summary(extracted, language)
                except Exception as e:
                    logger.warning(f"Gemini summary generation encountered error, falling back: {e}")

            if not summary_text:
                summary_text = await openai_service.generate_summary(extracted, language)

            summary = HealthSummary(
                id=str(uuid.uuid4()),
                document_id=document_id,
                language=language,
                summary_text=summary_text,
            )
            db.add(summary)
            await db.commit()
            logger.info(f"Summary generated for {document_id} in {language}")

            # Step 4: Timeline events
            timeline_items = await _create_timeline_events(db, document, extracted)

            # Step 5: Mark completed
            document.status = "completed"
            await db.commit()
            logger.info(f"Document {document_id} processing complete.")

            # Optional Step 6: Sync to Firebase Firestore if enabled
            if settings.is_firebase_active:
                await firebase_service.save_document({
                    "id": document.id,
                    "patient_id": document.patient_id,
                    "filename": document.filename,
                    "document_type": document.document_type,
                    "status": "completed",
                    "ocr_text": document.ocr_text,
                    "extracted_data": document.extracted_data,
                    "overall_confidence": document.overall_confidence,
                    "created_at": document.created_at.isoformat() if document.created_at else None,
                })
                await firebase_service.save_health_summary({
                    "id": summary.id,
                    "document_id": document_id,
                    "language": language,
                    "summary_text": summary_text,
                })
                await firebase_service.save_timeline_events([
                    {
                        "id": ev.id,
                        "patient_id": ev.patient_id,
                        "event_type": ev.event_type,
                        "event_date": ev.event_date.isoformat() if ev.event_date else None,
                        "title": ev.title,
                        "description": ev.description,
                        "related_document_id": ev.related_document_id,
                        "data": ev.data,
                    }
                    for ev in timeline_items
                ])

        except Exception as e:
            logger.exception(f"Processing failed for document {document_id}: {e}")
            async with db_session_factory() as err_db:
                result = await err_db.execute(select(Document).where(Document.id == document_id))
                doc = result.scalar_one_or_none()
                if doc:
                    doc.status = "failed"
                    doc.error_message = str(e)
                    await err_db.commit()


async def _create_timeline_events(db: AsyncSession, document: Document, extracted: ExtractedData) -> list[TimelineEvent]:
    """Create TimelineEvent rows from extracted data."""
    patient_id = document.patient_id
    doc_id = document.id
    events = []

    # One event per medication
    for med in extracted.medications:
        events.append(TimelineEvent(
            id=str(uuid.uuid4()),
            patient_id=patient_id,
            event_type="medication",
            event_date=_to_datetime(extracted.document_date),
            title=f"Medication: {med.name}",
            description=f"{med.dosage or ''} {med.frequency or ''}".strip(),
            related_document_id=doc_id,
            data=med.model_dump(mode="json"),
        ))

    # One event per lab result
    for lab in extracted.lab_results:
        flag_str = f" [{lab.flag}]" if lab.flag else ""
        events.append(TimelineEvent(
            id=str(uuid.uuid4()),
            patient_id=patient_id,
            event_type="lab_result",
            event_date=_to_datetime(lab.date or extracted.document_date),
            title=f"Lab: {lab.test_name}{flag_str}",
            description=f"{lab.value} {lab.unit or ''}".strip() if lab.value else None,
            related_document_id=doc_id,
            data=lab.model_dump(mode="json"),
        ))

    # One event per diagnosis
    for diag in extracted.diagnoses:
        events.append(TimelineEvent(
            id=str(uuid.uuid4()),
            patient_id=patient_id,
            event_type="diagnosis",
            event_date=_to_datetime(diag.date or extracted.document_date),
            title=f"Diagnosis: {diag.name}",
            related_document_id=doc_id,
            data=diag.model_dump(mode="json"),
        ))

    # One event for the document itself
    events.append(TimelineEvent(
        id=str(uuid.uuid4()),
        patient_id=patient_id,
        event_type="document",
        event_date=_to_datetime(extracted.document_date) or datetime.utcnow(),
        title=f"Document uploaded: {document.filename}",
        description=f"Type: {extracted.document_type}",
        related_document_id=doc_id,
        data={"filename": document.filename, "document_type": extracted.document_type},
    ))

    db.add_all(events)
    await db.commit()
    logger.info(f"Created {len(events)} timeline events for document {doc_id}")
    return events


def _to_datetime(d) -> Optional[datetime]:
    if d is None:
        return None
    if isinstance(d, datetime):
        return d
    if isinstance(d, date):
        return datetime(d.year, d.month, d.day)
    if isinstance(d, str):
        try:
            return datetime.fromisoformat(d)
        except Exception:
            return None
    return None

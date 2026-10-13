import logging
from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.domain import TimelineEvent, Patient
from app.models.schemas import TimelineEventOut
from app.services.auth import get_current_patient

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/timeline", tags=["timeline"])


@router.get("", response_model=List[TimelineEventOut])
async def get_timeline(
    patient: Patient = Depends(get_current_patient),
    db: AsyncSession = Depends(get_db),
):
    """Return chronological timeline events for the current patient."""
    result = await db.execute(
        select(TimelineEvent)
        .where(TimelineEvent.patient_id == patient.id)
        .order_by(TimelineEvent.event_date.desc().nullslast(), TimelineEvent.created_at.desc())
    )
    events = result.scalars().all()
    return [
        TimelineEventOut(
            id=e.id,
            patient_id=e.patient_id,
            event_type=e.event_type,
            event_date=e.event_date.date() if e.event_date else None,
            title=e.title,
            description=e.description,
            related_document_id=e.related_document_id,
            data=e.data,
            created_at=e.created_at,
        )
        for e in events
    ]

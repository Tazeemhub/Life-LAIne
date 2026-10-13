import uuid
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from app.database import get_db
from app.models.domain import Patient, ChatMessage
from app.models.schemas import (
    ChatMessageCreate,
    ChatMessageOut,
    DoctorReplyCreate,
    ChatConversationResponse,
)
from app.services.auth import get_current_patient
from app.services.gemini_service import gemini_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.get("/messages", response_model=List[ChatMessageOut])
async def get_chat_messages(
    patient_id: Optional[str] = Query(None),
    current_patient: Patient = Depends(get_current_patient),
    db: AsyncSession = Depends(get_db),
):
    """
    Get all chat messages for the patient conversation.
    Doctors can pass patient_id to view that specific patient's conversation.
    """
    target_patient_id = patient_id or current_patient.id
    stmt = (
        select(ChatMessage)
        .where(ChatMessage.patient_id == target_patient_id)
        .order_by(ChatMessage.created_at.asc())
    )
    result = await db.execute(stmt)
    messages = result.scalars().all()
    return messages


@router.post("/send", response_model=ChatConversationResponse)
async def send_chat_message(
    payload: ChatMessageCreate,
    x_user_role: Optional[str] = Header(default="patient"),
    x_doctor_name: Optional[str] = Header(default=None),
    current_patient: Patient = Depends(get_current_patient),
    db: AsyncSession = Depends(get_db),
):
    """
    Send a message about medical doubts, symptoms, prescriptions, or emotional feelings.
    Generates an empathetic AI response (ChatGPT/Gemini style) and suggests follow-up inquiries.
    """
    sender_role = "doctor" if x_user_role == "doctor" else "patient"
    sender_name = x_doctor_name if sender_role == "doctor" else (current_patient.name or "Patient")

    # 1. Store the user's message
    user_msg = ChatMessage(
        id=str(uuid.uuid4()),
        patient_id=current_patient.id,
        sender_role=sender_role,
        sender_name=sender_name,
        message=payload.message.strip(),
        category=payload.category or "doubt",
        doctor_id=payload.doctor_id,
    )
    db.add(user_msg)
    await db.commit()
    await db.refresh(user_msg)

    # 2. Fetch recent conversation history for AI context
    history_stmt = (
        select(ChatMessage)
        .where(ChatMessage.patient_id == current_patient.id)
        .order_by(ChatMessage.created_at.desc())
        .limit(8)
    )
    history_res = await db.execute(history_stmt)
    history_records = list(reversed(history_res.scalars().all()))

    formatted_history = [
        {"sender_role": m.sender_role, "message": m.message}
        for m in history_records
    ]

    # 3. Generate AI response (using Gemini 2.5 Flash / Companion AI)
    ai_result = await gemini_service.chat_health_companion(
        user_message=payload.message,
        category=payload.category or "doubt",
        sender_role=sender_role,
        user_name=sender_name,
        history=formatted_history,
    )

    ai_reply_text = ai_result.get("reply", "I am here to support you with your health questions and feelings.")
    suggested_followups = ai_result.get("suggested_followups", [])

    ai_msg = ChatMessage(
        id=str(uuid.uuid4()),
        patient_id=current_patient.id,
        sender_role="ai",
        sender_name="HealthCopilot AI",
        message=ai_reply_text,
        category=payload.category or "doubt",
        doctor_id=payload.doctor_id,
    )
    db.add(ai_msg)
    await db.commit()
    await db.refresh(ai_msg)

    return ChatConversationResponse(
        user_message=ChatMessageOut.model_validate(user_msg),
        reply_message=ChatMessageOut.model_validate(ai_msg),
        suggested_followups=suggested_followups,
    )


@router.post("/doctor-reply", response_model=ChatMessageOut)
async def doctor_reply(
    payload: DoctorReplyCreate,
    x_doctor_name: Optional[str] = Header(default="Dr. Clinician"),
    db: AsyncSession = Depends(get_db),
):
    """
    Direct response from a Doctor to a patient's doubts or emotional messages.
    """
    doc_msg = ChatMessage(
        id=str(uuid.uuid4()),
        patient_id=payload.patient_id,
        sender_role="doctor",
        sender_name=payload.doctor_name or x_doctor_name or "Doctor",
        message=payload.message.strip(),
        category=payload.category or "doubt",
    )
    db.add(doc_msg)
    await db.commit()
    await db.refresh(doc_msg)
    return doc_msg


@router.delete("/messages")
async def clear_chat_history(
    patient_id: Optional[str] = Query(None),
    current_patient: Patient = Depends(get_current_patient),
    db: AsyncSession = Depends(get_db),
):
    """
    Clear all messages for the active conversation to start fresh.
    """
    target_id = patient_id or current_patient.id
    stmt = delete(ChatMessage).where(ChatMessage.patient_id == target_id)
    await db.execute(stmt)
    await db.commit()
    return {"status": "ok", "message": "Conversation history cleared."}

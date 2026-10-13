import uuid
from datetime import datetime
from typing import Optional, Any, Dict
from sqlalchemy import String, Text, DateTime, ForeignKey, JSON, Float, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import JSONB


class Base(DeclarativeBase):
    pass


class Patient(Base):
    __tablename__ = "patients"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    entra_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, unique=True, index=True)
    guest_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True, unique=True, index=True)
    name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    mock_abha_id: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    preferred_language: Mapped[str] = mapped_column(String(10), default="en")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    documents: Mapped[list["Document"]] = relationship("Document", back_populates="patient", cascade="all, delete-orphan")
    timeline_events: Mapped[list["TimelineEvent"]] = relationship("TimelineEvent", back_populates="patient", cascade="all, delete-orphan")
    doctor_insights: Mapped[list["DoctorInsight"]] = relationship("DoctorInsight", back_populates="patient", cascade="all, delete-orphan")
    chat_messages: Mapped[list["ChatMessage"]] = relationship("ChatMessage", back_populates="patient", cascade="all, delete-orphan")


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    patient_id: Mapped[str] = mapped_column(String(36), ForeignKey("patients.id"), index=True)
    filename: Mapped[str] = mapped_column(String(500))
    blob_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    local_path: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    document_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    folder: Mapped[str] = mapped_column(String(50), default="prescriptions")
    tags: Mapped[Optional[list]] = mapped_column(JSON, default=list)
    is_xerox: Mapped[bool] = mapped_column(default=False)
    uploaded_by: Mapped[str] = mapped_column(String(20), default="patient")  # patient | doctor
    status: Mapped[str] = mapped_column(String(20), default="processing")  # processing | completed | failed
    ocr_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    extracted_data: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    overall_confidence: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    patient: Mapped["Patient"] = relationship("Patient", back_populates="documents")
    summaries: Mapped[list["HealthSummary"]] = relationship("HealthSummary", back_populates="document", cascade="all, delete-orphan")
    timeline_events: Mapped[list["TimelineEvent"]] = relationship("TimelineEvent", back_populates="related_document")
    doctor_insights: Mapped[list["DoctorInsight"]] = relationship("DoctorInsight", back_populates="document")


class HealthSummary(Base):
    __tablename__ = "health_summaries"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    document_id: Mapped[str] = mapped_column(String(36), ForeignKey("documents.id"), index=True)
    language: Mapped[str] = mapped_column(String(10), default="en")
    summary_text: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    document: Mapped["Document"] = relationship("Document", back_populates="summaries")


class TimelineEvent(Base):
    __tablename__ = "timeline_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    patient_id: Mapped[str] = mapped_column(String(36), ForeignKey("patients.id"), index=True)
    event_type: Mapped[str] = mapped_column(String(50))  # medication | lab_result | diagnosis | document | doctor_note
    event_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    title: Mapped[str] = mapped_column(String(500))
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    related_document_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("documents.id"), nullable=True)
    data: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    patient: Mapped["Patient"] = relationship("Patient", back_populates="timeline_events")
    related_document: Mapped[Optional["Document"]] = relationship("Document", back_populates="timeline_events")


class DoctorInsight(Base):
    __tablename__ = "doctor_insights"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    patient_id: Mapped[str] = mapped_column(String(36), ForeignKey("patients.id"), index=True)
    doctor_name: Mapped[str] = mapped_column(String(255))
    doctor_specialty: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    document_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("documents.id"), nullable=True)
    title: Mapped[str] = mapped_column(String(255), default="Clinical Consultation Note")
    clinical_notes: Mapped[str] = mapped_column(Text)
    prescriptions_advice: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    soap_subjective: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    soap_objective: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    soap_assessment: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    soap_plan: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    patient: Mapped["Patient"] = relationship("Patient", back_populates="doctor_insights")
    document: Mapped[Optional["Document"]] = relationship("Document", back_populates="doctor_insights")


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    patient_id: Mapped[str] = mapped_column(String(36), ForeignKey("patients.id"), index=True)
    sender_role: Mapped[str] = mapped_column(String(20))  # patient | doctor | ai
    sender_name: Mapped[str] = mapped_column(String(255))
    message: Mapped[str] = mapped_column(Text)
    category: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # doubt | feeling | medication | general
    doctor_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    patient: Mapped["Patient"] = relationship("Patient", back_populates="chat_messages")


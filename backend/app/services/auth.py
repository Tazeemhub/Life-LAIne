"""
Auth service: supports Microsoft Entra ID Bearer tokens
and a lightweight Guest/Demo mode for hackathon judges.
"""
import uuid
import logging
from typing import Optional, Tuple
from fastapi import Header, Query, HTTPException, status, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.domain import Patient
from app.database import get_db
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

GUEST_PATIENT_CACHE: dict[str, str] = {}  # guest_id -> patient_id


async def get_current_patient(
    authorization: Optional[str] = Header(default=None),
    x_demo_mode: Optional[str] = Header(default=None),
    x_guest_id: Optional[str] = Header(default=None),
    db: AsyncSession = Depends(get_db),
) -> Patient:
    """
    Resolve the current patient:
    - Guest mode: X-Demo-Mode: true header creates/retrieves a guest patient
    - Entra ID:   Bearer token in Authorization header
    """
    # ── Guest / Demo mode ────────────────────────────────────────────────────
    if x_demo_mode and x_demo_mode.lower() == "true":
        guest_id = x_guest_id or "demo-guest"
        return await _get_or_create_guest_patient(db, guest_id)

    # ── Entra ID Bearer token ─────────────────────────────────────────────────
    if authorization and authorization.startswith("Bearer "):
        token = authorization[len("Bearer "):]
        entra_id, name = await _validate_entra_token(token)
        if entra_id:
            return await _get_or_create_entra_patient(db, entra_id, name)

    # ── Default: demo mode for convenience during hackathon ───────────────────
    return await _get_or_create_guest_patient(db, "default-demo")


async def _get_or_create_guest_patient(db: AsyncSession, guest_id: str) -> Patient:
    result = await db.execute(select(Patient).where(Patient.guest_id == guest_id))
    patient = result.scalar_one_or_none()
    if not patient:
        patient = Patient(
            id=str(uuid.uuid4()),
            guest_id=guest_id,
            name="Demo User",
            preferred_language="en",
        )
        db.add(patient)
        await db.commit()
        await db.refresh(patient)
        logger.info(f"Created guest patient: {patient.id}")
    return patient


async def _get_or_create_entra_patient(db: AsyncSession, entra_id: str, name: Optional[str]) -> Patient:
    result = await db.execute(select(Patient).where(Patient.entra_id == entra_id))
    patient = result.scalar_one_or_none()
    if not patient:
        patient = Patient(
            id=str(uuid.uuid4()),
            entra_id=entra_id,
            name=name or "Patient",
            preferred_language="en",
        )
        db.add(patient)
        await db.commit()
        await db.refresh(patient)
        logger.info(f"Created Entra ID patient: {patient.id}")
    return patient


async def _validate_entra_token(token: str) -> Tuple[Optional[str], Optional[str]]:
    """Validate Microsoft Entra ID JWT. Returns (oid/sub, display_name)."""
    try:
        if not settings.azure_ad_tenant_id or not settings.azure_ad_client_id:
            logger.warning("Entra ID not configured; skipping token validation.")
            return None, None

        import jwt
        from jwt import PyJWKClient

        jwks_url = (
            f"https://login.microsoftonline.com/{settings.azure_ad_tenant_id}"
            f"/discovery/v2.0/keys"
        )
        jwks_client = PyJWKClient(jwks_url)
        signing_key = jwks_client.get_signing_key_from_jwt(token)
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            audience=settings.azure_ad_client_id,
        )
        entra_id = payload.get("oid") or payload.get("sub")
        name = payload.get("name")
        return entra_id, name
    except Exception as e:
        logger.warning(f"Entra ID token validation failed: {e}")
        return None, None

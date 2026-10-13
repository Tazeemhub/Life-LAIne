import os
import logging
from typing import Optional, Dict, Any, List
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class FirebaseService:
    """
    Firebase Firestore database service.
    Allows testing with Firebase Cloud Firestore for document and patient persistence,
    with seamless fallback to SQL (Postgres / SQLite).
    """

    def __init__(self):
        self._db = None
        self._initialized = False
        self._initialize()

    def _initialize(self):
        if not settings.is_firebase_active:
            logger.info("Firebase is not enabled. Using primary relational database.")
            return

        try:
            import firebase_admin
            from firebase_admin import credentials, firestore

            if not firebase_admin._apps:
                cred_path = settings.firebase_credentials_path
                has_file = cred_path and os.path.exists(cred_path)
                has_adc = bool(os.environ.get("GOOGLE_APPLICATION_CREDENTIALS") and os.path.exists(os.environ["GOOGLE_APPLICATION_CREDENTIALS"]))

                if has_file:
                    cred = credentials.Certificate(cred_path)
                    firebase_admin.initialize_app(cred)
                elif has_adc:
                    firebase_admin.initialize_app(options={"projectId": settings.firebase_project_id} if settings.firebase_project_id else None)
                else:
                    logger.warning(
                        "Firebase is enabled, but FIREBASE_CREDENTIALS_PATH does not point to a valid service account JSON file "
                        f"(got: '{cred_path or 'None'}'). "
                        "To test with Firebase Firestore, download serviceAccountKey.json from Firebase Console and set its path. "
                        "Safely falling back to relational database."
                    )
                    self._initialized = False
                    return

            self._db = firestore.client()
            self._initialized = True
            logger.info("Firebase Firestore database initialized successfully.")
        except Exception as e:
            logger.warning(
                f"Could not initialize Firebase Firestore: {e}. "
                "Ensure a valid Firebase serviceAccountKey.json is provided. "
                "Falling back safely to relational database."
            )
            self._initialized = False

    @property
    def is_active(self) -> bool:
        return self._initialized and self._db is not None

    def is_configured(self) -> bool:
        return self.is_active

    async def save_patient(self, patient_data: Dict[str, Any]) -> None:
        if not self.is_active:
            return
        try:
            doc_id = patient_data.get("id")
            if doc_id:
                self._db.collection("patients").document(doc_id).set(patient_data, merge=True)
                logger.info(f"Synced patient {doc_id} to Firestore.")
        except Exception as e:
            logger.warning(f"Firestore save_patient failed: {e}")

    async def save_document(self, doc_data: Dict[str, Any]) -> None:
        if not self.is_active:
            return
        try:
            doc_id = doc_data.get("id")
            if doc_id:
                self._db.collection("documents").document(doc_id).set(doc_data, merge=True)
                logger.info(f"Synced document {doc_id} to Firestore.")
        except Exception as e:
            logger.warning(f"Firestore save_document failed: {e}")

    async def save_health_summary(self, summary_data: Dict[str, Any]) -> None:
        if not self.is_active:
            return
        try:
            s_id = summary_data.get("id")
            if s_id:
                self._db.collection("health_summaries").document(s_id).set(summary_data, merge=True)
        except Exception as e:
            logger.warning(f"Firestore save_health_summary failed: {e}")

    async def save_timeline_events(self, events: List[Dict[str, Any]]) -> None:
        if not self.is_active:
            return
        try:
            batch = self._db.batch()
            for ev in events:
                e_id = ev.get("id")
                if e_id:
                    ref = self._db.collection("timeline_events").document(e_id)
                    batch.set(ref, ev, merge=True)
            batch.commit()
            logger.info(f"Synced {len(events)} timeline events to Firestore.")
        except Exception as e:
            logger.warning(f"Firestore save_timeline_events failed: {e}")

    async def save_doctor_insight(self, insight_data: Dict[str, Any]) -> None:
        if not self.is_active:
            return
        try:
            ins_id = insight_data.get("id")
            if ins_id:
                self._db.collection("doctor_insights").document(ins_id).set(insight_data, merge=True)
                logger.info(f"Synced doctor insight {ins_id} to Firestore.")
        except Exception as e:
            logger.warning(f"Firestore save_doctor_insight failed: {e}")


firebase_service = FirebaseService()

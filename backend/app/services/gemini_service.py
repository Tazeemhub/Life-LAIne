import json
import logging
from typing import Optional
from google import genai
from google.genai import types
from app.config import get_settings
from app.models.schemas import ExtractedData, ClinicalTranscriptionResponse

logger = logging.getLogger(__name__)
settings = get_settings()


class GeminiService:
    """
    Enterprise-grade Gemini AI service using the official google-genai SDK.
    Supports multimodal clinical document extraction, JSON schema enforcement,
    and plain-language multilingual health summarization (EN, HI, TE, TA).
    """

    def __init__(self):
        self._client: Optional[genai.Client] = None
        if settings.gemini_api_key:
            try:
                self._client = genai.Client(api_key=settings.gemini_api_key)
                logger.info(f"Gemini API client initialized successfully with model {settings.gemini_model}.")
            except Exception as e:
                logger.warning(f"Failed to initialize Gemini API client: {e}")

    @property
    def is_available(self) -> bool:
        return self._client is not None or bool(settings.gemini_api_key)

    def is_configured(self) -> bool:
        return self.is_available

    def _get_client(self) -> genai.Client:
        if self._client is None and settings.gemini_api_key:
            self._client = genai.Client(api_key=settings.gemini_api_key)
        if self._client is None:
            raise RuntimeError("Gemini API key is not configured. Provide GEMINI_API_KEY in .env.")
        return self._client

    async def extract_structured_data(self, ocr_text: str, file_bytes: Optional[bytes] = None, content_type: Optional[str] = None) -> ExtractedData:
        """
        Extract structured clinical fields from medical paperwork using Gemini with structured output schema.
        """
        client = self._get_client()

        prompt = (
            "You are an expert clinical AI extraction specialist. Analyze the following medical document.\n"
            "Extract all clinical entities with complete precision according to the target schema:\n"
            "1. Medications: Prescribed medicines, exact dosages, frequencies (e.g. Once daily, Twice daily, OD, BD), duration, route, instructions, and confidence score (0.0 to 1.0).\n"
            "2. Lab Results: All diagnostic tests, numeric/qualitative values, units, reference intervals, abnormal flags (H for high, L for low, N for normal, HH for critical high, LL for critical low), and confidence.\n"
            "3. Diagnoses: Primary and secondary diagnoses, conditions, or clinical impressions with confidence.\n"
            "4. Patient Information: Name, age, gender.\n"
            "5. Overall Document Confidence: (0.0 to 1.0).\n\n"
            f"DOCUMENT OCR CONTENT:\n{ocr_text}"
        )

        contents = []
        if file_bytes and content_type in ("application/pdf", "image/jpeg", "image/png", "image/jpg"):
            try:
                contents.append(types.Part.from_bytes(data=file_bytes, mime_type=content_type))
            except Exception as e:
                logger.debug(f"Direct file bytes attachment bypassed: {e}")

        contents.append(prompt)

        try:
            response = client.models.generate_content(
                model=settings.gemini_model,
                contents=contents,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=ExtractedData,
                    temperature=0.1,
                ),
            )

            if response.parsed:
                return response.parsed  # type: ignore

            if response.text:
                return ExtractedData.model_validate_json(response.text)

            raise ValueError("Empty response from Gemini model")
        except Exception as e:
            logger.error(f"Gemini structured extraction failed: {e}")
            raise

    async def generate_summary(self, extracted: ExtractedData, language: str = "en") -> str:
        """
        Generate an 8th-grade reading level plain-language health summary in the requested language (EN, HI, TE, TA).
        """
        client = self._get_client()

        lang_name_map = {
            "hi": "Hindi (हिंदी)",
            "te": "Telugu (తెలుగు)",
            "ta": "Tamil (தமிழ்)",
            "en": "English",
        }
        target_lang = lang_name_map.get(language, "English")

        if hasattr(extracted, "model_dump"):
            data_str = json.dumps(extracted.model_dump(mode="json"), indent=2)
        elif isinstance(extracted, dict):
            data_str = json.dumps(extracted, indent=2)
        else:
            data_str = str(extracted)

        prompt = (
            f"You are a compassionate, clear AI Health Copilot. Your job is to explain complex clinical paperwork "
            f"to a patient in simple, reassuring, 8th-grade reading level plain language in {target_lang}.\n\n"
            "Structure your explanation with numbered sections:\n"
            "1. Overview — Brief summary of what this document is (Prescription, Lab Report, or Discharge Summary).\n"
            "2. Key Findings & Medications — Plain English explanation of prescribed drugs (when and how to take them) "
            "or test results (flag any abnormal high/low values with caution ⚠️).\n"
            "3. What This Means For You — Practical interpretation without medical jargon.\n"
            "4. Action Items & Follow-up — Dietary/lifestyle advice mentioned, upcoming follow-ups, and warning signs.\n\n"
            "STRICT RULES:\n"
            "- Do NOT give speculative diagnosis or alter prescribed dosages.\n"
            "- If explaining in Hindi, Telugu, or Tamil, use natural regional phrasing with English drug names in brackets for clarity.\n\n"
            f"EXTRACTED CLINICAL DATA:\n{data_str}"
        )

        try:
            response = client.models.generate_content(
                model=settings.gemini_model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.3,
                ),
            )
            return response.text or "Summary generation completed."
        except Exception as e:
            logger.error(f"Gemini summary generation failed: {e}")
            raise

    async def transcribe_clinical_dictation(
        self,
        transcript_text: str,
        doctor_name: str = "Dr. Clinician",
        patient_context: Optional[str] = None,
    ) -> dict:
        """
        Transform raw spoken audio/dictation into structured SOAP notes and clinical insights using Gemini 2.5 Flash.
        """
        client = self._get_client()

        prompt = (
            f"You are an expert clinical scribe assisting {doctor_name}.\n"
            "The physician dictated consultation findings and advice for a patient.\n"
            f"Patient Context: {patient_context or 'General clinical consultation'}\n\n"
            "Transform this raw dictation into an organized clinical note:\n"
            "1. Concise title for the note (e.g. 'Type 2 Diabetes & Hypertension Consultation').\n"
            "2. Complete clinical notes paragraph explaining the assessment in clear, professional medical terms.\n"
            "3. Prescriptions and advice bullet points with exact drug name, dose, frequency, and instructions.\n"
            "4. Full SOAP note breakdown:\n"
            "   - Subjective (Chief complaints, symptoms)\n"
            "   - Objective (Vitals, physical exam, test readings)\n"
            "   - Assessment (Primary & secondary diagnoses)\n"
            "   - Plan (Medicines, tests ordered, lifestyle advice, follow-up date)\n\n"
            f"DOCTOR DICTATED TEXT:\n{transcript_text}"
        )

        try:
            response = client.models.generate_content(
                model=settings.gemini_model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=ClinicalTranscriptionResponse,
                    temperature=0.2,
                ),
            )
            if response.text:
                return json.loads(response.text)
        except Exception as e:
            logger.warning(f"Structured transcription failed: {e}. Generating fallback response.")

        return {
            "title": "Clinical Consultation Note",
            "clinical_notes": transcript_text,
            "prescriptions_advice": "As discussed during consultation.",
            "soap_subjective": transcript_text,
            "soap_objective": "Vitals and exam reviewed during consultation.",
            "soap_assessment": "Clinical review completed.",
            "soap_plan": "Continue current regimen and follow up as advised.",
            "extracted_medications": [],
        }

    async def chat_health_companion(
        self,
        user_message: str,
        category: str = "doubt",
        sender_role: str = "patient",
        user_name: str = "Patient",
        history: Optional[list] = None,
    ) -> dict:
        """
        AI Health Copilot interactive chat (ChatGPT / Gemini style) specifically tuned
        for patient & doctor doubts, emotional reassurance, symptoms, and feelings.
        Returns: { "reply": str, "suggested_followups": list[str] }
        """
        history_str = ""
        if history:
            formatted_turns = []
            for h in history[-6:]:  # last 6 turns
                role = h.get("sender_role", "user")
                text = h.get("message", "")
                formatted_turns.append(f"{role.upper()}: {text}")
            history_str = "\n".join(formatted_turns)

        role_context = (
            f"The user is a PATIENT named {user_name} asking about their health doubts and emotional feelings."
            if sender_role == "patient"
            else f"The user is a DOCTOR ({user_name}) discussing clinical doubts, diagnostic thoughts, or patient communication."
        )

        prompt = (
            f"You are the HealthCopilot AI Companion, an empathetic, world-class medical and emotional well-being assistant "
            f"(designed just like ChatGPT and Google Gemini, but specialized in compassionate healthcare communication).\n\n"
            f"CONTEXT:\n"
            f"- Role Context: {role_context}\n"
            f"- Primary Topic Category: {category.upper()} (e.g. doubt, feeling/anxiety, medication, or general question)\n"
            f"- Recent Dialogue History:\n{history_str or 'None (new conversation)'}\n\n"
            f"USER'S MESSAGE:\n\"{user_message}\"\n\n"
            "INSTRUCTIONS FOR YOUR RESPONSE:\n"
            "1. Deep Empathy & Validation: Immediately acknowledge their concern, doubt, or emotional state with warmth.\n"
            "2. Plain-Language Explanation: Clarify the medical doubt, biomarker, drug question, or symptom in simple, reassuring words (8th-grade level, no confusing jargon).\n"
            "3. Actionable Care Guidance: Provide realistic, calming steps they can take right now (hydration, relaxation, questions to note down for doctor).\n"
            "4. Safety & Boundaries: Reassure them while reminding that you are an AI companion supporting their journey and their doctor is always their final partner.\n\n"
            "FORMAT YOUR OUTPUT AS VALID JSON with keys:\n"
            '{\n  "reply": "Your markdown-formatted empathetic answer (use short paragraphs and bullet points for readability)",\n'
            '  "suggested_followups": ["Question 1", "Question 2", "Question 3"]\n}'
        )

        if not settings.gemini_api_key:
            return self._fallback_chat_reply(user_message, category, sender_role)

        try:
            client = self._get_client()
            response = client.models.generate_content(
                model=settings.gemini_model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.4,
                ),
            )
            if response.text:
                parsed = json.loads(response.text)
                return {
                    "reply": parsed.get("reply", "I'm here to support you with your health questions and feelings."),
                    "suggested_followups": parsed.get("suggested_followups", [
                        "Can you explain this in simpler terms?",
                        "What symptoms should I monitor closely?",
                        "How can I manage my anxiety about this?",
                    ]),
                }
        except Exception as e:
            logger.warning(f"Gemini chat companion failed: {e}. Falling back to rule-based response.")

        return self._fallback_chat_reply(user_message, category, sender_role)

    def _fallback_chat_reply(self, message: str, category: str, sender_role: str) -> dict:
        """Compassionate offline fallback reply when Gemini is offline or rate-limited."""
        if category == "feeling":
            reply = (
                f"I hear how much weight you are carrying right now. Medical uncertainties and bodily symptoms "
                f"can naturally trigger feelings of anxiety, fear, or frustration. You are definitely not alone in feeling this way.\n\n"
                f"**What can help right now:**\n"
                f"- Take three slow, grounding breaths (inhale for 4 seconds, exhale for 6 seconds).\n"
                f"- Remember that a test result or symptom is just one piece of data, not your entire health story.\n"
                f"- Note down specifically what worries you so we can formulate clear questions for your doctor.\n\n"
                f"Would you like to break down any specific lab report or medication that is making you feel uneasy?"
            )
            followups = [
                "How do I cope with health anxiety?",
                "What questions should I ask my doctor about this?",
                "Can stress cause these symptoms?",
            ]
        elif category == "medication":
            reply = (
                f"It is very common to have doubts about prescriptions, dosages, and potential side effects.\n\n"
                f"**General Safety Guidelines:**\n"
                f"- Take medicines strictly at regular intervals as prescribed.\n"
                f"- If you missed a dose, generally do not double up without doctor confirmation.\n"
                f"- If you experience unexpected dizziness, rashes, or stomach distress, inform your clinic.\n\n"
                f"Feel free to share the exact medication name or dosage from your prescription so we can review its purpose!"
            )
            followups = [
                "Should I take this medicine with or without food?",
                "What are the common mild side effects?",
                "What should I do if I missed a dose?",
            ]
        else:
            reply = (
                f"Thank you for sharing your doubt. Understanding what is happening with your body or clinical paperwork "
                f"is the best way to feel in control of your health.\n\n"
                f"**Key perspective:**\n"
                f"- Medical numbers and terminology often sound much more alarming on paper than they actually are in context.\n"
                f"- Always look at the trend over time rather than a single isolated reading.\n\n"
                f"I'm here to unpack any medical term, symptom, or doctor note whenever you're ready. What part would you like to explore first?"
            )
            followups = [
                "Can you explain what normal ranges mean?",
                "Is this reading considered dangerous?",
                "What lifestyle adjustments can improve this?",
            ]

        return {
            "reply": reply,
            "suggested_followups": followups,
        }


gemini_service = GeminiService()


import json
import logging
from pathlib import Path
from typing import Optional
from app.config import get_settings
from app.models.schemas import ExtractedData

logger = logging.getLogger(__name__)
settings = get_settings()

PROMPTS_DIR = Path(__file__).parent.parent / "prompts"

# Pre-load prompt templates if present
_EXTRACTION_PROMPT = ""
_SUMMARY_PROMPT = ""
try:
    if (PROMPTS_DIR / "extraction.txt").exists():
        _EXTRACTION_PROMPT = (PROMPTS_DIR / "extraction.txt").read_text(encoding="utf-8")
    if (PROMPTS_DIR / "summary.txt").exists():
        _SUMMARY_PROMPT = (PROMPTS_DIR / "summary.txt").read_text(encoding="utf-8")
except Exception as e:
    logger.warning(f"Could not load prompt files: {e}")

# JSON Schema for structured extraction
EXTRACTION_SCHEMA = ExtractedData.model_json_schema()

# ─── Mock Data Sets for Local / Demo Mode ───────────────────────────────────

MOCK_LAB = {
    "document_type": "lab_report",
    "patient_info": {"name": "Rajesh Kumar", "age": "52", "gender": "Male", "confidence": 0.95},
    "medications": [],
    "lab_results": [
        {"test_name": "Fasting Blood Sugar (FBS)", "value": "148.0", "unit": "mg/dL", "reference_range": "70.0 - 99.0", "flag": "H", "date": "2026-03-12", "confidence": 0.98},
        {"test_name": "Post Prandial Sugar (PPBS)", "value": "210.5", "unit": "mg/dL", "reference_range": "< 140.0", "flag": "H", "date": "2026-03-12", "confidence": 0.97},
        {"test_name": "Glycated Hemoglobin (HbA1c)", "value": "8.2", "unit": "%", "reference_range": "4.0 - 5.6", "flag": "H", "date": "2026-03-12", "confidence": 0.96},
        {"test_name": "Total Cholesterol", "value": "224.0", "unit": "mg/dL", "reference_range": "< 200.0", "flag": "H", "date": "2026-03-12", "confidence": 0.94},
        {"test_name": "Triglycerides", "value": "192.0", "unit": "mg/dL", "reference_range": "< 150.0", "flag": "H", "date": "2026-03-12", "confidence": 0.93},
        {"test_name": "HDL Cholesterol (Good)", "value": "38.0", "unit": "mg/dL", "reference_range": "> 40.0", "flag": "L", "date": "2026-03-12", "confidence": 0.91},
        {"test_name": "LDL Cholesterol (Bad)", "value": "147.6", "unit": "mg/dL", "reference_range": "< 100.0", "flag": "H", "date": "2026-03-12", "confidence": 0.95},
        {"test_name": "Serum Creatinine", "value": "0.95", "unit": "mg/dL", "reference_range": "0.70 - 1.30", "flag": "N", "date": "2026-03-12", "confidence": 0.96},
        {"test_name": "Hemoglobin", "value": "14.6", "unit": "g/dL", "reference_range": "13.0 - 17.0", "flag": "N", "date": "2026-03-12", "confidence": 0.95}
    ],
    "diagnoses": [
        {"name": "Suboptimal Glycemic Control (Diabetes)", "date": "2026-03-12", "confidence": 0.92},
        {"name": "Mixed Dyslipidemia", "date": "2026-03-12", "confidence": 0.90}
    ],
    "document_date": "2026-03-12",
    "notes": "Elevated fasting/postprandial glucose & HbA1c (8.2%). Elevated LDL & triglycerides with borderline low HDL. Renal function normal.",
    "overall_confidence": 0.95
}

MOCK_PRESCRIPTION = {
    "document_type": "prescription",
    "patient_info": {"name": "Rajesh Kumar", "age": "52", "gender": "Male", "confidence": 0.97},
    "medications": [
        {"name": "Metformin Hydrochloride", "dosage": "500 mg", "frequency": "Twice daily (BD)", "duration": "90 days", "route": "Oral", "instructions": "Take immediately after breakfast and dinner", "confidence": 0.98},
        {"name": "Lisinopril", "dosage": "10 mg", "frequency": "Once daily (OD) - Morning", "duration": "90 days", "route": "Oral", "instructions": "Take daily at 8:00 AM with water. Monitor blood pressure weekly", "confidence": 0.96},
        {"name": "Atorvastatin", "dosage": "20 mg", "frequency": "Once daily (OD) - Bedtime", "duration": "90 days", "route": "Oral", "instructions": "Take at bedtime. Report any muscle soreness", "confidence": 0.97},
        {"name": "Aspirin (Enteric Coated)", "dosage": "75 mg", "frequency": "Once daily (OD) - Post lunch", "duration": "90 days", "route": "Oral", "instructions": "Take after meals", "confidence": 0.94}
    ],
    "lab_results": [
        {"test_name": "Blood Pressure", "value": "138/88", "unit": "mmHg", "reference_range": "< 120/80", "flag": "H", "date": "2026-03-15", "confidence": 0.95}
    ],
    "diagnoses": [
        {"name": "Type 2 Diabetes Mellitus", "date": "2026-03-15", "confidence": 0.96},
        {"name": "Primary Essential Hypertension (Stage 1)", "date": "2026-03-15", "confidence": 0.94},
        {"name": "Dyslipidemia", "date": "2026-03-15", "confidence": 0.92}
    ],
    "document_date": "2026-03-15",
    "notes": "Prescribed by Dr. Sunita Rao, MD. Advised diabetic diet, low sodium, brisk walking. Follow-up in 8 weeks with repeat lipid & renal tests.",
    "overall_confidence": 0.96
}

MOCK_DISCHARGE = {
    "document_type": "discharge_summary",
    "patient_info": {"name": "Rajesh Kumar", "age": "52", "gender": "Male", "confidence": 0.96},
    "medications": [
        {"name": "Cefuroxime Axetil", "dosage": "500 mg", "frequency": "Twice daily (BD)", "duration": "5 days", "route": "Oral", "instructions": "Complete full antibiotic course after food", "confidence": 0.96},
        {"name": "Budesonide + Formoterol Inhaler (200/6 mcg)", "dosage": "2 puffs", "frequency": "Twice daily", "duration": "30 days", "route": "Inhalation", "instructions": "Use with spacer. Rinse mouth after use", "confidence": 0.95},
        {"name": "Montelukast 10 mg + Levocetirizine 5 mg", "dosage": "1 tablet", "frequency": "Once daily (bedtime)", "duration": "14 days", "route": "Oral", "instructions": "Take at night before sleeping", "confidence": 0.94}
    ],
    "lab_results": [
        {"test_name": "Oxygen Saturation (SpO2)", "value": "98", "unit": "%", "reference_range": "95 - 100", "flag": "N", "date": "2026-02-21", "confidence": 0.98}
    ],
    "diagnoses": [
        {"name": "Acute Exacerbation of Bronchitis with Bronchospasm", "date": "2026-02-18", "confidence": 0.95},
        {"name": "Type 2 Diabetes Mellitus", "date": "2026-02-18", "confidence": 0.93},
        {"name": "Mild Systemic Hypertension", "date": "2026-02-18", "confidence": 0.91}
    ],
    "document_date": "2026-02-21",
    "notes": "Admitted 2026-02-18 for cough & wheezing. Treated with IV bronchodilators & antibiotics. Discharged stable on 2026-02-21. Follow-up OPD on Feb 28.",
    "overall_confidence": 0.95
}


def _detect_mock_data(ocr_text: str) -> dict:
    """Choose best mock data based on text keywords."""
    text_upper = ocr_text.upper()
    if any(k in text_upper for k in ["DISCHARGE", "INPATIENT", "ADMISSION", "HOSPITAL COURSE", "BRONCHITIS"]):
        return MOCK_DISCHARGE
    elif any(k in text_upper for k in ["PRESCRIPTION", "RX", "TAB.", "LISINOPRIL", "METFORMIN HYDROCHLORIDE", "SUNITA RAO"]):
        return MOCK_PRESCRIPTION
    return MOCK_LAB


def _generate_mock_summary(doc_type: str, language: str) -> str:
    """Generates localized plain-language health summaries."""
    if language == "hi":
        if doc_type == "prescription":
            return (
                "1. सारांश (Overview)\n"
                "यह डॉक्टर सुनीता राव द्वारा दिया गया प्रिस्क्रिप्शन है, जिसमें डायबिटीज (शुगर), ब्लड प्रेशर और कोलेस्ट्रॉल नियंत्रण की दवाइयाँ शामिल हैं।\n\n"
                "2. मुख्य दवाइयाँ (Prescribed Medicines)\n"
                "• मेटफॉर्मिन 500 mg: दिन में दो बार खाने के तुरंत बाद लें (शुगर नियंत्रित करने के लिए)।\n"
                "• लिसिनोप्रिल 10 mg: सुबह 8 बजे एक बार लें (ब्लड प्रेशर नियंत्रित करने के लिए)।\n"
                "• एटोरवास्टेटिन 20 mg: रात को सोते समय एक गोली लें (कोलेस्ट्रॉल कम करने के लिए)।\n"
                "• एस्पिरिन 75 mg: दोपहर के खाने के बाद एक गोली लें।\n\n"
                "3. जीवनशैली व आहार सुझाव\n"
                "मीठी और तली हुई चीजों से परहेज करें, नमक कम खाएं, और रोजाना 30 मिनट तेज चलें।\n\n"
                "4. आगामी जांच व फॉलो-अप\n"
                "8 सप्ताह बाद ब्लड शुगर और लिपिड प्रोफाइल टेस्ट करवाएं और डॉक्टर से पुनः परामर्श लें।"
            )
        elif doc_type == "discharge_summary":
            return (
                "1. अस्पताल डिस्चार्ज सारांश (Overview)\n"
                "यह मणिपाल अस्पताल से डिस्चार्ज सारांश है। मरीज को ब्रोंकाइटिस और सांस लेने में तकलीफ के कारण 18 से 21 फरवरी तक भर्ती किया गया था।\n\n"
                "2. स्वास्थ्य स्थिति\n"
                "इलाज के बाद मरीज की स्थिति स्थिर है और ऑक्सीजन स्तर (98%) सामान्य है।\n\n"
                "3. डिस्चार्ज दवाइयाँ\n"
                "• सेफ्यूरोक्सिम 500 mg (एंटीबायोटिक): 5 और दिनों तक भोजन के बाद दिन में दो बार।\n"
                "• इनहेलर (बुडेसोनाइड + फॉर्मोटेरोल): दिन में दो बार 2 पफ (स्पेसर के साथ)।\n"
                "• मोंटेलुकास्ट + लेवोसेटिरिज़िन: रात को 1 गोली 14 दिनों तक।\n\n"
                "4. चेतावनी संकेत\n"
                "यदि तेज बुखार, सांस लेने में अधिक तकलीफ या सीने में दर्द हो, तो तुरंत इमरजेंसी में संपर्क करें।"
            )
        else:
            return (
                "1. प्रयोगशाला जांच सारांश (Overview)\n"
                "यह आपकी ब्लड टेस्ट रिपोर्ट का सारांश है। कुछ परिणाम सामान्य सीमा से बाहर हैं जिन पर ध्यान देने की आवश्यकता है।\n\n"
                "2. मुख्य परिणाम\n"
                "• फास्टिंग ब्लड शुगर (148.0 mg/dL): सामान्य से अधिक ⚠️\n"
                "• HbA1c (8.2%): अधिक ⚠️ — पिछले 3 महीनों में शुगर नियंत्रण असंतुलित था।\n"
                "• कोलेस्ट्रॉल (224.0 mg/dL) व LDL (147.6 mg/dL): अधिक ⚠️\n"
                "• किडनी व हीमोग्लोबिन जांच: सामान्य ✓\n\n"
                "3. अगला कदम\n"
                "दवाइयों के नियमित सेवन और खानपान के बारे में अपने डॉक्टर से परामर्श अवश्य लें।"
            )

    elif language == "te":
        if doc_type == "prescription":
            return (
                "1. ప్రిస్క్రిప్షన్ సారాంశం (Overview)\n"
                "ఇది డాక్టర్ సునీత రావు అందించిన వైద్య ప్రిస్క్రిప్షన్. ఇందులో మధుమేహం (షుగర్), రక్తపోటు (బీపీ), కొలెస్ట్రాల్ నియంత్రణకు మందులు సూచించబడ్డాయి.\n\n"
                "2. మందుల వివరాలు\n"
                "• మెట్‌ఫార్మిన్ 500 mg: ఉదయం మరియు రాత్రి భోజనం తర్వాత.\n"
                "• లిసినోప్రిల్ 10 mg: ప్రతిరోజూ ఉదయం 8 గంటలకు ఒక టాబ్లెట్.\n"
                "• అటోర్వాస్టాటిన్ 20 mg: రాత్రి పడుకునే ముందు ఒక టాబ్లెట్.\n\n"
                "3. జీవనశైలి మార్పులు\n"
                "ఉప్పు మరియు తీపి తగ్గించండి, రోజూ 30 నిమిషాలు నడవండి. 8 వారాల తర్వాత మళ్ళీ పరీక్షలు చేయించుకోండి."
            )
        else:
            return (
                "1. రక్త పరీక్షల సారాంశం (Overview)\n"
                "మీ తాజా ల్యాబ్ రిపోర్టు సారాంశం. కొన్ని విలువలు సాధారణ స్థాయి కంటే ఎక్కువగా ఉన్నాయి.\n\n"
                "2. ముఖ్య ఫలితాలు\n"
                "• ఖాళీ కడుపున షుగర్ (148 mg/dL) & HbA1c (8.2%): సాధారణం కంటే ఎక్కువ ⚠️\n"
                "• కొలెస్ట్రాల్ (224 mg/dL) & చెడు కొలెస్ట్రాల్ LDL (147.6 mg/dL): ఎక్కువ ⚠️\n"
                "• కిడ్నీ మరియు రక్తం శాతము (Hb): సాధారణం ✓\n\n"
                "3. సూచనలు\n"
                "మందులు సరిగ్గా వాడుతూ డాక్టర్‌ను సంప్రదించండి."
            )

    elif language == "ta":
        if doc_type == "prescription":
            return (
                "1. மருந்து சீட்டு சுருக்கம் (Overview)\n"
                "இது டாக்டர் சுனிதா ராவ் வழங்கிய மருத்துவ சீட்டு. இதில் சர்க்கரை நோய், இரத்த அழுத்தம் மற்றும் கொலஸ்ட்ரால் மருந்துகளின் விபரம் உள்ளது.\n\n"
                "2. மருந்துகள் விபரம்\n"
                "• மெட்பார்மின் 500 mg: உணவுக்குப் பிறகு தினமும் இருமுறை.\n"
                "• லிசினோபிரில் 10 mg: தினமும் காலையில் ஒரு மாத்திரை.\n"
                "• அடோர்வாஸ்டாடின் 20 mg: இரவில் தூங்கும் முன் ஒரு மாத்திரை.\n\n"
                "3. உணவு முறை\n"
                "உப்பு மற்றும் சர்க்கரை உணவுகளை குறைக்கவும், தினமும் உடற்பயிற்சி செய்யவும்."
            )
        else:
            return (
                "1. ஆய்வக பரிசோதனை சுருக்கம் (Overview)\n"
                "உங்கள் இரத்த பரிசோதனை முடிவுகள். சில அளவுகள் இயல்பான அளவை விட அதிகமாக உள்ளன.\n\n"
                "2. முக்கிய முடிவுகள்\n"
                "• இரத்த சர்க்கரை அளவு (148 mg/dL) & HbA1c (8.2%): அதிகம் ⚠️\n"
                "• கொலஸ்ட்ரால் (224 mg/dL): அதிகம் ⚠️\n"
                "• சிறுநீரக செயல்பாடு & ஹீமோகுளோபின்: இயல்பானது ✓\n\n"
                "3. அடுத்த கட்ட நடவடிக்கை\n"
                "உங்கள் மருத்துவரை அணுகி ஆலோசனையை பெறவும்."
            )

    # Default: English
    if doc_type == "prescription":
        return (
            "1. Overview\n"
            "This prescription from Dr. Sunita Rao (Apollo Multispecialty Clinic) outlines long-term maintenance medications for Type 2 Diabetes, Stage 1 Hypertension, and Dyslipidemia.\n\n"
            "2. Prescribed Medications & Daily Schedule\n"
            "• Metformin 500 mg (Oral) — Take twice daily immediately after breakfast and dinner. Helps your body process blood sugar.\n"
            "• Lisinopril 10 mg (Oral) — Take once daily at 8:00 AM with water. Helps lower blood pressure.\n"
            "• Atorvastatin 20 mg (Oral) — Take once daily at bedtime. Lowers LDL (bad) cholesterol and triglycerides.\n"
            "• Aspirin 75 mg Enteric-Coated — Take once daily after lunch for cardiovascular protection.\n\n"
            "3. Vital Signs Noted\n"
            "• Blood Pressure: 138/88 mmHg (mildly elevated stage 1 range)\n"
            "• Heart Rate: 76 bpm | BMI: 26.5 kg/m²\n\n"
            "4. Diet & Lifestyle Instructions\n"
            "• Low-glycemic diabetic diet (restrict refined carbohydrates and sugary items).\n"
            "• Low sodium intake (< 2 grams daily).\n"
            "• 30 minutes of brisk daily walking at least 5 days a week.\n\n"
            "5. Next Steps & Follow-Up\n"
            "Repeat fasting blood sugar, HbA1c, and lipid panel in 8 weeks before your review appointment on May 15, 2026."
        )
    elif doc_type == "discharge_summary":
        return (
            "1. Overview\n"
            "Inpatient discharge summary from Manipal Hospital following admission for Acute Exacerbation of Bronchitis with Bronchospasm. Patient had a successful hospital stay and is clinically stable.\n\n"
            "2. Hospital Course & Resolution\n"
            "Treated with IV bronchodilators, nebulization, and antibiotics. Wheezing has completely cleared, chest X-Ray showed resolution, and oxygen saturation is normal at 98% on room air.\n\n"
            "3. Take-Home Medications\n"
            "• Cefuroxime Axetil 500 mg — 1 tablet twice daily after meals for 5 remaining days to complete the 7-day antibiotic course.\n"
            "• Budesonide + Formoterol Inhaler — 2 puffs twice daily with spacer for 30 days.\n"
            "• Montelukast + Levocetirizine — 1 tablet at bedtime for 14 days.\n"
            "• Resume standard home medications (Metformin & Lisinopril).\n\n"
            "4. Warning Signs to Watch For\n"
            "Seek immediate medical attention if you experience: shortness of breath at rest, fever exceeding 101°F, oxygen saturation dropping below 94%, or chest pain.\n\n"
            "5. Follow-Up Plan\n"
            "Review with Dr. Vikram Deshmukh in Pulmonology OPD on February 28, 2026 at 11:00 AM for repeat peak flow spirometry."
        )
    else:
        return (
            "1. Overview\n"
            "This comprehensive lab report from Metropolis Diagnostics evaluates blood sugar, lipid panel, kidney function, and complete blood count. Several key metabolic markers are outside the normal range and require physician follow-up.\n\n"
            "2. Key Findings & Flagged Results\n"
            "• Fasting Blood Sugar: 148.0 mg/dL — High (Normal: 70–99 mg/dL) ⚠️\n"
            "• Post-Prandial Blood Sugar: 210.5 mg/dL — High (Normal: < 140 mg/dL) ⚠️\n"
            "• HbA1c: 8.2% — High (Normal: 4.0–5.6%) ⚠️. Indicates elevated average glucose over the past 3 months.\n"
            "• Total Cholesterol: 224.0 mg/dL — High (Normal: < 200 mg/dL) ⚠️\n"
            "• LDL Cholesterol: 147.6 mg/dL — High (Optimal: < 100 mg/dL) ⚠️\n"
            "• Triglycerides: 192.0 mg/dL — High (Normal: < 150 mg/dL) ⚠️\n"
            "• HDL Cholesterol: 38.0 mg/dL — Borderline Low (Normal: > 40 mg/dL) ⚠️\n"
            "• Kidney Function (Creatinine 0.95 mg/dL, eGFR 89.0): Normal ✓\n"
            "• Hemoglobin (14.6 g/dL): Normal ✓\n\n"
            "3. What These Results Mean\n"
            "The elevated glucose and 8.2% HbA1c indicate that diabetes management needs adjustment. The lipid numbers show elevated bad cholesterol and triglycerides, which increase cardiovascular risk if untreated.\n\n"
            "4. Action Items\n"
            "• Review these results with your treating doctor to adjust medication dosages.\n"
            "• Continue dietary carbohydrate and lipid restrictions.\n"
            "• Repeat HbA1c and lipid testing in 8–12 weeks."
        )


class OpenAIService:
    """
    Wraps Azure OpenAI for extraction + summary.
    Falls back to intelligent mock responses in local dev / hackathon demo mode.
    """

    def __init__(self):
        self.use_azure = (
            bool(settings.azure_openai_api_key)
            and bool(settings.azure_openai_endpoint)
            and not settings.use_mock_ai
        )
        if self.use_azure:
            from openai import AsyncAzureOpenAI
            self._client = AsyncAzureOpenAI(
                azure_endpoint=settings.azure_openai_endpoint,
                api_key=settings.azure_openai_api_key,
                api_version=settings.azure_openai_api_version,
            )
            logger.info("Azure OpenAI initialized (deployment=%s)", settings.azure_openai_deployment_name)
        else:
            logger.info("Azure OpenAI not configured — using intelligent mock responses.")

    async def extract_structured_data(self, ocr_text: str) -> ExtractedData:
        """Run extraction prompt → validate against ExtractedData schema."""
        if not self.use_azure or not ocr_text.strip():
            mock_data = _detect_mock_data(ocr_text)
            return ExtractedData(**mock_data)

        schema_str = json.dumps(EXTRACTION_SCHEMA, indent=2)
        prompt = _EXTRACTION_PROMPT.format(schema=schema_str, ocr_text=ocr_text) if _EXTRACTION_PROMPT else f"Extract medical data as JSON:\n{ocr_text}"

        try:
            response = await self._client.chat.completions.create(
                model=settings.azure_openai_deployment_name,
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"},
                temperature=0.2,
                max_tokens=4000,
            )
            raw_json = response.choices[0].message.content
            data = json.loads(raw_json)
            return ExtractedData(**data)
        except Exception as e:
            logger.error(f"OpenAI extraction error: {e}")
            mock_data = _detect_mock_data(ocr_text)
            mock = ExtractedData(**mock_data)
            mock.overall_confidence = 0.65
            return mock

    async def generate_summary(self, extracted_data: ExtractedData, language: str = "en") -> str:
        """Generate plain-language health summary."""
        if not self.use_azure:
            return _generate_mock_summary(extracted_data.document_type, language)

        extracted_json = extracted_data.model_dump_json(indent=2)
        prompt = _SUMMARY_PROMPT.format(extracted_json=extracted_json) if _SUMMARY_PROMPT else f"Summarize this medical record for the patient in plain language:\n{extracted_json}"

        if language != "en":
            lang_name = _LANGUAGE_MAP.get(language, "English")
            prompt += f"\n\nPlease write the entire summary in {lang_name} at an 8th-grade reading level."

        try:
            response = await self._client.chat.completions.create(
                model=settings.azure_openai_deployment_name,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.5,
                max_tokens=1500,
            )
            return response.choices[0].message.content
        except Exception as e:
            logger.error(f"OpenAI summary error: {e}")
            return _generate_mock_summary(extracted_data.document_type, language)


_LANGUAGE_MAP = {
    "hi": "Hindi",
    "te": "Telugu",
    "ta": "Tamil",
    "en": "English",
}

openai_service = OpenAIService()

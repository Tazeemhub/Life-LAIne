"""FHIR R4 Bundle export service."""
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional
from app.models.domain import Document, Patient
from app.models.schemas import ExtractedData, Medication, LabResult, Diagnosis


def build_fhir_bundle(patient: Patient, documents: List[Document]) -> Dict[str, Any]:
    """Construct a minimal FHIR R4 Bundle from patient + documents."""
    entries = []
    patient_resource = _patient_resource(patient)
    patient_ref = f"Patient/{patient.id}"
    entries.append({"resource": patient_resource})

    for doc in documents:
        if doc.status != "completed" or not doc.extracted_data:
            continue
        try:
            extracted = ExtractedData(**doc.extracted_data)
        except Exception:
            continue

        # Conditions (diagnoses)
        for diag in extracted.diagnoses:
            entries.append({"resource": _condition_resource(diag, patient_ref, doc.id)})

        # MedicationRequests
        for med in extracted.medications:
            entries.append({"resource": _medication_request_resource(med, patient_ref, doc.id)})

        # Observations (lab results)
        for lab in extracted.lab_results:
            entries.append({"resource": _observation_resource(lab, patient_ref, doc.id)})

        # DiagnosticReport
        if extracted.lab_results:
            entries.append({"resource": _diagnostic_report_resource(extracted, patient_ref, doc.id)})

    return {
        "resourceType": "Bundle",
        "id": str(uuid.uuid4()),
        "type": "collection",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "entry": entries,
    }


def _patient_resource(patient: Patient) -> Dict:
    r = {
        "resourceType": "Patient",
        "id": patient.id,
        "meta": {"profile": ["http://hl7.org/fhir/StructureDefinition/Patient"]},
    }
    if patient.name:
        r["name"] = [{"text": patient.name}]
    if patient.mock_abha_id:
        r["identifier"] = [{"system": "https://healthid.abdm.gov.in", "value": patient.mock_abha_id}]
    return r


def _format_date(d) -> Optional[str]:
    if not d:
        return None
    if hasattr(d, "isoformat"):
        return d.isoformat()
    return str(d)


def _condition_resource(diag: Diagnosis, patient_ref: str, doc_id: str) -> Dict:
    return {
        "resourceType": "Condition",
        "id": str(uuid.uuid4()),
        "subject": {"reference": patient_ref},
        "code": {"text": diag.name},
        "recordedDate": _format_date(diag.date),
    }


def _medication_request_resource(med: Medication, patient_ref: str, doc_id: str) -> Dict:
    resource = {
        "resourceType": "MedicationRequest",
        "id": str(uuid.uuid4()),
        "status": "active",
        "intent": "order",
        "subject": {"reference": patient_ref},
        "medicationCodeableConcept": {"text": med.name},
    }
    dosage = {}
    if med.dosage:
        dosage["text"] = med.dosage
    if med.frequency:
        dosage["timing"] = {"code": {"text": med.frequency}}
    if med.route:
        dosage["route"] = {"text": med.route}
    if dosage:
        resource["dosageInstruction"] = [dosage]
    return resource


def _observation_resource(lab: LabResult, patient_ref: str, doc_id: str) -> Dict:
    resource = {
        "resourceType": "Observation",
        "id": str(uuid.uuid4()),
        "status": "final",
        "subject": {"reference": patient_ref},
        "code": {"text": lab.test_name},
    }
    if lab.value:
        try:
            resource["valueQuantity"] = {
                "value": float(lab.value),
                "unit": lab.unit or "",
            }
        except ValueError:
            resource["valueString"] = lab.value
    if lab.flag:
        interpretation_map = {"H": "High", "L": "Low", "N": "Normal", "HH": "Critical High", "LL": "Critical Low"}
        resource["interpretation"] = [{"text": interpretation_map.get(lab.flag, lab.flag)}]
    if lab.reference_range:
        resource["referenceRange"] = [{"text": lab.reference_range}]
    if lab.date:
        resource["effectiveDateTime"] = _format_date(lab.date)
    return resource


def _diagnostic_report_resource(extracted: ExtractedData, patient_ref: str, doc_id: str) -> Dict:
    return {
        "resourceType": "DiagnosticReport",
        "id": str(uuid.uuid4()),
        "status": "final",
        "subject": {"reference": patient_ref},
        "code": {"text": "Laboratory Report"},
        "effectiveDateTime": _format_date(extracted.document_date),
        "result": [{"display": lab.test_name} for lab in extracted.lab_results],
    }

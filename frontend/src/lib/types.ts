export interface Medication {
  name: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  route?: string;
  instructions?: string;
  confidence: number;
}

export interface LabResult {
  test_name: string;
  value?: string;
  unit?: string;
  reference_range?: string;
  flag?: 'H' | 'L' | 'N' | 'HH' | 'LL' | string;
  date?: string;
  confidence: number;
}

export interface Diagnosis {
  name: string;
  date?: string;
  confidence: number;
}

export interface PatientInfo {
  name?: string;
  age?: string;
  gender?: string;
  confidence: number;
}

export interface ExtractedData {
  document_type: 'prescription' | 'lab_report' | 'discharge_summary' | 'diagnostic' | 'other';
  patient_info?: PatientInfo;
  medications: Medication[];
  lab_results: LabResult[];
  diagnoses: Diagnosis[];
  document_date?: string;
  notes?: string;
  overall_confidence: number;
}

export interface Document {
  id: string;
  patient_id: string;
  filename: string;
  blob_url?: string;
  document_type?: string;
  folder?: string;
  tags?: string[];
  is_xerox?: boolean;
  uploaded_by?: string;
  status: 'processing' | 'completed' | 'failed';
  ocr_text?: string;
  extracted_data?: ExtractedData;
  summary?: string;
  summary_language?: string;
  error_message?: string;
  created_at: string;
  updated_at?: string;
}

export interface DocumentListItem {
  id: string;
  filename: string;
  document_type?: string;
  folder?: string;
  tags?: string[];
  is_xerox?: boolean;
  uploaded_by?: string;
  status: 'processing' | 'completed' | 'failed';
  overall_confidence?: number;
  created_at: string;
}

export interface DriveFolderInfo {
  id: string;
  label: string;
  icon: string;
  count: number;
  color: string;
}

export interface DoctorInsight {
  id: string;
  patient_id: string;
  patient_name?: string;
  doctor_name: string;
  doctor_specialty?: string;
  document_id?: string;
  title: string;
  clinical_notes: string;
  prescriptions_advice?: string;
  soap_subjective?: string;
  soap_objective?: string;
  soap_assessment?: string;
  soap_plan?: string;
  created_at: string;
}

export interface DoctorPatientSummary {
  id: string;
  name: string;
  mock_abha_id?: string;
  preferred_language: string;
  document_count: number;
  last_activity?: string;
  recent_diagnoses: string[];
}

export interface ClinicalTranscriptionResponse {
  title: string;
  clinical_notes: string;
  prescriptions_advice?: string;
  soap_subjective?: string;
  soap_objective?: string;
  soap_assessment?: string;
  soap_plan?: string;
  extracted_medications?: Array<Record<string, unknown>>;
}

export type UserRole = 'doctor' | 'patient';

export interface UserSession {
  role: UserRole;
  id: string;
  name: string;
  specialty?: string;
  hospital?: string;
  mock_abha_id?: string;
}

export interface PatientProfile {
  id: string;
  name?: string;
  mock_abha_id?: string;
  preferred_language: string;
  created_at: string;
}

export interface TimelineEvent {
  id: string;
  patient_id: string;
  event_type: 'medication' | 'lab_result' | 'diagnosis' | 'document' | 'doctor_note' | string;
  event_date?: string;
  title: string;
  description?: string;
  related_document_id?: string;
  data?: Record<string, unknown>;
  created_at: string;
}

export interface UploadResponse {
  document_id: string;
  status: string;
  message: string;
}

export interface ChatMessage {
  id: string;
  patient_id: string;
  sender_role: 'patient' | 'doctor' | 'ai';
  sender_name: string;
  message: string;
  category?: 'doubt' | 'feeling' | 'medication' | 'general' | string;
  doctor_id?: string;
  created_at: string;
}

export interface ChatConversationResponse {
  user_message: ChatMessage;
  reply_message: ChatMessage;
  suggested_followups: string[];
}

import axios from 'axios';
import type {
  Document,
  DocumentListItem,
  PatientProfile,
  TimelineEvent,
  UploadResponse,
  ChatMessage,
  ChatConversationResponse,
} from './types';

// In dev, use Vite proxy if VITE_API_URL is not set; otherwise use VITE_API_URL
const API_BASE = import.meta.env.VITE_API_URL || '';

// Always send demo mode headers for hackathon
const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'X-Demo-Mode': 'true',
    'X-Guest-Id': 'demo-guest',
  },
});

// Attach auth token or session if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    delete config.headers['X-Demo-Mode'];
  }
  const sessionStr = localStorage.getItem('med_user_session');
  if (sessionStr) {
    try {
      const sess = JSON.parse(sessionStr);
      if (sess.role === 'doctor') {
        config.headers['X-User-Role'] = 'doctor';
        config.headers['X-Doctor-Name'] = sess.name;
      } else {
        config.headers['X-User-Role'] = 'patient';
        config.headers['X-Guest-Id'] = sess.id || 'demo-guest';
      }
    } catch {
      // ignore
    }
  }
  return config;
});

export const uploadDocument = async (
  file: File,
  folderOrProgress?: string | ((pct: number) => void),
  isXerox?: boolean,
  tags?: string,
  onProgress?: (pct: number) => void,
): Promise<UploadResponse> => {
  const formData = new FormData();
  formData.append('file', file);

  let progressCb = onProgress;
  let folder: string | undefined;

  if (typeof folderOrProgress === 'function') {
    progressCb = folderOrProgress;
  } else if (typeof folderOrProgress === 'string') {
    folder = folderOrProgress;
  }

  if (folder) formData.append('folder', folder);
  if (isXerox !== undefined) formData.append('is_xerox', String(isXerox));
  if (tags) formData.append('tags', tags);

  const { data } = await api.post<UploadResponse>('/api/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => {
      if (progressCb && e.total) {
        progressCb(Math.round((e.loaded / e.total) * 100));
      }
    },
  });
  return data;
};

// ─── DigiLocker Drive Endpoints ──────────────────────────────────────────────

export const getDriveFolders = async () => {
  const { data } = await api.get<import('./types').DriveFolderInfo[]>('/api/drive/folders');
  return data;
};

export const getDriveDocuments = async (params?: {
  folder?: string;
  tag?: string;
  is_xerox?: boolean;
  search?: string;
}) => {
  const { data } = await api.get<DocumentListItem[]>('/api/drive/documents', { params });
  return data;
};

export const updateDocumentMetadata = async (
  id: string,
  update: { folder: string; tags?: string[]; is_xerox?: boolean },
) => {
  const { data } = await api.patch<DocumentListItem>(`/api/drive/documents/${id}`, update);
  return data;
};

export const getPatientInsights = async () => {
  const { data } = await api.get<import('./types').DoctorInsight[]>('/api/drive/insights');
  return data;
};

// ─── Doctor Portal Endpoints ─────────────────────────────────────────────────

export const getDoctorPatients = async (search?: string) => {
  const { data } = await api.get<import('./types').DoctorPatientSummary[]>('/api/doctor/patients', {
    params: { search },
  });
  return data;
};

export const getPatientDocumentsForDoctor = async (patientId: string, folder?: string) => {
  const { data } = await api.get<DocumentListItem[]>(`/api/doctor/patients/${patientId}/documents`, {
    params: { folder },
  });
  return data;
};

export const transcribeClinicalVoice = async (transcriptText: string, doctorName?: string, patientContext?: string) => {
  const { data } = await api.post<import('./types').ClinicalTranscriptionResponse>('/api/doctor/transcribe', {
    transcript_text: transcriptText,
    doctor_name: doctorName,
    patient_context: patientContext,
  });
  return data;
};

export const createDoctorInsight = async (insight: {
  patient_id: string;
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
}) => {
  const { data } = await api.post<import('./types').DoctorInsight>('/api/doctor/insights', insight);
  return data;
};

export const getPatientDoctorInsights = async (patientId: string) => {
  const { data } = await api.get<import('./types').DoctorInsight[]>(`/api/doctor/insights/${patientId}`);
  return data;
};

export const getDocuments = async (): Promise<DocumentListItem[]> => {
  const { data } = await api.get<DocumentListItem[]>('/api/documents');
  return data;
};

export const getDocument = async (id: string): Promise<Document> => {
  const { data } = await api.get<Document>(`/api/documents/${id}`);
  return data;
};

export const reprocessDocument = async (id: string, language?: string): Promise<void> => {
  const url = language
    ? `/api/documents/${id}/reprocess?language=${encodeURIComponent(language)}`
    : `/api/documents/${id}/reprocess`;
  await api.post(url);
};

export const deleteDocument = async (id: string): Promise<void> => {
  await api.delete(`/api/documents/${id}`);
};

export const getPatientProfile = async (): Promise<PatientProfile> => {
  const { data } = await api.get<PatientProfile>('/api/patients/me');
  return data;
};

export const updatePatientProfile = async (update: Partial<PatientProfile>): Promise<PatientProfile> => {
  const { data } = await api.patch<PatientProfile>('/api/patients/me', update);
  return data;
};

export const getTimeline = async (): Promise<TimelineEvent[]> => {
  const { data } = await api.get<TimelineEvent[]>('/api/timeline');
  return data;
};

export const getFhirBundle = async (): Promise<unknown> => {
  const { data } = await api.get('/api/patients/me/fhir');
  return data;
};

// ─── Chat & Health Companion Endpoints ──────────────────────────────────────

export const getChatMessages = async (patientId?: string): Promise<ChatMessage[]> => {
  const { data } = await api.get<ChatMessage[]>('/api/chat/messages', {
    params: patientId ? { patient_id: patientId } : undefined,
  });
  return data;
};

export const sendChatMessage = async (payload: {
  message: string;
  category?: string;
  doctor_id?: string;
  target_mode?: string;
}): Promise<ChatConversationResponse> => {
  const { data } = await api.post<ChatConversationResponse>('/api/chat/send', payload);
  return data;
};

export const doctorReplyChat = async (payload: {
  patient_id: string;
  message: string;
  doctor_name?: string;
  category?: string;
}): Promise<ChatMessage> => {
  const { data } = await api.post<ChatMessage>('/api/chat/doctor-reply', payload);
  return data;
};

export const clearChatMessages = async (patientId?: string): Promise<void> => {
  await api.delete('/api/chat/messages', {
    params: patientId ? { patient_id: patientId } : undefined,
  });
};

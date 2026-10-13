import { create } from 'zustand';
import type { DocumentListItem, PatientProfile, TimelineEvent, UserSession, DoctorInsight } from '../lib/types';

// Load initial session from localStorage if exists, default to patient
const getStoredSession = (): UserSession => {
  try {
    const raw = localStorage.getItem('med_user_session');
    if (raw) return JSON.parse(raw);
  } catch {
    // fallback
  }
  return {
    role: 'patient',
    id: 'demo-guest',
    name: 'Priya Verma',
    mock_abha_id: '91-8842-1920-3341',
  };
};

interface AppState {
  // Session & Role
  session: UserSession;
  setSession: (session: UserSession) => void;
  logout: () => void;

  // Patient
  patient: PatientProfile | null;
  setPatient: (p: PatientProfile | null) => void;

  // Documents
  documents: DocumentListItem[];
  setDocuments: (docs: DocumentListItem[]) => void;
  upsertDocument: (doc: DocumentListItem) => void;
  removeDocument: (id: string) => void;

  // Drive state
  activeFolder: string;
  setActiveFolder: (f: string) => void;
  activeTag: string | null;
  setActiveTag: (tag: string | null) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;

  // Doctor Insights
  doctorInsights: DoctorInsight[];
  setDoctorInsights: (insights: DoctorInsight[]) => void;

  // Timeline
  timeline: TimelineEvent[];
  setTimeline: (events: TimelineEvent[]) => void;

  // UI
  language: string;
  setLanguage: (lang: string) => void;
  isLoading: boolean;
  setLoading: (v: boolean) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  session: getStoredSession(),
  setSession: (session) => {
    localStorage.setItem('med_user_session', JSON.stringify(session));
    set({ session });
  },
  logout: () => {
    localStorage.removeItem('med_user_session');
    set({
      session: {
        role: 'patient',
        id: 'demo-guest',
        name: 'Guest User',
      },
    });
  },

  patient: null,
  setPatient: (patient) => set({ patient }),

  documents: [],
  setDocuments: (documents) => set({ documents }),
  upsertDocument: (doc) => {
    const existing = get().documents;
    const idx = existing.findIndex((d) => d.id === doc.id);
    if (idx >= 0) {
      const updated = [...existing];
      updated[idx] = doc;
      set({ documents: updated });
    } else {
      set({ documents: [doc, ...existing] });
    }
  },
  removeDocument: (id) => {
    set({ documents: get().documents.filter((d) => d.id !== id) });
  },

  activeFolder: 'all',
  setActiveFolder: (activeFolder) => set({ activeFolder }),

  activeTag: null,
  setActiveTag: (activeTag) => set({ activeTag }),

  searchQuery: '',
  setSearchQuery: (searchQuery) => set({ searchQuery }),

  doctorInsights: [],
  setDoctorInsights: (doctorInsights) => set({ doctorInsights }),

  timeline: [],
  setTimeline: (timeline) => set({ timeline }),

  language: 'en',
  setLanguage: (language) => set({ language }),

  isLoading: false,
  setLoading: (isLoading) => set({ isLoading }),
}));

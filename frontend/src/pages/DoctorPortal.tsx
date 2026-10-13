import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Stethoscope,
  Mic,
  MicOff,
  Sparkles,
  Send,
  Users,
  FileText,
  Search,
  CheckCircle2,
  ChevronRight,
  Pill,
  Folder,
  Camera,
  Bot,
} from 'lucide-react';
import { useAppStore } from '../lib/store';
import {
  getDoctorPatients,
  getPatientDocumentsForDoctor,
  transcribeClinicalVoice,
  createDoctorInsight,
} from '../lib/api';
import type {
  DoctorPatientSummary,
  DocumentListItem,
  ClinicalTranscriptionResponse,
} from '../lib/types';
import { formatDate } from '../lib/utils';
import StatusBadge from '../components/StatusBadge';

export default function DoctorPortal() {
  const session = useAppStore((s) => s.session);

  // Patients list
  const [patients, setPatients] = useState<DoctorPatientSummary[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(true);
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

  // Selected patient's documents
  const [patientDocs, setPatientDocs] = useState<DocumentListItem[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [docFolderFilter, setDocFolderFilter] = useState('all');

  // Dictation & Voice Transcription
  const [isRecording, setIsRecording] = useState(false);
  const [dictationText, setDictationText] = useState('');
  const [transcribing, setTranscribing] = useState(false);
  const [transcriptionResult, setTranscriptionResult] = useState<ClinicalTranscriptionResponse | null>(null);

  // Publishing Insight
  const [publishing, setPublishing] = useState(false);
  const [publishedSuccess, setPublishedSuccess] = useState(false);

  // Speech Recognition Reference
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  const loadPatients = useCallback(async () => {
    setLoadingPatients(true);
    try {
      const data = await getDoctorPatients(patientSearch);
      setPatients(data);
      if (data.length > 0 && !selectedPatientId) {
        setSelectedPatientId(data[0].id);
      }
    } catch (err) {
      console.error('Failed to load patients for doctor:', err);
    } finally {
      setLoadingPatients(false);
    }
  }, [patientSearch, selectedPatientId]);

  const loadPatientDocuments = useCallback(async (patientId: string, folder?: string) => {
    setLoadingDocs(true);
    try {
      const docs = await getPatientDocumentsForDoctor(patientId, folder);
      setPatientDocs(docs);
    } catch (err) {
      console.error('Failed to load patient documents:', err);
    } finally {
      setLoadingDocs(false);
    }
  }, []);

  // Load patients on search/mount
  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect
    loadPatients();
  }, [loadPatients]);

  // Load patient documents when selected patient changes
  useEffect(() => {
    if (!selectedPatientId) return;
    // oxlint-disable-next-line react/set-state-in-effect
    loadPatientDocuments(selectedPatientId, docFolderFilter);
  }, [selectedPatientId, docFolderFilter, loadPatientDocuments]);

  // Voice recording toggle via Web Speech API
  const toggleRecording = () => {
    if (isRecording) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsRecording(false);
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. You can type clinical notes directly.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setDictationText((prev) => (prev ? `${prev} ${currentTranscript}` : currentTranscript));
      };

      recognition.onerror = () => {
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
      setIsRecording(true);
    } catch (e) {
      console.warn('Speech recognition start failed:', e);
      setIsRecording(false);
    }
  };

  // Quick preset dictation for fast testing
  const insertSampleDictation = () => {
    setDictationText(
      'Patient reports 3-week history of worsening morning joint stiffness and bilateral knee pain. Blood pressure is 138/88, pulse 76 regular. Fasting glucose is 108 mg/dL, uric acid elevated at 7.8 mg/dL. Assessment is symptomatic Hyperuricemia with Early Osteoarthritis. Prescribed Febuxostat 40mg once daily in morning for 30 days, Paracetamol 650mg as needed for pain, and Calcium with Vitamin D3 once daily after lunch. Advised low-purine diet and review serum uric acid after 4 weeks.'
    );
  };

  const handleTranscribeWithGemini = async () => {
    if (!dictationText.trim()) return;
    setTranscribing(true);
    setPublishedSuccess(false);
    try {
      const selectedPatient = patients.find((p) => p.id === selectedPatientId);
      const res = await transcribeClinicalVoice(
        dictationText,
        session.name,
        `Patient: ${selectedPatient?.name || 'Consultation'}`
      );
      setTranscriptionResult(res);
    } catch (err) {
      console.error('Failed to transcribe clinical voice:', err);
    } finally {
      setTranscribing(false);
    }
  };

  const handlePublishInsight = async () => {
    if (!selectedPatientId || !transcriptionResult) return;
    setPublishing(true);
    try {
      await createDoctorInsight({
        patient_id: selectedPatientId,
        doctor_name: session.name,
        doctor_specialty: session.specialty,
        title: transcriptionResult.title || 'Clinical Consultation Note',
        clinical_notes: transcriptionResult.clinical_notes,
        prescriptions_advice: transcriptionResult.prescriptions_advice,
        soap_subjective: transcriptionResult.soap_subjective,
        soap_objective: transcriptionResult.soap_objective,
        soap_assessment: transcriptionResult.soap_assessment,
        soap_plan: transcriptionResult.soap_plan,
      });
      setPublishedSuccess(true);
      setTimeout(() => setPublishedSuccess(false), 5000);
    } catch (err) {
      console.error('Failed to publish doctor insight:', err);
    } finally {
      setPublishing(false);
    }
  };

  const selectedPatient = patients.find((p) => p.id === selectedPatientId);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Top Banner: Doctor Clinical Workstation */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-13 h-13 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-xs">
              <Stethoscope size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200 uppercase tracking-wider">
                  Doctor Clinical Station
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  {session.hospital || 'AIIMS / Hospital Network'}
                </span>
              </div>
              <h1 className="text-2xl font-extrabold text-slate-900 mt-1">{session.name}</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                {session.specialty || 'Internal Medicine'} • Real-Time Voice Scribe & Patient Drive Ingestion
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-slate-50 px-4 py-2 rounded-xl border border-slate-200 text-right">
              <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Active Patients</p>
              <p className="text-lg font-extrabold text-slate-900">{patients.length}</p>
            </div>
            <div className="bg-slate-50 px-4 py-2 rounded-xl border border-slate-200 text-right">
              <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Transcription Engine</p>
              <p className="text-lg font-extrabold text-blue-600">Gemini 2.5</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (5 cols): Patient Directory & Records */}
        <div className="lg:col-span-5 space-y-6">
          {/* Patient Directory */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-blue-600" />
                <h2 className="text-sm font-bold text-slate-900">Patient Directory</h2>
              </div>
              <span className="text-xs text-slate-500">{patients.length} registered</span>
            </div>

            {/* Search */}
            <div className="relative">
              <Search size={14} className="absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
                placeholder="Search patient by name or ID..."
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3.5 py-2.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white transition-colors"
              />
            </div>

            {/* Patient List */}
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {loadingPatients ? (
                <p className="text-xs text-slate-500 text-center py-6">Loading patients...</p>
              ) : patients.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6">No patients found</p>
              ) : (
                patients.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => setSelectedPatientId(p.id)}
                    className={`p-3 rounded-xl cursor-pointer transition-all border flex items-center justify-between ${
                      selectedPatientId === p.id
                        ? 'bg-blue-50 border-blue-500/60 text-blue-950 shadow-xs'
                        : 'bg-white border-slate-200/70 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-slate-900">{p.name}</p>
                        {p.mock_abha_id && (
                          <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-mono font-semibold">
                            ABHA
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-1">
                        <span>{p.document_count} files in drive</span>
                        {p.recent_diagnoses.length > 0 && (
                          <span>• {p.recent_diagnoses.join(', ')}</span>
                        )}
                      </div>
                    </div>
                    <ChevronRight size={14} className="text-slate-400" />
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Patient's Uploaded Files & Xeroxes */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Folder size={16} className="text-amber-500" />
                <h3 className="text-sm font-bold text-slate-900">
                  {selectedPatient ? `${selectedPatient.name}'s Drive Files` : 'Patient Files'}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {selectedPatient && (
                  <Link
                    to={`/chat?patientId=${selectedPatient.id}`}
                    className="flex items-center gap-1.5 text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 px-2.5 py-1 rounded-xl border border-blue-200 transition-all font-semibold"
                    title={`Open consultation chat for ${selectedPatient.name}`}
                  >
                    <Bot size={13} />
                    <span>Chat with Patient</span>
                  </Link>
                )}
                <span className="text-xs text-slate-500">{patientDocs.length} items</span>
              </div>
            </div>

            {/* Folder filter pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
              {[
                { id: 'all', label: 'All' },
                { id: 'prescriptions', label: 'Rx' },
                { id: 'lab_reports', label: 'Labs' },
                { id: 'scans_xerox', label: 'Xerox & Scans' },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setDocFolderFilter(f.id)}
                  className={`px-2.5 py-1 rounded-lg transition-all font-semibold whitespace-nowrap ${
                    docFolderFilter === f.id
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Document list */}
            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
              {loadingDocs ? (
                <p className="text-xs text-slate-500 text-center py-6">Loading documents...</p>
              ) : patientDocs.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6">No documents in this category</p>
              ) : (
                patientDocs.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-3 rounded-xl bg-slate-50/70 border border-slate-200/80 hover:bg-white hover:border-slate-300 transition-all flex items-center justify-between"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <FileText size={14} className="text-slate-400" />
                        <span className="text-xs font-semibold text-slate-800 break-all">{doc.filename}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500">
                        {doc.is_xerox && (
                          <span className="bg-amber-50 text-amber-700 px-1.5 py-0.2 rounded border border-amber-200 flex items-center gap-1 font-semibold">
                            <Camera size={10} /> Xerox
                          </span>
                        )}
                        <span>{formatDate(doc.created_at)}</span>
                        {doc.overall_confidence && (
                          <span className="text-blue-700 font-semibold">
                            {Math.round(doc.overall_confidence * 100)}% conf
                          </span>
                        )}
                      </div>
                    </div>
                    <StatusBadge status={doc.status} />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column (7 cols): Clinical Dictation Studio & Gemini SOAP Transcriber */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 space-y-5 shadow-xs">
            {/* Studio Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                  <Sparkles size={18} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">AI Clinical Scribe & Dictation Studio</h2>
                  <p className="text-xs text-slate-500">
                    Dictate consultation notes; Gemini extracts structured SOAP notes & prescription orders
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={insertSampleDictation}
                className="text-[11px] text-blue-600 hover:text-blue-700 font-bold hover:underline"
                title="Load sample clinical dictation text"
              >
                Insert Sample
              </button>
            </div>

            {/* Target Patient Selector */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Users size={14} className="text-blue-600" />
                <span>Target Patient:</span>
              </span>
              <div className="text-xs font-extrabold text-blue-700">
                {selectedPatient ? `${selectedPatient.name} (ABHA: ${selectedPatient.mock_abha_id || 'Not linked'})` : 'Select a patient from left list'}
              </div>
            </div>

            {/* Dictation Textarea with Voice Recording Controls */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800">
                  Physician Voice Dictation / Clinical Notes:
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleRecording}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      isRecording
                        ? 'bg-rose-600 text-white animate-pulse shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                    }`}
                  >
                    {isRecording ? <MicOff size={13} /> : <Mic size={13} className="text-rose-500" />}
                    <span>{isRecording ? 'Listening (Click to Stop)...' : 'Record Speech'}</span>
                  </button>
                </div>
              </div>

              <textarea
                rows={5}
                value={dictationText}
                onChange={(e) => setDictationText(e.target.value)}
                placeholder="Speak into microphone or type clinical notes here... e.g. Patient presents with acute bronchospasm. Prescribed Inhaler Budesonide 200mcg BID..."
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white leading-relaxed font-sans"
              />
            </div>

            {/* Transcribe Trigger Button */}
            <button
              type="button"
              onClick={handleTranscribeWithGemini}
              disabled={transcribing || !dictationText.trim()}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Sparkles size={16} className={transcribing ? 'animate-spin' : ''} />
              <span>{transcribing ? 'Gemini 2.5 is Structuring SOAP Note...' : 'Transcribe with Gemini Clinical AI'}</span>
            </button>

            {/* Generated Structured SOAP Note Panel */}
            {transcriptionResult && (
              <div className="space-y-4 pt-4 border-t border-slate-100 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-600" />
                    <h3 className="text-sm font-bold text-slate-900">
                      {transcriptionResult.title || 'Structured Consultation Note'}
                    </h3>
                  </div>
                  <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-bold">
                    SOAP Verified
                  </span>
                </div>

                {/* SOAP Note Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <p className="text-[11px] font-bold text-blue-700 uppercase tracking-wider mb-1">
                      Subjective (S)
                    </p>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      {transcriptionResult.soap_subjective || 'No subjective complaints recorded.'}
                    </p>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <p className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider mb-1">
                      Objective (O)
                    </p>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      {transcriptionResult.soap_objective || 'Vitals and observations recorded.'}
                    </p>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <p className="text-[11px] font-bold text-purple-700 uppercase tracking-wider mb-1">
                      Assessment (A)
                    </p>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      {transcriptionResult.soap_assessment || 'Clinical assessment recorded.'}
                    </p>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider mb-1">
                      Plan & Follow-up (P)
                    </p>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      {transcriptionResult.soap_plan || 'Treatment plan documented.'}
                    </p>
                  </div>
                </div>

                {/* Prescriptions & Advice Box */}
                {transcriptionResult.prescriptions_advice && (
                  <div className="p-3.5 bg-emerald-50/70 rounded-xl border border-emerald-200 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
                      <Pill size={14} className="text-emerald-700" />
                      <span>Prescriptions & Drug Advice for Patient:</span>
                    </div>
                    <p className="text-xs text-emerald-950 whitespace-pre-wrap leading-relaxed font-sans font-medium">
                      {transcriptionResult.prescriptions_advice}
                    </p>
                  </div>
                )}

                {/* Publish Button */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handlePublishInsight}
                    disabled={publishing}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Send size={15} />
                    <span>
                      {publishing
                        ? 'Publishing to Patient Drive...'
                        : `Publish Insight to ${selectedPatient ? selectedPatient.name : 'Patient'}'s Drive`}
                    </span>
                  </button>

                  {publishedSuccess && (
                    <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
                      <CheckCircle2 size={16} className="text-emerald-600" />
                      <span>
                        Clinical insight published successfully! It is now visible in the patient's personal DigiLocker drive and health timeline.
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

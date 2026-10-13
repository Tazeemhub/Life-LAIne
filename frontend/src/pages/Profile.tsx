import React, { useCallback, useEffect, useState } from 'react';
import { User, Globe, Link2, Save, Download, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { getPatientProfile, updatePatientProfile, getFhirBundle } from '../lib/api';
import type { PatientProfile } from '../lib/types';
import { useAppStore } from '../lib/store';
import { formatDate } from '../lib/utils';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिंदी (Hindi)' },
  { code: 'te', label: 'తెలుగు (Telugu)' },
  { code: 'ta', label: 'தமிழ் (Tamil)' },
];

export default function Profile() {
  const { setPatient, setLanguage } = useAppStore();
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [abhaInput, setAbhaInput] = useState('');
  const [fhirData, setFhirData] = useState<Record<string, unknown> | null>(null);
  const [loadingFhir, setLoadingFhir] = useState(false);
  const [showFhir, setShowFhir] = useState(false);

  const loadProfile = useCallback(async () => {
    try {
      const p = await getPatientProfile();
      setProfile(p);
      setPatient(p);
      setLanguage(p.preferred_language || 'en');
      setAbhaInput(p.mock_abha_id || '');
    } catch {
      setErrorMessage('Could not load patient profile.');
    }
  }, [setPatient, setLanguage]);

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect
    loadProfile();
  }, [loadProfile]);

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    setErrorMessage(null);
    try {
      const updated = await updatePatientProfile({
        preferred_language: profile.preferred_language,
        mock_abha_id: abhaInput.trim() ? abhaInput.trim() : '',
        name: profile.name,
      });
      setProfile(updated);
      setPatient(updated);
      setLanguage(updated.preferred_language || 'en');
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err: unknown) {
      console.error('Profile save error:', err);
      setErrorMessage('Failed to save profile. Please check server connection.');
    } finally {
      setSaving(false);
    }
  };

  const handleFhirExport = async () => {
    setLoadingFhir(true);
    setErrorMessage(null);
    try {
      const data = (await getFhirBundle()) as Record<string, unknown>;
      setFhirData(data);
      setShowFhir(true);
    } catch (err: unknown) {
      console.error('FHIR export error:', err);
      setErrorMessage('Failed to generate FHIR R4 Bundle. Ensure completed documents exist.');
    } finally {
      setLoadingFhir(false);
    }
  };

  const downloadFhir = () => {
    if (!fhirData) return;
    const blob = new Blob([JSON.stringify(fhirData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fhir-bundle-${profile?.id || 'patient'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 size={32} className="animate-spin text-cyan-400" />
        <p className="text-sm text-slate-500">Loading patient profile…</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center shadow-xs">
          <User size={20} className="text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Patient Profile</h1>
          <p className="text-sm text-slate-500 font-medium">Member since {formatDate(profile.created_at)}</p>
        </div>
      </div>

      {errorMessage && (
        <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-2 font-medium">
          <AlertCircle size={16} className="shrink-0 text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Profile card */}
      <div className="bg-white rounded-2xl p-6 space-y-6 border border-slate-200/80 shadow-xs">
        {/* Name */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            Patient Display Name
          </label>
          <input
            type="text"
            value={profile.name || ''}
            onChange={(e) => setProfile((p) => (p ? { ...p, name: e.target.value } : p))}
            placeholder="e.g. Rajesh Kumar"
            className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-600 focus:bg-white transition-colors"
          />
        </div>

        {/* Preferred Language */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Globe size={13} className="text-blue-600" />
            <span>Preferred Language (for AI Summaries)</span>
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                type="button"
                onClick={() => setProfile((p) => (p ? { ...p, preferred_language: lang.code } : p))}
                className={`text-sm px-4 py-2.5 rounded-xl border transition-all text-left font-medium ${
                  profile.preferred_language === lang.code
                    ? 'border-blue-500 bg-blue-50 text-blue-900 font-bold shadow-xs'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                {lang.label}
              </button>
            ))}
          </div>
        </div>

        {/* Mock ABHA ID */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Link2 size={13} className="text-blue-600" />
            <span>ABHA Health ID (Ayushman Bharat Digital Mission)</span>
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={abhaInput}
              onChange={(e) => setAbhaInput(e.target.value)}
              placeholder="e.g. 91-8472-9102-4412"
              className="flex-1 bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-600 focus:bg-white transition-colors font-mono"
            />
            <button
              type="button"
              onClick={() =>
                setAbhaInput(
                  `91-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(
                    1000 + Math.random() * 9000
                  )}-${Math.floor(1000 + Math.random() * 9000)}`
                )
              }
              className="text-xs font-bold text-slate-700 hover:text-blue-600 bg-white hover:bg-slate-50 px-3.5 py-2 rounded-xl transition-colors border border-slate-200 shadow-xs"
            >
              Generate
            </button>
            {abhaInput && (
              <button
                type="button"
                onClick={() => setAbhaInput('')}
                className="text-xs font-bold text-slate-400 hover:text-rose-600 bg-white hover:bg-rose-50 px-2.5 py-2 rounded-xl transition-colors border border-slate-200 shadow-xs"
                title="Clear ABHA ID"
              >
                Clear
              </button>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1.5 font-medium">
            Simulates ABDM ABHA 14-digit identifier format (XX-XXXX-XXXX-XXXX).
          </p>
        </div>

        {/* Patient ID */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            System Patient ID
          </label>
          <p className="text-xs text-slate-700 font-mono bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-xl break-all">
            {profile.id}
          </p>
        </div>

        {/* Save button */}
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all shadow-xs disabled:opacity-50"
        >
          {saved ? (
            <><CheckCircle size={16} /> Preferences Saved!</>
          ) : saving ? (
            <><Loader2 size={16} className="animate-spin" /> Saving…</>
          ) : (
            <><Save size={16} /> Save Changes</>
          )}
        </button>
      </div>

      {/* FHIR Export Card */}
      <div className="mt-6 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
          <span className="text-lg">⚕️</span>
          <span>HL7 FHIR R4 Bundle Export</span>
        </h3>
        <p className="text-xs text-slate-600 mb-4 leading-relaxed font-medium">
          Export your health data as a standardized HL7 FHIR R4 JSON collection bundle, compatible with international EHR systems and India's ABDM digital health lockers.
        </p>
        <div className="flex gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={handleFhirExport}
            disabled={loadingFhir}
            className="flex items-center gap-2 text-xs font-bold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 px-4 py-2.5 rounded-xl transition-colors border border-slate-200 shadow-xs"
          >
            {loadingFhir && <Loader2 size={14} className="animate-spin text-blue-600" />}
            <span>{showFhir ? 'Refresh FHIR Bundle' : 'View FHIR Bundle'}</span>
          </button>
          {fhirData && (
            <button
              type="button"
              onClick={downloadFhir}
              className="flex items-center gap-2 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 px-4 py-2.5 rounded-xl transition-colors border border-blue-200"
            >
              <Download size={14} />
              <span>Download JSON</span>
            </button>
          )}
        </div>

        {showFhir && fhirData && (
          <div className="mt-4">
            <pre className="text-xs text-slate-800 bg-slate-50 rounded-xl p-4 overflow-auto max-h-72 font-mono border border-slate-200">
              {JSON.stringify(fhirData, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

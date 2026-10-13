import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Shield, Zap, Brain, FileSearch, Sparkles, CheckCircle2, Stethoscope, FolderLock } from 'lucide-react';
import UploadZone from '../components/UploadZone';
import DisclaimerBanner from '../components/DisclaimerBanner';
import { useAppStore } from '../lib/store';
import { getPatientProfile } from '../lib/api';

const FEATURES = [
  {
    icon: <FileSearch size={20} className="text-blue-600" />,
    title: 'Smart Clinical OCR',
    desc: 'Extracts medicines, dosages, lab biomarkers, and diagnoses from PDFs and photos.',
  },
  {
    icon: <Brain size={20} className="text-indigo-600" />,
    title: 'Gemini AI Intelligence',
    desc: 'Translates complex medical paperwork into plain, patient-friendly language.',
  },
  {
    icon: <Zap size={20} className="text-amber-600" />,
    title: 'Unified Health Timeline',
    desc: 'All your medical events sequenced chronologically in one holistic record.',
  },
  {
    icon: <Shield size={20} className="text-emerald-600" />,
    title: 'FHIR R4 & ABHA Ready',
    desc: 'Export standard HL7 clinical bundles aligned to national ABDM standards.',
  },
];

export default function Home() {
  const navigate = useNavigate();
  const setPatient = useAppStore((s) => s.setPatient);
  const [latestUploadedId, setLatestUploadedId] = useState<string | null>(null);

  useEffect(() => {
    getPatientProfile().then(setPatient).catch(() => {});
  }, [setPatient]);

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 pt-14 sm:pt-18 pb-14 text-center">
        <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-full px-4 py-1.5 mb-6 shadow-2xs">
          <Sparkles size={14} className="text-blue-600" />
          <span className="text-xs font-semibold text-blue-800">
            MED DEV COPILOT · Powered by Gemini AI & Cloud Firestore
          </span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold leading-tight mb-5 tracking-tight text-slate-900">
          Your Personal{' '}
          <span className="text-blue-600">AI Health Copilot</span>
        </h1>

        <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto mb-9 leading-relaxed font-normal">
          Upload prescriptions, lab reports, and discharge summaries. Get instant AI-powered
          summaries in plain language — with zero confusing medical jargon.
        </p>

        <div className="flex items-center justify-center gap-3.5 mb-12 flex-wrap">
          <Link
            to="/drive"
            className="flex items-center gap-2 bg-blue-600 text-white font-bold px-6 py-3 rounded-xl hover:bg-blue-700 transition-all shadow-md shadow-blue-500/20 hover:shadow-lg"
          >
            <FolderLock size={16} />
            <span>Open Patient DigiLocker</span>
            <ArrowRight size={15} />
          </Link>
          <Link
            to="/doctor"
            className="flex items-center gap-2 bg-white text-indigo-700 font-bold px-6 py-3 rounded-xl hover:bg-indigo-50 border border-indigo-200 transition-all shadow-xs"
          >
            <Stethoscope size={16} className="text-indigo-600" />
            <span>Doctor Clinical Station</span>
          </Link>
          <Link
            to="/login"
            className="flex items-center gap-2 bg-white text-slate-700 font-semibold px-5 py-3 rounded-xl hover:bg-slate-50 transition-colors border border-slate-300 shadow-xs"
          >
            <span>Switch Role / Sign In</span>
          </Link>
        </div>

        {/* Upload Zone */}
        <div className="max-w-2xl mx-auto">
          <UploadZone
            onUploadComplete={(id) => {
              setLatestUploadedId(id);
            }}
            onProcessingDone={(id) => {
              setLatestUploadedId(id);
            }}
          />

          {latestUploadedId && (
            <div className="mt-4 p-4 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between text-left shadow-xs">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                <span className="text-xs font-semibold text-emerald-950">
                  Document ingested! Ready to explore extracted clinical fields and AI summary.
                </span>
              </div>
              <button
                type="button"
                onClick={() => navigate(`/documents/${latestUploadedId}`)}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-900 underline underline-offset-2 shrink-0 ml-3"
              >
                View Details →
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 pb-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="bg-white rounded-2xl p-5 card-hover border border-slate-200 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center mb-4 shadow-2xs">
                {f.icon}
              </div>
              <h3 className="text-sm font-bold text-slate-900 mb-1">{f.title}</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-normal">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Disclaimer */}
      <div className="max-w-6xl mx-auto px-4 pb-12">
        <DisclaimerBanner />
      </div>
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Shield, Zap, Brain, FileSearch, Sparkles, CheckCircle2, Stethoscope, FolderLock } from 'lucide-react';
import UploadZone from '../components/UploadZone';
import DisclaimerBanner from '../components/DisclaimerBanner';
import { useAppStore } from '../lib/store';
import { getPatientProfile } from '../lib/api';

const FEATURES = [
  {
    icon: <FileSearch size={20} className="text-cyan-400" />,
    title: 'Smart Clinical OCR',
    desc: 'Extracts medicines, dosages, lab biomarkers, and diagnoses from PDFs and images.',
  },
  {
    icon: <Brain size={20} className="text-purple-400" />,
    title: 'Gemini AI Intelligence',
    desc: 'Translates complex medical paperwork into plain, patient-friendly language.',
  },
  {
    icon: <Zap size={20} className="text-yellow-400" />,
    title: 'Unified Health Timeline',
    desc: 'All your medical events sequenced chronologically in one holistic record.',
  },
  {
    icon: <Shield size={20} className="text-green-400" />,
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
      <section className="max-w-6xl mx-auto px-4 pt-16 sm:pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-cyan-500/10 border border-cyan-500/30 rounded-full px-4 py-1.5 mb-6 shadow-sm">
          <Sparkles size={13} className="text-cyan-400" />
          <span className="text-xs font-medium text-cyan-300">
            ByteXL / Altrix Labs Hackathon · Powered by Gemini AI & Firebase
          </span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold leading-tight mb-6 tracking-tight">
          Your Personal{' '}
          <span className="gradient-text">AI Health Copilot</span>
        </h1>

        <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          Upload prescriptions, lab reports, and discharge summaries. Get instant AI-powered
          summaries in plain language — no confusing medical jargon.
        </p>

        <div className="flex items-center justify-center gap-3.5 mb-14 flex-wrap">
          <Link
            to="/drive"
            className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 font-bold px-6 py-3 rounded-xl hover:from-cyan-400 hover:to-teal-400 transition-all shadow-lg shadow-cyan-500/25"
          >
            <FolderLock size={16} />
            <span>Open Patient DigiLocker</span>
            <ArrowRight size={15} />
          </Link>
          <Link
            to="/doctor"
            className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold px-6 py-3 rounded-xl hover:from-indigo-400 hover:to-purple-500 transition-all shadow-lg shadow-indigo-500/20"
          >
            <Stethoscope size={16} />
            <span>Doctor Clinical Station</span>
          </Link>
          <Link
            to="/login"
            className="flex items-center gap-2 glass text-slate-300 font-medium px-5 py-3 rounded-xl hover:text-white transition-colors border border-slate-700/60"
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
            <div className="mt-4 p-3.5 glass rounded-xl border border-cyan-500/30 flex items-center justify-between text-left">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 size={18} className="text-cyan-400" />
                <span className="text-xs text-slate-300">
                  Document ingested! Ready to explore extracted data and AI summary.
                </span>
              </div>
              <button
                type="button"
                onClick={() => navigate(`/documents/${latestUploadedId}`)}
                className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 underline shrink-0 ml-2"
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
            <div key={f.title} className="glass rounded-2xl p-5 card-hover border border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-slate-800/90 border border-slate-700/60 flex items-center justify-center mb-4 shadow-sm">
                {f.icon}
              </div>
              <h3 className="text-sm font-semibold text-slate-200 mb-1">{f.title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Disclaimer */}
      <div className="max-w-6xl mx-auto px-4 pb-10">
        <DisclaimerBanner />
      </div>
    </div>
  );
}

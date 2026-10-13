import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Stethoscope, ShieldCheck, ArrowRight, User, Hospital, Activity, CheckCircle2 } from 'lucide-react';
import { useAppStore } from '../lib/store';
import type { UserRole, UserSession } from '../lib/types';

export default function Login() {
  const navigate = useNavigate();
  const setSession = useAppStore((s) => s.setSession);

  const [selectedRole, setSelectedRole] = useState<UserRole>('patient');
  const [customName, setCustomName] = useState('');
  const [customSpecialty, setCustomSpecialty] = useState('');

  const DOCTOR_PRESETS: Array<UserSession> = [
    {
      role: 'doctor',
      id: 'doc-sharma',
      name: 'Dr. Rajesh Sharma, MD',
      specialty: 'Cardiology & Internal Medicine',
      hospital: 'AIIMS New Delhi',
    },
    {
      role: 'doctor',
      id: 'doc-iyer',
      name: 'Dr. Ananya Iyer, MD',
      specialty: 'Pulmonology & Critical Care',
      hospital: 'Apollo Hospitals',
    },
  ];

  const PATIENT_PRESETS: Array<UserSession> = [
    {
      role: 'patient',
      id: 'patient-priya',
      name: 'Priya Verma',
      mock_abha_id: '91-8842-1920-3341',
    },
    {
      role: 'patient',
      id: 'patient-rahul',
      name: 'Rahul Sharma',
      mock_abha_id: '14-5521-9980-1204',
    },
  ];

  const handleLogin = (sessionData: UserSession) => {
    setSession(sessionData);
    if (sessionData.role === 'doctor') {
      navigate('/doctor');
    } else {
      navigate('/drive');
    }
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;

    if (selectedRole === 'doctor') {
      handleLogin({
        role: 'doctor',
        id: `doc-${Date.now()}`,
        name: customName.trim(),
        specialty: customSpecialty.trim() || 'General Practitioner',
        hospital: 'City Healthcare Clinic',
      });
    } else {
      handleLogin({
        role: 'patient',
        id: `patient-${Date.now()}`,
        name: customName.trim(),
        mock_abha_id: '91-' + Math.floor(1000 + Math.random() * 9000) + '-' + Math.floor(1000 + Math.random() * 9000),
      });
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-4 sm:p-6 bg-radial-gradient">
      <div className="w-full max-w-4xl space-y-8 py-8">
        {/* Title & Branding */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold uppercase tracking-wider">
            <Activity size={13} />
            <span>Dual-Portal Healthcare Platform</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-100 tracking-tight">
            Choose Your Dedicated Environment
          </h1>
          <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto">
            Log in to the clinical station designed for doctors or the secure personal DigiLocker drive for patients.
          </p>
        </div>

        {/* Dual Portal Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Doctor Portal Card */}
          <div
            onClick={() => setSelectedRole('doctor')}
            className={`cursor-pointer rounded-2xl p-6 transition-all border relative flex flex-col justify-between ${
              selectedRole === 'doctor'
                ? 'bg-gradient-to-b from-indigo-950/60 to-slate-900 border-indigo-500 shadow-xl shadow-indigo-500/10 ring-2 ring-indigo-500/30'
                : 'glass border-slate-800 hover:border-slate-700 opacity-80 hover:opacity-100'
            }`}
          >
            {selectedRole === 'doctor' && (
              <div className="absolute top-4 right-4 text-indigo-400">
                <CheckCircle2 size={20} />
              </div>
            )}
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-inner">
                <Stethoscope size={24} />
              </div>
              <div>
                <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
                  Doctor / Clinician Portal
                </span>
                <h2 className="text-xl font-bold text-slate-100 mt-2">Clinical Station</h2>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Speech-to-text dictation with Gemini SOAP note transcription, patient diagnostic records review, and instant insight sharing.
                </p>
              </div>

              {/* Doctor Quick Presets */}
              <div className="pt-3 border-t border-slate-800/80 space-y-2">
                <p className="text-[11px] font-semibold text-slate-400">1-Click Doctor Demo Logins:</p>
                {DOCTOR_PRESETS.map((doc) => (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLogin(doc);
                    }}
                    className="w-full text-left p-2.5 rounded-xl bg-slate-900/80 hover:bg-indigo-600/20 border border-slate-800 hover:border-indigo-500/40 transition-all flex items-center justify-between group"
                  >
                    <div>
                      <p className="text-xs font-semibold text-slate-200 group-hover:text-indigo-300">
                        {doc.name}
                      </p>
                      <p className="text-[10px] text-slate-500">{doc.specialty} • {doc.hospital}</p>
                    </div>
                    <ArrowRight size={14} className="text-slate-600 group-hover:text-indigo-400 transition-colors" />
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5 pt-3">
              <span className="text-[11px] text-indigo-400/80 font-medium flex items-center gap-1.5">
                <Hospital size={13} />
                <span>Specialized clinical workstation layout</span>
              </span>
            </div>
          </div>

          {/* Patient DigiLocker Drive Card */}
          <div
            onClick={() => setSelectedRole('patient')}
            className={`cursor-pointer rounded-2xl p-6 transition-all border relative flex flex-col justify-between ${
              selectedRole === 'patient'
                ? 'bg-gradient-to-b from-cyan-950/60 to-slate-900 border-cyan-500 shadow-xl shadow-cyan-500/10 ring-2 ring-cyan-500/30'
                : 'glass border-slate-800 hover:border-slate-700 opacity-80 hover:opacity-100'
            }`}
          >
            {selectedRole === 'patient' && (
              <div className="absolute top-4 right-4 text-cyan-400">
                <CheckCircle2 size={20} />
              </div>
            )}
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-inner">
                <ShieldCheck size={24} />
              </div>
              <div>
                <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">
                  Patient Health Locker
                </span>
                <h2 className="text-xl font-bold text-slate-100 mt-2">DigiLocker-Style Drive</h2>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Categorized folders for prescriptions, lab reports, camera/xerox scans, discharge summaries, and verified doctor insights.
                </p>
              </div>

              {/* Patient Quick Presets */}
              <div className="pt-3 border-t border-slate-800/80 space-y-2">
                <p className="text-[11px] font-semibold text-slate-400">1-Click Patient Demo Logins:</p>
                {PATIENT_PRESETS.map((pat) => (
                  <button
                    key={pat.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLogin(pat);
                    }}
                    className="w-full text-left p-2.5 rounded-xl bg-slate-900/80 hover:bg-cyan-600/20 border border-slate-800 hover:border-cyan-500/40 transition-all flex items-center justify-between group"
                  >
                    <div>
                      <p className="text-xs font-semibold text-slate-200 group-hover:text-cyan-300">
                        {pat.name}
                      </p>
                      <p className="text-[10px] text-slate-500">ABHA: {pat.mock_abha_id}</p>
                    </div>
                    <ArrowRight size={14} className="text-slate-600 group-hover:text-cyan-400 transition-colors" />
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5 pt-3">
              <span className="text-[11px] text-cyan-400/80 font-medium flex items-center gap-1.5">
                <User size={13} />
                <span>Personal health vault with Xerox scanner</span>
              </span>
            </div>
          </div>
        </div>

        {/* Custom Sign-In Form */}
        <div className="glass rounded-2xl p-6 border border-slate-800 max-w-xl mx-auto">
          <h3 className="text-sm font-bold text-slate-200 mb-1">
            Or Sign In with Custom Name ({selectedRole === 'doctor' ? 'Doctor Mode' : 'Patient Mode'})
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Enter your custom details to start a test session with the selected role.
          </p>

          <form onSubmit={handleCustomSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                {selectedRole === 'doctor' ? 'Doctor Full Name' : 'Patient Full Name'}
              </label>
              <input
                type="text"
                required
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder={selectedRole === 'doctor' ? 'e.g. Dr. Sameer Khan' : 'e.g. Meera Patel'}
                className="w-full text-xs bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
              />
            </div>

            {selectedRole === 'doctor' && (
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Specialty / Department</label>
                <input
                  type="text"
                  value={customSpecialty}
                  onChange={(e) => setCustomSpecialty(e.target.value)}
                  placeholder="e.g. Endocrinology, Dermatology"
                  className="w-full text-xs bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>
            )}

            <button
              type="submit"
              className={`w-full py-2.5 text-xs font-bold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 ${
                selectedRole === 'doctor'
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white'
                  : 'bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950'
              }`}
            >
              <span>Continue to {selectedRole === 'doctor' ? 'Doctor Clinical Station' : 'Patient DigiLocker'}</span>
              <ArrowRight size={14} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import DoctorPortal from './pages/DoctorPortal';
import PatientDrive from './pages/PatientDrive';
import Timeline from './pages/Timeline';
import DocumentDetail from './pages/DocumentDetail';
import Profile from './pages/Profile';
import Chat from './pages/Chat';
import ChatWidget from './components/ChatWidget';
import { useAppStore } from './lib/store';
import { getPatientProfile } from './lib/api';

export default function App() {
  const setPatient = useAppStore((s) => s.setPatient);
  const setLanguage = useAppStore((s) => s.setLanguage);

  useEffect(() => {
    getPatientProfile()
      .then((p) => {
        setPatient(p);
        if (p?.preferred_language) {
          setLanguage(p.preferred_language);
        }
      })
      .catch(() => {
        // Fallback demo user if API is initializing
      });
  }, [setPatient, setLanguage]);

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50/60 text-slate-900 selection:bg-blue-100 selection:text-blue-900 flex flex-col font-sans">
        <Navbar />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/doctor" element={<DoctorPortal />} />
            <Route path="/drive" element={<PatientDrive />} />
            <Route path="/dashboard" element={<PatientDrive />} />
            <Route path="/timeline" element={<Timeline />} />
            <Route path="/documents/:id" element={<DocumentDetail />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <ChatWidget />
      </div>
    </BrowserRouter>
  );
}

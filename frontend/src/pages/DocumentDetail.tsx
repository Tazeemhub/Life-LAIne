import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, RefreshCw, Loader2, AlertCircle, FileText,
  FlaskConical, Bot, Trash2, Columns, CheckCircle2,
} from 'lucide-react';
import type { Document } from '../lib/types';
import { getDocument, reprocessDocument, deleteDocument } from '../lib/api';
import ExtractedFieldsPanel from '../components/ExtractedFieldsPanel';
import HealthSummaryCard from '../components/HealthSummaryCard';
import DisclaimerBanner from '../components/DisclaimerBanner';
import { formatDate, docTypeLabel, docTypeIcon, confidenceClass } from '../lib/utils';
import { useAppStore } from '../lib/store';

type Tab = 'extracted' | 'summary' | 'ocr';

export default function DocumentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const patient = useAppStore((s) => s.patient);
  const removeDocumentStore = useAppStore((s) => s.removeDocument);

  const [doc, setDoc] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('extracted');
  const [reprocessing, setReprocessing] = useState(false);
  const [isSideBySide, setIsSideBySide] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const isMountedRef = useRef(true);
  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearPollTimeout = () => {
    if (pollTimeoutRef.current) {
      clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
    }
  };

  const fetchDocRef = useRef<() => Promise<void>>(async () => {});

  const fetchDoc = useCallback(async () => {
    if (!id) return;
    try {
      const d = await getDocument(id);
      if (!isMountedRef.current) return;
      setDoc(d);

      // If document is processing, poll again safely after 3.5 seconds
      if (d.status === 'processing') {
        clearPollTimeout();
        pollTimeoutRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            fetchDocRef.current();
          }
        }, 3500);
      }
    } catch {
      if (isMountedRef.current) {
        setDoc(null);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [id]);

  useEffect(() => {
    fetchDocRef.current = fetchDoc;
  }, [fetchDoc]);

  useEffect(() => {
    isMountedRef.current = true;
    // oxlint-disable-next-line react/set-state-in-effect
    fetchDoc();
    return () => {
      isMountedRef.current = false;
      clearPollTimeout();
    };
  }, [fetchDoc]);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      if (isMountedRef.current) setNotification(null);
    }, 3500);
  };

  const handleReprocess = async (targetLanguage?: string) => {
    if (!id) return;
    setReprocessing(true);
    clearPollTimeout();
    try {
      await reprocessDocument(id, targetLanguage);
      setDoc((d) => (d ? { ...d, status: 'processing' } : d));
      showNotification(`AI re-analyzing document${targetLanguage ? ` in ${targetLanguage}` : ''}…`);
      pollTimeoutRef.current = setTimeout(fetchDoc, 1500);
    } catch {
      showNotification('Reprocessing failed. Please try again.', 'error');
    } finally {
      setReprocessing(false);
    }
  };

  const handleDelete = async () => {
    if (!id || !doc) return;
    const confirmed = window.confirm(`Are you sure you want to delete "${doc.filename}"?`);
    if (!confirmed) return;

    try {
      await deleteDocument(id);
      removeDocumentStore(id);
      navigate('/dashboard');
    } catch {
      showNotification('Failed to delete document', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 size={32} className="animate-spin text-cyan-400" />
        <p className="text-sm text-slate-500">Loading document details…</p>
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <AlertCircle size={40} className="text-red-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-slate-200">Document not found</h2>
        <p className="text-sm text-slate-500 mt-1">This document may have been deleted or the ID is invalid.</p>
        <Link to="/dashboard" className="text-cyan-400 text-sm mt-4 inline-block hover:underline">
          ← Back to Dashboard
        </Link>
      </div>
    );
  }

  const activeLanguage = doc.summary_language || patient?.preferred_language || 'en';

  const TABS: { id: Tab; label: string; icon: React.ReactNode; disabled?: boolean }[] = [
    { id: 'extracted', label: 'Extracted Data', icon: <FlaskConical size={14} /> },
    { id: 'summary', label: 'AI Health Summary', icon: <Bot size={14} />, disabled: !doc.summary },
    { id: 'ocr', label: 'Raw OCR Text', icon: <FileText size={14} />, disabled: !doc.ocr_text },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Back button and notifications */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <Link
          to="/dashboard"
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors w-fit"
        >
          <ArrowLeft size={14} /> Back to Dashboard
        </Link>

        {notification && (
          <div
            className={`text-xs px-3 py-1.5 rounded-xl border flex items-center gap-1.5 shadow-lg ${
              notification.type === 'success'
                ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300'
                : 'bg-red-500/15 border-red-500/30 text-red-300'
            }`}
          >
            {notification.type === 'success' ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
            <span>{notification.message}</span>
          </div>
        )}
      </div>

      {/* Header Card */}
      <div className="glass rounded-2xl p-6 mb-6 border border-slate-800">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-800 flex items-center justify-center text-3xl shrink-0 shadow-md">
              {docTypeIcon(doc.document_type)}
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-100 break-all">{doc.filename}</h1>
              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                <span className="text-xs text-slate-400 bg-slate-800 px-2.5 py-0.5 rounded-full border border-slate-700/60 font-medium">
                  {docTypeLabel(doc.document_type)}
                </span>
                <StatusBadge status={doc.status} />
                {doc.extracted_data?.overall_confidence !== undefined && (
                  <span className={`text-xs font-semibold ${confidenceClass(doc.extracted_data.overall_confidence)}`}>
                    {Math.round(doc.extracted_data.overall_confidence * 100)}% overall confidence
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">Uploaded {formatDate(doc.created_at)}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
            {doc.status === 'completed' && doc.ocr_text && (
              <button
                type="button"
                onClick={() => setIsSideBySide((v) => !v)}
                className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl transition-all border ${
                  isSideBySide
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-medium'
                    : 'glass text-slate-400 hover:text-slate-200 border-slate-700/60'
                }`}
                title="Toggle side-by-side verification view"
              >
                <Columns size={13} />
                <span>Side-by-Side View</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => handleReprocess()}
              disabled={reprocessing || doc.status === 'processing'}
              className="flex items-center gap-2 text-xs text-slate-300 hover:text-white glass px-3 py-2 rounded-xl transition-colors disabled:opacity-50 border border-slate-700/60"
            >
              <RefreshCw size={13} className={reprocessing || doc.status === 'processing' ? 'animate-spin' : ''} />
              <span>Reprocess</span>
            </button>

            <button
              type="button"
              onClick={handleDelete}
              className="text-xs text-slate-500 hover:text-red-400 glass p-2 rounded-xl transition-colors border border-slate-700/60"
              title="Delete document"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {/* Processing notification */}
        {doc.status === 'processing' && (
          <div className="mt-4 flex items-center gap-3 text-sm text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-3.5">
            <Loader2 size={18} className="animate-spin shrink-0 text-cyan-400" />
            <div>
              <p className="font-semibold text-cyan-200">AI is analyzing clinical document…</p>
              <p className="text-xs text-cyan-300/80 mt-0.5">
                Performing OCR, extracting clinical schema, and generating plain-language health insights.
              </p>
            </div>
          </div>
        )}

        {/* Failed notification */}
        {doc.status === 'failed' && (
          <div className="mt-4 flex items-center justify-between gap-3 text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-xl p-3.5">
            <div className="flex items-center gap-2.5">
              <AlertCircle size={18} className="shrink-0 text-red-400" />
              <span>{doc.error_message || 'Processing failed.'}</span>
            </div>
            <button
              type="button"
              onClick={() => handleReprocess()}
              className="text-xs font-semibold underline hover:text-red-200"
            >
              Retry
            </button>
          </div>
        )}
      </div>

      {doc.status === 'completed' && (
        <>
          {/* Side-by-Side Verification Mode */}
          {isSideBySide ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column: Raw OCR Source Text */}
              <div className="glass rounded-2xl p-6 border border-slate-800">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <FileText size={16} className="text-cyan-400" />
                    <h3 className="text-sm font-semibold text-slate-200">Raw OCR Extracted Text</h3>
                  </div>
                  <span className="text-xs text-slate-500">Source Document</span>
                </div>
                <pre className="text-xs text-slate-300 whitespace-pre-wrap font-mono leading-relaxed overflow-x-auto max-h-[700px] overflow-y-auto p-3 bg-slate-900/60 rounded-xl border border-slate-800/80">
                  {doc.ocr_text || 'No text extracted'}
                </pre>
              </div>

              {/* Right Column: AI Extraction & Summary */}
              <div className="space-y-6">
                {doc.summary && (
                  <HealthSummaryCard
                    summary={doc.summary}
                    language={activeLanguage}
                    onLanguageChange={(lang) => handleReprocess(lang)}
                    isLoading={reprocessing}
                  />
                )}
                {doc.extracted_data && (
                  <div className="glass rounded-2xl p-6 border border-slate-800">
                    <h3 className="text-sm font-semibold text-slate-200 mb-4 pb-3 border-b border-slate-800 flex items-center gap-2">
                      <FlaskConical size={16} className="text-teal-400" />
                      <span>Extracted Clinical Entities</span>
                    </h3>
                    <ExtractedFieldsPanel extracted={doc.extracted_data} />
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Standard Tabbed Mode */
            <>
              {/* Tabs */}
              <div className="flex items-center gap-1 mb-6 glass rounded-xl p-1 w-fit border border-slate-800">
                {TABS.filter((t) => !t.disabled).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTab(t.id)}
                    className={`flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg transition-all ${
                      tab === t.id
                        ? 'bg-cyan-500/20 text-cyan-300 font-medium'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="glass rounded-2xl p-6 border border-slate-800">
                {tab === 'extracted' && doc.extracted_data && (
                  <ExtractedFieldsPanel extracted={doc.extracted_data} />
                )}
                {tab === 'summary' && doc.summary && (
                  <HealthSummaryCard
                    summary={doc.summary}
                    language={activeLanguage}
                    onLanguageChange={(lang) => handleReprocess(lang)}
                    isLoading={reprocessing}
                  />
                )}
                {tab === 'ocr' && doc.ocr_text && (
                  <div>
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Raw OCR Text</h3>
                    <pre className="text-xs text-slate-300 whitespace-pre-wrap font-mono leading-relaxed overflow-x-auto bg-slate-900/60 p-4 rounded-xl border border-slate-800/80">
                      {doc.ocr_text}
                    </pre>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Persistent Disclaimer */}
          <div className="mt-6">
            <DisclaimerBanner />
          </div>
        </>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; cls: string }> = {
    processing: { label: 'Processing', cls: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30' },
    completed: { label: 'Ready', cls: 'text-green-400 bg-green-500/10 border-green-500/30' },
    failed: { label: 'Failed', cls: 'text-red-400 bg-red-500/10 border-red-500/30' },
  };
  const s = config[status] || config.processing;
  return (
    <span className={`text-xs px-2.5 py-0.5 rounded-full border font-medium ${s.cls}`}>
      {s.label}
    </span>
  );
}

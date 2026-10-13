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
          className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-blue-600 transition-colors w-fit"
        >
          <ArrowLeft size={15} /> Back to Dashboard
        </Link>

        {notification && (
          <div
            className={`text-xs px-3.5 py-1.5 rounded-xl border flex items-center gap-1.5 font-medium shadow-xs ${
              notification.type === 'success'
                ? 'bg-blue-50 border-blue-200 text-blue-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            {notification.type === 'success' ? <CheckCircle2 size={14} className="text-blue-600" /> : <AlertCircle size={14} className="text-rose-600" />}
            <span>{notification.message}</span>
          </div>
        )}
      </div>

      {/* Header Card */}
      <div className="bg-white rounded-2xl p-6 mb-6 border border-slate-200/80 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-3xl shrink-0 shadow-xs">
              {docTypeIcon(doc.document_type)}
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 break-all">{doc.filename}</h1>
              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                <span className="text-xs text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200 font-semibold">
                  {docTypeLabel(doc.document_type)}
                </span>
                <StatusBadge status={doc.status} />
                {doc.extracted_data?.overall_confidence !== undefined && (
                  <span className={`text-xs font-bold ${confidenceClass(doc.extracted_data.overall_confidence)}`}>
                    {Math.round(doc.extracted_data.overall_confidence * 100)}% overall confidence
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1 font-medium">Uploaded {formatDate(doc.created_at)}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
            {doc.status === 'completed' && doc.ocr_text && (
              <button
                type="button"
                onClick={() => setIsSideBySide((v) => !v)}
                className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl transition-all border font-semibold ${
                  isSideBySide
                    ? 'bg-blue-50 text-blue-700 border-blue-300 shadow-xs'
                    : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'
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
              className="flex items-center gap-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 px-3.5 py-2 rounded-xl transition-colors disabled:opacity-50 border border-slate-200 shadow-xs"
            >
              <RefreshCw size={13} className={reprocessing || doc.status === 'processing' ? 'animate-spin text-blue-600' : ''} />
              <span>Reprocess</span>
            </button>

            <button
              type="button"
              onClick={handleDelete}
              className="text-xs text-slate-400 hover:text-rose-600 bg-white hover:bg-rose-50 p-2 rounded-xl transition-colors border border-slate-200 shadow-xs"
              title="Delete document"
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>

        {/* Processing notification */}
        {doc.status === 'processing' && (
          <div className="mt-4 flex items-center gap-3 text-sm text-blue-900 bg-blue-50 border border-blue-200 rounded-xl p-3.5">
            <Loader2 size={18} className="animate-spin shrink-0 text-blue-600" />
            <div>
              <p className="font-bold text-blue-950">AI is analyzing clinical document…</p>
              <p className="text-xs text-blue-800 mt-0.5">
                Performing OCR, extracting clinical schema, and generating plain-language health insights.
              </p>
            </div>
          </div>
        )}

        {/* Failed notification */}
        {doc.status === 'failed' && (
          <div className="mt-4 flex items-center justify-between gap-3 text-sm text-rose-900 bg-rose-50 border border-rose-200 rounded-xl p-3.5">
            <div className="flex items-center gap-2.5">
              <AlertCircle size={18} className="shrink-0 text-rose-600" />
              <span className="font-medium">{doc.error_message || 'Processing failed.'}</span>
            </div>
            <button
              type="button"
              onClick={() => handleReprocess()}
              className="text-xs font-bold underline text-rose-700 hover:text-rose-900"
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
              <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <FileText size={16} className="text-blue-600" />
                    <h3 className="text-sm font-bold text-slate-900">Raw OCR Extracted Text</h3>
                  </div>
                  <span className="text-xs font-semibold text-slate-500">Source Document</span>
                </div>
                <pre className="text-xs text-slate-800 whitespace-pre-wrap font-mono leading-relaxed overflow-x-auto max-h-[700px] overflow-y-auto p-3.5 bg-slate-50 rounded-xl border border-slate-200">
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
                  <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
                    <h3 className="text-sm font-bold text-slate-900 mb-4 pb-3 border-b border-slate-100 flex items-center gap-2">
                      <FlaskConical size={16} className="text-blue-600" />
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
              <div className="flex items-center gap-1.5 mb-6 bg-slate-100 rounded-xl p-1 w-fit border border-slate-200">
                {TABS.filter((t) => !t.disabled).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTab(t.id)}
                    className={`flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-lg transition-all ${
                      tab === t.id
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
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
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Raw OCR Text</h3>
                    <pre className="text-xs text-slate-800 whitespace-pre-wrap font-mono leading-relaxed overflow-x-auto bg-slate-50 p-4 rounded-xl border border-slate-200">
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
    processing: { label: 'Processing', cls: 'text-blue-700 bg-blue-50 border-blue-200' },
    completed: { label: 'Ready', cls: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
    failed: { label: 'Failed', cls: 'text-rose-700 bg-rose-50 border-rose-200' },
  };
  const s = config[status] || config.processing;
  return (
    <span className={`text-xs px-2.5 py-0.5 rounded-full border font-bold ${s.cls}`}>
      {s.label}
    </span>
  );
}

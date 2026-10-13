import React, { useCallback, useEffect, useRef, useState } from 'react';
import { LayoutDashboard, RefreshCw, Plus, X } from 'lucide-react';
import DocumentCard from '../components/DocumentCard';
import UploadZone from '../components/UploadZone';
import { useAppStore } from '../lib/store';
import { getDocuments, deleteDocument } from '../lib/api';

export default function Dashboard() {
  const { documents, setDocuments, removeDocument } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isMountedRef = useRef(true);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchDocs = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    try {
      const docs = await getDocuments();
      if (!isMountedRef.current) return;
      setDocuments(docs);
      setErrorMessage(null);
    } catch (err) {
      if (!isMountedRef.current) return;
      console.error('Failed to load documents:', err);
      setErrorMessage('Could not load documents from server. Make sure the API is running.');
    } finally {
      if (isMountedRef.current && showSpinner) {
        setLoading(false);
      }
    }
  }, [setDocuments]);

  // Initial load
  useEffect(() => {
    isMountedRef.current = true;
    // oxlint-disable-next-line react/set-state-in-effect
    fetchDocs();
    return () => {
      isMountedRef.current = false;
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [fetchDocs]);

  // Auto-polling when any document is in 'processing' status
  const hasProcessingDocs = documents.some((d) => d.status === 'processing');
  useEffect(() => {
    if (hasProcessingDocs) {
      if (!pollIntervalRef.current) {
        pollIntervalRef.current = setInterval(() => {
          if (isMountedRef.current) {
            fetchDocs(false);
          }
        }, 3000);
      }
    } else {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [hasProcessingDocs, fetchDocs]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const docToDelete = documents.find((d) => d.id === id);
    const confirmed = window.confirm(
      `Delete document "${docToDelete?.filename || id}"? This action cannot be undone.`
    );
    if (!confirmed) return;

    try {
      await deleteDocument(id);
      removeDocument(id);
    } catch {
      alert('Failed to delete document. Please try again.');
    }
  };

  const processingCount = documents.filter((d) => d.status === 'processing').length;
  const completedCount = documents.filter((d) => d.status === 'completed').length;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-teal-500/20 border border-cyan-500/30 flex items-center justify-center shadow-sm">
            <LayoutDashboard size={18} className="text-cyan-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-100">Clinical Dashboard</h1>
            <p className="text-sm text-slate-500">
              {documents.length} document{documents.length === 1 ? '' : 's'} total
              {processingCount > 0 && ` · ${processingCount} processing in background…`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fetchDocs(true)}
            disabled={loading}
            className="flex items-center gap-2 text-sm text-slate-300 hover:text-white transition-colors glass px-3.5 py-2 rounded-xl border border-slate-700/60"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            onClick={() => setShowUpload((v) => !v)}
            className="flex items-center gap-2 text-sm bg-gradient-to-r from-cyan-500 to-teal-500 text-white font-medium px-4 py-2 rounded-xl hover:from-cyan-400 hover:to-teal-400 transition-all shadow-md shadow-cyan-500/20"
          >
            {showUpload ? <X size={14} /> : <Plus size={14} />}
            <span>{showUpload ? 'Close' : 'Upload'}</span>
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
          {errorMessage}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Total Ingested', value: documents.length, color: 'text-slate-100' },
          { label: 'Processing (AI)', value: processingCount, color: 'text-cyan-400' },
          { label: 'Ready & Analyzed', value: completedCount, color: 'text-green-400' },
        ].map((stat) => (
          <div key={stat.label} className="glass rounded-2xl p-5 text-center border border-slate-800">
            <p className={`text-3xl font-extrabold ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-medium">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Upload zone (collapsible) */}
      {showUpload && (
        <div className="mb-8">
          <UploadZone
            onUploadComplete={() => {
              fetchDocs(false);
            }}
            onProcessingDone={() => {
              fetchDocs(false);
            }}
          />
        </div>
      )}

      {/* Document List */}
      {documents.length === 0 && !loading ? (
        <div className="text-center py-20 glass rounded-2xl border border-slate-800">
          <p className="text-5xl mb-4">📂</p>
          <p className="text-slate-300 font-semibold text-lg">No medical documents yet</p>
          <p className="text-sm text-slate-500 mt-1 mb-6 max-w-sm mx-auto">
            Upload a prescription, lab report, or discharge summary to see instant AI extraction and plain-language summaries.
          </p>
          <button
            type="button"
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-2 mx-auto text-sm bg-gradient-to-r from-cyan-500 to-teal-500 text-white font-medium px-5 py-2.5 rounded-xl hover:from-cyan-400 hover:to-teal-400 transition-all shadow-md shadow-cyan-500/25"
          >
            <Plus size={15} /> Upload Medical Document
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {documents.map((doc) => (
            <DocumentCard key={doc.id} doc={doc} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}

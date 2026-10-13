import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Folder,
  Camera,
  Upload,
  Search,
  Grid,
  List as ListIcon,
  ShieldCheck,
  Pill,
  FlaskConical,
  FileText,
  Stethoscope,
  Trash2,
  MoveRight,
  RefreshCw,
  Eye,
} from 'lucide-react';
import { useAppStore } from '../lib/store';
import {
  getDriveFolders,
  getDriveDocuments,
  updateDocumentMetadata,
  deleteDocument,
  getPatientInsights,
} from '../lib/api';
import type { DriveFolderInfo, DocumentListItem, DoctorInsight } from '../lib/types';
import UploadZone from '../components/UploadZone';
import CameraScanModal from '../components/CameraScanModal';
import StatusBadge from '../components/StatusBadge';
import { formatDate } from '../lib/utils';

export default function PatientDrive() {
  const navigate = useNavigate();
  const session = useAppStore((s) => s.session);
  const patient = useAppStore((s) => s.patient);

  const [folders, setFolders] = useState<DriveFolderInfo[]>([]);
  const [activeFolder, setActiveFolder] = useState<string>('all');
  const [activeTag, setActiveTag] = useState<string>('all');
  const [search, setSearch] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const [documents, setDocuments] = useState<DocumentListItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Doctor Insights inbox
  const [insights, setInsights] = useState<DoctorInsight[]>([]);

  // Modals & Panels
  const [showUploadZone, setShowUploadZone] = useState<boolean>(false);
  const [showCameraModal, setShowCameraModal] = useState<boolean>(false);

  const isMountedRef = useRef(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [fData, dData, iData] = await Promise.all([
        getDriveFolders(),
        getDriveDocuments({
          folder: activeFolder === 'all' ? undefined : activeFolder,
          tag: activeTag === 'all' ? undefined : activeTag,
          search: search.trim() || undefined,
        }),
        getPatientInsights(),
      ]);
      if (!isMountedRef.current) return;
      setFolders(fData);
      setDocuments(dData);
      setInsights(iData);
    } catch (err) {
      console.error('Failed to load drive data:', err);
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, [activeFolder, activeTag, search]);

  useEffect(() => {
    isMountedRef.current = true;
    // oxlint-disable-next-line react/set-state-in-effect
    loadData();
    return () => {
      isMountedRef.current = false;
    };
  }, [loadData]);

  const handleMoveFolder = async (docId: string, targetFolder: string) => {
    try {
      await updateDocumentMetadata(docId, { folder: targetFolder });
      loadData();
    } catch (err) {
      console.error('Failed to move folder:', err);
    }
  };

  const handleDelete = async (docId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this document from your drive?')) return;
    try {
      await deleteDocument(docId);
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
      loadData();
    } catch (err) {
      console.error('Failed to delete document:', err);
    }
  };

  const getFolderIcon = (iconName: string) => {
    switch (iconName) {
      case 'Pill':
        return <Pill size={18} className="text-emerald-400" />;
      case 'FlaskConical':
        return <FlaskConical size={18} className="text-purple-400" />;
      case 'Camera':
        return <Camera size={18} className="text-amber-400" />;
      case 'FileText':
        return <FileText size={18} className="text-blue-400" />;
      case 'ShieldCheck':
        return <ShieldCheck size={18} className="text-indigo-400" />;
      default:
        return <Folder size={18} className="text-cyan-400" />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Top Banner: Patient DigiLocker Drive */}
      <div className="glass rounded-2xl p-6 border border-cyan-500/30 bg-gradient-to-r from-cyan-950/40 via-slate-900 to-slate-900 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-inner">
              <ShieldCheck size={28} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-cyan-300 bg-cyan-500/20 px-2.5 py-0.5 rounded-full border border-cyan-500/30 uppercase tracking-wider">
                  DigiLocker Health Drive
                </span>
                <span className="text-xs text-slate-400 font-mono bg-slate-800/80 px-2.5 py-0.5 rounded-full border border-slate-700">
                  ABHA: {session.mock_abha_id || patient?.mock_abha_id || '91-8842-1920-3341'}
                </span>
              </div>
              <h1 className="text-2xl font-extrabold text-slate-100 mt-1">{session.name}</h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Centralized personal repository for prescriptions, lab xeroxes, mobile scans & doctor insights
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={() => setShowCameraModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition-all"
            >
              <Camera size={15} />
              <span>Scan Xerox / Photo</span>
            </button>

            <button
              type="button"
              onClick={() => setShowUploadZone((v) => !v)}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition-all"
            >
              <Upload size={15} />
              <span>Upload PDF / Files</span>
            </button>
          </div>
        </div>
      </div>

      {/* Upload Dropzone (Collapsible) */}
      {showUploadZone && (
        <div className="glass rounded-2xl p-6 border border-cyan-500/30 animate-fadeIn">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-200">Upload Document to DigiLocker</h3>
            <button
              type="button"
              onClick={() => setShowUploadZone(false)}
              className="text-xs text-slate-400 hover:text-white"
            >
              Close
            </button>
          </div>
          <UploadZone
            onUploadComplete={() => {
              loadData();
              setShowUploadZone(false);
            }}
          />
        </div>
      )}

      {/* DigiLocker Folder Tiles Bar */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Folder size={14} className="text-cyan-400" />
            <span>DigiLocker Category Folders</span>
          </h2>
          <span className="text-xs text-slate-500">{documents.length} Total Files Stored</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {folders.map((f) => (
            <div
              key={f.id}
              onClick={() => setActiveFolder(f.id)}
              className={`p-3.5 rounded-2xl cursor-pointer transition-all border flex flex-col justify-between ${
                activeFolder === f.id
                  ? 'bg-cyan-500/20 border-cyan-500 shadow-md ring-2 ring-cyan-500/30 text-cyan-200'
                  : 'glass border-slate-800 hover:border-slate-700 text-slate-300 hover:bg-slate-900/60'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 rounded-xl bg-slate-900/80 border border-slate-700/60 flex items-center justify-center">
                  {getFolderIcon(f.icon)}
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-900/80 border border-slate-800 text-slate-300">
                  {f.count}
                </span>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-100 truncate">{f.label}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Category Folder</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Shared Doctor's Insights Inbox Banner */}
      {insights.length > 0 && (
        <div className="glass rounded-2xl p-5 border border-indigo-500/30 bg-gradient-to-r from-indigo-950/30 to-slate-900 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <Stethoscope size={16} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-100">Verified Doctor Insights & Prescriptions</h3>
                <p className="text-[11px] text-slate-400">
                  Clinical remarks and prescription instructions shared directly from your healthcare providers
                </p>
              </div>
            </div>
            <span className="text-xs text-indigo-300 bg-indigo-500/20 px-2.5 py-0.5 rounded-full border border-indigo-500/30 font-semibold">
              {insights.length} Notes Received
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            {insights.map((ins) => (
              <div key={ins.id} className="p-4 rounded-xl bg-slate-900/80 border border-indigo-500/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-300">{ins.doctor_name}</span>
                  <span className="text-[10px] text-slate-500">{formatDate(ins.created_at)}</span>
                </div>
                <p className="text-xs font-semibold text-slate-100">{ins.title}</p>
                <p className="text-xs text-slate-300 leading-relaxed line-clamp-3">
                  {ins.clinical_notes}
                </p>
                {ins.prescriptions_advice && (
                  <div className="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-500/20 text-[11px] text-emerald-300 font-mono">
                    <span className="font-bold">Prescription Advice: </span>
                    {ins.prescriptions_advice}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Drive Toolbar: Search, Tag Filters, View Toggle */}
      <div className="glass rounded-2xl p-4 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search size={14} className="absolute left-3 top-3 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search reports, medicines, xeroxes..."
            className="w-full text-xs bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3.5 py-2 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* Tag Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 text-xs">
          <span className="text-slate-500 text-[11px] font-semibold pr-1">Tags:</span>
          {['all', 'xerox', 'scan', 'lab', 'rx', 'prescription'].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setActiveTag(t)}
              className={`px-3 py-1 rounded-lg transition-all capitalize font-medium ${
                activeTag === t
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                  : 'glass text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 glass p-1 rounded-xl border border-slate-800 self-end md:self-auto">
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-lg transition-all ${
              viewMode === 'grid' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-500 hover:text-slate-300'
            }`}
            title="Grid View"
          >
            <Grid size={15} />
          </button>
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded-lg transition-all ${
              viewMode === 'list' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-500 hover:text-slate-300'
            }`}
            title="List View"
          >
            <ListIcon size={15} />
          </button>
        </div>
      </div>

      {/* Documents Area */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 text-xs flex items-center justify-center gap-2">
          <RefreshCw size={16} className="animate-spin text-cyan-400" />
          <span>Loading DigiLocker drive...</span>
        </div>
      ) : documents.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center border border-slate-800 space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mx-auto text-cyan-400">
            <Folder size={26} />
          </div>
          <p className="text-sm font-bold text-slate-200">No documents found in this folder</p>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Upload a prescription, lab report, or use the Xerox camera scanner to add your records to this folder.
          </p>
          <div className="pt-2 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setShowCameraModal(true)}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md"
            >
              Scan Xerox Now
            </button>
            <button
              type="button"
              onClick={() => setShowUploadZone(true)}
              className="px-4 py-2 glass hover:bg-slate-800 text-slate-200 font-semibold text-xs rounded-xl border border-slate-700"
            >
              Upload PDF
            </button>
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {documents.map((doc) => (
            <div
              key={doc.id}
              onClick={() => navigate(`/documents/${doc.id}`)}
              className="glass rounded-2xl p-5 border border-slate-800 hover:border-cyan-500/40 transition-all cursor-pointer group flex flex-col justify-between hover:shadow-xl hover:shadow-cyan-500/5"
            >
              <div className="space-y-3">
                {/* Header line */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-cyan-400 group-hover:border-cyan-500/30 transition-colors">
                      {doc.is_xerox ? <Camera size={16} className="text-amber-400" /> : <FileText size={16} />}
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {doc.folder || 'Prescriptions'}
                      </span>
                      <p className="text-[10px] text-slate-500">{formatDate(doc.created_at)}</p>
                    </div>
                  </div>
                  <StatusBadge status={doc.status} />
                </div>

                {/* Filename */}
                <div>
                  <h3 className="text-xs font-bold text-slate-100 group-hover:text-cyan-300 transition-colors break-all line-clamp-1">
                    {doc.filename}
                  </h3>
                  {doc.overall_confidence && (
                    <p className="text-[10px] text-cyan-400/90 font-medium mt-1">
                      {Math.round(doc.overall_confidence * 100)}% Extraction Confidence
                    </p>
                  )}
                </div>

                {/* Tags */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  {doc.is_xerox && (
                    <span className="text-[10px] bg-amber-500/10 text-amber-300 border border-amber-500/20 px-2 py-0.5 rounded-full font-semibold">
                      Xerox / Scan
                    </span>
                  )}
                  {doc.tags?.map((tg, idx) => (
                    <span
                      key={idx}
                      className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full border border-slate-700/60"
                    >
                      #{tg}
                    </span>
                  ))}
                </div>
              </div>

              {/* Bottom Actions & Move Folder Selector */}
              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
                {/* Move folder select */}
                <div className="flex items-center gap-1 text-[11px] text-slate-400">
                  <MoveRight size={12} className="text-slate-500" />
                  <select
                    value={doc.folder || 'prescriptions'}
                    onChange={(e) => handleMoveFolder(doc.id, e.target.value)}
                    className="bg-slate-900 border border-slate-800 text-[10px] rounded-lg px-2 py-1 text-slate-300 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="prescriptions">Prescriptions</option>
                    <option value="lab_reports">Lab & Diagnostics</option>
                    <option value="scans_xerox">Scans & Xerox</option>
                    <option value="discharge_summaries">Discharge Notes</option>
                    <option value="insurance">Insurance & ABHA</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => handleDelete(doc.id, e)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 transition-colors"
                    title="Delete document"
                  >
                    <Trash2 size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate(`/documents/${doc.id}`)}
                    className="p-1.5 rounded-lg text-cyan-400 hover:text-cyan-300 transition-colors"
                    title="Open details"
                  >
                    <Eye size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* List View */
        <div className="glass rounded-2xl border border-slate-800 overflow-hidden divide-y divide-slate-800">
          {documents.map((doc) => (
            <div
              key={doc.id}
              onClick={() => navigate(`/documents/${doc.id}`)}
              className="p-4 hover:bg-slate-900/60 transition-all cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-cyan-400">
                  {doc.is_xerox ? <Camera size={16} className="text-amber-400" /> : <FileText size={16} />}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-100 group-hover:text-cyan-300 transition-colors break-all">
                    {doc.filename}
                  </h4>
                  <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5 flex-wrap">
                    <span className="font-semibold text-slate-400 uppercase">{doc.folder || 'Prescriptions'}</span>
                    <span>• {formatDate(doc.created_at)}</span>
                    {doc.is_xerox && (
                      <span className="text-amber-400 font-semibold bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20">
                        Xerox Copy
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-auto" onClick={(e) => e.stopPropagation()}>
                <StatusBadge status={doc.status} />

                {/* Move folder */}
                <select
                  value={doc.folder || 'prescriptions'}
                  onChange={(e) => handleMoveFolder(doc.id, e.target.value)}
                  className="bg-slate-900 border border-slate-800 text-[10px] rounded-lg px-2 py-1 text-slate-300 focus:outline-none focus:border-cyan-500"
                >
                  <option value="prescriptions">Prescriptions</option>
                  <option value="lab_reports">Lab & Diagnostics</option>
                  <option value="scans_xerox">Scans & Xerox</option>
                  <option value="discharge_summaries">Discharge Notes</option>
                  <option value="insurance">Insurance & ABHA</option>
                </select>

                <button
                  type="button"
                  onClick={(e) => handleDelete(doc.id, e)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 transition-colors"
                  title="Delete document"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Camera & Xerox Scan Modal */}
      <CameraScanModal
        isOpen={showCameraModal}
        onClose={() => setShowCameraModal(false)}
        onUploaded={() => loadData()}
      />
    </div>
  );
}

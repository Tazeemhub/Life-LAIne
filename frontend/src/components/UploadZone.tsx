import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, X, CheckCircle, Loader2, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';
import { uploadDocument, getDocument } from '../lib/api';
import { useAppStore } from '../lib/store';
import { SAMPLE_DOCUMENTS, type SampleDocumentPreset } from '../lib/sampleDocs';

const ACCEPTED_TYPES = {
  'application/pdf': ['.pdf'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/tiff': ['.tiff', '.tif'],
  'text/plain': ['.txt'],
};

interface UploadedFile {
  name: string;
  documentId?: string;
  status: 'pending' | 'uploading' | 'processing' | 'done' | 'error';
  progress: number;
  error?: string;
}

interface UploadZoneProps {
  onUploadComplete?: (id: string) => void;
  onProcessingDone?: (id: string) => void;
}

export default function UploadZone({ onUploadComplete, onProcessingDone }: UploadZoneProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const upsertDocument = useAppStore((s) => s.upsertDocument);
  const isMountedRef = useRef(true);
  const intervalsRef = useRef<Record<string, ReturnType<typeof setInterval>>>({});

  // Cleanup all running polling intervals on unmount
  useEffect(() => {
    isMountedRef.current = true;
    const intervals = intervalsRef.current;
    return () => {
      isMountedRef.current = false;
      Object.values(intervals).forEach((iv) => clearInterval(iv));
    };
  }, []);

  const pollDocument = useCallback((docId: string, fileName: string) => {
    let attempts = 0;
    const maxAttempts = 60;

    const interval = setInterval(async () => {
      attempts++;
      if (attempts > maxAttempts) {
        clearInterval(interval);
        delete intervalsRef.current[docId];
        return;
      }
      try {
        const doc = await getDocument(docId);
        if (!isMountedRef.current) {
          clearInterval(interval);
          delete intervalsRef.current[docId];
          return;
        }

        if (doc.status === 'completed') {
          clearInterval(interval);
          delete intervalsRef.current[docId];
          setFiles((prev) =>
            prev.map((f) => (f.name === fileName ? { ...f, status: 'done', progress: 100 } : f))
          );
          upsertDocument({
            id: doc.id,
            filename: doc.filename,
            document_type: doc.document_type,
            status: 'completed',
            overall_confidence: doc.extracted_data?.overall_confidence,
            created_at: doc.created_at,
          });
          onProcessingDone?.(doc.id);
        } else if (doc.status === 'failed') {
          clearInterval(interval);
          delete intervalsRef.current[docId];
          setFiles((prev) =>
            prev.map((f) =>
              f.name === fileName
                ? { ...f, status: 'error', error: doc.error_message || 'Processing failed' }
                : f
            )
          );
        }
      } catch {
        // Transient network error; continue polling
      }
    }, 3000);

    intervalsRef.current[docId] = interval;
  }, [upsertDocument, onProcessingDone]);

  const processFile = useCallback(async (file: File) => {
    // Vercel serverless functions enforce a 4.5 MB maximum request payload limit
    if (file.size > 4.5 * 1024 * 1024) {
      const fileEntry: UploadedFile = {
        name: file.name,
        status: 'error',
        progress: 0,
        error: 'File exceeds 4.5 MB limit for serverless deployment. Please select a document under 4.5 MB.',
      };
      setFiles((prev) => [...prev, fileEntry]);
      return;
    }

    const fileEntry: UploadedFile = { name: file.name, status: 'uploading', progress: 0 };
    setFiles((prev) => [...prev, fileEntry]);

    const updateFile = (update: Partial<UploadedFile>) => {
      if (!isMountedRef.current) return;
      setFiles((prev) =>
        prev.map((f) => (f.name === file.name ? { ...f, ...update } : f))
      );
    };

    try {
      const response = await uploadDocument(file, (pct) => {
        updateFile({ progress: pct });
      });

      const isImmediatelyDone = response.status === 'completed';

      updateFile({
        documentId: response.document_id,
        status: isImmediatelyDone ? 'done' : 'processing',
        progress: 100,
      });

      const now = new Date().toISOString();
      upsertDocument({
        id: response.document_id,
        filename: file.name,
        status: response.status || 'processing',
        created_at: now,
      });

      // Poll for background completion or fetch final details
      pollDocument(response.document_id, file.name);
      onUploadComplete?.(response.document_id);
      if (isImmediatelyDone) {
        onProcessingDone?.(response.document_id);
      }
    } catch (err: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const axiosErr = err as any;
      const detail = axiosErr?.response?.data?.detail;
      const msg = detail || (err instanceof Error ? err.message : 'Upload failed');
      updateFile({ status: 'error', error: String(msg) });
    }
  }, [upsertDocument, pollDocument, onUploadComplete, onProcessingDone]);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      acceptedFiles.forEach((file) => {
        processFile(file);
      });
    },
    [processFile]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: 20 * 1024 * 1024,
    multiple: true,
  });

  const removeFile = (name: string) => {
    setFiles((prev) => prev.filter((f) => f.name !== name));
  };

  const handleLoadSample = (sample: SampleDocumentPreset, e: React.MouseEvent) => {
    e.stopPropagation();
    const blob = new Blob([sample.content], { type: sample.mimeType });
    const file = new File([blob], sample.filename, { type: sample.mimeType });
    processFile(file);
  };

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={cn(
          'relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-300 bg-white shadow-xs',
          isDragActive
            ? 'border-blue-600 bg-blue-50/70 scale-[1.01]'
            : 'border-slate-300 hover:border-blue-500 hover:bg-blue-50/30'
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-4">
          <div
            className={cn(
              'w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-xs border',
              isDragActive ? 'bg-blue-600 text-white border-blue-600' : 'bg-blue-50 text-blue-600 border-blue-100'
            )}
          >
            <Upload size={26} className={isDragActive ? 'text-white' : 'text-blue-600'} />
          </div>
          <div>
            <p className="text-base sm:text-lg font-bold text-slate-900">
              {isDragActive ? 'Drop your medical files here!' : 'Drag & drop medical records'}
            </p>
            <p className="text-sm text-slate-500 mt-1">
              or <span className="text-blue-600 font-semibold underline underline-offset-2">browse files</span> (PDF, JPEG, PNG, TXT up to 20MB)
            </p>
          </div>
        </div>

        {/* Demo Sample Presets */}
        <div className="mt-6 pt-5 border-t border-slate-200/90" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-600 mb-3">
            <Sparkles size={14} className="text-blue-600" />
            <span>Or test immediately with a realistic sample record:</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-left">
            {SAMPLE_DOCUMENTS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={(e) => handleLoadSample(s, e)}
                className="group p-3 rounded-xl bg-slate-50/80 hover:bg-blue-50/60 border border-slate-200/90 hover:border-blue-300 transition-all text-left shadow-2xs"
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="text-[10px] font-bold text-blue-700 bg-blue-100/70 px-1.5 py-0.5 rounded uppercase tracking-wider">
                    {s.badge}
                  </span>
                  <span className="text-[11px] text-blue-600 group-hover:text-blue-800 transition-colors font-semibold">
                    + Load
                  </span>
                </div>
                <p className="text-xs font-bold text-slate-900 truncate group-hover:text-blue-700">
                  {s.name}
                </p>
                <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                  {s.description}
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((f) => (
            <div key={f.name} className="bg-white border border-slate-200 rounded-xl p-3.5 flex items-center gap-3 shadow-xs">
              <FileText size={18} className="text-blue-600 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">{f.name}</p>
                {f.status === 'uploading' && (
                  <div className="mt-1.5 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 transition-all duration-300"
                      style={{ width: `${f.progress}%` }}
                    />
                  </div>
                )}
                {f.status === 'processing' && (
                  <p className="text-xs text-blue-600 mt-1 flex items-center gap-1.5 font-semibold">
                    <Loader2 size={12} className="animate-spin" />
                    AI analyzing and extracting clinical fields…
                  </p>
                )}
                {f.status === 'done' && (
                  <p className="text-xs text-emerald-700 mt-1 font-semibold flex items-center gap-1">
                    <CheckCircle size={12} /> Ready for clinical review
                  </p>
                )}
                {f.status === 'error' && (
                  <p className="text-xs text-rose-600 mt-1 font-medium">{f.error}</p>
                )}
              </div>
              <div className="shrink-0 flex items-center gap-2">
                {f.status === 'done' && <CheckCircle size={16} className="text-emerald-600" />}
                {f.status === 'uploading' && (
                  <span className="text-xs text-slate-500 font-mono font-medium">{f.progress}%</span>
                )}
                {f.status === 'processing' && (
                  <Loader2 size={16} className="text-blue-600 animate-spin" />
                )}
                <button
                  type="button"
                  onClick={() => removeFile(f.name)}
                  aria-label="Remove uploaded file item"
                  className="text-slate-400 hover:text-slate-600 transition-colors p-1"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

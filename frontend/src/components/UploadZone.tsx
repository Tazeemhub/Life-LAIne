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

      updateFile({
        documentId: response.document_id,
        status: 'processing',
        progress: 100,
      });

      const now = new Date().toISOString();
      upsertDocument({
        id: response.document_id,
        filename: file.name,
        status: 'processing',
        created_at: now,
      });

      // Poll for background completion with safe cleanup
      pollDocument(response.document_id, file.name);
      onUploadComplete?.(response.document_id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      updateFile({ status: 'error', error: msg });
    }
  }, [upsertDocument, pollDocument, onUploadComplete]);

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
          'relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-300',
          isDragActive
            ? 'border-cyan-400 bg-cyan-500/10 scale-[1.01]'
            : 'border-slate-700 hover:border-cyan-500/50 hover:bg-cyan-500/5'
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-4">
          <div
            className={cn(
              'w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-md',
              isDragActive ? 'bg-cyan-500/30' : 'bg-slate-800'
            )}
          >
            <Upload size={26} className={isDragActive ? 'text-cyan-300' : 'text-slate-400'} />
          </div>
          <div>
            <p className="text-base sm:text-lg font-semibold text-slate-200">
              {isDragActive ? 'Drop your files here!' : 'Drag & drop medical documents'}
            </p>
            <p className="text-sm text-slate-500 mt-1">
              or <span className="text-cyan-400 font-medium">browse local files</span> (PDF, JPEG, PNG, TXT up to 20MB)
            </p>
          </div>
        </div>

        {/* Demo Sample Presets */}
        <div className="mt-6 pt-5 border-t border-slate-800/80" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-center gap-1.5 text-xs font-medium text-slate-400 mb-3">
            <Sparkles size={14} className="text-cyan-400" />
            <span>Or test with a sample record (1-click load):</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-left">
            {SAMPLE_DOCUMENTS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={(e) => handleLoadSample(s, e)}
                className="group p-3 rounded-xl bg-slate-900/90 hover:bg-cyan-950/40 border border-slate-800 hover:border-cyan-500/40 transition-all text-left"
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wider">
                    {s.badge}
                  </span>
                  <span className="text-[10px] text-slate-500 group-hover:text-cyan-300 transition-colors font-medium">
                    + Load
                  </span>
                </div>
                <p className="text-xs font-semibold text-slate-200 truncate group-hover:text-white">
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
            <div key={f.name} className="glass rounded-xl p-3.5 flex items-center gap-3">
              <FileText size={18} className="text-slate-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-200 truncate">{f.name}</p>
                {f.status === 'uploading' && (
                  <div className="mt-1.5 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-teal-400 transition-all duration-300"
                      style={{ width: `${f.progress}%` }}
                    />
                  </div>
                )}
                {f.status === 'processing' && (
                  <p className="text-xs text-cyan-400 mt-1 flex items-center gap-1.5 font-medium">
                    <Loader2 size={12} className="animate-spin" />
                    Processing with AI…
                  </p>
                )}
                {f.status === 'done' && (
                  <p className="text-xs text-green-400 mt-1 font-medium flex items-center gap-1">
                    <CheckCircle size={12} /> Ready for review
                  </p>
                )}
                {f.status === 'error' && (
                  <p className="text-xs text-red-400 mt-1">{f.error}</p>
                )}
              </div>
              <div className="shrink-0 flex items-center gap-2">
                {f.status === 'done' && <CheckCircle size={16} className="text-green-400" />}
                {f.status === 'uploading' && (
                  <span className="text-xs text-slate-400 font-mono">{f.progress}%</span>
                )}
                {f.status === 'processing' && (
                  <Loader2 size={16} className="text-cyan-400 animate-spin" />
                )}
                <button
                  type="button"
                  onClick={() => removeFile(f.name)}
                  aria-label="Remove uploaded file item"
                  className="text-slate-500 hover:text-slate-300 transition-colors p-1"
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

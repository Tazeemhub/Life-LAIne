import React from 'react';
import { Link } from 'react-router-dom';
import { Clock, CheckCircle, AlertCircle, Loader2, ChevronRight, Trash2 } from 'lucide-react';
import type { DocumentListItem } from '../lib/types';
import { cn, formatDate, docTypeLabel, docTypeIcon, confidenceClass } from '../lib/utils';

interface Props {
  doc: DocumentListItem;
  onDelete?: (id: string, e: React.MouseEvent) => void;
}

export default function DocumentCard({ doc, onDelete }: Props) {
  const statusConfig = {
    processing: {
      icon: <Loader2 size={13} className="animate-spin text-blue-600" />,
      label: 'Processing…',
      className: 'text-blue-700 bg-blue-50 border-blue-200',
    },
    completed: {
      icon: <CheckCircle size={13} className="text-emerald-600" />,
      label: 'Ready',
      className: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    },
    failed: {
      icon: <AlertCircle size={13} className="text-rose-600" />,
      label: 'Failed',
      className: 'text-rose-700 bg-rose-50 border-rose-200',
    },
  };
  const status = statusConfig[doc.status] || statusConfig.processing;

  return (
    <div className="relative group">
      <Link to={`/documents/${doc.id}`} className="block card-hover">
        <div className="bg-white rounded-2xl p-4 sm:p-5 flex items-center gap-4 border border-slate-200/90 shadow-xs hover:border-blue-300 transition-all">
          {/* Document Icon */}
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-2xl shrink-0 shadow-2xs">
            {docTypeIcon(doc.document_type)}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 pr-8">
            <p className="text-sm font-bold text-slate-900 truncate group-hover:text-blue-700 transition-colors">
              {doc.filename}
            </p>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className="text-xs text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200 font-medium">
                {docTypeLabel(doc.document_type)}
              </span>
              <span className={cn('text-xs px-2.5 py-0.5 rounded-full border flex items-center gap-1.5 font-semibold', status.className)}>
                {status.icon}
                {status.label}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-2">
              <span className="flex items-center gap-1 text-xs text-slate-500 font-medium">
                <Clock size={11} /> {formatDate(doc.created_at)}
              </span>
              {doc.overall_confidence !== undefined && (
                <span className={cn('text-xs font-semibold', confidenceClass(doc.overall_confidence))}>
                  {Math.round(doc.overall_confidence * 100)}% accuracy
                </span>
              )}
            </div>
          </div>

          <ChevronRight size={18} className="text-slate-400 group-hover:text-blue-600 transition-colors shrink-0" />
        </div>
      </Link>

      {/* Delete button (top-right corner) */}
      {onDelete && (
        <button
          type="button"
          onClick={(e) => onDelete(doc.id, e)}
          title="Delete document"
          aria-label={`Delete ${doc.filename}`}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
        >
          <Trash2 size={15} />
        </button>
      )}
    </div>
  );
}

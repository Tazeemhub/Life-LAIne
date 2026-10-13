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
      icon: <Loader2 size={13} className="animate-spin text-cyan-400" />,
      label: 'Processing…',
      className: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
    },
    completed: {
      icon: <CheckCircle size={13} className="text-green-400" />,
      label: 'Ready',
      className: 'text-green-400 bg-green-500/10 border-green-500/30',
    },
    failed: {
      icon: <AlertCircle size={13} className="text-red-400" />,
      label: 'Failed',
      className: 'text-red-400 bg-red-500/10 border-red-500/30',
    },
  };
  const status = statusConfig[doc.status] || statusConfig.processing;

  return (
    <div className="relative group">
      <Link to={`/documents/${doc.id}`} className="block card-hover">
        <div className="glass rounded-2xl p-4 sm:p-5 flex items-center gap-4 border border-slate-800">
          {/* Document Icon */}
          <div className="w-12 h-12 rounded-xl bg-slate-800/90 border border-slate-700/50 flex items-center justify-center text-2xl shrink-0 shadow-sm">
            {docTypeIcon(doc.document_type)}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 pr-8">
            <p className="text-sm font-semibold text-slate-100 truncate group-hover:text-cyan-300 transition-colors">
              {doc.filename}
            </p>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className="text-xs text-slate-400 bg-slate-800/80 px-2.5 py-0.5 rounded-full border border-slate-700/40">
                {docTypeLabel(doc.document_type)}
              </span>
              <span className={cn('text-xs px-2.5 py-0.5 rounded-full border flex items-center gap-1.5 font-medium', status.className)}>
                {status.icon}
                {status.label}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-2">
              <span className="flex items-center gap-1 text-xs text-slate-500">
                <Clock size={11} /> {formatDate(doc.created_at)}
              </span>
              {doc.overall_confidence !== undefined && (
                <span className={cn('text-xs font-semibold', confidenceClass(doc.overall_confidence))}>
                  {Math.round(doc.overall_confidence * 100)}% confidence
                </span>
              )}
            </div>
          </div>

          <ChevronRight size={16} className="text-slate-600 group-hover:text-slate-300 group-hover:translate-x-0.5 transition-all shrink-0" />
        </div>
      </Link>

      {onDelete && (
        <button
          type="button"
          onClick={(e) => onDelete(doc.id, e)}
          title="Delete document"
          className="absolute right-12 top-1/2 -translate-y-1/2 text-slate-600 hover:text-red-400 transition-colors p-2 rounded-lg hover:bg-slate-800/80 opacity-0 group-hover:opacity-100"
        >
          <Trash2 size={15} />
        </button>
      )}
    </div>
  );
}

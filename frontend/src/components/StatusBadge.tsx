import React from 'react';

export default function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; cls: string }> = {
    processing: { label: 'Processing', cls: 'text-blue-700 bg-blue-50 border-blue-200' },
    completed: { label: 'Ready', cls: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
    failed: { label: 'Failed', cls: 'text-rose-700 bg-rose-50 border-rose-200' },
  };
  const s = config[status] || config.processing;
  return (
    <span className={`text-xs px-2.5 py-0.5 rounded-full border font-semibold shadow-2xs ${s.cls}`}>
      {s.label}
    </span>
  );
}

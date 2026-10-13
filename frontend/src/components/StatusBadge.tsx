import React from 'react';

export default function StatusBadge({ status }: { status: string }) {
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

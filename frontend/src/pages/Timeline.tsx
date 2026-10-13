import React, { useCallback, useEffect, useState } from 'react';
import { Clock, RefreshCw, AlertCircle } from 'lucide-react';
import TimelineComponent from '../components/TimelineComponent';
import { getTimeline } from '../lib/api';
import { useAppStore } from '../lib/store';

export default function Timeline() {
  const { timeline, setTimeline } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTimeline = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getTimeline();
      setTimeline(data);
    } catch (err) {
      console.error('Failed to load timeline:', err);
      setError('Unable to fetch timeline events. Please check server connection.');
    } finally {
      setLoading(false);
    }
  }, [setTimeline]);

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect
    fetchTimeline();
  }, [fetchTimeline]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center shadow-xs">
            <Clock size={20} className="text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">Health Timeline</h1>
            <p className="text-sm text-slate-500 font-medium">{timeline.length} events across all documents</p>
          </div>
        </div>
        <button
          type="button"
          onClick={fetchTimeline}
          disabled={loading}
          className="flex items-center gap-2 text-xs font-bold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 px-3.5 py-2 rounded-xl transition-colors border border-slate-200 shadow-xs"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin text-blue-600' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center justify-between gap-3 font-medium">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-rose-600" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={fetchTimeline}
            className="text-xs font-bold underline hover:text-rose-950"
          >
            Retry
          </button>
        </div>
      )}

      {loading && timeline.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full" />
          <p className="text-sm text-slate-500 font-medium">Compiling chronological health events…</p>
        </div>
      ) : (
        <TimelineComponent events={timeline} />
      )}
    </div>
  );
}

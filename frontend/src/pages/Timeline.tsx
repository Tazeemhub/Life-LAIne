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
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/30 flex items-center justify-center shadow-sm">
            <Clock size={18} className="text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-100">Health Timeline</h1>
            <p className="text-sm text-slate-500">{timeline.length} events across all documents</p>
          </div>
        </div>
        <button
          type="button"
          onClick={fetchTimeline}
          disabled={loading}
          className="flex items-center gap-2 text-sm text-slate-300 hover:text-white glass px-3.5 py-2 rounded-xl transition-colors border border-slate-700/60"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={fetchTimeline}
            className="text-xs font-semibold underline hover:text-red-200"
          >
            Retry
          </button>
        </div>
      )}

      {loading && timeline.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full" />
          <p className="text-sm text-slate-500">Compiling chronological health events…</p>
        </div>
      ) : (
        <TimelineComponent events={timeline} />
      )}
    </div>
  );
}

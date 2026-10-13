import React from 'react';
import type { TimelineEvent } from '../lib/types';
import { Link } from 'react-router-dom';
import { cn, formatDate, eventTypeIcon, eventTypeBg } from '../lib/utils';
import { ExternalLink } from 'lucide-react';

interface Props {
  events: TimelineEvent[];
}

export default function TimelineComponent({ events }: Props) {
  if (events.length === 0) {
    return (
      <div className="text-center py-16 text-slate-500 bg-white rounded-2xl border border-slate-200 shadow-xs">
        <p className="text-4xl mb-3">📋</p>
        <p className="text-slate-900 font-bold text-base">No timeline events yet</p>
        <p className="text-sm text-slate-500 mt-1">Upload a medical document to populate your health timeline.</p>
      </div>
    );
  }

  // Group by date
  const grouped = groupByDate(events);

  return (
    <div className="relative space-y-8">
      {/* Vertical connector line */}
      <div className="absolute left-6 top-3 bottom-3 w-0.5 bg-blue-200" />

      {Object.entries(grouped).map(([dateKey, dayEvents]) => {
        const { day, month } = shortDate(dateKey);
        return (
          <div key={dateKey} className="relative">
            {/* Date label */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-white border-2 border-blue-500 flex flex-col items-center justify-center z-10 relative shrink-0 leading-tight shadow-sm">
                <span className="text-xs font-extrabold text-slate-900">{day}</span>
                <span className="text-[10px] uppercase font-bold text-blue-600 tracking-wider">{month}</span>
              </div>
              <span className="text-xs text-slate-600 font-bold">{formatDate(dateKey)}</span>
            </div>

            {/* Events for this day */}
            <div className="pl-16 space-y-3">
              {dayEvents.map((event) => (
                <div key={event.id} className="bg-white rounded-xl p-4 card-hover border border-slate-200 shadow-xs group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <span className="text-lg shrink-0 mt-0.5">{eventTypeIcon(event.event_type)}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-bold text-slate-900">{event.title}</p>
                          <span className={cn('text-xs px-2.5 py-0.5 rounded-full border capitalize shadow-2xs', eventTypeBg(event.event_type))}>
                            {event.event_type.replace('_', ' ')}
                          </span>
                        </div>
                        {event.description && (
                          <p className="text-xs text-slate-600 mt-1.5 leading-relaxed font-normal">{event.description}</p>
                        )}
                      </div>
                    </div>
                    {event.related_document_id && (
                      <Link
                        to={`/documents/${event.related_document_id}`}
                        title="View related medical record"
                        className="text-slate-400 hover:text-blue-600 transition-colors shrink-0 p-1.5 rounded-lg hover:bg-blue-50"
                      >
                        <ExternalLink size={15} />
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function groupByDate(events: TimelineEvent[]): Record<string, TimelineEvent[]> {
  const sorted = [...events].sort(
    (a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime()
  );
  return sorted.reduce<Record<string, TimelineEvent[]>>((acc, e) => {
    const k = e.event_date || 'unknown';
    if (!acc[k]) acc[k] = [];
    acc[k].push(e);
    return acc;
  }, {});
}

function shortDate(dateStr: string): { day: string; month: string } {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return { day: '?', month: '?' };
    return {
      day: d.getDate().toString(),
      month: d.toLocaleString('en-US', { month: 'short' }),
    };
  } catch {
    return { day: '?', month: '?' };
  }
}

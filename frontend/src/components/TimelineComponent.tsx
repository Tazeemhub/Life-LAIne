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
      <div className="text-center py-16 text-slate-600">
        <p className="text-4xl mb-3">📋</p>
        <p className="text-slate-400 font-medium">No timeline events yet</p>
        <p className="text-sm mt-1">Upload a medical document to get started.</p>
      </div>
    );
  }

  // Group by date
  const grouped = groupByDate(events);

  return (
    <div className="relative space-y-8">
      {/* Vertical line */}
      <div className="absolute left-6 top-2 bottom-2 w-px bg-gradient-to-b from-cyan-500/50 via-slate-700 to-transparent" />

      {Object.entries(grouped).map(([dateKey, dayEvents]) => {
        const { day, month } = shortDate(dateKey);
        return (
          <div key={dateKey} className="relative">
            {/* Date label */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 flex flex-col items-center justify-center z-10 relative shrink-0 leading-tight">
                <span className="text-xs font-bold text-slate-200">{day}</span>
                <span className="text-[10px] uppercase font-semibold text-cyan-400">{month}</span>
              </div>
              <span className="text-xs text-slate-400 font-medium">{formatDate(dateKey)}</span>
            </div>

            {/* Events for this day */}
            <div className="pl-16 space-y-3">
              {dayEvents.map((event) => (
                <div key={event.id} className="glass rounded-xl p-4 card-hover group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <span className="text-lg shrink-0">{eventTypeIcon(event.event_type)}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-slate-200">{event.title}</p>
                          <span className={cn('text-xs px-2 py-0.5 rounded-full border capitalize', eventTypeBg(event.event_type))}>
                            {event.event_type.replace('_', ' ')}
                          </span>
                        </div>
                        {event.description && (
                          <p className="text-xs text-slate-400 mt-1">{event.description}</p>
                        )}
                      </div>
                    </div>
                    {event.related_document_id && (
                      <Link
                        to={`/documents/${event.related_document_id}`}
                        title="View related document"
                        className="text-slate-500 hover:text-cyan-400 transition-colors shrink-0 p-1 rounded-lg hover:bg-slate-800"
                      >
                        <ExternalLink size={14} />
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
  const groups: Record<string, TimelineEvent[]> = {};
  for (const event of events) {
    const key = event.event_date || (event.created_at ? event.created_at.split('T')[0] : 'undated');
    if (!groups[key]) groups[key] = [];
    groups[key].push(event);
  }
  return groups;
}

function shortDate(dateStr: string): { day: number | string; month: string } {
  try {
    const trimmed = dateStr.trim();
    let d: Date;
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const [y, m, day] = trimmed.split('-').map(Number);
      d = new Date(y, m - 1, day);
    } else {
      d = new Date(trimmed);
    }
    return {
      day: isNaN(d.getDate()) ? '—' : d.getDate(),
      month: isNaN(d.getTime()) ? '' : d.toLocaleString('en', { month: 'short' }),
    };
  } catch {
    return { day: '—', month: '' };
  }
}

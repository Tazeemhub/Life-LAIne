import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  try {
    const trimmed = dateStr.trim();
    // Prevent UTC midnight day-shift by parsing year, month, day components
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const [y, m, d] = trimmed.split('-').map(Number);
      return new Date(y, m - 1, d).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    }
    return new Date(trimmed).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function confidenceClass(score: number): string {
  if (score >= 0.8) return 'text-green-400';
  if (score >= 0.6) return 'text-yellow-400';
  return 'text-red-400';
}

export function confidenceLabel(score: number): string {
  if (score >= 0.8) return 'High';
  if (score >= 0.6) return 'Medium';
  return 'Low';
}

export function normalizeFlag(flag?: string | null): 'H' | 'HH' | 'L' | 'LL' | 'N' | '' {
  if (!flag) return '';
  const f = flag.trim().toUpperCase();
  if (f === 'H' || f === 'HIGH') return 'H';
  if (f === 'HH' || f === 'CRITICAL HIGH') return 'HH';
  if (f === 'L' || f === 'LOW') return 'L';
  if (f === 'LL' || f === 'CRITICAL LOW') return 'LL';
  if (f === 'N' || f === 'NORMAL') return 'N';
  return '';
}

export function flagClass(flag?: string): string {
  const norm = normalizeFlag(flag);
  switch (norm) {
    case 'H': return 'flag-h';
    case 'HH': return 'flag-hh';
    case 'L': return 'flag-l';
    case 'LL': return 'flag-ll';
    case 'N': return 'flag-n';
    default: return '';
  }
}

export function flagLabel(flag?: string): string {
  const norm = normalizeFlag(flag);
  if (norm === 'H') return 'HIGH';
  if (norm === 'HH') return 'CRITICAL HIGH';
  if (norm === 'L') return 'LOW';
  if (norm === 'LL') return 'CRITICAL LOW';
  if (norm === 'N') return 'NORMAL';
  return flag || '';
}

export function docTypeLabel(type?: string): string {
  const map: Record<string, string> = {
    prescription: 'Prescription',
    lab_report: 'Lab Report',
    discharge_summary: 'Discharge Summary',
    diagnostic: 'Diagnostic',
    other: 'Other',
  };
  return type ? (map[type] || type) : 'Unknown';
}

export function docTypeIcon(type?: string): string {
  const map: Record<string, string> = {
    prescription: '💊',
    lab_report: '🧪',
    discharge_summary: '🏥',
    diagnostic: '🔬',
    other: '📄',
  };
  return type ? (map[type] || '📄') : '📄';
}

export function eventTypeIcon(type: string): string {
  const map: Record<string, string> = {
    medication: '💊',
    lab_result: '🧪',
    diagnosis: '🩺',
    document: '📄',
  };
  return map[type] || '📌';
}

export function eventTypeBg(type: string): string {
  const map: Record<string, string> = {
    medication: 'bg-purple-500/20 border-purple-500/40 text-purple-300',
    lab_result: 'bg-blue-500/20 border-blue-500/40 text-blue-300',
    diagnosis: 'bg-orange-500/20 border-orange-500/40 text-orange-300',
    document: 'bg-slate-500/20 border-slate-500/40 text-slate-300',
  };
  return map[type] || 'bg-slate-500/20 border-slate-500/40 text-slate-300';
}

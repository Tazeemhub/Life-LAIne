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
  if (score >= 0.8) return 'text-emerald-700 font-semibold';
  if (score >= 0.6) return 'text-amber-700 font-semibold';
  return 'text-rose-700 font-semibold';
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
    medication: 'bg-purple-50 border-purple-200 text-purple-800 font-medium',
    lab_result: 'bg-blue-50 border-blue-200 text-blue-800 font-medium',
    diagnosis: 'bg-amber-50 border-amber-200 text-amber-900 font-medium',
    document: 'bg-slate-100 border-slate-200 text-slate-800 font-medium',
  };
  return map[type] || 'bg-slate-100 border-slate-200 text-slate-800 font-medium';
}

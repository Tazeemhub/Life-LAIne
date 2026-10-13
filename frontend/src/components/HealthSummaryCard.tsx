import React, { useState } from 'react';
import { Bot, Copy, CheckCheck, Globe, Loader2, Sparkles } from 'lucide-react';
import DisclaimerBanner from './DisclaimerBanner';

interface Props {
  summary: string;
  language?: string;
  onLanguageChange?: (lang: string) => void;
  isLoading?: boolean;
}

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिंदी' },
  { code: 'te', label: 'తెలుగు' },
  { code: 'ta', label: 'தமிழ்' },
];

export default function HealthSummaryCard({
  summary,
  language = 'en',
  onLanguageChange,
  isLoading = false,
}: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatSummary = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, i) => {
      // Section headers: "1. Overview"
      if (/^\d+\.\s/.test(line)) {
        return (
          <h4 key={i} className="text-sm font-bold text-blue-900 mt-4 mb-1.5 first:mt-0 tracking-tight">
            {line}
          </h4>
        );
      }
      // Bullet points
      if (line.trim().startsWith('•') || line.trim().startsWith('-')) {
        return (
          <p key={i} className="text-sm text-slate-700 pl-4 leading-relaxed my-1">
            {line}
          </p>
        );
      }
      // Disclaimer line
      if (line.toLowerCase().includes('disclaimer')) {
        return (
          <p key={i} className="text-xs text-amber-900 italic mt-4 border-t border-amber-200/80 pt-3">
            {line}
          </p>
        );
      }
      if (!line.trim()) return <br key={i} />;
      return (
        <p key={i} className="text-sm text-slate-700 leading-relaxed my-1">
          {line}
        </p>
      );
    });
  };

  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-slate-200/90 shadow-xs">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50/70">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-2xs">
            <Bot size={16} className="text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">AI Health Summary</h3>
            <p className="text-xs text-slate-500 flex items-center gap-1 font-medium">
              <Globe size={11} className="text-blue-600" />
              Patient-friendly explanation (8th-grade reading level)
            </p>
          </div>
        </div>

        {/* Language selector & Copy */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          {onLanguageChange && (
            <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => onLanguageChange(lang.code)}
                  className={`text-xs px-2.5 py-1 rounded-lg transition-all font-semibold ${
                    language === lang.code
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={handleCopy}
            title="Copy summary"
            className="flex items-center gap-1.5 text-xs text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg transition-colors font-semibold shadow-2xs shrink-0"
          >
            {copied ? (
              <>
                <CheckCheck size={13} className="text-emerald-600" />
                <span className="text-emerald-700 font-semibold">Copied!</span>
              </>
            ) : (
              <>
                <Copy size={13} className="text-slate-500" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="p-5">
        {isLoading ? (
          <div className="flex items-center justify-center py-12 gap-3 text-slate-500">
            <Loader2 size={20} className="animate-spin text-blue-600" />
            <span className="text-sm font-medium">Generating clear summary with Gemini AI…</span>
          </div>
        ) : summary ? (
          <div className="space-y-1">{formatSummary(summary)}</div>
        ) : (
          <div className="text-center py-10 text-slate-400">
            <Sparkles size={28} className="mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-medium text-slate-500">No summary available yet.</p>
          </div>
        )}
      </div>

      {/* Disclaimer footer */}
      <div className="px-5 pb-5 pt-0">
        <DisclaimerBanner />
      </div>
    </div>
  );
}

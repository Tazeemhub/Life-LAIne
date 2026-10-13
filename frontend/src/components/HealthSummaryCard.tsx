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
          <h4 key={i} className="text-sm font-semibold text-cyan-300 mt-4 mb-1 first:mt-0">
            {line}
          </h4>
        );
      }
      // Bullet points
      if (line.trim().startsWith('•') || line.trim().startsWith('-')) {
        return (
          <p key={i} className="text-sm text-slate-300 pl-4 leading-relaxed">
            {line}
          </p>
        );
      }
      // Disclaimer line
      if (line.toLowerCase().includes('disclaimer')) {
        return (
          <p key={i} className="text-xs text-amber-300/80 italic mt-4 border-t border-amber-500/20 pt-3">
            {line}
          </p>
        );
      }
      if (!line.trim()) return <br key={i} />;
      return (
        <p key={i} className="text-sm text-slate-300 leading-relaxed">
          {line}
        </p>
      );
    });
  };

  return (
    <div className="glass rounded-2xl overflow-hidden border border-slate-800">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-900/40">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center shadow-md">
            <Bot size={16} className="text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-200">AI Health Summary</h3>
            <p className="text-xs text-slate-500 flex items-center gap-1">
              <Globe size={11} className="text-cyan-400" />
              <span>Language: {languageLabel(language)}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          {/* Language Selector */}
          <div className="flex items-center gap-1 bg-slate-800/80 p-0.5 rounded-xl border border-slate-700/60">
            {LANGUAGES.map((lang) => {
              const active = language === lang.code;
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => onLanguageChange?.(lang.code)}
                  disabled={isLoading}
                  className={`text-xs px-2.5 py-1 rounded-lg transition-all ${
                    active
                      ? 'bg-cyan-500/20 text-cyan-300 font-medium shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/40'
                  }`}
                >
                  {lang.label}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors px-3 py-1.5 rounded-xl hover:bg-slate-800 border border-slate-800 shrink-0"
          >
            {copied ? (
              <><CheckCheck size={13} className="text-green-400" /> Copied</>
            ) : (
              <><Copy size={13} /> Copy</>
            )}
          </button>
        </div>
      </div>

      {/* Summary Content */}
      <div className="p-5 space-y-1 relative min-h-[120px]">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-10 text-cyan-400 gap-2">
            <Loader2 size={24} className="animate-spin" />
            <p className="text-xs text-slate-400 flex items-center gap-1.5">
              <Sparkles size={13} className="text-cyan-400" />
              Translating and generating plain-language health summary…
            </p>
          </div>
        ) : (
          formatSummary(summary)
        )}
      </div>

      {/* Disclaimer */}
      <div className="p-4 pt-0">
        <DisclaimerBanner />
      </div>
    </div>
  );
}

function languageLabel(code: string): string {
  const map: Record<string, string> = { en: 'English', hi: 'Hindi (हिंदी)', te: 'Telugu (తెలుగు)', ta: 'Tamil (தமிழ்)' };
  return map[code] || 'English';
}

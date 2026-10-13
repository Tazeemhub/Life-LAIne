import React from 'react';
import { AlertTriangle } from 'lucide-react';

export default function DisclaimerBanner() {
  return (
    <div className="w-full bg-amber-50 border border-amber-200/90 rounded-xl p-4 flex gap-3 items-start shadow-xs">
      <AlertTriangle className="text-amber-600 mt-0.5 shrink-0" size={18} />
      <p className="text-amber-950 text-xs sm:text-sm leading-relaxed">
        <span className="font-bold text-amber-900">Medical Disclaimer: </span>
        This AI-generated content is for informational purposes only and is{' '}
        <strong className="font-semibold text-amber-950">not a substitute</strong> for professional medical advice, diagnosis, or treatment.
        Always consult your doctor or a qualified healthcare provider for any medical decisions.
      </p>
    </div>
  );
}

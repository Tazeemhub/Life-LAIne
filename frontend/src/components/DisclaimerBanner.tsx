import React from 'react';
import { AlertTriangle } from 'lucide-react';

export default function DisclaimerBanner() {
  return (
    <div className="w-full bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex gap-3 items-start">
      <AlertTriangle className="text-amber-400 mt-0.5 shrink-0" size={18} />
      <p className="text-amber-200/90 text-sm leading-relaxed">
        <span className="font-semibold text-amber-300">Medical Disclaimer: </span>
        This AI-generated content is for informational purposes only and is{' '}
        <strong>not a substitute</strong> for professional medical advice, diagnosis, or treatment.
        Always consult your doctor or a qualified healthcare provider for any health concerns.
      </p>
    </div>
  );
}

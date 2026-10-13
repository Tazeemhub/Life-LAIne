import React from 'react';
import type { ExtractedData } from '../lib/types';
import { cn, flagClass, flagLabel, normalizeFlag } from '../lib/utils';
import { Pill, FlaskConical, Stethoscope, AlertTriangle, Info } from 'lucide-react';

interface Props {
  extracted: ExtractedData;
}

function ConfidenceDot({ score }: { score: number }) {
  return (
    <span
      title={`Confidence: ${Math.round(score * 100)}%`}
      className={cn(
        'inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border',
        score >= 0.8
          ? 'text-green-400 bg-green-500/10 border-green-500/30'
          : score >= 0.6
          ? 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30'
          : 'text-red-400 bg-red-500/10 border-red-500/30'
      )}
    >
      {score < 0.6 && <AlertTriangle size={10} />}
      {Math.round(score * 100)}%
    </span>
  );
}

export default function ExtractedFieldsPanel({ extracted }: Props) {
  return (
    <div className="space-y-6">
      {/* Patient Info */}
      {extracted.patient_info && (
        <section>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Info size={12} /> Patient Information
          </h3>
          <div className="glass rounded-xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {extracted.patient_info.name && (
              <div>
                <p className="text-xs text-slate-500">Name</p>
                <p className="text-sm font-medium text-slate-200">{extracted.patient_info.name}</p>
              </div>
            )}
            {extracted.patient_info.age && (
              <div>
                <p className="text-xs text-slate-500">Age</p>
                <p className="text-sm font-medium text-slate-200">{extracted.patient_info.age}</p>
              </div>
            )}
            {extracted.patient_info.gender && (
              <div>
                <p className="text-xs text-slate-500">Gender</p>
                <p className="text-sm font-medium text-slate-200">{extracted.patient_info.gender}</p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Medications */}
      {extracted.medications && extracted.medications.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Pill size={12} className="text-purple-400" /> Medications ({extracted.medications.length})
          </h3>
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-sm">
              <thead className="bg-slate-900/60">
                <tr className="text-left text-xs text-slate-400 border-b border-slate-800">
                  <th scope="col" className="py-2.5 px-4">Medicine</th>
                  <th scope="col" className="py-2.5 px-4">Dosage</th>
                  <th scope="col" className="py-2.5 px-4">Frequency</th>
                  <th scope="col" className="py-2.5 px-4">Duration</th>
                  <th scope="col" className="py-2.5 px-4">Confidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {extracted.medications.map((med, i) => (
                  <tr key={i} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 font-medium text-slate-200">
                      <div>{med.name}</div>
                      {med.instructions && (
                        <div className="text-[11px] text-slate-500 mt-0.5">{med.instructions}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-300">{med.dosage || '—'}</td>
                    <td className="py-3 px-4 text-slate-300">{med.frequency || '—'}</td>
                    <td className="py-3 px-4 text-slate-400">{med.duration || '—'}</td>
                    <td className="py-3 px-4">
                      <ConfidenceDot score={med.confidence} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Lab Results */}
      {extracted.lab_results && extracted.lab_results.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <FlaskConical size={12} className="text-blue-400" /> Lab Results ({extracted.lab_results.length})
          </h3>
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-sm">
              <thead className="bg-slate-900/60">
                <tr className="text-left text-xs text-slate-400 border-b border-slate-800">
                  <th scope="col" className="py-2.5 px-4">Test</th>
                  <th scope="col" className="py-2.5 px-4">Value</th>
                  <th scope="col" className="py-2.5 px-4">Unit</th>
                  <th scope="col" className="py-2.5 px-4">Reference</th>
                  <th scope="col" className="py-2.5 px-4">Flag</th>
                  <th scope="col" className="py-2.5 px-4">Confidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {extracted.lab_results.map((lab, i) => {
                  const norm = normalizeFlag(lab.flag);
                  const isAbnormal = norm === 'H' || norm === 'HH' || norm === 'L' || norm === 'LL';
                  const isHigh = norm === 'H' || norm === 'HH';
                  const isLow = norm === 'L' || norm === 'LL';

                  return (
                    <tr key={i} className={cn(isAbnormal ? 'bg-red-500/5' : 'hover:bg-slate-800/30 transition-colors')}>
                      <td className="py-3 px-4 font-medium text-slate-200">{lab.test_name}</td>
                      <td className={cn('py-3 px-4 font-semibold', isHigh ? 'text-red-400 font-bold' : isLow ? 'text-blue-400 font-bold' : 'text-slate-200')}>
                        {lab.value || '—'}
                      </td>
                      <td className="py-3 px-4 text-slate-400">{lab.unit || '—'}</td>
                      <td className="py-3 px-4 text-slate-500 text-xs">{lab.reference_range || '—'}</td>
                      <td className="py-3 px-4">
                        {lab.flag ? (
                          <span className={cn('text-xs font-bold px-2 py-0.5 rounded border inline-flex items-center gap-1', flagClass(lab.flag))}>
                            {isAbnormal && <AlertTriangle size={10} />}
                            {flagLabel(lab.flag)}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="py-3 px-4">
                        <ConfidenceDot score={lab.confidence} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Diagnoses */}
      {extracted.diagnoses && extracted.diagnoses.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Stethoscope size={12} className="text-orange-400" /> Diagnoses
          </h3>
          <div className="flex flex-wrap gap-2">
            {extracted.diagnoses.map((diag, i) => (
              <div key={i} className="flex items-center gap-2 glass rounded-xl px-3 py-2 border border-slate-800">
                <span className="text-sm font-medium text-slate-200">{diag.name}</span>
                <ConfidenceDot score={diag.confidence} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Notes */}
      {extracted.notes && (
        <section>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Notes</h3>
          <p className="text-sm text-slate-300 glass rounded-xl p-3 border border-slate-800 leading-relaxed">
            {extracted.notes}
          </p>
        </section>
      )}
    </div>
  );
}

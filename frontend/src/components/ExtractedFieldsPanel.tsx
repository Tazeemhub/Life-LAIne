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
        'inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-semibold shadow-2xs',
        score >= 0.8
          ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
          : score >= 0.6
          ? 'text-amber-700 bg-amber-50 border-amber-200'
          : 'text-rose-700 bg-rose-50 border-rose-200'
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
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5 flex items-center gap-2">
            <Info size={13} className="text-blue-600" /> Patient Information
          </h3>
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-4">
            {extracted.patient_info.name && (
              <div>
                <p className="text-xs text-slate-500 font-medium">Name</p>
                <p className="text-sm font-bold text-slate-900 mt-0.5">{extracted.patient_info.name}</p>
              </div>
            )}
            {extracted.patient_info.age && (
              <div>
                <p className="text-xs text-slate-500 font-medium">Age</p>
                <p className="text-sm font-bold text-slate-900 mt-0.5">{extracted.patient_info.age}</p>
              </div>
            )}
            {extracted.patient_info.gender && (
              <div>
                <p className="text-xs text-slate-500 font-medium">Gender</p>
                <p className="text-sm font-bold text-slate-900 mt-0.5">{extracted.patient_info.gender}</p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Medications */}
      {extracted.medications && extracted.medications.length > 0 && (
        <section>
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5 flex items-center gap-2">
            <Pill size={13} className="text-purple-600" /> Prescribed Medications ({extracted.medications.length})
          </h3>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-xs">
            <table className="w-full text-sm">
              <thead className="bg-slate-50/80">
                <tr className="text-left text-xs text-slate-600 font-semibold border-b border-slate-200">
                  <th scope="col" className="py-2.5 px-4">Medicine</th>
                  <th scope="col" className="py-2.5 px-4">Dosage</th>
                  <th scope="col" className="py-2.5 px-4">Frequency</th>
                  <th scope="col" className="py-2.5 px-4">Duration</th>
                  <th scope="col" className="py-2.5 px-4">Confidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {extracted.medications.map((med, i) => (
                  <tr key={i} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      <div>{med.name}</div>
                      {med.instructions && (
                        <div className="text-[11px] text-slate-500 mt-0.5 font-normal">{med.instructions}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-800 font-medium">{med.dosage || '—'}</td>
                    <td className="py-3 px-4 text-slate-800 font-medium">{med.frequency || '—'}</td>
                    <td className="py-3 px-4 text-slate-600 font-medium">{med.duration || '—'}</td>
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
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5 flex items-center gap-2">
            <FlaskConical size={13} className="text-blue-600" /> Laboratory Biomarkers ({extracted.lab_results.length})
          </h3>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-xs">
            <table className="w-full text-sm">
              <thead className="bg-slate-50/80">
                <tr className="text-left text-xs text-slate-600 font-semibold border-b border-slate-200">
                  <th scope="col" className="py-2.5 px-4">Test Name</th>
                  <th scope="col" className="py-2.5 px-4">Value</th>
                  <th scope="col" className="py-2.5 px-4">Unit</th>
                  <th scope="col" className="py-2.5 px-4">Reference Range</th>
                  <th scope="col" className="py-2.5 px-4">Flag</th>
                  <th scope="col" className="py-2.5 px-4">Confidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {extracted.lab_results.map((lab, i) => {
                  const norm = normalizeFlag(lab.flag);
                  const isAbnormal = norm === 'H' || norm === 'HH' || norm === 'L' || norm === 'LL';
                  const isHigh = norm === 'H' || norm === 'HH';
                  const isLow = norm === 'L' || norm === 'LL';

                  return (
                    <tr key={i} className={cn(isAbnormal ? 'bg-rose-50/40' : 'hover:bg-slate-50/70 transition-colors')}>
                      <td className="py-3 px-4 font-bold text-slate-900">{lab.test_name}</td>
                      <td className={cn('py-3 px-4 font-bold', isHigh ? 'text-rose-700' : isLow ? 'text-blue-700' : 'text-slate-900')}>
                        {lab.value || '—'}
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-medium">{lab.unit || '—'}</td>
                      <td className="py-3 px-4 text-slate-500 text-xs font-mono">{lab.reference_range || '—'}</td>
                      <td className="py-3 px-4">
                        {lab.flag ? (
                          <span className={cn('text-xs font-bold px-2 py-0.5 rounded border inline-flex items-center gap-1 shadow-2xs', flagClass(lab.flag))}>
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
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5 flex items-center gap-2">
            <Stethoscope size={13} className="text-amber-600" /> Diagnoses & Clinical Findings
          </h3>
          <div className="flex flex-wrap gap-2">
            {extracted.diagnoses.map((diag, i) => (
              <div key={i} className="flex items-center gap-2 bg-white rounded-xl px-3.5 py-2 border border-slate-200 shadow-2xs">
                <span className="text-sm font-bold text-slate-900">{diag.name}</span>
                <ConfidenceDot score={diag.confidence} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Notes */}
      {extracted.notes && (
        <section>
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Clinical Notes</h3>
          <p className="text-sm text-slate-800 bg-white rounded-xl p-4 border border-slate-200 shadow-xs leading-relaxed">
            {extracted.notes}
          </p>
        </section>
      )}
    </div>
  );
}

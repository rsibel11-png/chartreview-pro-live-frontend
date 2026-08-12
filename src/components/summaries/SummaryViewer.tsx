// SummaryViewer.tsx — chartreview-native-frontend
// Ported: 2026-05-03 — CRA/TypeScript port, all shadcn/ui inlined

import React from "react";

// ── Inlined UI ────────────────────────────────────────────────────────────────
function Button({ children, onClick, className = "", variant = "default", size = "default" }: {
  children: React.ReactNode; onClick?: () => void; className?: string; variant?: string; size?: string;
}) {
  const base = "inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none disabled:opacity-50";
  const variants: any = {
    default: "bg-blue-600 text-white hover:bg-blue-700",
    outline: "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
    ghost: "bg-transparent hover:bg-slate-100 text-slate-700",
  };
  const sizes: any = { default: "px-4 py-2 text-sm", sm: "px-3 py-1.5 text-xs", icon: "p-1.5" };
  return (
    <button onClick={onClick}
      className={`${base} ${variants[variant] || variants.default} ${sizes[size] || sizes.default} ${className}`}>
      {children}
    </button>
  );
}

function Badge({ children, className = "", variant = "default" }: {
  children: React.ReactNode; className?: string; variant?: string;
}) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
      variant === 'outline' ? 'bg-white border-slate-300 text-slate-700' : 'bg-slate-100 border-transparent text-slate-700'
    } ${className}`}>{children}</span>
  );
}

function Separator() {
  return <hr className="border-t border-slate-200 my-4" />;
}

// ── Icon stubs ────────────────────────────────────────────────────────────────
const Download = ({ className = "" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
);
const Edit = ({ className = "" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);

// ── Component ─────────────────────────────────────────────────────────────────
interface SummaryViewerProps {
  summary: any;
  onClose: () => void;
  onEdit: () => void;
  onExport: () => void;
}

export default function SummaryViewer({ summary, onClose, onEdit, onExport }: SummaryViewerProps) {

  const formatDiagnoses = (diagnosisText: string) => {
    if (!diagnosisText) return null;
    const text = diagnosisText.trim();
    // Split only on newlines, then strip leading list markers ("1. " / "1) ")
    // CRITICAL: do NOT use \d+[.)] as a global split — it fragments ICD codes like S61.442D
    if (text.includes('\n')) {
      return text
        .split(/\r?\n/)
        .map((line: string) => line.replace(/^\d+[.)\]]\s+/, '').trim())
        .filter((d: string) => d.length > 0);
    }
    // Single line: strip a leading list number if present, return as single item
    return [text.replace(/^\d+[.)\]]\s+/, '').trim()].filter((d: string) => d.length > 0);
  };

  const sortedVisits: any[] = summary.visits
    ? [...summary.visits].sort((a: any, b: any) => {
        if (!a.visit_date) return 1;
        if (!b.visit_date) return -1;
        return new Date(a.visit_date).getTime() - new Date(b.visit_date).getTime();
      })
    : [];

  const formatLocalDate = (dateStr: string) => {
    if (!dateStr) return null;
    // Handle ISO format (YYYY-MM-DD) — parse and reformat
    const parts = dateStr.split('-').map(Number);
    if (parts.length === 3 && !isNaN(parts[0])) {
      return `${String(parts[1]).padStart(2, '0')}/${String(parts[2]).padStart(2, '0')}/${parts[0]}`;
    }
    // Already in MM/DD/YYYY or other format — return as-is
    return dateStr;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 bg-white rounded-xl shadow-xl w-full mx-4 overflow-y-auto"
        style={{ maxWidth: 900, maxHeight: '90vh' }}>

        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 z-10">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-900">Medical Summary</h2>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Edit className="w-4 h-4 mr-2" />Edit
              </Button>
              <Button variant="outline" size="sm" onClick={onExport}>
                <Download className="w-4 h-4 mr-2" />Export
              </Button>
              <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Header info */}
          <div className="bg-slate-50 p-4 rounded-lg">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-slate-600 font-medium">Patient</p>
                <p className="text-lg font-semibold text-slate-900">{summary.patient_name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600 font-medium">Case Number</p>
                <p className="text-lg font-semibold text-slate-900">{summary.case_number || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600 font-medium">Total Visits</p>
                <p className="text-lg font-semibold text-slate-900">{summary.visits?.length || 0}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600 font-medium">Status</p>
                <Badge variant="outline" className={
                  summary.status === 'finalized' ? 'bg-green-50 text-green-700 border-green-200'
                  : summary.status === 'reviewed' ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : 'bg-slate-50 text-slate-700 border-slate-200'
                }>{summary.status}</Badge>
              </div>
            </div>
          </div>

          <Separator />

          {/* Visits — narrative format matching export style */}
          <div className="space-y-6" style={{ fontFamily: 'Helvetica, Arial, sans-serif', fontSize: '11pt' }}>
            {sortedVisits.map((visit: any, index: number) => {
              const formattedDate = formatLocalDate(visit.visit_date);
              const diagnoses = formatDiagnoses(visit.impression_diagnosis);
              const hasMultipleDiagnoses = diagnoses && diagnoses.length > 1;

              return (
                <div key={index} className="space-y-2">
                  {/* pre_note */}
                  {visit.pre_note && (
                    <p className="text-slate-700 italic text-sm mb-2">{visit.pre_note}</p>
                  )}

                  {/* Main narrative row */}
                  <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 0, marginTop: index === 0 ? 0 : '18pt' }}>
                    <tbody>
                      <tr>
                        <td style={{ width: '120px', verticalAlign: 'top', paddingRight: 0 }}>
                          {formattedDate && <strong>{formattedDate}:</strong>}
                        </td>
                        <td style={{ verticalAlign: 'top', textAlign: 'left' }}>
                          <div className="text-slate-800 leading-relaxed">
                            {visit.practice_setting && <>{visit.practice_setting}. </>}
                            {visit.rendering_provider && <>{visit.rendering_provider}. </>}
                            {visit.hpi_summary && (
                              <>
                                <strong>HPI:</strong> {visit.hpi_summary}{' '}
                                {visit.injury_date && <>Injury Date: {formatLocalDate(visit.injury_date)}. </>}
                                {visit.pain_scale && <>Pain Scale: {visit.pain_scale}. </>}
                                {visit.symptom_progression && visit.symptom_progression !== 'not_documented' && (
                                  <>Symptom Progression: {visit.symptom_progression.charAt(0).toUpperCase() + visit.symptom_progression.slice(1)}. </>
                                )}
                              </>
                            )}
                            {visit.physical_exam_findings && (
                              <><strong>Physical Examination:</strong> {visit.physical_exam_findings}{' '}</>
                            )}
                            {visit.imaging_findings && (
                              <><strong>Imaging Findings:</strong> {visit.imaging_findings}{' '}</>
                            )}
                            {visit.lab_findings && visit.lab_findings.trim().length > 0 && (
                              <><strong>Laboratory Findings:</strong> {visit.lab_findings}</>
                            )}
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Diagnosis */}
                  {visit.impression_diagnosis && (
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '6pt' }}>
                      <tbody>
                        <tr>
                          <td style={{ width: '120px' }} />
                          <td style={{ verticalAlign: 'top', textAlign: 'left' }}>
                            <div className="text-slate-800 leading-relaxed">
                              <strong>Diagnosis:</strong>{' '}
                              {hasMultipleDiagnoses ? (
                                <ol className="list-decimal mt-1" style={{ margin: 0, paddingLeft: '20px' }}>
                                  {diagnoses!.map((diagnosis: string, idx: number) => (
                                    <li key={idx} style={{ marginBottom: '3pt' }}>{diagnosis}</li>
                                  ))}
                                </ol>
                              ) : (
                                <span>{diagnoses![0]}</span>
                              )}
                              {visit.icd10_codes && visit.icd10_codes.length > 0 && (
                                <span> (ICD-10: {visit.icd10_codes.join(', ')})</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  )}

                  {/* Treatment Plan */}
                  {visit.treatment_plan && (
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '18pt', marginTop: '6pt' }}>
                      <tbody>
                        <tr>
                          <td style={{ width: '120px' }} />
                          <td style={{ verticalAlign: 'top', textAlign: 'left' }}>
                            <div className="text-slate-800 leading-relaxed">
                              <strong>Treatment Plan:</strong> {visit.treatment_plan}
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  )}
                </div>
              );
            })}

            {(!summary.visits || summary.visits.length === 0) && (
              <div className="text-center py-8 text-slate-500">
                No visits recorded for this summary.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

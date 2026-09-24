// SummaryViewer.tsx — chartreview-native-frontend
// Ported: 2026-05-03 — CRA/TypeScript port, all shadcn/ui inlined
// Updated: 2026-09-19 — added a "View Record" split pane: each visit that carries
//   source_page + source_doc_id (set by generate_summary.js) gets a link that opens
//   the exact source PDF page in a right-hand pane, so the user can verify the
//   summary against the original record without leaving the viewer. Visits without
//   source page data (older summaries, or passes that don't emit it yet) simply have
//   no link — no behavior change for them.

import React, { useState, useRef } from "react";
import { getSessionToken } from "../../api/authSession";

// ── Env vars ──────────────────────────────────────────────────────────────────
const AWS_API_URL = process.env.REACT_APP_AWS_API_URL || "https://8nh214t0ai.execute-api.us-east-1.amazonaws.com/dev";
const ORG_ID      = process.env.REACT_APP_ORG_ID      || "69ceb1ab037acdd4467b31c3";

// ── AI-generated draft watermark (on-screen viewer ONLY) ─────────────────────
// A single large centered banner over the visible modal -- not a repeating tile.
// Plain text with a maxWidth lets the browser wrap it naturally, so no word is
// ever clipped (the earlier SVG-tile version could cut text off at tile edges).
// This is NOT part of the exported .docx: Export builds its own document from
// scratch in MedicalSummaries.tsx via the `docx` library (exportToWord()), which
// never renders this component or reads its styles -- so the watermark can never
// leak into the file a user downloads. Added 2026-09-24, redone 2026-09-24 per
// Roman's feedback (single centered banner, not tiled) per Roman's request.
const AI_WATERMARK_TEXT = 'AI-GENERATED DRAFT SUMMARY. THIS OUTPUT MAY CONTAIN ERRORS, OMISSIONS, OR INACCURACIES. INDEPENDENT REVIEW OF ORIGINAL SOURCE RECORDS IS REQUIRED PRIOR TO RELIANCE OR USE.';

// ── pdf.js loader (same pattern as EmrDetector/Library/Settings preview) ─────
declare global {
  interface Window {
    pdfjsLib: any;
    _crpPdfCache: any;
  }
}
let _pdfjs: any = null;
const _getPdfjs = () => new Promise((resolve, reject) => {
  if (_pdfjs) return resolve(_pdfjs);
  if (window.pdfjsLib) {
    _pdfjs = window.pdfjsLib;
    _pdfjs.GlobalWorkerOptions.workerSrc = "";
    return resolve(_pdfjs);
  }
  const script = document.createElement("script");
  script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
  script.onload = () => {
    _pdfjs = window.pdfjsLib;
    _pdfjs.GlobalWorkerOptions.workerSrc = "";
    resolve(_pdfjs);
  };
  script.onerror = () => reject(new Error("pdfjs failed to load"));
  document.head.appendChild(script);
});

// ── Inlined UI ────────────────────────────────────────────────────────────────
function Button({ children, onClick, className = "", variant = "default", size = "default", disabled = false }: {
  children: React.ReactNode; onClick?: () => void; className?: string; variant?: string; size?: string; disabled?: boolean;
}) {
  const base = "inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none disabled:opacity-50";
  const variants: any = {
    default: "bg-blue-600 text-white hover:bg-blue-700",
    outline: "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
    ghost: "bg-transparent hover:bg-slate-100 text-slate-700",
  };
  const sizes: any = { default: "px-4 py-2 text-sm", sm: "px-3 py-1.5 text-xs", icon: "p-1.5" };
  return (
    <button onClick={onClick} disabled={disabled}
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
const FileText = ({ className = "" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);
const ChevronLeft = ({ className = "" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
);
const ChevronRight = ({ className = "" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);
const Loader2 = ({ className = "" }) => (
  <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
);

// ── Record pane: renders one page of the source PDF for a "View Record" click ─
interface ActiveRecord { docId: string; page: number; label?: string; }

function RecordPane({ record, onClose, onPageChange, awsProxy }: {
  record: ActiveRecord; onClose: () => void; onPageChange: (page: number) => void; awsProxy: any;
}) {
  const [status, setStatus] = useState<"loading" | "done" | "error">("loading");
  const [errMsg, setErrMsg] = useState("");
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageSize, setPageSize] = useState<{ w: number; h: number } | null>(null);
  const [visiblePage, setVisiblePage] = useState(record.page);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const slotRefs = useRef<{ [page: number]: HTMLDivElement | null }>({});
  const canvasRefs = useRef<{ [page: number]: HTMLCanvasElement | null }>({});
  const renderedPages = useRef<Set<number>>(new Set());
  const pdfDocRef = useRef<any>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const renderPage = async (pageNum: number) => {
    if (!pdfDocRef.current || renderedPages.current.has(pageNum)) return;
    const canvas = canvasRefs.current[pageNum];
    if (!canvas) return;
    renderedPages.current.add(pageNum);
    try {
      const page = await pdfDocRef.current.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.4 });
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
    } catch {
      renderedPages.current.delete(pageNum);
    }
  };

  // Load the PDF + page count once per document.
  React.useEffect(() => {
    let cancelled = false;
    setStatus("loading"); setNumPages(null); setPageSize(null);
    renderedPages.current = new Set();
    pdfDocRef.current = null;
    (async () => {
      try {
        const pdfjsLib: any = await _getPdfjs();
        if (!window._crpPdfCache) window._crpPdfCache = {};
        let pdfDoc = window._crpPdfCache[record.docId];
        if (!pdfDoc) {
          const result = await awsProxy(`/documents/${record.docId}/download-url`, "GET");
          const url = result.url || result.download_url || result.signedUrl;
          if (!url) throw new Error("No PDF URL returned");
          pdfDoc = await pdfjsLib.getDocument(url).promise;
          window._crpPdfCache[record.docId] = pdfDoc;
        }
        if (cancelled) return;
        pdfDocRef.current = pdfDoc;
        const pageNum = Math.min(Math.max(1, record.page), pdfDoc.numPages);
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.4 });
        if (cancelled) return;
        setNumPages(pdfDoc.numPages);
        setPageSize({ w: viewport.width, h: viewport.height });
        setStatus("done");
      } catch (err: any) {
        if (!cancelled) {
          setStatus("error");
          setErrMsg(err && err.message ? err.message : "Failed to load document");
        }
      }
    })();
    return () => { cancelled = true; };
  }, [record.docId]);

  // Jump to the requested page whenever the caller changes it (new visit clicked, or arrow nav).
  React.useEffect(() => {
    if (!pageSize || !numPages) return;
    const target = Math.min(Math.max(1, record.page), numPages);
    slotRefs.current[target]?.scrollIntoView({ block: "start" });
    setVisiblePage(target);
  }, [record.docId, record.page, pageSize, numPages]);

  // Lazily render pages as they scroll into view; track which page is currently on screen.
  React.useEffect(() => {
    if (!pageSize || !numPages || !containerRef.current) return;
    const observer = new IntersectionObserver((entries) => {
      let best: { page: number; ratio: number } | null = null;
      entries.forEach((entry) => {
        const p = Number((entry.target as HTMLElement).dataset.page);
        if (entry.isIntersecting) {
          renderPage(p);
          if (!best || entry.intersectionRatio > best.ratio) best = { page: p, ratio: entry.intersectionRatio };
        }
      });
      if (best) setVisiblePage(best.page);
    }, { root: containerRef.current, rootMargin: "600px 0px", threshold: [0, 0.25, 0.5, 0.75, 1] });
    observerRef.current = observer;
    Object.values(slotRefs.current).forEach((el) => { if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, [pageSize, numPages]);

  const jumpTo = (pageNum: number) => {
    if (!numPages) return;
    const target = Math.min(Math.max(1, pageNum), numPages);
    slotRefs.current[target]?.scrollIntoView({ block: "start", behavior: "smooth" });
    onPageChange(target);
  };

  return (
    <div className="flex flex-col h-full border-l border-slate-200 bg-slate-50">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="w-4 h-4 text-slate-500 shrink-0" />
          <span className="text-sm font-medium text-slate-900 truncate">{record.label || "Source record"}</span>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
      </div>
      <div className="flex items-center justify-center gap-3 px-4 py-2 border-b border-slate-200 bg-white text-sm text-slate-600">
        <Button variant="outline" size="sm" disabled={visiblePage <= 1} onClick={() => jumpTo(visiblePage - 1)}>
          <ChevronLeft className="w-3.5 h-3.5" />
        </Button>
        <span>Page {visiblePage}{numPages ? ` of ${numPages}` : ""}</span>
        <Button variant="outline" size="sm" disabled={!!numPages && visiblePage >= numPages} onClick={() => jumpTo(visiblePage + 1)}>
          <ChevronRight className="w-3.5 h-3.5" />
        </Button>
      </div>
      <div ref={containerRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {status === "error" ? (
          <span className="text-sm text-red-600 p-4 text-center block">{errMsg}</span>
        ) : status === "loading" ? (
          <span className="flex items-center gap-2 text-sm text-slate-400 mt-8 justify-center"><Loader2 className="w-4 h-4" /> Loading document…</span>
        ) : (
          Array.from({ length: numPages || 0 }, (_, i) => i + 1).map((pageNum) => (
            <div key={pageNum}
              ref={(el) => { slotRefs.current[pageNum] = el; if (el && observerRef.current) observerRef.current.observe(el); }}
              data-page={pageNum}
              className="mx-auto bg-white shadow-sm" style={{ width: pageSize!.w, maxWidth: '100%' }}>
              <canvas ref={(el) => { canvasRefs.current[pageNum] = el; }}
                style={{ width: '100%', aspectRatio: `${pageSize!.w} / ${pageSize!.h}`, display: 'block' }} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────
interface SummaryViewerProps {
  summary: any;
  onClose: () => void;
  onEdit: () => void;
  onExport: () => void;
  idToken?: string;
  cognitoUser?: any;
}

export default function SummaryViewer({ summary, onClose, onEdit, onExport, idToken, cognitoUser }: SummaryViewerProps) {
  const [activeRecord, setActiveRecord] = useState<ActiveRecord | null>(null);

  const awsProxy = async (path: string, method = "GET", data?: any): Promise<any> => {
    const url = `${AWS_API_URL}${path}`;
    const token: string = await getSessionToken(cognitoUser, idToken);
    const opts: any = {
      method,
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}`, "x-org-id": ORG_ID },
    };
    if (data !== undefined) opts.body = JSON.stringify(data);
    const res = await fetch(url, opts);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || `awsProxy ${method} ${path} failed: ${res.status}`);
    return json;
  };

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
      <div className="relative z-10 bg-white rounded-xl shadow-xl w-full mx-4 flex flex-col overflow-hidden"
        style={{ maxWidth: activeRecord ? 1600 : 900, maxHeight: '90vh', height: activeRecord ? '90vh' : undefined }}>

        {/* AI-generated draft watermark — single centered banner, on-screen viewer ONLY (see const above) */}
        <div aria-hidden="true" className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none overflow-hidden select-none">
          <div style={{
            transform: 'rotate(-28deg)',
            color: 'rgba(185,28,28,0.18)',
            fontFamily: 'Arial, sans-serif',
            fontWeight: 700,
            fontSize: '20px',
            lineHeight: 1.5,
            textAlign: 'center',
            letterSpacing: '0.3px',
            maxWidth: '460px',
            whiteSpace: 'normal',
          }}>
            {AI_WATERMARK_TEXT}
          </div>
        </div>

        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-6 py-4 shrink-0">
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

        {/* Body: narrative column + optional record pane, side by side */}
        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-6" style={{ minWidth: activeRecord ? 420 : undefined }}>
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
                const hasSourcePage = !!(visit.source_page && visit.source_doc_id);
                const isActiveRecord = !!activeRecord && activeRecord.docId === visit.source_doc_id && activeRecord.page === visit.source_page;

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

                    {/* View Record — only shown when this visit carries page-level source data.
                        Extra block after the narrative; own spacing so it never reduces the
                        18pt gap the narrative sections already provide before the next visit. */}
                    {hasSourcePage && (
                      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '4pt', marginBottom: '10pt' }}>
                        <tbody>
                          <tr>
                            <td style={{ width: '120px' }} />
                            <td style={{ verticalAlign: 'top', textAlign: 'left' }}>
                              <button
                                onClick={() => setActiveRecord({ docId: visit.source_doc_id, page: visit.source_page, label: visit.source_part_label || visit.practice_setting })}
                                className={`text-xs font-medium ${isActiveRecord ? 'text-blue-800 underline' : 'text-blue-600 hover:underline'}`}
                              >
                                View Record →
                              </button>
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

          {activeRecord && (
            <div className="flex-1" style={{ minWidth: 420 }}>
              <RecordPane
                record={activeRecord}
                onClose={() => setActiveRecord(null)}
                onPageChange={(page: number) => setActiveRecord((prev) => prev ? { ...prev, page } : prev)}
                awsProxy={awsProxy}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

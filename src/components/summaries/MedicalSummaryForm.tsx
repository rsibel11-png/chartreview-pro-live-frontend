// MedicalSummaryForm.tsx
// Updated: 2026-08-30 — Ported MacroPicker from original Base44 app, wired into IME/Chart Review/Pre-Visit/Physical Exam fields
// Updated: 2026-07-22 — sync visit_count to visits.length on every save so library card stays accurate after PT/OT consolidation (keep first & last per facility) — chartreview-native-frontend
// Ported: 2026-05-03 — CRA/TypeScript, all shadcn/ui inlined, DuplicateVisitDetector/PTConsolidationHelper stripped
// MacroPicker restored: 2026-08-30 (adapted for localStorage)
// awsProxy rewired to direct fetch (no Base44 relay)

import React, { useState, useEffect } from "react";
import DuplicateVisitDetector from "./DuplicateVisitDetector";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import MacroPicker from "./MacroPicker";
// Updated: 2026-09-12 — silent Cognito session refresh (fixes long-edit save timeouts)
import { getSessionToken } from "../../api/authSession";
import toast from "react-hot-toast";

// ── Env vars ──────────────────────────────────────────────────────────────────
const AWS_API_URL = process.env.REACT_APP_AWS_API_URL || "";
const ORG_ID      = process.env.REACT_APP_ORG_ID      || "";
const API_KEY     = process.env.REACT_APP_AWS_API_KEY  || "";

// ── Constants ─────────────────────────────────────────────────────────────────
const STRING_VISIT_FIELDS = [
  'visit_date','rendering_provider','practice_setting','chief_complaint','hpi_summary',
  'injury_date','pain_scale','symptom_progression','physical_exam_findings',
  'imaging_findings','lab_findings','impression_diagnosis','treatment_plan'
];
const VALID_PROGRESSIONS = ['improved','same','worse','not_documented'];

// ── PT/OT detection helpers ───────────────────────────────────────────────────
function isPtOtVisit(visit: any): boolean {
  const setting = (visit.practice_setting || '').toLowerCase();
  const provider = (visit.rendering_provider || '').toLowerCase();
  if (/physical therapy|physiotherapy|rehabilitation|rehab|hand therapy|occupational therapy/.test(setting)) return true;
  if (/\b(PT|PTA|DPT|OT|COTA|CLT)\b/i.test(provider) && !/\b(MD|DO|PA|NP|FNP|APRN|DC|DMD|DPM)\b/i.test(provider)) return true;
  if (/\btherapy\b|\brehabilitation\b/.test(setting) && !/pain management|spine|orthopedic|medical center|hospital/.test(setting)) return true;
  return false;
}

function normFacility(f: string): string {
  return (f || '').toLowerCase().trim()
    .replace(/\s*[-\u2013\u2014]\s*(blue diamond|lake mead|nw|ne|se|sw|north|south|east|west|suite|ste|bldg|building|floor|fl|\d+).*$/i, '')
    .replace(/\s*[-\u2013\u2014]\s*[a-z0-9 ]{1,30}$/i, '')
    .replace(/\s*\(.*?\)\s*$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// ── PT/OT Consolidation Panel component ──────────────────────────────────────
function PtConsolidatePanel({ groups, onConfirm, onCancel }: {
  groups: { [key: string]: { facility: string; indices: number[]; dates: string[] } };
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const groupEntries = Object.entries(groups);
  if (groupEntries.length === 0) {
    return <div className="p-3 bg-slate-50 rounded-md text-sm text-slate-600">No PT/OT visits found in this summary.</div>;
  }
  const rowData = groupEntries.map(([key, group]: [string, any]) => {
    const count: number = (group.indices as number[]).length;
    const willRemove: number = count > 2 ? count - 2 : 0;
    const dateRange: string[] = (group.dates as string[]).filter(Boolean).sort();
    return { key, facility: group.facility as string, count, willRemove, dateRange };
  });
  const totalToRemove: number = rowData.reduce((acc: number, r: any) => acc + (r.willRemove as number), 0);
  return (
    <div className="p-3 bg-blue-50 border border-blue-200 rounded-md space-y-2">
      <p className="text-sm font-medium text-slate-700">PT/OT Consolidation — keep first &amp; last visit per facility:</p>
      {rowData.map((r: any) => (
        <div key={r.key as string} className="flex items-center justify-between text-sm">
          <span className="text-slate-700">
            {r.facility as string} ({r.count as number} visits{(r.dateRange as string[]).length > 0 ? `, ${(r.dateRange as string[])[0]} – ${(r.dateRange as string[])[(r.dateRange as string[]).length - 1]}` : ''})
          </span>
          {(r.willRemove as number) > 0 && <span className="text-orange-600 font-medium">{r.willRemove as number} will be removed</span>}
          {(r.willRemove as number) === 0 && <span className="text-green-600">Already minimal</span>}
        </div>
      ))}
      {totalToRemove > 0 && (
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onCancel}
            className="inline-flex items-center justify-center rounded-md font-medium px-3 py-1.5 text-xs border border-slate-300 bg-white text-slate-700 hover:bg-slate-50">
            Cancel
          </button>
          <button type="button" onClick={onConfirm}
            className="inline-flex items-center justify-center rounded-md font-medium px-3 py-1.5 text-xs bg-blue-600 text-white hover:bg-blue-700">
            Remove {totalToRemove} middle visit{totalToRemove > 1 ? 's' : ''}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function sanitizeSummary(s: any) {
  const cleanVisits = (s.visits || []).map((visit: any) => {
      const clean: any = { ...visit };
      STRING_VISIT_FIELDS.forEach((field: string) => {
        const val = clean[field];
        if (val === null || val === undefined || val === false) clean[field] = '';
        else if (typeof val === 'object') clean[field] = JSON.stringify(val);
        else if (typeof val !== 'string') clean[field] = String(val);
      });
      if (!Array.isArray(clean.icd10_codes)) clean.icd10_codes = [];
      if (!VALID_PROGRESSIONS.includes(clean.symptom_progression)) clean.symptom_progression = 'not_documented';
      return clean;
    });
  return {
    ...s,
    visits: cleanVisits,
    visit_count: cleanVisits.length,  // always sync visit_count to actual array length on save
  };
}

// ── Inlined UI primitives ─────────────────────────────────────────────────────
function Button({ children, onClick, disabled, className = "", variant = "default", size = "default", type = "button" }: {
  children: React.ReactNode; onClick?: (e?: any) => void; disabled?: boolean;
  className?: string; variant?: string; size?: string; type?: "button" | "submit";
}) {
  const base = "inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none disabled:opacity-50 disabled:pointer-events-none";
  const variants: any = {
    default: "bg-blue-600 text-white hover:bg-blue-700",
    outline: "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
    ghost: "bg-transparent hover:bg-slate-100 text-slate-700",
    destructive: "bg-red-600 text-white hover:bg-red-700",
  };
  const sizes: any = { default: "px-4 py-2 text-sm", sm: "px-3 py-1.5 text-xs", icon: "p-1.5" };
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      className={`${base} ${variants[variant] || variants.default} ${sizes[size] || sizes.default} ${className}`}>
      {children}
    </button>
  );
}

function Input({ id, value, onChange, placeholder = "", type = "text", list }: {
  id?: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string; type?: string; list?: string;
}) {
  return (
    <input id={id} type={type} value={value} onChange={onChange} placeholder={placeholder}
      list={list}
      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
    />
  );
}

function Textarea({ value, onChange, placeholder = "", rows = 3 }: {
  value: string; onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string; rows?: number;
}) {
  return (
    <textarea value={value} onChange={onChange} placeholder={placeholder} rows={rows}
      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
    />
  );
}

function Label({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-700 mb-1">{children}</label>;
}

function Select({ value, onValueChange, children }: {
  value: string; onValueChange: (v: string) => void; children: React.ReactNode;
}) {
  return (
    <select value={value} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onValueChange(e.target.value)}
      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
      {children}
    </select>
  );
}

function SelectOption({ value, children }: { value: string; children: React.ReactNode }) {
  return <option value={value}>{children}</option>;
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-white rounded-xl border border-slate-200 shadow-sm ${className}`}>{children}</div>;
}
function CardContent({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`p-6 ${className}`}>{children}</div>;
}
function CardHeader({ children, className = "", onClick }: {
  children: React.ReactNode; className?: string; onClick?: () => void;
}) {
  return <div className={`px-6 py-4 border-b border-slate-100 ${className}`} onClick={onClick}>{children}</div>;
}
function CardTitle({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <h3 className={`font-semibold text-slate-900 ${className}`}>{children}</h3>;
}

function Badge({ children, variant = "default", className = "" }: {
  children: React.ReactNode; variant?: string; className?: string;
}) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
      variant === 'outline' ? 'bg-white border-slate-300 text-slate-700' : 'bg-slate-100 border-transparent text-slate-700'
    } ${className}`}>{children}</span>
  );
}

function Separator() { return <hr className="border-t border-slate-200 my-4" />; }

// ── Icons ─────────────────────────────────────────────────────────────────────
const Save = ({ className = "" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
  </svg>
);
const Plus = ({ className = "" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);
const Trash2 = ({ className = "" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);
const Maximize2 = ({ className = "" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
  </svg>
);
const Minimize2 = ({ className = "" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v6H3M15 21v-6h6M3 9l6-6M15 15l6 6" />
  </svg>
);

// ── pdf.js loader (same pattern as EmrDetector/SummaryViewer) — View Record ──
// Updated: 2026-09-19 — added "View Record" split pane: a visit that carries
// source_page + source_doc_id (set by generate_summary.js) gets a link that opens
// the exact source PDF page in a right-hand pane. Visits without that data (older
// summaries, or passes that don't emit it) simply have no link — no behavior change.
declare global {
  interface Window {
    pdfjsLib: any;
    _crpPdfCache: any;
  }
}
let _msfPdfjs: any = null;
const _getMsfPdfjs = () => new Promise((resolve, reject) => {
  if (_msfPdfjs) return resolve(_msfPdfjs);
  if (window.pdfjsLib) {
    _msfPdfjs = window.pdfjsLib;
    _msfPdfjs.GlobalWorkerOptions.workerSrc = "";
    return resolve(_msfPdfjs);
  }
  const script = document.createElement("script");
  script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
  script.onload = () => {
    _msfPdfjs = window.pdfjsLib;
    _msfPdfjs.GlobalWorkerOptions.workerSrc = "";
    resolve(_msfPdfjs);
  };
  script.onerror = () => reject(new Error("pdfjs failed to load"));
  document.head.appendChild(script);
});

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
const Loader2Icon = ({ className = "" }) => (
  <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
);

interface ActiveRecord { docId: string; page: number; label?: string; }

function RecordPane({ record, onClose, onPageChange, awsProxy }: {
  record: ActiveRecord; onClose: () => void; onPageChange: (page: number) => void; awsProxy: any;
}) {
  const [status, setStatus] = useState<"loading" | "done" | "error">("loading");
  const [errMsg, setErrMsg] = useState("");
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageSize, setPageSize] = useState<{ w: number; h: number } | null>(null);
  const [visiblePage, setVisiblePage] = useState(record.page);
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const slotRefs = React.useRef<{ [page: number]: HTMLDivElement | null }>({});
  const canvasRefs = React.useRef<{ [page: number]: HTMLCanvasElement | null }>({});
  const renderedPages = React.useRef<Set<number>>(new Set());
  const pdfDocRef = React.useRef<any>(null);
  const observerRef = React.useRef<IntersectionObserver | null>(null);

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
  useEffect(() => {
    let cancelled = false;
    setStatus("loading"); setNumPages(null); setPageSize(null);
    renderedPages.current = new Set();
    pdfDocRef.current = null;
    (async () => {
      try {
        const pdfjsLib: any = await _getMsfPdfjs();
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
  useEffect(() => {
    if (!pageSize || !numPages) return;
    const target = Math.min(Math.max(1, record.page), numPages);
    slotRefs.current[target]?.scrollIntoView({ block: "start" });
    setVisiblePage(target);
  }, [record.docId, record.page, pageSize, numPages]);

  // Lazily render pages as they scroll into view; track which page is currently on screen.
  useEffect(() => {
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
          <span className="flex items-center gap-2 text-sm text-slate-400 mt-8 justify-center"><Loader2Icon className="w-4 h-4" /> Loading document…</span>
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
interface MedicalSummaryFormProps {
  summary: any;
  onClose: () => void;
  onSave: () => void;
  idToken?: string;
  cognitoUser?: any;
}

export default function MedicalSummaryForm({ summary, onClose, onSave, idToken, cognitoUser }: MedicalSummaryFormProps) {
  // ── AWS proxy ───────────────────────────────────────────────────────────────
  const awsProxy = async (path: string, method = "GET", data?: any): Promise<any> => {
    const opts: any = {
      method,
      "x-api-key": API_KEY,
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${await getSessionToken(cognitoUser, idToken)}`, "x-org-id": ORG_ID },
    };
    if (data !== undefined) opts.body = JSON.stringify(data);
    const res = await fetch(`${AWS_API_URL}${path}`, opts);
    const json = await res.json();
    if (res.status === 401) throw new Error('Your login session expired — log in again, then re-save. Your edits are still on screen (do not refresh).');
    if (!res.ok) throw new Error(json.error || `awsProxy ${method} ${path} failed: ${res.status}`);
    return json;
  };

  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<any>(() => sanitizeSummary(summary));
  const [expandedVisit, setExpandedVisit] = useState(0);
  const [activeRecord, setActiveRecord] = useState<ActiveRecord | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [pendingVisitIndex, setPendingVisitIndex] = useState<number | null>(null);
  const [providerPracticeMap, setProviderPracticeMap] = useState<any>({});
  const [icd10Input, setIcd10Input] = useState<any>({});

  const summaryId = summary.aws_summary_id || summary.id;

  // ── Fetch all summaries to build provider → practice map ─────────────────
  const { data: allSummaries = [] } = useQuery({
    queryKey: ['aws-all-summaries-for-rules'],
    queryFn: async () => {
      const res = await awsProxy("/summaries", "GET");
      if (Array.isArray(res)) return res;
      if (Array.isArray(res?.summaries)) return res.summaries;
      if (Array.isArray(res?.items)) return res.items;
      return [];
    },
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  });

  useEffect(() => {
    const frequencyMap: any = {};
    (allSummaries as any[]).forEach((s: any) => {
      (s.visits || []).forEach((visit: any) => {
        if (visit.rendering_provider && visit.practice_setting) {
          const provider = visit.rendering_provider.trim();
          if (!frequencyMap[provider]) frequencyMap[provider] = {};
          const setting = visit.practice_setting.trim();
          frequencyMap[provider][setting] = (frequencyMap[provider][setting] || 0) + 1;
        }
      });
    });
    const providerMap: any = {};
    Object.keys(frequencyMap).forEach((provider: string) => {
      const settings = frequencyMap[provider];
      providerMap[provider] = Object.keys(settings).reduce((a: string, b: string) =>
        settings[a] > settings[b] ? a : b
      );
    });
    setProviderPracticeMap(providerMap);
  }, [allSummaries]);

  // ── Save mutation ─────────────────────────────────────────────────────────
  const updateMutation = useMutation({
    mutationFn: (data: any) => awsProxy(`/summaries/${summaryId}`, "PUT", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aws-summaries'] });
      queryClient.invalidateQueries({ queryKey: ['aws-all-summaries-for-rules'] });
      onSave();
    },
    // Updated: 2026-09-12 — save failures were silently swallowed (no onError), so an
    // expired session made Save do nothing visible. Surface the error now.
    onError: (err: any) => {
      toast.error(err && err.message ? err.message : 'Failed to save summary');
    },
  });

  const handleSave = () => {
    let dataToSave = formData;
    if (pendingVisitIndex !== null && formData.visits && formData.visits[pendingVisitIndex]) {
      const { nextVisits } = placeVisitAtIndex(formData.visits, pendingVisitIndex);
      dataToSave = { ...formData, visits: nextVisits };
    }
    updateMutation.mutate(sanitizeSummary(dataToSave));
  };

  const updateVisit = (index: number, field: string, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      visits: prev.visits.map((visit: any, i: number) =>
        i === index ? { ...visit, [field]: value } : visit
      )
    }));
  };

  // Given the full visits array and the index of one visit, returns that array
  // with the visit relocated to its correct chronological slot (dated visits sorted
  // ascending; visits with no date yet stay at the bottom, in their current relative
  // order). Used to place a manually-added visit once the user is done editing it —
  // "Visit N" numbers are derived from array position (see the Visit {index+1}
  // header below), so relocating it automatically renumbers everything after it.
  // Other visits are left exactly as they are; only the target visit moves.
  const placeVisitAtIndex = (visits: any[], index: number): { nextVisits: any[]; newIndex: number } => {
    const visit = visits[index];
    const others = visits.filter((_: any, i: number) => i !== index);
    const dated = others.filter((v: any) => v.visit_date);
    const undated = others.filter((v: any) => !v.visit_date);
    let nextVisits: any[];
    if (visit.visit_date) {
      let insertAt = dated.findIndex((v: any) => (v.visit_date as string).localeCompare(visit.visit_date) > 0);
      if (insertAt === -1) insertAt = dated.length;
      nextVisits = [...dated.slice(0, insertAt), visit, ...dated.slice(insertAt), ...undated];
    } else {
      nextVisits = [...dated, ...undated, visit];
    }
    return { nextVisits, newIndex: nextVisits.indexOf(visit) };
  };

  const placeNewVisit = () => {
    if (pendingVisitIndex === null || !formData.visits || !formData.visits[pendingVisitIndex]) return;
    const { nextVisits, newIndex } = placeVisitAtIndex(formData.visits, pendingVisitIndex);
    setFormData((prev: any) => ({ ...prev, visits: nextVisits }));
    setExpandedVisit(newIndex);
    setPendingVisitIndex(null);
  };

  const handleProviderChange = (index: number, providerName: string) => {
    updateVisit(index, 'rendering_provider', providerName);
    const trimmedProvider = providerName.trim();
    if (providerPracticeMap[trimmedProvider] && !formData.visits[index].practice_setting) {
      updateVisit(index, 'practice_setting', providerPracticeMap[trimmedProvider]);
    }
  };

  const addVisit = () => {
    const newIndex = (formData.visits || []).length;
    setFormData((prev: any) => ({
      ...prev,
      visits: [...(prev.visits || []), {
        visit_date: '', rendering_provider: '', practice_setting: '',
        chief_complaint: '', hpi_summary: '', injury_date: '', pain_scale: '',
        symptom_progression: 'not_documented', physical_exam_findings: '',
        imaging_findings: '', lab_findings: '', impression_diagnosis: '',
        icd10_codes: [], treatment_plan: ''
      }]
    }));
    setExpandedVisit(newIndex);
    setPendingVisitIndex(newIndex);
  };

  const isC4Visit = (visit: any): boolean => {
    const fields = [visit.chief_complaint, visit.hpi_summary, visit.practice_setting, visit.rendering_provider, visit.impression_diagnosis, visit.treatment_plan];
    return fields.some((f: any) => f && /c-?4\b/i.test(f));
  };

  const handleDuplicateAction = (action: string, visitIndices: number[]) => {
    // Updated: 2026-09-07 — reorder-date: user-arranged same-day visit order.
    // visitIndices = the visits-array indices for ONE date, in the NEW order.
    // Rebuild the array so that date's visits occupy their same positions but in
    // the user's chosen order; every other visit is untouched. sanitizeSummary and
    // the docx export preserve array order, so the custom order persists.
    if (action === "reorder-date") {
      const order = Array.isArray(visitIndices) ? visitIndices : [];
      if (!order.length) return;
      setFormData((prev: any) => {
        const prevVisits: any[] = Array.isArray(prev.visits) ? prev.visits : [];
        const date = ((prevVisits[order[0]] || {}) as any).visit_date;
        if (!date) return prev;
        const positions = prevVisits
          .map((v: any, i: number) => (v && v.visit_date === date ? i : -1))
          .filter((i: number) => i >= 0);
        if (positions.length !== order.length) return prev;
        const reordered = order.map((i: number) => prevVisits[i]);
        const newVisits = [...prevVisits];
        positions.forEach((pos: number, k: number) => {
          newVisits[pos] = reordered[k];
        });
        return { ...prev, visits: newVisits };
      });
      return;
    }
    if (action === "delete-selected") {
      const indicesToDelete = new Set<number>(visitIndices);
      setFormData((prev: any) => {
        // If a C-4 visit is being deleted and a same-date non-C-4 survives, merge C-4 content in
        const mergeMap: Record<number, any[]> = {};
        (Array.isArray(prev.visits) ? prev.visits : []).forEach((visit: any, i: number) => {
          if (!indicesToDelete.has(i)) return;
          if (!isC4Visit(visit)) return;
          const survivingIdx = prev.visits.findIndex((v: any, j: number) =>
            !indicesToDelete.has(j) && v.visit_date === visit.visit_date
          );
          if (survivingIdx === -1) return;
          if (!mergeMap[survivingIdx]) mergeMap[survivingIdx] = [];
          mergeMap[survivingIdx].push(visit);
        });

        const newVisits = (Array.isArray(prev.visits) ? prev.visits : [])
          .map((visit: any, i: number) => {
            if (!mergeMap[i]) return visit;
            let merged = { ...visit };
            mergeMap[i].forEach((c4: any) => {
              const append = (field: string, sep = "\n") => {
                if (c4[field] && !merged[field]?.includes(c4[field])) {
                  merged[field] = merged[field]
                    ? `${merged[field]}${sep}[C-4] ${c4[field]}`
                    : `[C-4] ${c4[field]}`;
                }
              };
              append("chief_complaint");
              append("hpi_summary");
              append("impression_diagnosis");
              append("treatment_plan");
            });
            return merged;
          })
          .filter((_: any, i: number) => !indicesToDelete.has(i));

        return { ...prev, visits: newVisits };
      });
      setExpandedVisit(-1);
    }
  };

  const removeVisit = (index: number) => {
    setFormData((prev: any) => ({
      ...prev,
      visits: prev.visits.filter((_: any, i: number) => i !== index)
    }));
    if (expandedVisit >= (formData.visits?.length || 0) - 1) {
      setExpandedVisit(Math.max(0, expandedVisit - 1));
    }
    // Keep the "pending placement" pointer correct as indices shift.
    if (pendingVisitIndex !== null) {
      if (index === pendingVisitIndex) setPendingVisitIndex(null);
      else if (index < pendingVisitIndex) setPendingVisitIndex(pendingVisitIndex - 1);
    }
  };

  const uniqueProviders: string[] = Array.from(new Set<string>(
    (formData.visits || []).map((v: any) => v.rendering_provider).filter(Boolean)
  ));

  const addIcd10 = (index: number) => {
    const code = (icd10Input[index] || '').trim().toUpperCase();
    if (!code) return;
    const current: string[] = formData.visits[index].icd10_codes || [];
    if (!current.includes(code)) updateVisit(index, 'icd10_codes', [...current, code]);
    setIcd10Input((prev: any) => ({ ...prev, [index]: '' }));
  };

  const removeIcd10 = (visitIndex: number, code: string) => {
    const current: string[] = formData.visits[visitIndex].icd10_codes || [];
    updateVisit(visitIndex, 'icd10_codes', current.filter((c: string) => c !== code));
  };

  // ── PT/OT Consolidation state + logic ───────────────────────────────────────
  const [showPtConsolidate, setShowPtConsolidate] = useState<boolean>(false);

  const getPtOtGroups = (): { [key: string]: { facility: string; indices: number[]; dates: string[] } } => {
    const visits: any[] = formData.visits || [];
    const groups: { [key: string]: { facility: string; indices: number[]; dates: string[] } } = {};
    visits.forEach((visit: any, i: number) => {
      if (!isPtOtVisit(visit)) return;
      const key = normFacility(visit.practice_setting || visit.rendering_provider || 'pt');
      if (!groups[key]) groups[key] = { facility: visit.practice_setting || 'Physical Therapy', indices: [], dates: [] };
      groups[key].indices.push(i);
      groups[key].dates.push(visit.visit_date || '');
    });
    return groups;
  };

  const consolidatePtOt = () => {
    const groups = getPtOtGroups();
    const indicesToRemove = new Set<number>();
    Object.values(groups).forEach((group: any) => {
      if ((group.indices as number[]).length <= 2) return;
      const sorted = (group.indices as number[])
        .map((idx: number, i: number) => ({ idx, date: (group.dates as string[])[i] }))
        .sort((a: any, b: any) => ((a.date as string) || '').localeCompare((b.date as string) || ''));
      const firstIdx: number = sorted[0].idx as number;
      const lastIdx: number = sorted[sorted.length - 1].idx as number;
      (group.indices as number[]).forEach((idx: number) => {
        if (idx !== firstIdx && idx !== lastIdx) indicesToRemove.add(idx);
      });
    });
    if (indicesToRemove.size === 0) { setShowPtConsolidate(false); return; }
    setFormData((prev: any) => ({
      ...prev,
      visits: (prev.visits as any[]).filter((_: any, i: number) => !indicesToRemove.has(i))
    }));
    setExpandedVisit(-1);
    setShowPtConsolidate(false);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className={`relative z-10 bg-white shadow-xl w-full flex flex-col overflow-hidden ${isFullscreen ? '' : 'rounded-xl mx-4'}`}
        style={isFullscreen
          ? { maxWidth: '100vw', width: '100vw', height: '100vh', maxHeight: '100vh' }
          : { maxWidth: activeRecord ? 1600 : 900, maxHeight: '92vh', height: activeRecord ? '92vh' : undefined }}>

        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-6 py-4 shrink-0 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">
            Edit Summary — {formData.patient_name || 'Patient'}
          </h2>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={() => setIsFullscreen(!isFullscreen)}>
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </Button>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} disabled={updateMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white">
              <Save className="w-4 h-4 mr-2" />
              {updateMutation.isPending ? 'Saving...' : 'Save Summary'}
            </Button>
          </div>
        </div>

        {/* Body: form column + optional record pane, side by side */}
        <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-y-auto" style={{ minWidth: activeRecord ? 420 : undefined }}>
        <div className="p-6 space-y-6">

          {/* Patient Info */}
          <Card>
            <CardHeader><CardTitle className="text-lg">Patient Information</CardTitle></CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="patient_name">Patient Name</Label>
                  <Input id="patient_name" value={formData.patient_name || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData((prev: any) => ({ ...prev, patient_name: e.target.value }))} />
                </div>
                <div>
                  <Label htmlFor="case_number">Case Number</Label>
                  <Input id="case_number" value={formData.case_number || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData((prev: any) => ({ ...prev, case_number: e.target.value }))} />
                </div>
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status || 'draft'}
                  onValueChange={(value: string) => setFormData((prev: any) => ({ ...prev, status: value }))}>
                  <SelectOption value="draft">Draft</SelectOption>
                  <SelectOption value="reviewed">Reviewed</SelectOption>
                  <SelectOption value="finalized">Finalized</SelectOption>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* IME Note */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">INDEPENDENT MEDICAL EXAMINATION
                <span className="text-sm font-normal text-slate-500 ml-2">(bold centered section header in export)</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <Textarea placeholder="Independent medical examination header text..."
                value={formData.ime_note || ''}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData((prev: any) => ({ ...prev, ime_note: e.target.value }))}
                rows={3} />
              <MacroPicker
                section="header"
                currentText={formData.ime_note || ''}
                onInsert={(text: string) => setFormData((prev: any) => ({ ...prev, ime_note: text }))}
              />
            </CardContent>
          </Card>

          {/* Chart Review Note */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">CHART REVIEW
                <span className="text-sm font-normal text-slate-500 ml-2">(bold centered section header in export)</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <Textarea placeholder="Chart review header text..."
                value={formData.chart_review_note || ''}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData((prev: any) => ({ ...prev, chart_review_note: e.target.value }))}
                rows={3} />
              <MacroPicker
                section="header"
                currentText={formData.chart_review_note || ''}
                onInsert={(text: string) => setFormData((prev: any) => ({ ...prev, chart_review_note: text }))}
              />
            </CardContent>
          </Card>

          {/* Document List Toggle */}
          <Card>
            <CardContent className="pt-5">
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <p className="font-medium text-slate-900">Include Document List</p>
                  <p className="text-sm text-slate-500 mt-0.5">
                    Insert a numbered list of all source documents in the export.
                  </p>
                </div>
                <button type="button"
                  onClick={() => setFormData((prev: any) => ({ ...prev, include_document_list: !prev.include_document_list }))}
                  className={`mt-0.5 w-12 h-6 rounded-full transition-colors flex-shrink-0 relative ${formData.include_document_list ? 'bg-blue-600' : 'bg-slate-300'}`}>
                  <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${formData.include_document_list ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </button>
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Visits */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900">
                Office Visits ({formData.visits?.length || 0})
              </h3>
              <div className="flex gap-2">
                <Button onClick={() => setShowPtConsolidate(!showPtConsolidate)} size="sm" variant="outline">
                  Consolidate PT/OT
                </Button>
              </div>
            </div>

            {showPtConsolidate && <PtConsolidatePanel
              groups={getPtOtGroups()}
              onConfirm={consolidatePtOt}
              onCancel={() => setShowPtConsolidate(false)}
            />}

            {formData.visits && formData.visits.length > 0 && (
              <DuplicateVisitDetector
                visits={formData.visits}
                onDuplicateAction={handleDuplicateAction}
              />
            )}

            {(formData.visits || []).map((visit: any, index: number) => {
              const isExpanded = expandedVisit === index;
              const hasSourcePage = !!(visit.source_page && visit.source_doc_id);
              const isActiveRecord = !!activeRecord && activeRecord.docId === visit.source_doc_id && activeRecord.page === visit.source_page;
              return (
                <Card key={index} className="border-2">
                  <CardHeader className="cursor-pointer bg-slate-50"
                    onClick={() => setExpandedVisit(isExpanded ? -1 : index)}>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">
                        Visit {index + 1}
                        {visit.visit_date && ` — ${new Date(visit.visit_date + 'T00:00:00').toLocaleDateString()}`}
                        {visit.rendering_provider && ` — ${visit.rendering_provider}`}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        {hasSourcePage && (
                          <button
                            onClick={(e: any) => { e.stopPropagation(); setActiveRecord({ docId: visit.source_doc_id, page: visit.source_page, label: visit.source_part_label || visit.practice_setting }); }}
                            className={`text-xs font-medium whitespace-nowrap ${isActiveRecord ? 'text-blue-800 underline' : 'text-blue-600 hover:underline'}`}
                          >
                            View Record →
                          </button>
                        )}
                        {(formData.visits || []).length > 1 && (
                          <Button variant="ghost" size="sm"
                            onClick={(e: any) => { e.stopPropagation(); removeVisit(index); }}
                            className="text-red-600 hover:text-red-700">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                        <Badge variant="outline">{isExpanded ? 'Collapse' : 'Expand'}</Badge>
                      </div>
                    </div>
                  </CardHeader>

                  {isExpanded && (
                    <CardContent className="pt-6 space-y-4">

                      {index === pendingVisitIndex && (
                        <div className="flex items-center justify-between gap-3 bg-blue-50 border border-blue-200 rounded-md px-3 py-2">
                          <p className="text-sm text-blue-800">
                            New visit — fill in the details below, then save to place it in chronological order.
                          </p>
                          <Button size="sm" onClick={placeNewVisit}
                            className="bg-blue-600 hover:bg-blue-700 text-white shrink-0">
                            <Save className="w-4 h-4 mr-2" />Save Visit
                          </Button>
                        </div>
                      )}

                      {/* Pre-note */}
                      <div>
                        <Label>Note Before This Visit <span className="text-xs font-normal text-slate-500">(appears before this visit in export)</span></Label>
                        <Textarea placeholder="Optional free text to insert before this visit..."
                          value={visit.pre_note || ''}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateVisit(index, 'pre_note', e.target.value)}
                          rows={2} />
                        <MacroPicker
                          section="pre_note"
                          currentText={visit.pre_note || ''}
                          onInsert={(text: string) => updateVisit(index, 'pre_note', text)}
                        />
                      </div>

                      {/* Dates */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>Visit Date</Label>
                          <Input type="date" value={visit.visit_date || ''}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateVisit(index, 'visit_date', e.target.value)} />
                        </div>
                        <div>
                          <Label>Injury Date (if applicable)</Label>
                          <Input type="date" value={visit.injury_date || ''}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateVisit(index, 'injury_date', e.target.value)} />
                        </div>
                      </div>

                      {/* Provider / Setting */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>Rendering Provider</Label>
                          <Input list={`providers-${index}`} value={visit.rendering_provider || ''}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleProviderChange(index, e.target.value)}
                            placeholder="Enter provider name" />
                          <datalist id={`providers-${index}`}>
                            {uniqueProviders.map((provider: string) => (
                              <option key={provider} value={provider} />
                            ))}
                          </datalist>
                          {visit.rendering_provider && providerPracticeMap[visit.rendering_provider.trim()] && (
                            <p className="text-xs text-blue-600 mt-1">
                              Suggested: {providerPracticeMap[visit.rendering_provider.trim()]}
                            </p>
                          )}
                        </div>
                        <div>
                          <Label>Practice Setting</Label>
                          <Input value={visit.practice_setting || ''}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateVisit(index, 'practice_setting', e.target.value)}
                            placeholder="Auto-filled based on provider" />
                        </div>
                      </div>

                      {/* Chief Complaint */}
                      <div>
                        <Label>Chief Complaint</Label>
                        <Textarea value={visit.chief_complaint || ''}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateVisit(index, 'chief_complaint', e.target.value)} rows={2} />
                      </div>

                      {/* HPI */}
                      <div>
                        <Label>History of Present Illness</Label>
                        <Textarea value={visit.hpi_summary || ''}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateVisit(index, 'hpi_summary', e.target.value)} rows={4} />
                      </div>

                      {/* Pain / Progression */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>Pain Scale</Label>
                          <Input placeholder="e.g., 7/10" value={visit.pain_scale || ''}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateVisit(index, 'pain_scale', e.target.value)} />
                        </div>
                        <div>
                          <Label>Symptom Progression</Label>
                          <Select value={visit.symptom_progression || 'not_documented'}
                            onValueChange={(value: string) => updateVisit(index, 'symptom_progression', value)}>
                            <SelectOption value="improved">Improved</SelectOption>
                            <SelectOption value="same">Same</SelectOption>
                            <SelectOption value="worse">Worse</SelectOption>
                            <SelectOption value="not_documented">Not Documented</SelectOption>
                          </Select>
                        </div>
                      </div>

                      {/* Physical Exam */}
                      <div>
                        <Label>Physical Examination Findings</Label>
                        <Textarea placeholder="Key pertinent positives only"
                          value={visit.physical_exam_findings || ''}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateVisit(index, 'physical_exam_findings', e.target.value)} rows={4} />
                        <MacroPicker
                          section="footer"
                          currentText={visit.physical_exam_findings || ''}
                          onInsert={(text: string) => updateVisit(index, 'physical_exam_findings', text)}
                        />
                      </div>

                      {/* Imaging */}
                      <div>
                        <Label>Imaging Findings</Label>
                        <Textarea placeholder="Exact text from report"
                          value={visit.imaging_findings || ''}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateVisit(index, 'imaging_findings', e.target.value)} rows={3} />
                      </div>

                      {/* Labs */}
                      <div>
                        <Label>Laboratory Findings</Label>
                        <Textarea placeholder="Leave empty if no labs performed"
                          value={visit.lab_findings || ''}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateVisit(index, 'lab_findings', e.target.value)} rows={3} />
                      </div>

                      {/* Impression / Diagnosis */}
                      <div>
                        <Label>Impression / Diagnosis</Label>
                        <Textarea value={visit.impression_diagnosis || ''}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateVisit(index, 'impression_diagnosis', e.target.value)} rows={3} />
                      </div>

                      {/* ICD-10 codes */}
                      <div>
                        <Label>ICD-10 Codes</Label>
                        <div className="flex gap-2">
                          <Input placeholder="e.g., M54.5" value={icd10Input[index] || ''}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setIcd10Input((prev: any) => ({ ...prev, [index]: e.target.value }))} />
                          <Button size="sm" variant="outline" onClick={() => addIcd10(index)}>
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                        {(visit.icd10_codes || []).length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {(visit.icd10_codes || []).map((code: string) => (
                              <span key={code}
                                className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-xs font-mono">
                                {code}
                                <button type="button" onClick={() => removeIcd10(index, code)}
                                  className="text-blue-400 hover:text-blue-700 ml-1">✕</button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Treatment Plan */}
                      <div>
                        <Label>Treatment Plan</Label>
                        <Textarea value={visit.treatment_plan || ''}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateVisit(index, 'treatment_plan', e.target.value)} rows={3} />
                      </div>

                    </CardContent>
                  )}
                </Card>
              );
            })}

            <div className="flex justify-center pt-2">
              <Button onClick={addVisit} size="sm" variant="outline">
                <Plus className="w-4 h-4 mr-2" />Add Visit
              </Button>
            </div>
          </div>

          {/* Bottom save */}
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} disabled={updateMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white">
              <Save className="w-4 h-4 mr-2" />
              {updateMutation.isPending ? 'Saving...' : 'Save Summary'}
            </Button>
          </div>

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


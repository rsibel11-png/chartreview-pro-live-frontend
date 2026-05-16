/**
 * Library.tsx -- Standalone AWS version (no Base44 dependency)
 * Based on Library.jsx v54 - 2026-05-03
 *
 * Changes from CRPv5 Library.jsx:
 * - awsProxy calls directly to VITE_AWS_API_URL (no Base44 /functions relay)
 * - No Base44 SDK imports
 * - All other logic identical to CRPv5 v54
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  FileText,
  Trash2,
  Search,
  ExternalLink,
  Calendar,
  User,
  Building,
  Copy,
  Scan,
  Loader2,
  AlertTriangle,
  Folder,
  FolderOpen,
  Edit2,
  MoveRight,
  FolderPlus,
  ArrowLeft,
  ScanSearch,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Eye,
  RefreshCw,
} from "lucide-react";

const AWS_API_URL = process.env.REACT_APP_AWS_API_URL || "";
const ORG_ID      = process.env.REACT_APP_ORG_ID      || "";
const API_KEY     = process.env.REACT_APP_AWS_API_KEY  || "";

// ── Inline shadcn-style primitives (no @/components/ui dependency) ──────────
const Card = ({ className = "", children, ...p }: any) => (
  <div className={`rounded-xl border bg-white shadow-sm ${className}`} {...p}>{children}</div>
);
const CardContent = ({ className = "", children, ...p }: any) => (
  <div className={`p-6 ${className}`} {...p}>{children}</div>
);
const Input = ({ className = "", ...p }: any) => (
  <input className={`flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1 text-sm shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`} {...p} />
);
const Button = ({ className = "", variant = "default", size = "default", children, ...p }: any) => {
  const base = "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus:outline-none disabled:opacity-50 disabled:pointer-events-none";
  const variants: any = {
    default:     "bg-blue-600 text-white hover:bg-blue-700 px-4 py-2",
    outline:     "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 px-4 py-2",
    ghost:       "bg-transparent hover:bg-slate-100 text-slate-700 px-3 py-2",
    destructive: "bg-red-600 text-white hover:bg-red-700 px-4 py-2",
    secondary:   "bg-slate-100 text-slate-700 hover:bg-slate-200 px-4 py-2",
  };
  const sizes: any = { default: "", sm: "h-8 px-3 text-xs", icon: "h-8 w-8 p-0" };
  return <button className={`${base} ${variants[variant] || variants.default} ${sizes[size] || ""} ${className}`} {...p}>{children}</button>;
};
const Badge = ({ className = "", variant = "default", children, ...p }: any) => {
  const variants: any = {
    default:   "bg-blue-600 text-white",
    secondary: "bg-slate-100 text-slate-700",
    outline:   "border border-slate-300 text-slate-700",
  };
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${variants[variant] || variants.default} ${className}`} {...p}>{children}</span>;
};
const Checkbox = ({ className = "", checked, onCheckedChange, ...p }: any) => (
  <input type="checkbox" className={`h-4 w-4 rounded border-slate-300 text-blue-600 cursor-pointer ${className}`} checked={checked} onChange={(e) => onCheckedChange?.(e.target.checked)} {...p} />
);
// Select
const Select = ({ value, onValueChange, children }: any) => {
  return <SelectContext.Provider value={{ value, onValueChange }}>{children}</SelectContext.Provider>;
};
const SelectContext = React.createContext<any>({});
const SelectTrigger = ({ className = "", children }: any) => {
  const { value, onValueChange } = React.useContext(SelectContext);
  return <div className={`relative inline-flex items-center ${className}`}>{children}</div>;
};
const SelectValue = ({ placeholder }: any) => {
  const { value } = React.useContext(SelectContext);
  return <span>{value || placeholder}</span>;
};
const SelectContent = ({ children }: any) => <>{children}</>;
const SelectItem = ({ value, children }: any) => {
  const { onValueChange } = React.useContext(SelectContext);
  return <option value={value} onClick={() => onValueChange?.(value)}>{children}</option>;
};
// NativeSelect wrapper (replaces Select/SelectTrigger/SelectContent/SelectItem pattern)
// AlertDialog
const AlertDialog = ({ open, onOpenChange, children }: any) => open ? <>{children}</> : null;
const AlertDialogContent = ({ className = "", children }: any) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
    <div className={`bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4 ${className}`}>{children}</div>
  </div>
);
const AlertDialogHeader = ({ children }: any) => <div className="mb-4">{children}</div>;
const AlertDialogFooter = ({ children }: any) => <div className="flex justify-end gap-2 mt-6">{children}</div>;
const AlertDialogTitle = ({ children }: any) => <h2 className="text-lg font-semibold">{children}</h2>;
const AlertDialogDescription = ({ children }: any) => <p className="text-sm text-slate-600 mt-1">{children}</p>;
const AlertDialogAction = ({ className = "", children, ...p }: any) => (
  <button className={`px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 ${className}`} {...p}>{children}</button>
);
const AlertDialogCancel = ({ className = "", children, ...p }: any) => (
  <button className={`px-4 py-2 border border-slate-300 rounded-md text-sm font-medium hover:bg-slate-50 ${className}`} {...p}>{children}</button>
);
// Tooltip
const TooltipProvider = ({ children }: any) => <>{children}</>;
const Tooltip = ({ children }: any) => <>{children}</>;
const TooltipTrigger = ({ asChild, children }: any) => <>{children}</>;
const TooltipContent = ({ children }: any) => null; // simplified — no tooltip popup in standalone
// Dialog
const Dialog = ({ open, onOpenChange, children }: any) => open ? <>{children}</> : null;
const DialogContent = ({ className = "", children }: any) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
    <div className={`bg-white rounded-xl shadow-xl p-6 max-w-lg w-full mx-4 ${className}`}>{children}</div>
  </div>
);
const DialogHeader = ({ children }: any) => <div className="mb-4">{children}</div>;
const DialogFooter = ({ children }: any) => <div className="flex justify-end gap-2 mt-6">{children}</div>;
const DialogTitle = ({ children }: any) => <h2 className="text-lg font-semibold">{children}</h2>;
const DialogDescription = ({ children }: any) => <p className="text-sm text-slate-600 mt-1">{children}</p>;
// ────────────────────────────────────────────────────────────────────────────

// v26: localStorage-backed set -- survives both remounts AND full browser refreshes
const ASSESSED_STORAGE_KEY = 'crpv5_assessed_ids';
const _classifiedSessionIds = (() => {
  try {
    const stored = localStorage.getItem(ASSESSED_STORAGE_KEY);
    return new Set(stored ? JSON.parse(stored) : []);
  } catch { return new Set(); }
})();
const _persistAssessed = (id: string) => {
  _classifiedSessionIds.add(id);
  try {
    localStorage.setItem(ASSESSED_STORAGE_KEY, JSON.stringify(Array.from(_classifiedSessionIds)));
  } catch {}
};
const _clearAssessed = (id: string) => {
  _classifiedSessionIds.delete(id);
  try {
    localStorage.setItem(ASSESSED_STORAGE_KEY, JSON.stringify(Array.from(_classifiedSessionIds)));
  } catch {}
};

// v51: classify queue -- serialized (1 at a time) to prevent concurrent Bedrock
// calls from pushing each other over API Gateway's 29s timeout on large files.
// Large PDFs (8MB+) need the full budget. Speed is recovered by the assembly
// line approach (summary starts on completed parts while later parts still assess).
const CLASSIFY_CONCURRENCY = 1;
let _classifyActiveCount = 0;
const _classifyQueue = []; // array of () => Promise<void>

function _runClassifyQueue() {
  while (_classifyActiveCount < CLASSIFY_CONCURRENCY && _classifyQueue.length > 0) {
    const task = _classifyQueue.shift();
    _classifyActiveCount++;
    task().finally(() => {
      _classifyActiveCount--;
      _runClassifyQueue();
    });
  }
}

function enqueueClassify(fn) {
  return new Promise((resolve, reject) => {
    _classifyQueue.push(() => fn().then(resolve, reject));
    _runClassifyQueue();
  });
}


// ---------------------------------------------------------------------------
// PDF page renderer -- used inside ClassificationModal only.
// Loads the PDF once when the modal opens, renders one page at a time on demand.
// Module-level so pdfjs instance is shared across modal opens.
// ---------------------------------------------------------------------------
// Extend window for pdfjs
declare global { interface Window { pdfjsLib: any; _crpPdfCache: any; _crpUrlCache: any; } }

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

// ModalPdfViewer: renders a single page of a PDF part inside the ClassificationModal.
// partId (string) + localPageNum (number) are stable primitives -- memo bails out correctly.
// Caches the loaded pdf document object in window._crpPdfCache[partId] so page navigation
// is instant without re-fetching the whole PDF.
const ModalPdfViewer = React.memo(({ partId, localPageNum, scale = 1.2, idToken }: { partId: string; localPageNum: number; scale?: number; idToken?: string }) => {
  const canvasRef = useRef(null);
  const renderTaskRef = useRef(null);
  const [status, setStatus] = useState("idle");

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    (async () => {
      try {
        if (!window._crpUrlCache) window._crpUrlCache = {};
        if (!window._crpUrlCache[partId]) {
          const res = await fetch(`${AWS_API_URL}/documents/${partId}/download-url`, {
            method: "GET",
            headers: {
              "x-api-key": API_KEY,
              "Authorization": `Bearer ${idToken || ""}`,
              "x-org-id": ORG_ID,
            },
          });
          const json = await res.json();
          window._crpUrlCache[partId] = json.download_url || json.url || null;
        }
        const url = window._crpUrlCache[partId];
        if (!url || cancelled) return;
        const pdfjsLib: any = await _getPdfjs();
        if (!window._crpPdfCache) window._crpPdfCache = {};
        if (!window._crpPdfCache[partId]) {
          window._crpPdfCache[partId] = await pdfjsLib.getDocument({ url, disableStream: true }).promise;
        }
        const pdf = window._crpPdfCache[partId];
        if (cancelled) return;
        const page = await pdf.getPage(localPageNum);
        if (cancelled) return;
        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        if (!canvas || cancelled) return;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        if (renderTaskRef.current) { try { renderTaskRef.current.cancel(); } catch {} }
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        renderTaskRef.current = page.render({ canvasContext: ctx, viewport });
        await renderTaskRef.current.promise;
        if (!cancelled) setStatus("done");
      } catch (err) {
        if (!cancelled && err?.name !== "RenderingCancelledException") {
          console.warn("ModalPdfViewer error:", err.message);
          setStatus("error");
        }
      }
    })();
    return () => { cancelled = true; };
  }, [partId, localPageNum, scale]);

  return (
    <div className="relative w-full flex items-center justify-center bg-slate-200 rounded-lg overflow-auto" style={{ minHeight: 320 }}>
      {status === "loading" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          <span className="text-xs text-slate-500">Loading page...</span>
        </div>
      )}
      {status === "error" && (
        <div className="absolute inset-0 flex items-center justify-center text-red-400 text-sm">
          Could not render page
        </div>
      )}
      <canvas ref={canvasRef} className="max-w-full shadow-md" style={{ display: status === "done" ? "block" : "none" }} />
    </div>
  );
});

export default function Library({ onNavigate, idToken }: { onNavigate?: (page: string) => void; idToken?: string }) {
  const queryClient = useQueryClient();

  // --- AWS proxy helper -----------------------------------------------------
  const awsProxy = async (path, method = "GET", data = undefined) => {
    const url = `${AWS_API_URL}${path}`;
    const opts: any = {
      method,
      headers: {
        "Content-Type": "application/json",
        "x-api-key": API_KEY,
        "Authorization": `Bearer ${idToken || ""}`,
        "x-org-id": ORG_ID,
      },
    };
    if (data !== undefined) opts.body = JSON.stringify(data);
    const res = await fetch(url, opts);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `awsProxy ${method} ${path} failed: ${res.status}`);
    }
    return res.json();
  };

  // v24: Open document via shell record ID (full original PDF) for grouped docs,
  // or direct record ID for single docs. Shell file_key = original pre-split PDF.
  const openDocument = async (doc) => {
    try {
      // doc.id is always the correct ID to use:
      // - For grouped docs: doc.id = shell ID, file_key = original full PDF
      // - For single docs: doc.id = the doc itself
      // getDownloadUrlHandler handles both cases identically via file_key lookup
      const result = await awsProxy(`/documents/${doc.id}/download-url`, "GET");
      const url = result.url || result.download_url || result.signedUrl;
      if (!url) throw new Error("No URL in response");
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      toast.error("Could not get document URL: " + err.message);
    }
  };

  // --- State ----------------------------------------------------------------
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [subcategoryFilter, setSubcategoryFilter] = useState("all");
  const [viewMode, setViewMode] = useState("date");
  const [folderFilter, setFolderFilter] = useState("all");
  const [deleteDialog, setDeleteDialog] = useState(null);
  const [deleteAllDialog, setDeleteAllDialog] = useState(false);
  const [scanningDocument, setScanningDocument] = useState(null);
  const [normalizingExtensions, setNormalizingExtensions] = useState(false);
  const [editingFolder, setEditingFolder] = useState(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [selectedDocuments, setSelectedDocuments] = useState(new Set());
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [moveToFolder, setMoveToFolder] = useState("");
  const [openFolder, setOpenFolder] = useState(null);
  const [deleteFolderDialog, setDeleteFolderDialog] = useState(null);
  const [folderDuplicatesDialog, setFolderDuplicatesDialog] = useState(null);
  const [deletingDuplicates, setDeletingDuplicates] = useState(false);
  const [selectedDuplicateIds, setSelectedDuplicateIds] = useState(new Set());
  const [reassessingDocuments, setReassessingDocuments] = useState(false);
  const [now, setNow] = useState(Date.now());

  const [classifyingIds, setClassifyingIds] = useState(new Set());
  const [pageClassifications, setPageClassifications] = useState({});
  const [inspectDoc, setInspectDoc] = useState(null);
  const [inspectPage, setInspectPage] = useState(1);
  const [restoringIds, setRestoringIds] = useState(new Set());
  // v44: classifiedRef is empty on each mount -- only tracks what was processed THIS session.
  // _classifiedSessionIds (localStorage) is checked separately to decide if re-classify is needed.
  const classifiedRef = useRef(new Set());
  const forceReclassifyRef = useRef(new Set());

  // --- Data fetch -----------------------------------------------------------
  const { data: documents = [], isLoading, error } = useQuery({
    queryKey: ["aws-documents"],
    queryFn: async () => {
      const res = await fetch(`${AWS_API_URL}/documents`, {
        method: "GET",
        headers: {
          "x-api-key": API_KEY,
          "Authorization": `Bearer ${idToken || ""}`,
          "x-org-id": ORG_ID,
        },
      });
      if (!res.ok) throw new Error("Failed to fetch documents");
      const data = await res.json();

      const raw = (Array.isArray(data) ? data : []).map((d) => ({
        ...d,
        id: d.aws_document_id || d.id,
        title: d.title || d.file_name || d.filename || "Untitled",
        created_date: d.created_date || d.created_at,
      }));

      const shellMap = {};
      const grouped = {};
      const singles = [];

      for (const doc of raw) {
        const isShell =
          !doc.parent_filename &&
          !doc.original_document_id &&
          (doc.status === "pending_upload" || doc.status === "uploaded");
        if (isShell) {
          shellMap[doc.id] = doc;
        } else if (doc.original_document_id) {
          if (!grouped[doc.original_document_id]) grouped[doc.original_document_id] = [];
          grouped[doc.original_document_id].push(doc);
        } else {
          singles.push(doc);
        }
      }

      const merged = Object.entries(grouped).map(([shellId, parts]: [string, any[]]) => {
        parts.sort((a, b) => (a.part_index ?? 0) - (b.part_index ?? 0));
        const shell = shellMap[shellId];
        const totalSize = parts.reduce((sum, p) => sum + (p.file_size || 0), 0);
        const displayTitle =
          shell?.file_name || shell?.title || parts[0].parent_filename || parts[0].title;
        return {
          ...parts[0],
          id: shellId,
          title: displayTitle,
          file_name: displayTitle,
          file_size: totalSize || null,
          created_date: shell?.created_date || shell?.created_at || parts[0].created_date,
          _is_group: true,
          _part_ids: parts.map((p) => p.id),
          _parts: parts,
        };
      });

      return [...singles, ...merged];
    },
    retry: 1,
    refetchInterval: (query) => {
      const data = query?.state?.data;
      if (!Array.isArray(data)) return false;
      const anyProcessing = data.some((d) =>
        d._is_group
          ? d._parts?.some((p) => p.status === "processing")
          : d.status === "processing"
      );
      return anyProcessing ? 15000 : false;
    },
  });

  // tick every 15s for elapsed time badges
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(timer);
  }, []);

  const getElapsed = (createdAt) => {
    if (!createdAt) return null;
    const ms = Date.now() - new Date(createdAt).getTime();
    const mins = Math.floor(ms / 60000);
    if (mins < 1) return "< 1 min";
    if (mins === 1) return "1 min";
    return `${mins} min`;
  };

  // --- v24: Client-side PDF classification ----------------------------------
  // v24 change: passes page_offset per part so low_relevance_pages are numbered
  // relative to the full document across all parts.
  // Part 1 (pages 1-100): page_offset=0
  // Part 2 (pages 1-49):  page_offset=100 -> saved as pages 101-149

  const classifyDocumentPages = useCallback((doc) => {
    const docId = doc.id;
    if (classifiedRef.current.has(docId)) return;
    classifiedRef.current.add(docId); // mark immediately so useEffect doesn't double-enqueue

    return enqueueClassify(async () => {
    const parts: any[] = doc._is_group ? (doc._parts || []) : [doc];
    if (!forceReclassifyRef.current.has(docId)) {
      const allAssessed = parts.filter((p) => p.relevance_assessed === true);
      if (allAssessed.length === parts.length) {
        // lrp page_number values are GLOBAL (backend applies offset before saving)
        // so we must compute each part's global start offset to match correctly
        const sortedParts: any[] = Array.from(parts).sort((a: any, b: any) => (a.part_index ?? 0) - (b.part_index ?? 0));
        let gOffset = 0;
        const partOffsets: any = {};
        for (const sp of sortedParts) { partOffsets[sp.id] = gOffset; gOffset += sp.page_count || 0; }
        const allSaved = parts.flatMap((p) => {
          // v40: prefer saved page_classifications (includes restored state) over rebuilding from low_relevance_pages
          if (p.page_classifications && p.page_classifications.length > 0) {
            console.log(`classifyPages [load]: using saved page_classifications for part ${p.id} (${p.page_classifications.length} pages)`);
            const off = partOffsets[p.id] || 0;
            return p.page_classifications.map((pc) => ({ ...pc, part_id: p.id }));
          }
          console.log(`classifyPages [load]: no saved page_classifications for part ${p.id} -- rebuilding from low_relevance_pages`);
          const lrp = p.low_relevance_pages || [];
          const pageCount = p.page_count || 0;
          if (pageCount === 0) return [];
          const off = partOffsets[p.id] || 0;
          const lowSet = new Set(lrp.map((l) => l.page_number));
          const reasonMap = {};
          lrp.forEach((l) => { reasonMap[l.page_number] = l.reason || ''; });
          return Array.from({ length: pageCount }, (_, i) => {
            const gp = off + i + 1;
            return { page: gp, part_id: p.id, char_count: lowSet.has(gp) ? 0 : 999,
                     is_clinical: !lowSet.has(gp), restored: false, reason: reasonMap[gp] || '' };
          });
        });
        setPageClassifications((prev) => ({ ...prev, [docId]: allSaved }));
        return;
      }
    }
    forceReclassifyRef.current.delete(docId);

    setClassifyingIds((prev) => new Set(Array.from(prev).concat([docId])));
    try {
      const allPageResults = [];

      // Project Gamma Phase 1: fire-and-poll classify via async Lambda.
      // POST /classify/start -> { job_id } -> poll GET /jobs/{job_id} until complete/failed.
      // classifyJobWorker runs in its own Lambda (600s timeout) -- no API Gateway 504.
      // page_offset is passed to the backend so low_relevance_pages are globally numbered.
      const assessedMap: any = {}; // part.id -> assess result | null (failed)

      const POLL_INTERVAL_MS = 3000;
      const POLL_TIMEOUT_MS  = 570000; // 9.5 min -- classifyJobWorker Lambda is 600s

      // FULL-DOCUMENT VI PRE-PASS: fire ONE classify job for the entire document
      // passing all sibling parts so the backend concatenates their extracted_text
      // and runs a single Bedrock call with full document context.
      // This matches the original summary-time VI pre-pass behavior.
      const sortedParts = [...parts].sort((a: any, b: any) => (a.part_index ?? 0) - (b.part_index ?? 0));
      const anchorPart = sortedParts[0];
      const siblingParts = sortedParts.map((p: any, idx: number) => ({
        aws_document_id: p.aws_document_id || p.id,
        part_index: p.part_index ?? idx,
        page_count: p.page_count || 1,
      }));

      console.log(`classifyPages: firing single full-doc classify job for ${parts.length} parts, anchor=${anchorPart.id}`);
      try {
        // 1. Fire ONE classify job with all sibling parts
        const startRes = await awsProxy(
          `/documents/${anchorPart.id}/classify`,
          "POST",
          { page_offset: 0, sibling_parts: siblingParts }
        );
        const jobId = startRes.job_id;
        if (!jobId) throw new Error("classify/start returned no job_id");
        console.log(`classifyPages: job started job_id=${jobId}`);

        // 2. Poll until complete or failed
        const deadline = Date.now() + POLL_TIMEOUT_MS;
        let jobResult = null;
        while (Date.now() < deadline) {
          await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
          const jobStatus = await awsProxy(`/jobs/${jobId}`, "GET");
          console.log(`classifyPages: poll job_id=${jobId} status=${jobStatus.status}`);
          if (jobStatus.status === "complete") {
            jobResult = jobStatus.result;
            break;
          }
          if (jobStatus.status === "failed") {
            throw new Error(`classify job failed: ${jobStatus.error_message || "unknown"}`);
          }
        }
        if (!jobResult) throw new Error(`classify job timed out after ${POLL_TIMEOUT_MS/1000}s`);

        // 3. Fetch fresh records for ALL parts
        for (const part of sortedParts) {
          try {
            const freshDoc = await awsProxy(`/documents/${(part as any).id}`, "GET");
            assessedMap[(part as any).id] = {
              is_relevant_medical_document: !freshDoc.is_rejected,
              low_relevance_pages: freshDoc.low_relevance_pages || [],
              page_classifications: (freshDoc as any).page_classifications || [],
              page_count: freshDoc.page_count || (part as any).page_count || 1,
            };
            console.log(`classifyPages: part ${(part as any).id} fetched -- low_pages=${(freshDoc.low_relevance_pages||[]).length} page_classifications=${((freshDoc as any).page_classifications||[]).length}`);
          } catch (fetchErr: any) {
            console.warn(`classifyPages: failed to fetch fresh doc for part ${(part as any).id}:`, fetchErr.message);
            assessedMap[(part as any).id] = { is_relevant_medical_document: true, low_relevance_pages: [], page_count: (part as any).page_count || 1 };
          }
        }
      } catch (err: any) {
        console.warn(`classifyPages: classify failed:`, err.message);
        // On error: treat all parts as all-clinical
        for (const part of sortedParts) {
          assessedMap[(part as any).id] = { is_relevant_medical_document: true, low_relevance_pages: [], page_count: (part as any).page_count || 1 };
        }
      }

      // Build page results from polled data (fall back to original part data if timed out)
      for (const part of parts) {
        const assessData = assessedMap[part.id] || {};
        const result = {
          is_relevant_medical_document: assessData.is_relevant_medical_document !== false,
          low_relevance_pages: assessData.low_relevance_pages || [],
          page_count: assessData.page_count || part.page_count || 1,
        };

        const pageCount = result.page_count || part.page_count || 1;
        // Prefer page_classifications written by VI pre-pass (has accurate per-page clinical/non-clinical)
        // Fall back to low_relevance_pages for backwards compatibility with old classify results
        if ((result as any).page_classifications && (result as any).page_classifications.length > 0) {
          console.log(`classifyPages: using page_classifications for part ${part.id} (${(result as any).page_classifications.length} pages)`);
          for (const pc of (result as any).page_classifications) {
            allPageResults.push({
              page: pc.page,
              part_id: part.id,
              char_count: pc.is_clinical ? 999 : 0,
              is_clinical: pc.is_clinical,
              restored: false,
              reason: pc.reason || '',
            });
          }
        } else {
          // Legacy path: rebuild from low_relevance_pages
          console.log(`classifyPages: falling back to low_relevance_pages for part ${part.id}`);
          const lowSet = new Set((result.low_relevance_pages || []).map((l: any) => l.page_number));
          const reasonMap: Record<number, string> = {};
          (result.low_relevance_pages || []).forEach((l: any) => { reasonMap[l.page_number] = l.reason || ''; });

          const sortedParts: any[] = Array.from(parts).sort((a: any, b: any) => (a.part_index ?? 0) - (b.part_index ?? 0));
          let partStartPage = 1;
          for (const sp of sortedParts) {
            if (sp.id === part.id) break;
            partStartPage += (sp.page_count || 0);
          }

          for (let p = 1; p <= pageCount; p++) {
            const globalPage = partStartPage + p - 1;
            allPageResults.push({
              page: globalPage,
              part_id: part.id,
              char_count: lowSet.has(globalPage) ? 0 : 999,
              is_clinical: !lowSet.has(globalPage),
              restored: false,
              reason: reasonMap[globalPage] || '',
            });
          }
        }
      }

      // v42: persist page_classifications AND relevance_assessed to DynamoDB
      // -- ensures parts that 504'd during assess still get relevance_assessed=true
      // -- so allPartsAssessed passes on reload and [useEffect load] fires correctly
      try {
        const partsSorted = Array.from(parts).sort((a, b) => (a.part_index ?? 0) - (b.part_index ?? 0));
        console.log(`classifyPages: persisting page_classifications for ${partsSorted.length} parts (docId=${docId})`);
        for (const part of partsSorted) {
          const partSlice = allPageResults.filter((p) => p.part_id === part.id);
          const timedOut = assessedMap[part.id] === null;
          if (timedOut) {
            // 504 -- do NOT write relevance_assessed:true so this part stays retryable
            console.warn(`classifyPages: skipping persist for timed-out part ${part.id} -- will retry on next classify`);
          } else {
            const payload: any = { page_classifications: partSlice };
            if (!part.relevance_assessed) {
              payload.relevance_assessed = true;
              console.log(`classifyPages: part ${part.id} had no server relevance_assessed -- writing true alongside page_classifications`);
            }
            if (partSlice.length > 0) {
              console.log(`classifyPages: PUT page_classifications for part ${part.id} (${partSlice.length} pages)`);
              const putResult = await awsProxy(`/documents/${part.id}`, "PUT", payload);
              console.log(`classifyPages: PUT result for part ${part.id}:`, JSON.stringify(putResult));
            } else {
              console.warn(`classifyPages: no pages for part ${part.id} -- skipping PUT`);
            }
          }
        }
        console.log(`classifyPages: persist complete for docId=${docId}`);
      } catch (saveErr) {
        console.error(`classifyPages: FAILED to persist page_classifications for ${docId}:`, saveErr.message, saveErr);
      }
      // v51: only mark assessed in localStorage if at least one part completed without timeout
      // if ALL parts 504'd, assessedMap values are all null -- don't persist so retry fires next time
      const anyCompleted = parts.some((p) => assessedMap[p.id] !== null && assessedMap[p.id] !== undefined);
      if (anyCompleted) {
        _persistAssessed(docId);
        setPageClassifications((prev) => ({ ...prev, [docId]: allPageResults }));
      } else {
        console.warn(`classifyPages: all parts timed out for docId=${docId} -- not persisting to localStorage, UI cleared for retry`);
        _clearAssessed(docId);
        setPageClassifications((prev) => {
          const next = { ...prev };
          delete next[docId];
          return next;
        });
      }
    } catch (err) {
      console.error(`classifyPages error for ${docId}:`, err.message);
      _clearAssessed(docId);
      classifiedRef.current.delete(docId);
    } finally {
      setClassifyingIds((prev) => {
        const next = new Set(prev);
        next.delete(docId);
        return next;
      });
      // v43: invalidate query cache so navigation back to Library re-fetches
      // fresh DynamoDB data (with relevance_assessed + page_classifications)
      queryClient.invalidateQueries({ queryKey: ["aws-documents"] });
    }
    }); // end enqueueClassify
  }, [queryClient]);

  // Trigger classification for any processed doc not yet classified
  useEffect(() => {
    for (const doc of documents) {
      const parts: any[] = doc._is_group ? (doc._parts || []) : [doc];
      const isProcessed = parts.every((p) => p.status === "processed");
      if (!isProcessed) continue;
      if (classifiedRef.current.has(doc.id)) continue;
      // v52: skip load path if a forced reclassify is pending for this doc --
      // reclassify clears classifiedRef but adds to forceReclassifyRef, so the
      // useEffect must not re-load stale DynamoDB data before the fresh assess fires
      if (forceReclassifyRef.current.has(doc.id)) continue;
      const allPartsAssessed = (parts as any[]).every((p: any) => p.relevance_assessed === true);
      if (allPartsAssessed) {
        const sortedParts2: any[] = Array.from(parts).sort((a: any, b: any) => (a.part_index ?? 0) - (b.part_index ?? 0));
        let gOff2 = 0;
        const partOff2: any = {};
        for (const sp of sortedParts2) { partOff2[sp.id] = gOff2; gOff2 += sp.page_count || 0; }
        const allSaved = parts.flatMap((p) => {
          // v40: prefer saved page_classifications from DynamoDB (preserves restored state)
          if (p.page_classifications && p.page_classifications.length > 0) {
            console.log(`[useEffect load] using saved page_classifications for part ${p.id} (${p.page_classifications.length} pages)`);
            return p.page_classifications.map((pc) => ({ ...pc, part_id: p.id }));
          }
          console.log(`[useEffect load] no saved page_classifications for part ${p.id} -- rebuilding from low_relevance_pages`);
          const lrp = p.low_relevance_pages || [];
          const pageCount = p.page_count || 0;
          if (pageCount === 0) return [];
          const off2 = partOff2[p.id] || 0;
          const lowSet = new Set(lrp.map((l) => l.page_number));
          const reasonMap2 = {};
          lrp.forEach((l) => { reasonMap2[l.page_number] = l.reason || ''; });
          return Array.from({ length: pageCount }, (_, i) => {
            const gp2 = off2 + i + 1;
            return { page: gp2, part_id: p.id, char_count: lowSet.has(gp2) ? 0 : 999,
                     is_clinical: !lowSet.has(gp2), restored: false, reason: reasonMap2[gp2] || '' };
          });
        });
        setPageClassifications((prev) => {
          if (prev[doc.id]) return prev;
          return { ...prev, [doc.id]: allSaved };
        });
        _persistAssessed(doc.id);
        classifiedRef.current.add(doc.id);
      } else {
        // v26: also skip if pageClassifications already has results (survives state across renders)
        if (pageClassifications[doc.id]) {
          _persistAssessed(doc.id);
          classifiedRef.current.add(doc.id);
          continue;
        }
        classifyDocumentPages(doc);
      }
    }
  }, [documents, classifyDocumentPages, pageClassifications]);

  // Re-classify: clear DynamoDB flags first, then re-run assess
  const reclassifyDoc = useCallback(async (doc) => {
    const docId = doc.id;
    _clearAssessed(docId);
    classifiedRef.current.delete(docId);
    setPageClassifications((prev) => {
      const next = { ...prev };
      delete next[docId];
      return next;
    });
    forceReclassifyRef.current.add(docId);
    // v51: clear relevance_assessed + page_classifications in DynamoDB so stale
    // data from a previous silent-pass 504 doesn't block the fresh assess call
    const parts: any[] = doc._is_group ? (doc._parts || []) : [doc];
    await Promise.all(parts.map((part) =>
      awsProxy(`/documents/${part.id}`, "PUT", {
        relevance_assessed: false,
        page_classifications: [],
        low_relevance_pages: [],
      }).catch((e) => console.warn(`reclassifyDoc: failed to clear DynamoDB flags for ${part.id}:`, e.message))
    ));
    classifyDocumentPages(doc);
  }, [classifyDocumentPages]);

  const reclassifyAll = useCallback(async () => {
    for (const doc of documents) {
      const parts: any[] = doc._is_group ? (doc._parts || []) : [doc];
      const isProcessed = parts.every((p) => p.status === "processed");
      if (!isProcessed) continue;
      await reclassifyDoc(doc);
    }
  }, [documents, reclassifyDoc]);

  // --- Non-clinical page count helpers --------------------------------------
  const getNonClinicalPages = (docId) => {
    const classifications = pageClassifications[docId] || [];
    return classifications.filter((p) => !p.is_clinical && !p.restored);
  };

  const getClinicalPages = (docId) => {
    const classifications = pageClassifications[docId] || [];
    return classifications.filter((p) => p.is_clinical || p.restored);
  };

  const getTotalPages = (doc) => {
    const parts: any[] = doc._is_group ? (doc._parts || []) : [doc];
    return parts.reduce((s, p) => s + (p.page_count || 0), 0);
  };

  // --- Restore page(s) ------------------------------------------------------
  const restorePage = useCallback(async (docId, pageNum) => {
    setRestoringIds((prev) => new Set(Array.from(prev).concat([docId])));
    try {
      setPageClassifications((prev) => {
        const updated = (prev[docId] || []).map((p) =>
          p.page === pageNum ? { ...p, is_clinical: true, restored: true } : p
        );
        return { ...prev, [docId]: updated };
      });
      const doc = documents.find((d) => d.id === docId);
      if (doc) {
        const parts: any[] = doc._is_group ? (doc._parts || []) : [doc];
        for (const part of parts) {
          const partClassifications = (pageClassifications[docId] || []).filter(
            (p) => p.part_id === part.id
          );
          if (partClassifications.some((p) => p.page === pageNum)) {
            const updated = partClassifications.map((p) =>
              p.page === pageNum ? { ...p, is_clinical: true, restored: true } : p
            );
            await awsProxy(`/documents/${part.id}`, "PUT", { page_classifications: updated });
            break;
          }
        }
      }
      toast.success(`Page ${pageNum} restored`);
    } catch (err) {
      toast.error("Restore failed: " + err.message);
    } finally {
      setRestoringIds((prev) => {
        const next = new Set(prev);
        next.delete(docId);
        return next;
      });
    }
  }, [documents, pageClassifications]);

  const restoreAllPages = useCallback(async (docId) => {
    setRestoringIds((prev) => new Set(Array.from(prev).concat([docId])));
    try {
      setPageClassifications((prev) => {
        const updated = (prev[docId] || []).map((p) => ({ ...p, is_clinical: true, restored: p.restored || !p.is_clinical }));
        return { ...prev, [docId]: updated };
      });
      const doc = documents.find((d) => d.id === docId);
      if (doc) {
        const parts: any[] = doc._is_group ? (doc._parts || []) : [doc];
        for (const part of parts) {
          const partClassifications = (pageClassifications[docId] || [])
            .filter((p) => p.part_id === part.id)
            .map((p) => ({ ...p, is_clinical: true, restored: p.restored || !p.is_clinical }));
          if (partClassifications.length > 0) {
            await awsProxy(`/documents/${part.id}`, "PUT", { page_classifications: partClassifications });
          }
        }
      }
      toast.success("All pages restored");
    } catch (err) {
      toast.error("Restore all failed: " + err.message);
    } finally {
      setRestoringIds((prev) => {
        const next = new Set(prev);
        next.delete(docId);
        return next;
      });
    }
  }, [documents, pageClassifications]);


  // --- ClassificationBadge: compact card badge -- opens modal on click -------
  const ClassificationBadge = ({ doc }) => {
    const docId = doc.id;
    const isClassifying = classifyingIds.has(docId);
    const nonClinical = getNonClinicalPages(docId);
    const totalPages = (pageClassifications[docId] || []).length;
    const allNonClinical = nonClinical.length > 0 && totalPages > 0 && nonClinical.length === totalPages;

    if (isClassifying) {
      return (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 flex items-center gap-2 mt-2">
          <Loader2 className="w-4 h-4 text-blue-600 animate-spin shrink-0" />
          <span className="text-xs text-blue-700 font-medium">Analyzing pages for clinical content...</span>
        </div>
      );
    }
    if (totalPages === 0) return null;

    if (nonClinical.length === 0) {
      return (
        <button
          onClick={() => { setInspectDoc(doc); setInspectPage(1); }}
          className="mt-2 w-full bg-green-50 border border-green-200 rounded-lg px-3 py-2 flex items-center justify-between hover:bg-green-100 transition-colors group"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
            <span className="text-xs text-green-800 font-medium">
              All {totalPages} page{totalPages !== 1 ? "s" : ""} clinical
            </span>
          </div>
          <Eye className="w-3 h-3 text-green-500 opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
      );
    }

    return (
      <div className="mt-2 space-y-1">
        <button
          onClick={() => { setInspectDoc(doc); setInspectPage(nonClinical[0]?.page || 1); }}
          className="w-full rounded-lg px-3 py-2 flex items-center justify-between transition-colors bg-red-50 border border-red-200 hover:bg-red-100 group"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
            <span className="text-xs font-medium text-red-800">
              {allNonClinical
                ? `All ${nonClinical.length} pages non-clinical`
                : `${nonClinical.length} page${nonClinical.length !== 1 ? "s" : ""} flagged non-clinical`}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">Inspect</span>
            <Eye className="w-3 h-3 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </button>
        {nonClinical.length < totalPages && (
          <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
            <span className="text-xs text-green-800 font-medium">
              {totalPages - nonClinical.length} clinical page{totalPages - nonClinical.length !== 1 ? "s" : ""} included
            </span>
          </div>
        )}
      </div>
    );
  };

  // --- ClassificationModal: full-screen two-panel modal --------------------
  const ClassificationModal = () => {
    if (!inspectDoc) return null;
    const docId = inspectDoc.id;
    const allPages = pageClassifications[docId] || [];
    const nonClinical = getNonClinicalPages(docId);
    const isRestoring = restoringIds.has(docId);
    const totalPages = allPages.length;

    const currentEntry = allPages.find((p) => p.page === inspectPage) || allPages[0];
    const partId = currentEntry?.part_id;
    const localPageNum = (() => {
      if (!currentEntry) return 1;
      const partPages = allPages.filter((p) => p.part_id === currentEntry.part_id);
      return (partPages.findIndex((p) => p.page === currentEntry.page) + 1) || 1;
    })();
    const isClinical = currentEntry ? (currentEntry.is_clinical || currentEntry.restored) : true;

    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-white">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-slate-200 bg-slate-50 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => setInspectDoc(null)} className="text-slate-500 hover:text-slate-700 shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h2 className="font-semibold text-slate-900 truncate">{inspectDoc.title}</h2>
              <p className="text-xs text-slate-500">{totalPages} pages -- {nonClinical.length} flagged non-clinical</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {nonClinical.length > 0 && (
              <button
                onClick={() => restoreAllPages(docId)}
                disabled={isRestoring}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1.5 transition-colors"
              >
                {isRestoring ? <><Loader2 className="w-4 h-4 animate-spin" /> Restoring...</> : <><CheckCircle2 className="w-4 h-4" /> Restore All</>}
              </button>
            )}
            <button
              onClick={() => { setInspectDoc(null); deleteMutation.mutate(inspectDoc); }}
              disabled={deleteMutation.isPending}
              className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 flex items-center gap-1.5 transition-colors"
            >
              <Trash2 className="w-4 h-4" /> Delete Document
            </button>
            <button onClick={() => setInspectDoc(null)} className="ml-1 w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 text-lg transition-colors">
              X
            </button>
          </div>
        </div>

        {/* Two-panel body */}
        <div className="flex flex-1 overflow-hidden">

          {/* Left: page list */}
          <div className="w-72 shrink-0 border-r border-slate-200 overflow-y-auto bg-slate-50">
            <div className="px-3 py-2 border-b border-slate-200 sticky top-0 bg-slate-100 z-10">
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">All Pages</p>
            </div>
            {allPages.map((pageEntry) => {
              const clin = pageEntry.is_clinical || pageEntry.restored;
              const isActive = pageEntry.page === inspectPage;
              return (
                <button
                  key={pageEntry.page}
                  ref={(el) => { if (el && isActive) el.scrollIntoView({ block: "nearest", behavior: "smooth" }); }}
                  onClick={() => setInspectPage(pageEntry.page)}
                  className={`w-full text-left px-4 py-3 border-b border-slate-100 flex items-start gap-3 transition-colors ${
                    isActive ? "bg-blue-50 border-l-4 border-l-blue-500" : "hover:bg-white"
                  }`}
                >
                  <div className={`mt-1 w-2.5 h-2.5 rounded-full shrink-0 ${clin ? "bg-green-500" : "bg-red-500"}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800">Page {pageEntry.page}</p>
                    {pageEntry.reason && (
                      <p className="text-xs text-slate-500 italic">{pageEntry.reason}</p>
                    )}
                    {pageEntry.restored && (
                      <p className="text-xs text-blue-500">Restored</p>
                    )}
                  </div>
                  {!clin && (
                    <button
                      onClick={(e) => { e.stopPropagation(); restorePage(docId, pageEntry.page); }}
                      disabled={isRestoring}
                      className="shrink-0 text-xs px-2 py-0.5 bg-slate-200 hover:bg-blue-100 hover:text-blue-700 rounded transition-colors disabled:opacity-50"
                    >
                      Restore
                    </button>
                  )}
                </button>
              );
            })}
          </div>

          {/* Right: PDF viewer */}
          <div
            className="flex-1 flex flex-col overflow-hidden outline-none"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight" || e.key === "ArrowDown") {
                e.preventDefault();
                setInspectPage((p) => Math.min(totalPages, p + 1));
              } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                e.preventDefault();
                setInspectPage((p) => Math.max(1, p - 1));
              }
            }}
          >
            <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200 bg-white shrink-0">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setInspectPage((p) => Math.max(1, p - 1))}
                  disabled={inspectPage <= 1}
                  className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-40 transition-colors"
                >
                  <ChevronUp className="w-4 h-4 text-slate-600" />
                </button>
                <span className="text-sm text-slate-700 font-medium px-2">
                  Page {inspectPage} of {totalPages}
                </span>
                <button
                  onClick={() => setInspectPage((p) => Math.min(totalPages, p + 1))}
                  disabled={inspectPage >= totalPages}
                  className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-40 transition-colors"
                >
                  <ChevronDown className="w-4 h-4 text-slate-600" />
                </button>
              </div>
              <div className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full ${isClinical ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                {isClinical ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                {isClinical ? "Clinical" : "Non-clinical"}
              </div>
            </div>
            <div
              className="flex-1 overflow-auto p-6 bg-slate-200 flex justify-center"
              onWheel={(e) => {
                // Scroll down -> next page, scroll up -> prev page
                // Only trigger when the canvas itself is not being scrolled (small docs)
                if (e.deltaY > 40) {
                  setInspectPage((p) => Math.min(totalPages, p + 1));
                } else if (e.deltaY < -40) {
                  setInspectPage((p) => Math.max(1, p - 1));
                }
              }}
            >
              {partId && (
                <ModalPdfViewer
                  partId={partId}
                  localPageNum={localPageNum}
                  scale={1.4}
                  idToken={idToken}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

    // --- Mutations ------------------------------------------------------------
  const deleteMutation = useMutation({
    mutationFn: async (doc: any) => {
      if (doc._is_group && doc._part_ids?.length) {
        for (const partId of doc._part_ids) {
          await awsProxy(`/documents/${partId}`, "DELETE").catch((e) =>
            console.warn("Part delete failed:", partId, e.message)
          );
        }
        await awsProxy(`/documents/${doc.id}`, "DELETE").catch((e) =>
          console.warn("Shell delete failed:", doc.id, e.message)
        );
      } else {
        await awsProxy(`/documents/${doc.id}`, "DELETE");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aws-documents"] });
      setDeleteDialog(null);
    },
    onError: (err) => toast.error("Delete failed: " + err.message),
  });

  const deleteAllMutation = useMutation({
    mutationFn: async (docsToDelete: any[]) => {
      for (const doc of docsToDelete) {
        try {
          if (doc._is_group && doc._part_ids?.length) {
            for (const partId of doc._part_ids) {
              await awsProxy(`/documents/${partId}`, "DELETE").catch(() => {});
            }
            await awsProxy(`/documents/${doc.id}`, "DELETE").catch(() => {});
          } else {
            await awsProxy(`/documents/${doc.id}`, "DELETE");
          }
        } catch (e) {
          console.warn("Delete failed for", doc.id, e.message);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aws-documents"] });
      setDeleteAllDialog(false);
    },
    onError: (err) => toast.error("Delete all failed: " + err.message),
  });

  const updateFolderMutation = useMutation({
    mutationFn: ({ docId, folder }: { docId: string; folder: string | null }) => awsProxy(`/documents/${docId}`, "PUT", { folder }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aws-documents"] });
      setEditingFolder(null);
      setNewFolderName("");
    },
  });

  const moveDocumentsMutation = useMutation({
    mutationFn: async ({ docIds, folder }: { docIds: string[]; folder: string | null }) => {
      for (const id of docIds) {
        await awsProxy(`/documents/${id}`, "PUT", { folder });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aws-documents"] });
      setShowMoveDialog(false);
      setSelectedDocuments(new Set());
      setMoveToFolder("");
    },
  });

  const deleteFolderMutation = useMutation({
    mutationFn: async (folderName) => {
      const docsInFolder = documents.filter((d) => d.folder === folderName);
      for (const doc of docsInFolder) {
        try {
          if (doc._is_group && doc._part_ids?.length) {
            for (const partId of doc._part_ids) {
              await awsProxy(`/documents/${partId}`, "DELETE").catch(() => {});
            }
            await awsProxy(`/documents/${doc.id}`, "DELETE").catch(() => {});
          } else {
            await awsProxy(`/documents/${doc.id}`, "DELETE");
          }
        } catch (e) {
          console.warn("Delete failed for", doc.id, e.message);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aws-documents"] });
      setDeleteFolderDialog(null);
    },
  });

  // --- Normalize extensions -------------------------------------------------
  const normalizeFileExtensions = async () => {
    setNormalizingExtensions(true);
    try {
      const docsToUpdate = documents.filter((doc) => {
        const parts = doc.title.split(".");
        if (parts.length > 1) {
          const ext = parts[parts.length - 1];
          return ext !== ext.toLowerCase();
        }
        return false;
      });
      for (const doc of docsToUpdate) {
        const parts = doc.title.split(".");
        const ext = parts.pop().toLowerCase();
        parts.push(ext);
        await awsProxy(`/documents/${doc.id}`, "PUT", { title: parts.join(".") });
      }
      queryClient.invalidateQueries({ queryKey: ["aws-documents"] });
    } catch (err) {
      console.error("Error normalizing extensions:", err);
    }
    setNormalizingExtensions(false);
  };

  // --- Duplicate page scan --------------------------------------------------
  const checkForDuplicatePages = async (document) => {
    setScanningDocument(document.id);
    try {
      const result = await awsProxy(`/documents/${document.id}/scan-duplicates`, "POST");
      await awsProxy(`/documents/${document.id}`, "PUT", {
        has_duplicate_pages: result.has_duplicates || false,
        duplicate_pages: result.duplicate_groups || [],
        duplicate_pages_reviewed: false,
      });
      queryClient.invalidateQueries({ queryKey: ["aws-documents"] });
      if (!result.has_duplicates) {
        toast.success("No duplicate pages detected in this document", { duration: 3000 });
      }
    } catch (err) {
      console.error("Error scanning for duplicate pages:", err);
      toast.error("Scan failed - check AWS connection");
    }
    setScanningDocument(null);
  };

  // --- Re-assess -----------------------------------------------------------
  const reassessSelectedDocuments = async () => {
    setReassessingDocuments(true);
    const docsToReassess = Array.from(selectedDocuments)
      .map((id) => documents.find((d) => d.id === id))
      .filter(Boolean);
    for (const doc of docsToReassess) {
      try {
        const result = await awsProxy(`/documents/${doc.id}/assess`, "POST");
        const isRejected = result.is_relevant_medical_document === false;
        await awsProxy(`/documents/${doc.id}`, "PUT", {
          category: result.category || "uncategorized",
          patient_name: result.patient_name,
          document_date: result.document_date,
          provider_name: result.provider_name,
          case_number: result.case_number,
          page_count: result.page_count || doc.page_count,
        });
      } catch (err) {
        console.error(`Error reassessing document ${doc.id}:`, err);
      }
    }
    queryClient.invalidateQueries({ queryKey: ["aws-documents"] });
    setReassessingDocuments(false);
    setSelectedDocuments(new Set());
    toast.success(`Re-assessed ${docsToReassess.length} document${docsToReassess.length !== 1 ? "s" : ""}`);
  };

  // --- Folder duplicate scan ------------------------------------------------
  const scanFolderForDuplicates = (folderName) => {
    const folderDocs =
      folderName === "unfiled"
        ? documents.filter((d) => !d.folder)
        : documents.filter((d) => d.folder === folderName);
    const titleGroups = {};
    folderDocs.forEach((doc) => {
      const titleKey = (doc.title || "").toLowerCase().trim();
      if (!titleGroups[titleKey]) titleGroups[titleKey] = [];
      titleGroups[titleKey].push(doc);
    });
    const duplicateGroups = [];
    const processedIds = new Set<string>();
    Object.values(titleGroups).forEach((group: any) => {
      if (group.length > 1) {
        const unprocessed = group.filter((d) => !processedIds.has(d.id));
        if (unprocessed.length > 1) {
          duplicateGroups.push(unprocessed);
          unprocessed.forEach((d) => processedIds.add(d.id));
        }
      }
    });
    setFolderDuplicatesDialog({ folderName, groups: duplicateGroups });
    const toDelete = new Set();
    duplicateGroups.forEach((group) => group.slice(1).forEach((d) => toDelete.add(d.id)));
    setSelectedDuplicateIds(toDelete);
  };

  const deleteSelectedDuplicates = async () => {
    setDeletingDuplicates(true);
    for (const id of Array.from(selectedDuplicateIds)) {
      try { await awsProxy(`/documents/${id}`, "DELETE"); }
      catch (e) { console.warn("Delete failed for", id, e.message); }
    }
    queryClient.invalidateQueries({ queryKey: ["aws-documents"] });
    setDeletingDuplicates(false);
    setFolderDuplicatesDialog(null);
    setSelectedDuplicateIds(new Set());
  };

  // --- Selection helpers ----------------------------------------------------
  const toggleDocumentSelection = (docId) => {
    setSelectedDocuments((prev) => {
      const next = new Set(prev);
      if (next.has(docId)) next.delete(docId); else next.add(docId);
      return next;
    });
  };
  const selectAllUnfiled = () => {
    const unfiledDocs = filteredDocuments.filter((doc) => !doc.folder);
    setSelectedDocuments(new Set(unfiledDocs.map((d) => d.id)));
  };
  const clearSelection = () => setSelectedDocuments(new Set());

  // --- File size helper -----------------------------------------------------
  const formatSize = (bytes) => {
    if (!bytes) return null;
    if (bytes >= 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + " MB";
    return (bytes / 1024).toFixed(0) + " KB";
  };

  // --- Filtering & grouping -------------------------------------------------
  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      doc.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.patient_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.case_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.folder?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "all" || doc.category === categoryFilter;
    const matchesSubcategory = subcategoryFilter === "all" || doc.subcategory === subcategoryFilter;
    const matchesFolder =
      folderFilter === "all" ||
      (folderFilter === "none" && !doc.folder) ||
      doc.folder === folderFilter;
    if (openFolder !== null) {
      if (openFolder === "unfiled") return !doc.folder && matchesSearch && matchesCategory && matchesSubcategory;
      return doc.folder === openFolder && matchesSearch && matchesCategory && matchesSubcategory;
    }
    return matchesSearch && matchesCategory && matchesSubcategory && matchesFolder;
  });

  const subcategories = Array.from(new Set(documents.map((d: any) => d.subcategory).filter(Boolean)));
  const folders = Array.from(new Set(documents.map((d: any) => d.folder).filter(Boolean))).sort();
  const folderCounts = folders.reduce((acc, folder) => {
    acc[folder] = documents.filter((d) => d.folder === folder).length;
    return acc;
  }, {});
  const unfiledCount = documents.filter((d) => !d.folder).length;

  const groupedDocuments =
    viewMode === "folder"
      ? filteredDocuments.reduce((groups, doc) => {
          const key = doc.folder || "Unfiled";
          if (!groups[key]) groups[key] = [];
          groups[key].push(doc);
          return groups;
        }, {})
      : filteredDocuments.reduce((groups, doc) => {
          const uploadDate = new Date(doc.created_date);
          const today = new Date();
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);
          let key;
          if (uploadDate.toDateString() === today.toDateString()) key = "Today";
          else if (uploadDate.toDateString() === yesterday.toDateString()) key = "Yesterday";
          else if (uploadDate > new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)) key = "This Week";
          else if (uploadDate > new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)) key = "This Month";
          else key = "Earlier";
          if (!groups[key]) groups[key] = [];
          groups[key].push(doc);
          return groups;
        }, {});

  const orderedGroups =
    viewMode === "folder"
      ? Object.keys(groupedDocuments).sort((a, b) => {
          if (a === "Unfiled") return 1;
          if (b === "Unfiled") return -1;
          return a.localeCompare(b);
        })
      : ["Today", "Yesterday", "This Week", "This Month", "Earlier"].filter(
          (key) => groupedDocuments[key]
        );

  // --- Render ---------------------------------------------------------------
  return (
    <div className="p-6 md:p-8 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {openFolder && (
            <Button variant="ghost" size="sm" onClick={() => setOpenFolder(null)}
              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
              <ArrowLeft className="w-4 h-4 mr-2" />Back to Folders
            </Button>
          )}
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{openFolder || "Document Library"}</h1>
            <p className="text-slate-600">
              {openFolder
                ? `${filteredDocuments.length} document${filteredDocuments.length !== 1 ? "s" : ""} in this folder`
                : "Browse and manage all uploaded documents"}
            </p>
          </div>
        </div>
        {documents.length > 0 && (
          <div className="flex gap-2">
            {openFolder && (
              <Button variant="outline" onClick={reclassifyAll} disabled={classifyingIds.size > 0} className="border-blue-300 text-blue-700 hover:bg-blue-50 disabled:opacity-60">
                {classifyingIds.size > 0
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Classifying ({classifyingIds.size} running)</>
                  : <><RefreshCw className="w-4 h-4 mr-2" />Re-classify All</>}
              </Button>
            )}
            <Button variant="destructive" onClick={() => setDeleteAllDialog(true)} className="bg-red-600 hover:bg-red-700">
              <Trash2 className="w-4 h-4 mr-2" />Delete All Documents
            </Button>
          </div>
        )}
      </div>

      {/* Error banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          Failed to load documents: {error.message}
        </div>
      )}

      {/* Filters */}
      <Card className="shadow-md">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex gap-2 border-b border-slate-200 pb-4">
              <Button variant={viewMode === "date" ? "default" : "outline"} onClick={() => setViewMode("date")}
                className={viewMode === "date" ? "bg-blue-600" : ""}>
                <Calendar className="w-4 h-4 mr-2" />By Date
              </Button>
              <Button variant={viewMode === "folder" ? "default" : "outline"} onClick={() => setViewMode("folder")}
                className={viewMode === "folder" ? "bg-blue-600" : ""}>
                <Folder className="w-4 h-4 mr-2" />By Folder
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input placeholder="Search documents, patients, case numbers..."
                    value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
                </div>
              </div>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="h-9 rounded-md border border-slate-300 bg-white px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Categories</option>
                <option value="medical">Medical</option>
                <option value="legal">Legal</option>
                <option value="uncategorized">Uncategorized</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selection actions */}
      {openFolder && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-600">
            Showing {filteredDocuments.length} of {documents.length} documents
          </p>
          <div className="flex items-center gap-2">
            {selectedDocuments.size > 0 && (
              <>
                <Badge variant="secondary" className="bg-blue-100 text-blue-700">{selectedDocuments.size} selected</Badge>
                <Button variant="outline" size="sm" onClick={() => { setShowMoveDialog(true); setMoveToFolder(""); }}>
                  <MoveRight className="w-4 h-4 mr-2" />Move to Folder
                </Button>
                <Button variant="outline" size="sm" onClick={clearSelection}>Clear</Button>
              </>
            )}
            {filteredDocuments.filter((d) => !d.folder).length > 0 && (
              <Button variant="outline" size="sm" onClick={selectAllUnfiled}
                className="border-blue-600 text-blue-600 hover:bg-blue-50">
                <FolderPlus className="w-4 h-4 mr-2" />
                Select All Unfiled ({filteredDocuments.filter((d) => !d.folder).length})
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Main content */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6"><div className="h-32 bg-slate-200 rounded" /></CardContent>
            </Card>
          ))}
        </div>
      ) : !openFolder ? (
        /* Folder grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {folders.map((folder) => (
            <Card key={folder} className="hover:shadow-lg transition-all duration-300 group hover:border-blue-400 relative">
              <CardContent className="p-6 cursor-pointer" onClick={() => setOpenFolder(folder)}>
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl flex items-center justify-center group-hover:from-blue-200 group-hover:to-blue-300 transition-all">
                    <Folder className="w-10 h-10 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 line-clamp-2">{folder}</h3>
                    <p className="text-sm text-slate-500 mt-1">{folderCounts[folder]} document{folderCounts[folder] !== 1 ? "s" : ""}</p>
                  </div>
                </div>
              </CardContent>
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                  onClick={(e) => { e.stopPropagation(); scanFolderForDuplicates(folder); }} title="Scan for duplicates">
                  <ScanSearch className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={(e) => { e.stopPropagation(); setDeleteFolderDialog(folder); }}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))}

          {unfiledCount > 0 && (
            <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer group hover:border-slate-400 relative"
              onClick={() => setOpenFolder("unfiled")}>
              <CardContent className="p-6">
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className="w-20 h-20 bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl flex items-center justify-center group-hover:from-slate-200 group-hover:to-slate-300 transition-all">
                    <Folder className="w-10 h-10 text-slate-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">Unfiled</h3>
                    <p className="text-sm text-slate-500 mt-1">{unfiledCount} document{unfiledCount !== 1 ? "s" : ""}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        /* Document cards */
        <div className="space-y-6">
          {orderedGroups.map((groupKey) => (
            <div key={groupKey}>
              <h2 className="text-lg font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-slate-400" />{groupKey}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {groupedDocuments[groupKey].map((doc) => {
                  const parts: any[] = doc._is_group ? (doc._parts || []) : [doc];
                  const isProcessing = parts.some((p) => p.status === "processing");
                  const isPending = parts.some((p) => p.status === "pending_upload" || p.status === "uploaded");
                  const totalPages = getTotalPages(doc);
                  const nonClinical = getNonClinicalPages(doc.id);
                  const hasNonClinical = nonClinical.length > 0;
                  const allNonClinical = pageClassifications[doc.id]?.length > 0 &&
                    pageClassifications[doc.id].every((p) => !p.is_clinical && !p.restored);

                  return (
                    <Card key={doc.id} className={`hover:shadow-lg transition-all duration-300 group ${selectedDocuments.has(doc.id) ? "ring-2 ring-blue-500 bg-blue-50" : ""}`}>
                      <CardContent className="p-6">
                        <div className="space-y-4">

                          {/* Classification panel */}
                          <ClassificationBadge doc={doc} />


                          {/* Processing badge */}
                          {isProcessing && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Loader2 className="w-4 h-4 text-blue-600 animate-spin shrink-0" />
                                <p className="text-xs text-blue-700 font-medium">Processing...</p>
                              </div>
                              {doc.created_date && (() => {
                                const elapsed = getElapsed(doc.created_date);
                                const ms = Date.now() - new Date(doc.created_date).getTime();
                                const mins = Math.floor(ms / 60000);
                                const color = mins >= 10 ? "text-red-600" : mins >= 5 ? "text-orange-500" : "text-yellow-600";
                                return <span className={`text-xs font-medium ${color}`}>{elapsed}</span>;
                              })()}
                            </div>
                          )}

                          {/* Icon + actions */}
                          <div className="flex items-start justify-between">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                              allNonClinical || hasNonClinical ? "bg-red-100"
                              : "bg-cyan-100"
                            }`}>
                              <FileText className={`w-6 h-6 ${
                                allNonClinical || hasNonClinical ? "text-red-500"
                                : "text-cyan-600"
                              }`} />
                            </div>
                            <TooltipProvider>
                              <div className="flex gap-2">
                                <Checkbox checked={selectedDocuments.has(doc.id)}
                                  onCheckedChange={() => toggleDocumentSelection(doc.id)} className="mt-1" />
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                      onClick={() => openDocument(doc)}>
                                      <ExternalLink className="w-4 h-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent><p>Open document</p></TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon"
                                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                                      onClick={() => reclassifyDoc(doc)}>
                                      <RefreshCw className="w-4 h-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent><p>Re-classify pages</p></TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon"
                                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-slate-600 hover:text-slate-700"
                                      onClick={() => { setEditingFolder(doc); setNewFolderName(doc.folder || ""); }}>
                                      <Edit2 className="w-4 h-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent><p>Edit folder</p></TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon"
                                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-red-600 hover:text-red-700 hover:bg-red-50"
                                      onClick={() => setDeleteDialog(doc)}>
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent><p>Delete document</p></TooltipContent>
                                </Tooltip>
                              </div>
                            </TooltipProvider>
                          </div>

                          {/* Title */}
                          <div>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <h3 className="font-semibold text-slate-900 line-clamp-2 mb-2 cursor-default">{doc.title}</h3>
                                </TooltipTrigger>
                                <TooltipContent><p>{doc.title}</p></TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            {/* Badges */}
                            <div className="flex flex-wrap gap-2">
                              {hasNonClinical && !allNonClinical && (
                                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                  {nonClinical.length} pages flagged
                                </Badge>
                              )}
                              {allNonClinical && (
                                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                  All non-clinical
                                </Badge>
                              )}
                              {doc.folder && (
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                  <Folder className="w-3 h-3 mr-1" />{doc.folder}
                                </Badge>
                              )}
                            </div>
                          </div>

                          {/* Meta */}
                          <div className="space-y-1">
                            {doc.file_size && (
                              <p className="text-xs text-slate-500">
                                Size: <span className="font-medium">{formatSize(doc.file_size)}</span>
                              </p>
                            )}
                            {totalPages > 0 && (
                              <p className="text-xs text-slate-600">
                                Pages: <span className="font-medium">{totalPages}</span>
                                {hasNonClinical && (
                                  <span className="text-red-600 ml-1">
                                    ({totalPages - nonClinical.length} clinical, {nonClinical.length} flagged)
                                  </span>
                                )}
                              </p>
                            )}
                            {doc.patient_name && (
                              <p className="text-xs text-slate-500 flex items-center gap-1">
                                <User className="w-3 h-3" />{doc.patient_name}
                              </p>
                            )}
                            {doc.case_number && (
                              <p className="text-xs text-slate-500 flex items-center gap-1">
                                <Building className="w-3 h-3" />Case: {doc.case_number}
                              </p>
                            )}
                            {doc.created_date && (
                              <p className="text-xs text-slate-400 flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(doc.created_date).toLocaleDateString()}
                              </p>
                            )}
                          </div>

                          {/* Pending/Processing status */}
                          {isPending && !isProcessing && (
                            <p className="text-xs text-slate-400 italic">Waiting to process...</p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}

          {filteredDocuments.length === 0 && (
            <div className="text-center py-16">
              <FileText className="w-16 h-16 mx-auto mb-4 text-slate-200" />
              <h3 className="text-xl font-semibold text-slate-900 mb-2">No documents found</h3>
              <p className="text-slate-500">
                {searchTerm ? "Try adjusting your search" : "Upload documents to get started"}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Classification inspect modal */}
      <ClassificationModal />

      {/* Delete single */}
      <AlertDialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <AlertDialogTitle className="text-xl">Delete Document</AlertDialogTitle>
            </div>
            <AlertDialogDescription>
              <p className="font-semibold text-slate-900">
                Permanently delete "{deleteDialog?.title}"?
              </p>
              <p className="mt-1">This will remove it from AWS S3 and DynamoDB. This cannot be undone.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMutation.mutate(deleteDialog)} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete all */}
      <AlertDialog open={deleteAllDialog} onOpenChange={setDeleteAllDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <AlertDialogTitle className="text-xl">Delete All Documents</AlertDialogTitle>
            </div>
            <AlertDialogDescription>
              <p className="font-semibold text-slate-900">
                Permanently delete all {documents.length} documents? This cannot be undone.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteAllMutation.mutate(documents as any)}
              disabled={deleteAllMutation.isPending} className="bg-red-600 hover:bg-red-700">
              {deleteAllMutation.isPending
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Deleting...</>
                : <><Trash2 className="w-4 h-4 mr-2" />Delete All {documents.length}</>}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit folder */}
      <Dialog open={!!editingFolder} onOpenChange={() => setEditingFolder(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Folder</DialogTitle>
            <DialogDescription>Assign this document to a folder for better organization</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <label className="text-sm font-medium text-slate-700 mb-2 block">Document: {editingFolder?.title}</label>
            <Input placeholder="Enter folder name (e.g., Case #12345, John Doe)"
              value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} />
            {folders.length > 0 && (
              <div className="mt-2">
                <p className="text-xs text-slate-500 mb-2">Existing folders:</p>
                <div className="flex flex-wrap gap-2">
                  {folders.map((folder) => (
                    <Button key={folder} variant="outline" size="sm"
                      onClick={() => setNewFolderName(folder)} className="text-xs">
                      <Folder className="w-3 h-3 mr-1" />{folder}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingFolder(null)}>Cancel</Button>
            <Button onClick={() => updateFolderMutation.mutate({ docId: (editingFolder as any).id, folder: newFolderName || null } as any)}
              disabled={updateFolderMutation.isPending}>
              {updateFolderMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete folder */}
      <AlertDialog open={!!deleteFolderDialog} onOpenChange={() => setDeleteFolderDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <AlertDialogTitle className="text-xl">Delete Folder</AlertDialogTitle>
            </div>
            <AlertDialogDescription>
              <p className="font-semibold text-slate-900">Delete folder "{deleteFolderDialog}"?</p>
              <p className="mt-1">This will permanently delete all {folderCounts[deleteFolderDialog]} documents. Cannot be undone.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteFolderMutation.mutate(deleteFolderDialog)}
              disabled={deleteFolderMutation.isPending} className="bg-red-600 hover:bg-red-700">
              {deleteFolderMutation.isPending
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Deleting...</>
                : <><Trash2 className="w-4 h-4 mr-2" />Delete Folder</>}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Folder duplicates */}
      <Dialog open={!!folderDuplicatesDialog} onOpenChange={() => setFolderDuplicatesDialog(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Duplicate Documents in "{folderDuplicatesDialog?.folderName}"</DialogTitle>
            <DialogDescription>
              {(folderDuplicatesDialog as any)?.groups?.length > 0
                ? `Found ${folderDuplicatesDialog.groups.length} duplicate group${folderDuplicatesDialog.groups.length !== 1 ? "s" : ""}.`
                : "No duplicate documents found."}
            </DialogDescription>
          </DialogHeader>
          {(folderDuplicatesDialog as any)?.groups?.length > 0 ? (
            <div className="space-y-4">
              {folderDuplicatesDialog.groups.map((group: any, gi: number) => (
                <div key={gi} className="border rounded-lg overflow-hidden">
                  <div className="bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Duplicate Group {gi + 1} -- {group.length} files
                  </div>
                  <div className="divide-y">
                    {group.map((doc: any, di: number) => {
                      const isFirst = di === 0;
                      const isSelected = selectedDuplicateIds.has(doc.id);
                      return (
                        <div key={doc.id} className={`flex items-center gap-3 px-4 py-3 ${isFirst ? "bg-green-50" : ""}`}>
                          {isFirst ? (
                            <div className="w-5 h-5 flex items-center justify-center">
                              <div className="w-3 h-3 rounded-full bg-green-500" title="Kept" />
                            </div>
                          ) : (
                            <Checkbox checked={isSelected} onCheckedChange={(checked: boolean) => {
                              setSelectedDuplicateIds((prev) => {
                                const next = new Set(prev);
                                if (checked) next.add(doc.id); else next.delete(doc.id);
                                return next;
                              });
                            }} />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 truncate">{doc.title}</p>
                            <p className="text-xs text-slate-500">
                              {isFirst ? "Keep (original)" : "Mark for deletion"}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-slate-500">
              <Copy className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p>No duplicate documents found.</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setFolderDuplicatesDialog(null)}>Close</Button>
            {(folderDuplicatesDialog as any)?.groups?.length > 0 && selectedDuplicateIds.size > 0 && (
              <Button onClick={deleteSelectedDuplicates} disabled={deletingDuplicates} className="bg-red-600 hover:bg-red-700">
                {deletingDuplicates
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Deleting...</>
                  : <><Trash2 className="w-4 h-4 mr-2" />Delete {selectedDuplicateIds.size} Duplicate{selectedDuplicateIds.size !== 1 ? "s" : ""}</>}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Move to folder */}
      <Dialog open={showMoveDialog} onOpenChange={setShowMoveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move Documents to Folder</DialogTitle>
            <DialogDescription>
              Move {selectedDocuments.size} selected document{selectedDocuments.size !== 1 ? "s" : ""} to a folder
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input placeholder="Enter new folder name or select existing"
              value={moveToFolder} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMoveToFolder(e.target.value)} autoFocus />
            {folders.length > 0 && (
              <div className="mt-3">
                <p className="text-xs text-slate-500 mb-2">Or select existing folder:</p>
                <div className="flex flex-wrap gap-2">
                  {folders.map((folder) => (
                    <Button key={folder} variant="outline" size="sm"
                      onClick={() => setMoveToFolder(folder)} className="text-xs">
                      <Folder className="w-3 h-3 mr-1" />{folder}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMoveDialog(false)}>Cancel</Button>
            <Button onClick={() => moveDocumentsMutation.mutate({ docIds: Array.from(selectedDocuments) as string[], folder: moveToFolder || null } as any)}
              disabled={moveDocumentsMutation.isPending || !moveToFolder}>
              {moveDocumentsMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Moving...</> : "Move"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}


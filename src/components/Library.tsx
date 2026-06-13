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
  ShieldCheck,
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
  ClipboardList,
  FileSpreadsheet,
  Layers,
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
const Tooltip = ({ children, ...p }: any) => {
  const [show, setShow] = React.useState(false);
  return (
    <span className="relative inline-flex" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)} {...p}>
      {React.Children.map(children, (c: any) => c)}
      {show && <span className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 rounded bg-slate-800 text-white text-xs whitespace-nowrap pointer-events-none shadow-lg"
        style={{minWidth: 'max-content'}}>{(React.Children.toArray(children) as any[]).find((c: any) => c?.type === TooltipContent)?.props?.children}</span>}
    </span>
  );
};
const TooltipTrigger = ({ asChild, children }: any) => <>{children}</>;
const TooltipContent = ({ children }: any) => null;
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

// calls from pushing each other over API Gateway's 29s timeout on large files.
// Large PDFs (8MB+) need the full budget. Speed is recovered by the assembly
// line approach (summary starts on completed parts while later parts still assess).

// ---------------------------------------------------------------------------
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

// partId (string) + localPageNum (number) are stable primitives -- memo bails out correctly.
// Caches the loaded pdf document object in window._crpPdfCache[partId] so page navigation
// is instant without re-fetching the whole PDF.

// =============================================================================
// =============================================================================

// ── Facesheet PII extraction (client-side) ─────────────────────────────────
function parseFacesheetPii(extractedText: string): Record<string, string> {
  const t = extractedText || '';
  const find = (pats: RegExp[]): string => {
    for (const p of pats) { p.lastIndex = 0; const m = p.exec(t); if (m && m[1]) return m[1].trim(); }
    return '';
  };
  const name = find([
    /(?:PATIENT|Patient)\s*[:|]\s*([A-Z][A-Z\-,'. ]{2,40})/,
    /^NAME\s*[:|]\s*([A-Z][A-Z\-,'. ]{2,40})/m,
    /CLAIMANT\s*[:|]\s*([A-Za-z][A-Za-z\-,'. ]+)/i,
  ]);
  const dob = find([
    /(?:DOB|D\.O\.B\.|DATE\s*OF\s*BIRTH|Birth\s*Date)\s*[:|]\s*([\d]{1,2}[\/\-][\d]{1,2}[\/\-][\d]{2,4})/i,
  ]);
  const ssn = find([ /(\d{3}-\d{2}-\d{4})/, /SSN\s*[:|]?\s*(\d{9})/i ]);
  const phone = find([
    /(?:PHONE#?|Patient\s*[Pp]hone|PH(?:ONE)?\s*#?|TEL(?:EPHONE)?)\s*[:|]?\s*([\d()\-. ]{10,})/i,
    /(\d{3}-\d{3}-\d{4})/,
  ]);
  const mrn = find([
    /(?:MRN#?|PRN\s*[:|]?|ACCT(?:OUNT)?\s*(?:NO\.?|#)|ACCOUNT\s*(?:NO\.?|#))\s*[:|]?\s*([A-Z0-9\-]{4,})/i,
  ]);
  const streetM = t.match(/(?:STREET|ADDRESS)\s*[:|]\s*(.+)/i)
    || t.match(/^(\d{2,5}\s+[A-Z][A-Z ]+(?:AVE|ST|BLVD|DR|RD|LN|WAY|CT|TRL|TRAIL|PKWY|CIR|PL|LOOP|RANCH))/im);
  const street = streetM ? streetM[1].trim() : '';
  const cityM  = t.match(/(?:C\/S\/Z[P]?|CITY)\s*[:|]\s*([A-Z][A-Z ]+)[,\s]+([A-Z]{2})\s+(\d{5})/i)
    || t.match(/([A-Z][A-Z ]+?),?\s+(NV|CA|TX|AZ|FL|NY|IL|WA|CO|GA|NM|UT|ID|OR|MN)\s+(\d{5})/);
  const city     = cityM ? cityM[1].trim() : '';
  const stateZip = cityM ? `${cityM[2]} ${cityM[3]}` : '';
  const spouseM  = t.match(/(?:SPOUSE|COMPANION)[\s\S]{0,20}([A-Z][A-Z ,]{3,30})/i);
  const spouse   = spouseM ? spouseM[1].trim() : '';
  const empM     = t.match(/(?:EMPLOYER|PATIENT\s*EMPLOYER)\s*[:|]?\s*(.+)/i);
  const employer = empM && !/UNEMPLOYED|NONE/i.test(empM[1]) ? empM[1].trim() : '';
  return { patientName: name, dob, ssn, phone, mrn, street, city, stateZip, spouse, employer };
}

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
  const downloadRedactionLog = async (doc: any) => {
    const logKey = (doc as any).redaction_log_key;
    if (!logKey) { alert('No redaction log available for this document.'); return; }
    try {
      // Use the backend's download-url endpoint with an explicit S3 key override
      const result = await awsProxy(`/documents/${doc.id}/download-url?key=${encodeURIComponent(logKey)}`, 'GET');
      const url = result.url || result.download_url || result.signedUrl;
      if (!url) throw new Error('No URL returned');
      const a = document.createElement('a');
      a.href = url;
      a.download = (doc.title || 'document').replace(/_REDACTED\.pdf$/i, '') + '_REDACTION_LOG.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err: any) {
      alert('Could not download redaction log: ' + (err.message || err));
    }
  };

  const flattenDocument = async (doc: any) => {
    if (flatteningDocId) return;
    setFlatteningDocId(doc.id);
    try {
      const result = await awsProxy(`/documents/${doc.id}/flatten`, 'POST', {});
      if (result.status === 'complete') {
        toast.success('PDF flattened — text layer removed from redacted pages.');
      } else {
        toast.error('Flatten failed: ' + (result.error || 'Unknown error'));
      }
    } catch (err: any) {
      toast.error('Flatten error: ' + (err.message || err));
    } finally {
      setFlatteningDocId(null);
    }
  };

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
  const [flatteningDocId, setFlatteningDocId] = useState<string | null>(null);
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
        is_redacted: d.is_redacted || false,
        redacted_from: d.redacted_from || null,
        title: d.original_filename || d.title || d.file_name || d.filename || "Untitled",
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

  // relative to the full document across all parts.
  // Part 1 (pages 1-100): page_offset=0
  // Part 2 (pages 1-49):  page_offset=100 -> saved as pages 101-149

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

  // --- Facesheet -----------------------------------------------------------
  const setFacesheetMutation = useMutation({
    mutationFn: async ({ doc, allDocsInFolder }: { doc: any; allDocsInFolder: any[] }) => {
      const detail = await awsProxy(`/documents/${doc.id}`, 'GET');
      const pii    = parseFacesheetPii(detail.extracted_text || '');
      for (const d of allDocsInFolder) {
        const isSelf = d.id === doc.id;
        await awsProxy(`/documents/${d.id}`, 'PUT', {
          pii_facesheet: isSelf ? true : false,
          facesheet_pii: isSelf ? JSON.stringify(pii) : null,
        });
      }
      return pii;
    },
    onSuccess: (_pii: any, { doc }: any) => {
      queryClient.invalidateQueries({ queryKey: ['aws-documents'] });
      toast.success('Facesheet saved: ' + (doc.title || doc.original_filename || doc.id));
    },
    onError: (err: any) => toast.error('Failed to set facesheet: ' + err.message),
  });

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
                  const totalPages = (doc._is_group ? (doc._parts || []) : [doc]).reduce((s: number, p: any) => s + (p.page_count || 0), 0);

                  return (
                    <Card key={doc.id} className={`hover:shadow-lg transition-all duration-300 group ${selectedDocuments.has(doc.id) ? "ring-2 ring-blue-500 bg-blue-50" : ""}`}>
                      <CardContent className="p-6">
                        <div className="space-y-4">

                          {/* Classification panel */}

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
                              (doc as any).is_redacted ? "bg-green-100" : "bg-cyan-100"
                            }`}>
                              {(doc as any).is_redacted
                                ? <ShieldCheck className="w-6 h-6 text-green-600" />
                                : <FileText className="w-6 h-6 text-cyan-600" />}
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
                                  </TooltipTrigger>
                                  <TooltipContent><p>Re-classify pages</p></TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon"
                                      className={`h-8 w-8 transition-opacity ${(doc as any).pii_facesheet ? 'text-green-600 opacity-100' : 'opacity-0 group-hover:opacity-100 text-amber-600 hover:text-amber-700 hover:bg-amber-50'}`}
                                      onClick={() => {
                                        const folderDocs = documents.filter((d: any) => (d.folder || 'Unfiled') === (doc.folder || 'Unfiled'));
                                        setFacesheetMutation.mutate({ doc, allDocsInFolder: folderDocs });
                                      }}>
                                      <ClipboardList className="w-4 h-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent><p>{(doc as any).pii_facesheet ? '✅ Facesheet — click to refresh' : 'Set as Facesheet'}</p></TooltipContent>
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
                                { (doc as any).redaction_log_key && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon"
                                      className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                                      onClick={(e) => { e.stopPropagation(); downloadRedactionLog(doc); }}>
                                      <FileSpreadsheet className="w-4 h-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent><p>Download redaction log (CSV)</p></TooltipContent>
                                </Tooltip>
                                )}
                                { (doc as any).is_redacted && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon"
                                      className="h-8 w-8 text-purple-600 hover:text-purple-700 hover:bg-purple-50 disabled:opacity-40"
                                      disabled={flatteningDocId === doc.id}
                                      onClick={(e) => { e.stopPropagation(); flattenDocument(doc); }}>
                                      {flatteningDocId === doc.id
                                        ? <Loader2 className="w-4 h-4 animate-spin" />
                                        : <Layers className="w-4 h-4" />}
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent><p>Flatten PDF (permanently remove text layer from redacted pages)</p></TooltipContent>
                                </Tooltip>
                                )}
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
                                  <div className="flex items-start justify-between gap-2 mb-2">
                                    <h3 className="font-semibold text-slate-900 line-clamp-2 cursor-default">{doc.title}</h3>
                                    {totalPages > 0 && (
                                      <span className="shrink-0 text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full whitespace-nowrap">
                                        {totalPages} pg
                                      </span>
                                    )}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent><p>{doc.title}</p></TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            {/* Badges */}
                            <div className="flex flex-wrap gap-2">
                              {doc.folder && (
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                  <Folder className="w-3 h-3 mr-1" />{doc.folder}
                                </Badge>
                              )}
                              {(doc as any).pii_facesheet && (
                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                  <ClipboardList className="w-3 h-3 mr-1" />Facesheet
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


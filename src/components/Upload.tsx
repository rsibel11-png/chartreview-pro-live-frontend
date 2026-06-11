// Upload.tsx — chartreview-native-frontend
// Ported: 2026-05-03 — CRA/TypeScript port of Upload v16
// Fixes applied: env vars, inlined UI components, removed useNavigate/createPageUrl,
//   opts:any, _pdfLib:any, all callback params typed, Array.from for sets

import React, { useState, useCallback, useRef } from "react";
import { Loader2 } from "lucide-react";
import toast from "react-hot-toast";

// ── Env vars (CRA) ────────────────────────────────────────────────────────────
const AWS_API_URL = process.env.REACT_APP_AWS_API_URL || "";
const ORG_ID      = process.env.REACT_APP_ORG_ID      || "";
const API_KEY     = process.env.REACT_APP_AWS_API_KEY  || "";
let _idToken = "";

const MAX_FILE_SIZE_MB   = 100;
const SPLIT_THRESHOLD_MB = 5;

// ── Inlined UI primitives ─────────────────────────────────────────────────────
function Button({ children, onClick, disabled, className = "", variant = "default", size = "default" }: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  variant?: string;
  size?: string;
}) {
  const base = "inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none disabled:opacity-50 disabled:pointer-events-none";
  const variants: any = {
    default: "bg-blue-600 text-white hover:bg-blue-700",
    outline: "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
    destructive: "bg-red-600 text-white hover:bg-red-700",
  };
  const sizes: any = { default: "px-4 py-2 text-sm", sm: "px-3 py-1.5 text-xs" };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${variants[variant] || variants.default} ${sizes[size] || sizes.default} ${className}`}
    >
      {children}
    </button>
  );
}

function Progress({ value, className = "" }: { value: number; className?: string }) {
  return (
    <div className={`w-full bg-slate-200 rounded-full overflow-hidden ${className}`}>
      <div
        className="bg-blue-500 h-full transition-all duration-300"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

function Input({ value, onChange, placeholder, className = "", autoFocus }: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      autoFocus={autoFocus}
      className={`w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
    />
  );
}

// ── Lucide-style icon stubs (inlined SVGs to avoid dep issues) ────────────────
const FileText = ({ className = "" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);
const X = ({ className = "" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);
const CheckCircle = ({ className = "" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const AlertCircle = ({ className = "" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const RefreshCw = ({ className = "" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
  </svg>
);
const Scissors = ({ className = "" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <circle cx="6" cy="6" r="3" strokeWidth={2} /><circle cx="6" cy="18" r="3" strokeWidth={2} />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 4L8.12 15.88M14.47 14.48L20 20M8.12 8.12L12 12" />
  </svg>
);
const Shield = ({ className = "" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);
const UploadIcon = ({ className = "" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
  </svg>
);

// ── Helpers ───────────────────────────────────────────────────────────────────
function sanitizeFilename(name: string): string {
  return name
    .replace(/'/g, "")
    .replace(/[^a-zA-Z0-9._\-()]/g, "_")
    .replace(/_+/g, "_");
}
function inferFolderFromFilename(filename: string): string | null {
  // Strip extension
  const base = filename.replace(/\.[^.]+$/, '');
  // Split on underscores only (preserves MORA-MALDONADO as one token)
  const tokens = base.split('_');
  // Find indices of ALL-CAPS tokens (optionally hyphenated, min 2 chars or single letter)
  const capIndices: number[] = [];
  tokens.forEach((t, i) => {
    if (/^[A-Z][A-Z\-]*[A-Z]$|^[A-Z]$/.test(t)) capIndices.push(i);
  });
  if (capIndices.length < 2) return null;
  // Find longest consecutive run of cap tokens
  let best: number[] = [], cur: number[] = [capIndices[0]];
  for (let k = 1; k < capIndices.length; k++) {
    if (capIndices[k] === cur[cur.length - 1] + 1) { cur.push(capIndices[k]); }
    else { if (cur.length > best.length) best = cur; cur = [capIndices[k]]; }
  }
  if (cur.length > best.length) best = cur;
  if (best.length < 2) return null;
  const nameToks = best.map(i => tokens[i]);
  const last = nameToks[0]; // e.g. MORA-MALDONADO
  const firstParts = nameToks.slice(1).filter(t => t.length > 1); // drop bare initials
  const first = (firstParts.length ? firstParts : nameToks.slice(1))
    .map(t => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase()).join(' ');
  return first ? `${last}, ${first}` : last;
}



function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

async function getUploadUrl(payload: any, retries = 3): Promise<any> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const res = await fetch(`${AWS_API_URL}/documents/upload-url`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": API_KEY,
        "Authorization": `Bearer ${_idToken}`,
        "x-org-id": ORG_ID,
      },
      body: JSON.stringify(payload),
    });
    if (res.ok) return res.json();
    const err = await res.json().catch(() => ({}));
    if (attempt === retries) throw new Error(err.error || `getUploadUrl failed: ${res.status}`);
    await new Promise((r) => setTimeout(r, attempt * 2000));
  }
}

function uploadToS3(presignedUrl: string, file: File, onProgress: ((pct: number) => void) | null): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", presignedUrl);
    xhr.setRequestHeader("Content-Type", file.type || "application/pdf");
    if (onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      };
    }
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(`S3 upload failed: ${xhr.status}`));
    xhr.onerror = () => reject(new Error("S3 upload network error"));
    xhr.send(file);
  });
}

async function awsProxy(path: string, method = "GET", data?: any, retries = 4): Promise<any> {
  for (let attempt = 0; attempt < retries; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, attempt * 5000));
    const url = `${AWS_API_URL}${path}`;
    const opts: any = {
      method,
      headers: {
        "Content-Type": "application/json",
        "x-api-key": API_KEY,
        "Authorization": `Bearer ${_idToken}`,
        "x-org-id": ORG_ID,
      },
    };
    if (data) opts.body = JSON.stringify(data);
    const res = await fetch(url, opts);
    if (res.ok) return res.json();
    const err = await res.json().catch(() => ({}));
    const msg = err.error || `AWS proxy error: ${res.status}`;
    if (attempt === retries - 1) throw new Error(msg);
    console.warn(`awsProxy attempt ${attempt + 1} failed (${msg}), retrying...`);
  }
}

// ── Global process queue ──────────────────────────────────────────────────────
const processQueue: Array<{ docId: string; resolve: (v: any) => void; reject: (e: any) => void }> = [];
let processRunning = false;

async function drainProcessQueue() {
  if (processRunning) return;
  processRunning = true;
  while (processQueue.length > 0) {
    const { docId, resolve, reject } = processQueue.shift()!;
    let success = false;
    for (let attempt = 0; attempt < 4; attempt++) {
      if (attempt > 0) {
        console.warn(`/process retry ${attempt} for ${docId}`);
        await new Promise((r) => setTimeout(r, 8000 * attempt));
      }
      try {
        const result = await awsProxy(`/documents/${docId}/process`, "POST");
        resolve(result);
        success = true;
        break;
      } catch (e: any) {
        if (attempt === 3) {
          console.error(`/process failed after 4 attempts for ${docId}:`, e.message);
          reject(e);
        }
      }
    }
    if (processQueue.length > 0) {
      await new Promise((r) => setTimeout(r, 6000));
    }
  }
  processRunning = false;
}

function enqueueProcess(docId: string): Promise<any> {
  return new Promise((resolve, reject) => {
    processQueue.push({ docId, resolve, reject });
    drainProcessQueue();
  });
}

// ── Client-side PDF splitting ─────────────────────────────────────────────────
let _pdfLib: any = null;

async function _getPdfLib(): Promise<any> {
  if (_pdfLib) return _pdfLib;
  const mod = await import("https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.esm.min.js" as any);
  _pdfLib = mod;
  return _pdfLib;
}

const PAGES_PER_CHUNK = 50;

async function splitPdfClientSide(
  file: File,
  originalDocId: string,
  folder: string,
  onProgress: ((pct: number) => void) | null
): Promise<{ split: boolean; parts: any[] }> {
  const { PDFDocument } = await _getPdfLib();
  const arrayBuffer = await file.arrayBuffer();
  const srcDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  const totalPages = srcDoc.getPageCount();

  if (totalPages <= PAGES_PER_CHUNK) {
    return { split: false, parts: [] };
  }

  const numChunks = Math.ceil(totalPages / PAGES_PER_CHUNK);
  const parts: any[] = [];

  for (let i = 0; i < numChunks; i++) {
    const startPage = i * PAGES_PER_CHUNK;
    const endPage = Math.min(startPage + PAGES_PER_CHUNK, totalPages);
    const pageCount = endPage - startPage;

    const chunkDoc = await PDFDocument.create();
    const pageIdxs = Array.from({ length: pageCount }, (_: any, k: number) => startPage + k);
    const copiedPages = await chunkDoc.copyPages(srcDoc, pageIdxs);
    copiedPages.forEach((p: any) => chunkDoc.addPage(p));
    const chunkBytes = await chunkDoc.save();

    const chunkFile = new File(
      [chunkBytes],
      `${file.name.replace(/\.pdf$/i, "")}_Part${i + 1}.pdf`,
      { type: "application/pdf" }
    );

    const { upload_url, aws_document_id } = await getUploadUrl({
      filename: sanitizeFilename(chunkFile.name),
      content_type: "application/pdf",
      file_size: chunkFile.size,
      folder: folder.trim() || null,
      parent_filename: file.name,
      total_parts: numChunks,
      part_index: i,
      original_document_id: originalDocId,
      page_count: pageCount,
    });

    await uploadToS3(upload_url, chunkFile, null);
    parts.push({ aws_document_id, page_count: pageCount, part_index: i });
    if (onProgress) onProgress(Math.round(((i + 1) / numChunks) * 100));
  }

  return { split: true, parts };
}

// ── FileRow sub-component ─────────────────────────────────────────────────────
const FileRow = React.memo(({ file, onRemove, onRetry }: { file: any; onRemove: (id: string) => void; onRetry: (id: string) => void }) => {
  const statusColor: any = {
    pending: "text-slate-500",
    uploading: "text-blue-600",
    splitting: "text-purple-600",
    processing: "text-purple-600",
    completed: "text-green-600",
    error: "text-red-600",
  }[file.status] || "text-slate-500";

  const statusLabel: any = {
    pending: "Pending",
    uploading: `Uploading… ${file.progress || 0}%`,
    splitting: `Splitting into parts… ${file.progress || 0}%`,
    processing: `Processing… ${file.progress || 0}%`,
    completed: file.splitIntoParts
      ? `Complete — split into ${file.splitIntoParts} parts`
      : "Complete",
    error: file.error || "Error",
  }[file.status] || file.status;

  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border ${
      file.status === "completed" ? "bg-green-50 border-green-200"
      : file.status === "error" ? "bg-red-50 border-red-200"
      : file.status === "splitting" ? "bg-purple-50 border-purple-200"
      : "bg-white border-slate-200"
    }`}>
      {file.status === "splitting"
        ? <Scissors className="w-5 h-5 text-purple-400 shrink-0 animate-pulse" />
        : <FileText className="w-5 h-5 text-slate-400 shrink-0" />
      }
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-900 truncate">{file.name}</p>
        <p className={`text-xs mt-0.5 ${statusColor}`}>{statusLabel}</p>
        {["uploading", "splitting", "processing"].includes(file.status) && (
          <Progress value={file.progress || 0} className="h-1 mt-1" />
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-xs text-slate-400">{formatSize(file.size)}</span>
        {file.status === "pending" && (
          <button onClick={() => onRemove(file.id)} className="text-slate-400 hover:text-red-500">
            <X className="w-4 h-4" />
          </button>
        )}
        {file.status === "completed" && <CheckCircle className="w-4 h-4 text-green-500" />}
        {file.status === "error" && (
          <div className="flex items-center gap-1">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <button
              onClick={() => onRetry(file.id)}
              title="Retry upload"
              className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-white bg-red-500 hover:bg-red-600 rounded transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              Retry
            </button>
          </div>
        )}
        {["uploading", "splitting", "processing"].includes(file.status) && (
          <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
        )}
      </div>
    </div>
  );
});

// ── Main component ────────────────────────────────────────────────────────────
export default function Upload({ onNavigate, idToken = "" }: { onNavigate?: (page: string) => void; idToken?: string }) {
  // Sync idToken into module-level var so helper functions can access it
  React.useEffect(() => { _idToken = idToken; }, [idToken]);

  const inputRef = useRef<HTMLInputElement>(null);
  const [fileItems, setFileItems] = useState<any[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [folder, setFolder] = useState("");
  const [uploading, setUploading] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [allDone, setAllDone] = useState(false);

  const addFiles = useCallback((newFiles: File[]) => {
    const items = newFiles.map((f: File) => ({
      id: `${f.name}-${f.size}-${Date.now()}-${Math.random()}`,
      file: f,
      name: f.name,
      size: f.size,
      status: "pending",
      progress: 0,
      error: null,
    }));
    setFileItems((prev: any[]) => [...prev, ...items]);
    setAllDone(false);
    // Auto-suggest folder from filename if folder is currently empty
    setFolder((prev: string) => {
      if (prev.trim()) return prev; // don't overwrite user's existing folder
      for (const f of newFiles) {
        const suggested = inferFolderFromFilename(f.name);
        if (suggested) return suggested;
      }
      return prev;
    });
  }, []);

  const removeFile = (id: string) => setFileItems((prev: any[]) => prev.filter((f: any) => f.id !== id));

  const updateItem = (id: string, patch: any) =>
    setFileItems((prev: any[]) => prev.map((f: any) => (f.id === id ? { ...f, ...patch } : f)));

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    addFiles(Array.from(e.dataTransfer.files));
  }, [addFiles]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(Array.from(e.target.files));
    e.target.value = "";
  };

  const uploadFile = async (item: any) => {
    const { file } = item;
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    const isLarge = file.size > SPLIT_THRESHOLD_MB * 1024 * 1024;

    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      updateItem(item.id, { status: "error", error: `File exceeds ${MAX_FILE_SIZE_MB} MB limit.` });
      return;
    }

    try {
      updateItem(item.id, { status: "uploading", progress: 5 });
      const { upload_url, aws_document_id } = await getUploadUrl({
        filename: sanitizeFilename(file.name),
        content_type: file.type || "application/pdf",
        file_size: file.size,
        title: file.name,
        folder: folder.trim() || null,
      });

      await uploadToS3(upload_url, file, (pct: number) => {
        updateItem(item.id, { progress: 5 + Math.round(pct * 0.4) });
      });
      updateItem(item.id, { progress: 46 });

      if (isPdf && isLarge) {
        updateItem(item.id, { status: "splitting", progress: 48 });
        const splitData = await splitPdfClientSide(
          file,
          aws_document_id,
          folder,
          (splitPct: number) => updateItem(item.id, { progress: 48 + Math.round(splitPct * 0.2) })
        );
        const parts = splitData.parts || [];

        if (!splitData.split || parts.length === 0) {
          updateItem(item.id, { status: "processing", progress: 90 });
          await enqueueProcess(aws_document_id);
          updateItem(item.id, { status: "completed", progress: 100 });
          return;
        }

        updateItem(item.id, { status: "processing", progress: 70 });
        for (let i = 0; i < parts.length; i++) {
          await enqueueProcess(parts[i].aws_document_id);
          updateItem(item.id, { progress: 70 + Math.round(((i + 1) / parts.length) * 28) });
        }
        updateItem(item.id, { status: "completed", progress: 100, splitIntoParts: parts.length });
        return;
      }

      updateItem(item.id, { status: "processing", progress: 92 });
      await enqueueProcess(aws_document_id);
      updateItem(item.id, { status: "completed", progress: 100 });
    } catch (err: any) {
      let errMsg = err.message || "Upload failed";
      if (errMsg.includes("http") || errMsg.includes("X-Amz") || errMsg.length > 120) {
        const urlIdx = errMsg.search(/https?:\/\//);
        if (urlIdx > 0) errMsg = errMsg.substring(0, urlIdx).trim().replace(/[,:]$/, "");
        else errMsg = errMsg.substring(0, 120).trim();
        if (errMsg.length < 10) errMsg = "Upload failed — network error. Please retry.";
      }
      updateItem(item.id, { status: "error", error: errMsg });
    }
  };

  const handleRetry = async (id: string) => {
    // Reset item to pending then re-upload it
    const item = fileItems.find((f: any) => f.id === id);
    if (!item) return;
    updateItem(id, { status: "pending", error: undefined, progress: 0 });
    setUploading(true);
    try {
      await uploadFile({ ...item, status: "pending", error: undefined, progress: 0 });
    } finally {
      setUploading(false);
    }
  };

  const handleUploadAll = async () => {
    const pending = fileItems.filter((f: any) => f.status === "pending");
    if (!pending.length) return;
    setUploading(true);
    setGlobalError(null);

    const CONCURRENCY = 3;
    let index = 0;
    const runNext = async (workerIndex: number) => {
      if (workerIndex > 0) {
        await new Promise((r) => setTimeout(r, workerIndex * 5000));
      }
      while (index < pending.length) {
        const item = pending[index++];
        await uploadFile(item);
        const wasSplit = (item.splitIntoParts || 0) > 1;
        const gap = wasSplit ? 8000 : 3000;
        await new Promise((r) => setTimeout(r, gap));
      }
    };

    await Promise.all(Array.from({ length: CONCURRENCY }, (_: any, i: number) => runNext(i)));
    setUploading(false);
    setAllDone(true);
  };

  const pendingCount   = fileItems.filter((f: any) => f.status === "pending").length;
  const completedCount = fileItems.filter((f: any) => f.status === "completed").length;
  const errorCount     = fileItems.filter((f: any) => f.status === "error").length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between">
          <h1 className="text-4xl font-extrabold text-slate-900 leading-tight">
            Upload<br />Documents
          </h1>
          <Button variant="outline" onClick={() => onNavigate?.("Dashboard")} className="mt-1">
            Back to Dashboard
          </Button>
        </div>

        {/* HIPAA badge */}
        <div className="flex items-start gap-3 bg-white border border-green-200 rounded-xl px-4 py-3 shadow-sm">
          <Shield className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-green-700">HIPAA Compliant</p>
            <p className="text-xs text-slate-500 mt-0.5">
              All files are encrypted and securely stored. PDFs over 5 MB are automatically split into 50-page chunks for reliable processing.
            </p>
          </div>
        </div>

        {/* Folder selector */}
        <div className="bg-white border border-slate-200 rounded-xl px-4 py-4 shadow-sm space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer select-none">
            <input
              type="checkbox"
              className="rounded"
              checked={folder !== ""}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFolder(e.target.checked ? " " : "")}
            />
            Assign to Folder (optional)
          </label>
          {folder !== "" && (
            <Input
              placeholder="e.g. John Doe — Case 12345"
              value={folder}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFolder(e.target.value)}
              className="mt-1"
              autoFocus
            />
          )}
        </div>

        {/* Drop zone */}
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => !uploading && inputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-xl px-6 py-12 text-center cursor-pointer transition-colors ${
            dragActive
              ? "border-blue-400 bg-blue-50"
              : "border-slate-300 bg-white hover:border-blue-300 hover:bg-slate-50"
          } ${uploading ? "pointer-events-none opacity-60" : ""}`}
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png"
            className="hidden"
            onChange={handleFileInput}
          />
          <UploadIcon className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600 font-medium">
            Drop PDFs here or <span className="text-blue-600 underline underline-offset-2">click to browse</span>
          </p>
          <p className="text-xs text-slate-400 mt-1">
            PDF, JPG, PNG — Max {MAX_FILE_SIZE_MB} MB — PDFs over {SPLIT_THRESHOLD_MB} MB auto-split
          </p>
        </div>

        {/* Global error */}
        {globalError && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {globalError}
          </div>
        )}

        {/* File list */}
        {fileItems.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <span className="text-sm font-semibold text-slate-700">Files ({fileItems.length})</span>
              <div className="flex gap-3">
                {completedCount > 0 && (
                  <button
                    className="text-xs text-slate-400 hover:text-slate-600"
                    onClick={() => setFileItems((prev: any[]) => prev.filter((f: any) => f.status !== "completed"))}
                  >
                    Clear Completed
                  </button>
                )}
                {completedCount > 0 && (
                  <button
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                    onClick={() => onNavigate?.("Library")}
                  >
                    View in Library
                  </button>
                )}
              </div>
            </div>
            <div className="divide-y divide-slate-100 px-3 py-2 space-y-1">
              {fileItems.map((f: any) => (
                <FileRow key={f.id} file={f} onRemove={removeFile} onRetry={handleRetry} />
              ))}
            </div>
          </div>
        )}

        {/* Upload button */}
        {pendingCount > 0 && (
          <Button
            onClick={handleUploadAll}
            disabled={uploading}
            className="w-full h-12 text-base font-semibold bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 shadow-md"
          >
            {uploading ? (
              <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Uploading…</>
            ) : (
              <><UploadIcon className="w-5 h-5 mr-2" />Upload {pendingCount} File{pendingCount !== 1 ? "s" : ""}</>
            )}
          </Button>
        )}

        {/* All done banner */}
        {allDone && completedCount > 0 && errorCount === 0 && (
          <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
            <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-green-700">
                {completedCount} file{completedCount !== 1 ? "s" : ""} uploaded successfully
              </p>
              <p className="text-xs text-slate-500">
                Documents are processing in the background — check the Library in a few minutes.
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={() => onNavigate?.("Library")}
              className="border-green-300 text-green-700 hover:bg-green-100">
              View Library
            </Button>
          </div>
        )}

      </div>
    </div>
  );
}


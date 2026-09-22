// Updated: 2026-09-22 -- Removed the dead REACT_APP_AWS_API_KEY / x-api-key header. It was never real AWS credentials (wrong format), and every backend handler stopped checking it on 2026-09-19 in favor of real Cognito JWT verification -- it was just an inert string being shipped in the JS bundle for no reason.
// Upload.tsx — chartreview-pro-live-frontend
// Updated: 2026-09-21 — Fixed the one caveat left from the wait-for-processed change: the
//   status bar used to vanish if you navigated to Library/Summaries and back mid-upload,
//   because plain useState() resets when React unmounts/remounts a component, even though
//   the background upload work itself kept running underneath the whole time. Moved
//   fileItems/uploading/allDone into a small module-level store (see _uploadStore below)
//   that survives Upload unmounting -- the component just subscribes to it, so navigating
//   away and back now shows the real, still-accurate progress instead of an empty list.
// Updated: 2026-09-21 — "Upload complete" now waits for backend processing too. Previously
//   a file was marked "completed" as soon as POST /process (SQS enqueue) succeeded -- the
//   Library still showed it mid-processing (Textract + relevance assess) for a while after.
//   Added waitForProcessed(), which polls GET /documents/{id} until status is "processed" or
//   "failed" before the file is marked done, so from the user's point of view the whole
//   pipeline (upload + processing) happens inside the Upload step. Falls back to a
//   "still processing" state after ~16 min (past the backend worker's own 900s timeout) so a
//   stuck/huge document can't hang the Upload button forever. No backend change needed --
//   GET /documents/{id} already returns status.
// Updated: 2026-09-21 — Removed the 100MB ceiling as the real blocker for large files: PDFs
//   over SPLIT_THRESHOLD_MB now bypass MAX_FILE_SIZE_MB and go straight to the existing
//   auto-split path (up to MAX_SPLITTABLE_PDF_MB, a browser-memory safety net, not a real
//   cap). The zip container's own size check no longer reuses MAX_FILE_SIZE_MB either --
//   zips get their own much higher MAX_ZIP_SIZE_MB ceiling since bundling many small valid
//   files can easily push a zip past 100MB with nothing wrong inside it.
// Updated: 2026-09-21 — Zip contents now go through a checkbox review panel (select which
//   extracted files to actually add) instead of being added automatically.
// Updated: 2026-09-21 — Added ZIP upload support: client-side unzip (via esm.sh JSZip CDN,
//   same dynamic-import pattern as pdf-lib below) into accepted PDF/JPG/PNG files, which
//   then flow through the existing addFiles/page-count/split/upload pipeline unchanged.
// Updated: 2026-08-30 — Simplified status messages for production (hide internal pipeline steps)
// Updated: 2026-08-22 — Integrated Stripe per-page payment flow
// Ported: 2026-05-03 — CRA/TypeScript port of Upload v16
// Fixes applied: env vars, inlined UI components, removed useNavigate/createPageUrl,
//   opts:any, _pdfLib:any, all callback params typed, Array.from for sets

import React, { useState, useCallback, useRef, useEffect } from "react";
import { Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import PagePaymentDialog from "./PagePaymentDialog";
import { _splitBridge } from "./SplitPdf";

// ── Env vars (CRA) ────────────────────────────────────────────────────────────
const AWS_API_URL = process.env.REACT_APP_AWS_API_URL || "";
const ORG_ID      = process.env.REACT_APP_ORG_ID      || "";
let _idToken = "";

const MAX_FILE_SIZE_MB       = 100; // hard cap for non-PDFs (JPG/PNG can't be split)
const SPLIT_THRESHOLD_MB     = 5;   // PDFs over this get auto-split into 50-page chunks
const MAX_SPLITTABLE_PDF_MB  = 500; // browser-memory safety net for PDFs going through split
const MAX_ZIP_SIZE_MB        = 1000; // safety net for the zip container itself (pre-extraction)

const ACCEPTED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png'];

function guessMimeType(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.png')) return 'image/png';
  return 'application/octet-stream';
}

function isAcceptedFilename(filename: string): boolean {
  const lower = filename.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

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
const FileText = ({ className = "" }: any) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);
const X = ({ className = "" }: any) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);
const CheckCircle = ({ className = "" }: any) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const AlertCircle = ({ className = "" }: any) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const RefreshCw = ({ className = "" }: any) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
  </svg>
);
const Shield = ({ className = "" }: any) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);
const UploadIcon = ({ className = "" }: any) => (
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
  const base = filename.replace(/\.[^.]+$/, '');
  const tokens = base.split('_');
  const capIndices: number[] = [];
  tokens.forEach((t, i) => {
    if (/^[A-Z][A-Z\-]*[A-Z]$|^[A-Z]$/.test(t)) capIndices.push(i);
  });
  if (capIndices.length < 2) return null;
  let best: number[] = [], cur: number[] = [capIndices[0]];
  for (let k = 1; k < capIndices.length; k++) {
    if (capIndices[k] === cur[cur.length - 1] + 1) { cur.push(capIndices[k]); }
    else { if (cur.length > best.length) best = cur; cur = [capIndices[k]]; }
  }
  if (cur.length > best.length) best = cur;
  if (best.length < 2) return null;
  const nameToks = best.map(i => tokens[i]);
  const last = nameToks[0];
  const firstParts = nameToks.slice(1).filter(t => t.length > 1);
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

// ── Stripe API helpers ────────────────────────────────────────────────────────
async function stripeApiCall(path: string, method: string = "GET", data?: any): Promise<any> {
  const url = `${AWS_API_URL}${path}`;
  const opts: any = {
    method,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${_idToken}`,
      "x-org-id": ORG_ID,
    },
  };
  if (data) opts.body = JSON.stringify(data);
  const res = await fetch(url, opts);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || `Stripe API error: ${res.status}`);
  return json;
}

// ── Fast client-side PDF page count ──────────────────────────────────────────
async function countPdfPages(file: File): Promise<number> {
  if (!file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf')) {
    return Math.max(1, Math.round(file.size / 100000));
  }
  try {
    const buffer = await file.arrayBuffer();
    const text = new TextDecoder('latin1').decode(buffer);
    const matches = text.match(/\/Type\s*\/Page[^s]/g);
    return matches ? matches.length : Math.max(1, Math.round(file.size / 100000));
  } catch {
    return Math.max(1, Math.round(file.size / 100000));
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
      } catch (err: any) {
        if (attempt === 3) {
          reject(err);
          break;
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

// ── Wait for backend processing (Textract + relevance assess) to finish ──────
// enqueueProcess() only confirms the backend job was *queued* (SQS accepted the message) --
// it does NOT mean the document is actually usable in the Library yet. Poll the document
// record until status reaches a terminal value so the UI never claims "Complete" before
// processing has really finished. The backend worker Lambda has a 900s timeout, so poll
// comfortably past that (~16 min) before giving up and falling back to a "still processing"
// state instead of hanging the Upload button forever.
async function waitForProcessed(docId: string): Promise<{ ok: boolean; timedOut?: boolean }> {
  const POLL_INTERVAL_MS = 5000;
  const MAX_ATTEMPTS = 192; // ~16 minutes
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    try {
      const doc = await awsProxy(`/documents/${docId}`);
      if (doc.status === "processed") return { ok: true };
      if (doc.status === "failed") return { ok: false };
      // still "processing" (or "uploaded" briefly) -- keep polling
    } catch {
      // transient network/API blip -- awsProxy already retries internally; just keep
      // polling on the next tick instead of failing the whole item over one bad request.
    }
  }
  return { ok: false, timedOut: true };
}

// ── Client-side ZIP extraction ────────────────────────────────────────────────
// JSZip has no native ESM build, so (unlike pdf-lib below) we load it through esm.sh,
// which transforms the npm package into real ESM on the fly -- verified the served
// module has genuine `export` statements before relying on it here. Nothing is added
// to package.json; this mirrors the existing CDN dynamic-import pattern for pdf-lib.
let _jsZip: any = null;

async function _getJSZip(): Promise<any> {
  if (_jsZip) return _jsZip;
  const mod: any = await import("https://esm.sh/jszip@3.10.1" as any);
  _jsZip = mod.default || mod;
  return _jsZip;
}

// Unzips a .zip File client-side into the accepted document files it contains.
// Skips directories, macOS resource-fork noise (__MACOSX/, .DS_Store/._*), and any
// entry that isn't a PDF/JPG/PNG. Names are de-duplicated if two entries from
// different sub-folders share the same base filename.
async function extractZipFile(zipFile: File): Promise<File[]> {
  const JSZip: any = await _getJSZip();
  const buffer = await zipFile.arrayBuffer();
  const zip = await JSZip.loadAsync(buffer);

  const seenNames = new Set<string>();
  const extracted: File[] = [];

  const entries = Object.values(zip.files) as any[];
  for (const entry of entries) {
    if (entry.dir) continue;
    if (entry.name.includes('__MACOSX/')) continue;

    const baseName = entry.name.split('/').pop() || entry.name;
    if (!baseName || baseName.startsWith('.')) continue; // .DS_Store, ._AppleDouble, etc.
    if (!isAcceptedFilename(baseName)) continue;

    let outName = baseName;
    if (seenNames.has(outName)) {
      const dot = outName.lastIndexOf('.');
      const stem = dot > 0 ? outName.slice(0, dot) : outName;
      const ext = dot > 0 ? outName.slice(dot) : '';
      let n = 2;
      while (seenNames.has(`${stem} (${n})${ext}`)) n++;
      outName = `${stem} (${n})${ext}`;
    }
    seenNames.add(outName);

    const bytes = await entry.async('arraybuffer');
    extracted.push(new File([bytes], outName, { type: guessMimeType(outName) }));
  }

  return extracted;
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
    splitting: "text-blue-600",
    processing: "text-blue-600",
    finalizing: "text-blue-600",
    background: "text-amber-600",
    completed: "text-green-600",
    error: "text-red-600",
  }[file.status] || "text-slate-500";

  const statusLabel: any = {
    pending: "Pending",
    uploading: `Uploading… ${file.progress || 0}%`,
    splitting: `Uploading… ${file.progress || 0}%`,
    processing: `Uploading… ${file.progress || 0}%`,
    finalizing: `Finishing up… ${file.progress || 0}%`,
    background: "Still processing — check Library shortly",
    completed: "Complete",
    error: file.error || "Error",
  }[file.status] || file.status;

  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border ${
      file.status === "completed" ? "bg-green-50 border-green-200"
      : file.status === "error" ? "bg-red-50 border-red-200"
      : file.status === "background" ? "bg-amber-50 border-amber-200"
      : "bg-white border-slate-200"
    }`}>
      <FileText className="w-5 h-5 text-slate-400 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-900 truncate">{file.name}</p>
        <p className={`text-xs mt-0.5 ${statusColor}`}>{statusLabel}</p>
        {["uploading", "splitting", "processing", "finalizing", "background"].includes(file.status) && (
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
        {["uploading", "splitting", "processing", "finalizing", "background"].includes(file.status) && (
          <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
        )}
      </div>
    </div>
  );
});

// ── Persisted upload-progress store ──────────────────────────────────────────
// This app is a single-page, state-swap SPA (App.tsx swaps which page component
// renders -- no real route change or page reload). Background upload work
// (uploadFile(), waitForProcessed() polling) is NOT tied to whether the Upload
// component is mounted -- it keeps running in the JS module even after the user
// navigates to Library/Summaries. Plain useState() IS tied to the component
// instance though: navigating away and back used to remount Upload with empty
// state, so the status bar/progress list vanished even though uploads were still
// happening underneath. This module-level store is the persistent source of
// truth for the three pieces of state the status bar depends on -- writes always
// land here (so they're never lost while unmounted), and the component just
// subscribes to re-render whenever it changes.
let _uploadStore = { fileItems: [] as any[], uploading: false, allDone: false };
const _uploadStoreListeners = new Set<() => void>();

function setUploadStore(patch: Partial<typeof _uploadStore>) {
  _uploadStore = { ..._uploadStore, ...patch };
  _uploadStoreListeners.forEach((listener) => listener());
}
function subscribeUploadStore(listener: () => void) {
  _uploadStoreListeners.add(listener);
  return () => { _uploadStoreListeners.delete(listener); };
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Upload({ onNavigate, idToken = "", isFreeUser = false }: { onNavigate?: (page: string) => void; idToken?: string; isFreeUser?: boolean }) {
  // Sync idToken into module-level var so helper functions can access it
  React.useEffect(() => { _idToken = idToken; }, [idToken]);

  const inputRef = useRef<HTMLInputElement>(null);

  // Subscribe to the persisted upload store (defined above) so this component
  // re-renders whenever it changes -- including when background work (uploadFile,
  // waitForProcessed polling) updates it while Upload isn't the page on screen.
  const [, forceStoreRender] = useState(0);
  useEffect(() => subscribeUploadStore(() => forceStoreRender((n) => n + 1)), []);
  const fileItems = _uploadStore.fileItems;
  const setFileItems = (updater: any) => {
    const next = typeof updater === "function" ? updater(_uploadStore.fileItems) : updater;
    setUploadStore({ fileItems: next });
  };

  // Read split bridge on mount — if user clicked "Send to Upload" from SplitPdf
  useEffect(() => {
    if (_splitBridge.files && _splitBridge.files.length > 0) {
      const bridgeFiles = _splitBridge.files;
      _splitBridge.files = null;
      const items = bridgeFiles.map((f: File) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: f.name,
        size: f.size,
        status: "pending",
        progress: 0,
        file: f,
      }));
      setFileItems(items);
    }
  }, []);
  const [dragActive, setDragActive] = useState(false);
  const [folder, setFolder] = useState("");
  const uploading = _uploadStore.uploading;
  const setUploading = (value: boolean) => setUploadStore({ uploading: value });
  const [globalError, setGlobalError] = useState<string | null>(null);
  const allDone = _uploadStore.allDone;
  const setAllDone = (value: boolean) => setUploadStore({ allDone: value });

  // ── Payment dialog state ────────────────────────────────────────────────────
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [estimatedPageCount, setEstimatedPageCount] = useState(0);
  const [scanningPages, setScanningPages] = useState(false);
  const [extractingZip, setExtractingZip] = useState(false);
  const [zipReview, setZipReview] = useState<{ items: { id: string; file: File; checked: boolean }[] } | null>(null);

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
    setFolder((prev: string) => {
      if (prev.trim()) return prev;
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

  // Detects any .zip among the incoming files, unzips each one client-side into its
  // accepted PDF/JPG/PNG entries, then hands the combined (non-zip + extracted) file
  // list to the existing addFiles() -- so page counting, splitting, and upload all
  // proceed exactly as if the user had picked those files directly.
  const addFilesFromInput = useCallback(async (incoming: File[]) => {
    const zipFiles = incoming.filter((f) => f.name.toLowerCase().endsWith(".zip"));
    const regularFiles = incoming.filter((f) => !f.name.toLowerCase().endsWith(".zip"));

    if (zipFiles.length === 0) {
      addFiles(regularFiles);
      return;
    }

    setExtractingZip(true);
    setGlobalError(null);
    try {
      const extractedBatches: File[][] = [];
      for (const zipFile of zipFiles) {
        if (zipFile.size > MAX_ZIP_SIZE_MB * 1024 * 1024) {
          setGlobalError(`${zipFile.name} exceeds ${MAX_ZIP_SIZE_MB} MB and was skipped.`);
          continue;
        }
        try {
          const files = await extractZipFile(zipFile);
          if (files.length === 0) {
            setGlobalError(`${zipFile.name} contained no PDF/JPG/PNG files.`);
          }
          extractedBatches.push(files);
        } catch (err: any) {
          setGlobalError(`Failed to unzip ${zipFile.name}: ${err.message || err}`);
        }
      }
      const allExtracted = extractedBatches.flat();
      // Regular (non-zip) files picked in the same batch are added right away, same as before.
      if (regularFiles.length > 0) addFiles(regularFiles);
      // Zip contents go to a review panel instead -- the user checks which ones to actually
      // add. If a review panel is already open (another zip dropped before this one was
      // resolved), append rather than clobber the user's in-progress selection.
      if (allExtracted.length > 0) {
        const newItems = allExtracted.map((f: File, i: number) => ({
          id: `zipreview-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 8)}`,
          file: f,
          checked: true,
        }));
        setZipReview((prev) => ({ items: [...(prev?.items || []), ...newItems] }));
      }
    } finally {
      setExtractingZip(false);
    }
  }, [addFiles]);

  const toggleZipReviewItem = (id: string) => {
    setZipReview((prev) => (prev ? { items: prev.items.map((it) => (it.id === id ? { ...it, checked: !it.checked } : it)) } : prev));
  };

  const setAllZipReviewChecked = (checked: boolean) => {
    setZipReview((prev) => (prev ? { items: prev.items.map((it) => ({ ...it, checked })) } : prev));
  };

  const confirmZipReview = () => {
    if (!zipReview) return;
    const selected = zipReview.items.filter((it) => it.checked).map((it) => it.file);
    setZipReview(null);
    if (selected.length > 0) addFiles(selected);
  };

  const cancelZipReview = () => setZipReview(null);

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
    addFilesFromInput(Array.from(e.dataTransfer.files));
  }, [addFilesFromInput]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFilesFromInput(Array.from(e.target.files));
    e.target.value = "";
  };

  const uploadFile = async (item: any) => {
    const { file } = item;
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    const isLarge = file.size > SPLIT_THRESHOLD_MB * 1024 * 1024;
    const isSplittable = isPdf && isLarge;

    // Non-PDFs (JPG/PNG) can't be split, so they're capped at MAX_FILE_SIZE_MB. PDFs over
    // the split threshold get a much higher ceiling instead -- they're auto-split into
    // <=50-page chunks below, so MAX_FILE_SIZE_MB was never a real constraint for them, just
    // an accidental one. MAX_SPLITTABLE_PDF_MB is a browser-memory safety net (pdf-lib holds
    // the whole file in memory once to split it), not a real product limit.
    if (!isSplittable && file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      updateItem(item.id, { status: "error", error: `File exceeds ${MAX_FILE_SIZE_MB} MB limit.` });
      return;
    }
    if (isSplittable && file.size > MAX_SPLITTABLE_PDF_MB * 1024 * 1024) {
      updateItem(item.id, { status: "error", error: `PDF exceeds the ${MAX_SPLITTABLE_PDF_MB} MB auto-split limit.` });
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
          updateItem(item.id, { status: "finalizing", progress: 95 });
          const singleResult = await waitForProcessed(aws_document_id);
          if (singleResult.ok) {
            updateItem(item.id, { status: "completed", progress: 100 });
          } else if (singleResult.timedOut) {
            updateItem(item.id, { status: "background", progress: 99 });
          } else {
            updateItem(item.id, { status: "error", error: "Processing failed. Please retry or contact support." });
          }
          return;
        }

        updateItem(item.id, { status: "processing", progress: 70 });
        for (let i = 0; i < parts.length; i++) {
          await enqueueProcess(parts[i].aws_document_id);
          updateItem(item.id, { progress: 70 + Math.round(((i + 1) / parts.length) * 15) });
        }
        updateItem(item.id, { status: "finalizing", progress: 85 });
        let anyFailed = false;
        let anyTimedOut = false;
        let doneParts = 0;
        await Promise.all(parts.map(async (p: any) => {
          const partResult = await waitForProcessed(p.aws_document_id);
          if (!partResult.ok) {
            if (partResult.timedOut) anyTimedOut = true;
            else anyFailed = true;
          }
          doneParts++;
          updateItem(item.id, { progress: 85 + Math.round((doneParts / parts.length) * 13) });
        }));
        if (anyFailed) {
          updateItem(item.id, { status: "error", error: "One or more parts failed to process. Check the Library for details.", splitIntoParts: parts.length });
        } else if (anyTimedOut) {
          updateItem(item.id, { status: "background", progress: 99, splitIntoParts: parts.length });
        } else {
          updateItem(item.id, { status: "completed", progress: 100, splitIntoParts: parts.length });
        }
        return;
      }

      updateItem(item.id, { status: "processing", progress: 92 });
      await enqueueProcess(aws_document_id);
      updateItem(item.id, { status: "finalizing", progress: 95 });
      const result = await waitForProcessed(aws_document_id);
      if (result.ok) {
        updateItem(item.id, { status: "completed", progress: 100 });
      } else if (result.timedOut) {
        updateItem(item.id, { status: "background", progress: 99 });
      } else {
        updateItem(item.id, { status: "error", error: "Processing failed. Please retry or contact support." });
      }
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

  // ── Scan pages and show payment dialog ───────────────────────────────────────
  const scanAndShowPayment = async () => {
    setScanningPages(true);
    setGlobalError(null);
    try {
      const pendingFiles = fileItems.filter((f: any) => f.status === "pending");
      const pageCounts = await Promise.all(pendingFiles.map((f: any) => countPdfPages(f.file)));
      const totalPages = pageCounts.reduce((sum, n) => sum + n, 0);
      setEstimatedPageCount(totalPages);
      setShowPaymentDialog(true);
    } catch (err: any) {
      setGlobalError("Failed to scan pages: " + err.message);
    } finally {
      setScanningPages(false);
    }
  };

  // ── Handle payment proceed — deduct credits then upload ─────────────────────
  const handlePaymentProceed = async (mode: string) => {
    setShowPaymentDialog(false);
    if (mode === "credits" || mode === "stripe_paid") {
      // Deduct credits for non-free users
      if (!isFreeUser) {
        try {
          await stripeApiCall("/stripe/deduct", "POST", { pages: estimatedPageCount });
        } catch (err: any) {
          setGlobalError("Credit deduction failed: " + err.message);
          return;
        }
      }
      // Start the actual upload
      handleUploadAllActual();
    }
  };

  // ── Actual upload logic (called after payment is confirmed) ──────────────────
  const handleUploadAllActual = async () => {
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

  // ── Handle upload button click — gate behind payment ────────────────────────
  const handleUploadAll = async () => {
    const pending = fileItems.filter((f: any) => f.status === "pending");
    if (!pending.length) return;

    // Free users skip the payment dialog
    if (isFreeUser) {
      handleUploadAllActual();
      return;
    }

    // Non-free users: scan pages and show payment dialog
    await scanAndShowPayment();
  };

  const pendingCount    = fileItems.filter((f: any) => f.status === "pending").length;
  const completedCount  = fileItems.filter((f: any) => f.status === "completed").length;
  const errorCount      = fileItems.filter((f: any) => f.status === "error").length;
  const backgroundCount = fileItems.filter((f: any) => f.status === "background").length;

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
              All files are encrypted and securely stored.
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
          onClick={() => !uploading && !scanningPages && !extractingZip && inputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-xl px-6 py-12 text-center cursor-pointer transition-colors ${
            dragActive
              ? "border-blue-400 bg-blue-50"
              : "border-slate-300 bg-white hover:border-blue-300 hover:bg-slate-50"
          } ${uploading || scanningPages || extractingZip ? "pointer-events-none opacity-60" : ""}`}
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png,.zip"
            className="hidden"
            onChange={handleFileInput}
          />
          {extractingZip ? (
            <>
              <Loader2 className="w-10 h-10 text-blue-400 mx-auto mb-3 animate-spin" />
              <p className="text-slate-600 font-medium">Extracting zip…</p>
            </>
          ) : scanningPages ? (
            <>
              <Loader2 className="w-10 h-10 text-blue-400 mx-auto mb-3 animate-spin" />
              <p className="text-slate-600 font-medium">Scanning pages…</p>
            </>
          ) : (
            <>
              <UploadIcon className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600 font-medium">
                Drop PDFs or a ZIP file here or <span className="text-blue-600 underline underline-offset-2">click to browse</span>
              </p>
              <p className="text-xs text-slate-400 mt-1">
                PDF, JPG, PNG, ZIP — Images max {MAX_FILE_SIZE_MB} MB, PDFs auto-split up to {MAX_SPLITTABLE_PDF_MB} MB
              </p>
            </>
          )}
        </div>

        {/* Global error */}
        {globalError && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {globalError}
          </div>
        )}

        {/* Zip contents review — pick which extracted files to actually add */}
        {zipReview && (
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <span className="text-sm font-semibold text-slate-700">
                Select files from zip ({zipReview.items.filter((it) => it.checked).length}/{zipReview.items.length})
              </span>
              <div className="flex gap-3">
                <button
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                  onClick={() => setAllZipReviewChecked(true)}
                >
                  Select All
                </button>
                <button
                  className="text-xs text-slate-400 hover:text-slate-600"
                  onClick={() => setAllZipReviewChecked(false)}
                >
                  Deselect All
                </button>
              </div>
            </div>
            <div className="divide-y divide-slate-100 px-3 py-2 space-y-1 max-h-80 overflow-y-auto">
              {zipReview.items.map((it) => (
                <label
                  key={it.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={it.checked}
                    onChange={() => toggleZipReviewItem(it.id)}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="flex-1 min-w-0 text-sm text-slate-700 truncate">{it.file.name}</span>
                  <span className="text-xs text-slate-400 shrink-0">{formatSize(it.file.size)}</span>
                </label>
              ))}
            </div>
            <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-slate-100 bg-slate-50">
              <Button variant="outline" size="sm" onClick={cancelZipReview}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={confirmZipReview}
                disabled={zipReview.items.every((it) => !it.checked)}
              >
                Add {zipReview.items.filter((it) => it.checked).length} file
                {zipReview.items.filter((it) => it.checked).length === 1 ? "" : "s"}
              </Button>
            </div>
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
            disabled={uploading || scanningPages || extractingZip}
            className="w-full h-12 text-base font-semibold bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 shadow-md"
          >
            {uploading ? (
              <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Uploading…</>
            ) : scanningPages ? (
              <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Scanning pages…</>
            ) : (
              <><UploadIcon className="w-5 h-5 mr-2" />Upload {pendingCount} File{pendingCount !== 1 ? "s" : ""}</>
            )}
          </Button>
        )}

        {/* All done banner -- only shows once files have actually finished processing,
            not just once bytes were uploaded */}
        {allDone && completedCount > 0 && errorCount === 0 && backgroundCount === 0 && (
          <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
            <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-green-700">
                {completedCount} file{completedCount !== 1 ? "s" : ""} ready in the Library
              </p>
              <p className="text-xs text-slate-500">
                Upload and processing are both complete.
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={() => onNavigate?.("Library")}
              className="border-green-300 text-green-700 hover:bg-green-100">
              View Library
            </Button>
          </div>
        )}

        {/* Rare fallback: a file exceeded ~16 min of processing (past the backend worker's
            own timeout) -- don't hang the Upload button forever, but don't call it "Complete"
            either. Only shown for the file(s) actually affected. */}
        {allDone && backgroundCount > 0 && (
          <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <Loader2 className="w-5 h-5 text-amber-600 shrink-0 animate-spin" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-700">
                Still processing {backgroundCount} file{backgroundCount !== 1 ? "s" : ""}
              </p>
              <p className="text-xs text-slate-500">
                This is taking longer than usual — check the Library in a few minutes.
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={() => onNavigate?.("Library")}
              className="border-amber-300 text-amber-700 hover:bg-amber-100">
              View Library
            </Button>
          </div>
        )}

      </div>

      {/* Payment Dialog */}
      <PagePaymentDialog
        open={showPaymentDialog}
        onClose={() => setShowPaymentDialog(false)}
        estimatedPages={estimatedPageCount}
        onProceed={handlePaymentProceed}
        idToken={idToken}
        isFreeUser={isFreeUser}
      />
    </div>
  );
}

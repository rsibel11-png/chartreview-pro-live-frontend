// SplitPdf.tsx — chartreview-pro-live-frontend
// Updated: 2026-08-30 — Client-side PDF splitter page (ported from original Base44 app)
// Uses pdf-lib for client-side splitting — no backend Lambda needed

import React, { useState, useRef } from "react";
import { PDFDocument } from "pdf-lib";
import { Loader2, Upload, FileText, Download, Scissors, CheckCircle, AlertCircle, ArrowUpCircle } from "lucide-react";

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
  const sizes: any = { default: "px-4 py-2 text-sm", sm: "px-3 py-1.5 text-xs", lg: "px-6 py-3 text-base" };
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

// ── Module-level bridge for "Send to Upload" ─────────────────────────────────
// SplitPdf writes File objects here, Upload.tsx reads them on mount
export const _splitBridge: { files: File[] | null } = { files: null };

// ── Constants ─────────────────────────────────────────────────────────────────
const MAX_BYTES = 9 * 1024 * 1024; // 9 MB per part (safe margin under 10 MB)

// ── Helper: format file size ──────────────────────────────────────────────────
function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function SplitPdf({ onNavigate }: { onNavigate?: (page: string) => void }) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string>("idle"); // idle | splitting | done | error
  const [progress, setProgress] = useState<number>(0);
  const [progressMsg, setProgressMsg] = useState<string>("");
  const [parts, setParts] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === "application/pdf") {
      setSelectedFile(file);
      setParts([]);
      setError(null);
      setStatus("idle");
    } else {
      setError("Please select a PDF file.");
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type === "application/pdf") {
      setSelectedFile(file);
      setParts([]);
      setError(null);
      setStatus("idle");
    }
  };

  const handleSplit = async () => {
    if (!selectedFile) return;
    setError(null);
    setParts([]);
    setStatus("splitting");
    setProgress(10);
    setProgressMsg("Loading PDF\u2026");

    try {
      const fileBytes = await selectedFile.arrayBuffer();
      const srcDoc = await PDFDocument.load(fileBytes, { ignoreEncryption: true });
      const totalPages = srcDoc.getPageCount();
      setProgress(25);
      setProgressMsg(`Analyzing ${totalPages} pages\u2026`);

      // Binary search for max pages that fit under MAX_BYTES
      const chunks: { start: number; count: number }[] = [];
      let chunkStart = 0;

      while (chunkStart < totalPages) {
        let lo = 1;
        let hi = totalPages - chunkStart;
        let bestCount = 1;

        while (lo <= hi) {
          const mid = Math.floor((lo + hi) / 2);
          const testDoc = await PDFDocument.create();
          const pageIndices = Array.from({ length: mid }, (_, i) => chunkStart + i);
          const copied = await testDoc.copyPages(srcDoc, pageIndices);
          copied.forEach((p: any) => testDoc.addPage(p));
          const bytes = await testDoc.save();

          if (bytes.byteLength <= MAX_BYTES) {
            bestCount = mid;
            lo = mid + 1;
          } else {
            hi = mid - 1;
          }
        }

        chunks.push({ start: chunkStart, count: bestCount });
        chunkStart += bestCount;
      }

      setProgress(50);
      setProgressMsg(`Creating ${chunks.length} parts\u2026`);

      // Build each chunk as a blob
      const baseName = selectedFile.name.replace(/\.pdf$/i, "");
      const results: any[] = [];

      for (let i = 0; i < chunks.length; i++) {
        const { start, count } = chunks[i];
        const chunkDoc = await PDFDocument.create();
        const pageIndices = Array.from({ length: count }, (_, j) => start + j);
        const copied = await chunkDoc.copyPages(srcDoc, pageIndices);
        copied.forEach((p: any) => chunkDoc.addPage(p));

        const pdfBytes = await chunkDoc.save();
        const partName = `${baseName}_part${i + 1}.pdf`;
        const blob = new Blob([pdfBytes], { type: "application/pdf" });
        const blobUrl = URL.createObjectURL(blob);

        results.push({
          part: i + 1,
          filename: partName,
          blobUrl,
          blob,
          page_start: start + 1,
          page_end: start + count,
          page_count: count,
          size_bytes: pdfBytes.byteLength,
        });

        setProgress(50 + Math.round(((i + 1) / chunks.length) * 45));
        setProgressMsg(`Creating part ${i + 1} of ${chunks.length}\u2026`);
      }

      setParts(results);
      setProgress(100);
      setStatus("done");
    } catch (err: any) {
      setError(err.message || "An error occurred during splitting");
      setStatus("error");
    }
  };

  const downloadPart = (part: any) => {
    const a = document.createElement("a");
    a.href = part.blobUrl;
    a.download = part.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleSendToUpload = () => {
    const fileObjects = parts.map((part: any) =>
      new File([part.blob], part.filename, { type: "application/pdf" })
    );
    _splitBridge.files = fileObjects;
    onNavigate?.("Upload");
  };

  const reset = () => {
    setSelectedFile(null);
    setStatus("idle");
    setParts([]);
    setProgress(0);
    setProgressMsg("");
    setError(null);
  };

  return (
    <div className="p-6 md:p-8 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Split Large PDF</h1>
        <p className="text-slate-500 mt-1">Break a large PDF into smaller parts for easy uploading</p>
      </div>

      {/* Drop Zone */}
      <div
        className={`border-2 border-dashed transition-colors cursor-pointer rounded-xl p-10 text-center ${
          selectedFile ? "border-blue-300 bg-blue-50" : "border-slate-300 hover:border-blue-400 bg-white"
        }`}
        onDrop={handleDrop}
        onDragOver={(e: React.DragEvent<HTMLDivElement>) => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={handleFileChange}
        />
        {selectedFile ? (
          <div className="space-y-2">
            <FileText className="w-12 h-12 text-blue-500 mx-auto" />
            <p className="font-semibold text-slate-900">{selectedFile.name}</p>
            <p className="text-sm text-slate-500">{formatSize(selectedFile.size)}</p>
            <p className="text-xs text-slate-400">Click to choose a different file</p>
          </div>
        ) : (
          <div className="space-y-2">
            <Upload className="w-12 h-12 text-slate-400 mx-auto" />
            <p className="text-slate-600 font-medium">Drop your PDF here or click to browse</p>
            <p className="text-sm text-slate-400">PDF files only</p>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-red-50 border border-red-200">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Progress */}
      {status === "splitting" && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3 shadow-sm">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            <span className="text-slate-700 font-medium">{progressMsg}</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full overflow-hidden h-2">
            <div
              className="bg-blue-500 h-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Split Button */}
      {selectedFile && status === "idle" && (
        <Button
          onClick={handleSplit}
          className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 shadow-md"
          size="lg"
        >
          <Scissors className="w-5 h-5 mr-2" />
          Split PDF into Parts Under 10 MB
        </Button>
      )}

      {/* Results */}
      {status === "done" && parts.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
          <div className="p-4 border-b border-slate-200">
            <h2 className="flex items-center gap-2 text-green-700 font-semibold">
              <CheckCircle className="w-5 h-5" />
              Split Complete — {parts.length} Parts Ready
            </h2>
          </div>
          <div className="p-4 space-y-3">
            {parts.map((part: any) => (
              <div
                key={part.part}
                className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold text-sm">
                    {part.part}
                  </div>
                  <div>
                    <p className="font-medium text-slate-900 text-sm">{part.filename}</p>
                    <p className="text-xs text-slate-500">
                      Pages {part.page_start}–{part.page_end} · {part.page_count} pages · {formatSize(part.size_bytes)}
                    </p>
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={() => downloadPart(part)}>
                  <Download className="w-4 h-4 mr-1" />
                  Download
                </Button>
              </div>
            ))}

            <div className="flex gap-3 mt-4">
              <Button
                className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600"
                onClick={handleSendToUpload}
              >
                <ArrowUpCircle className="w-4 h-4 mr-2" />
                Send All Parts to Upload
              </Button>
            </div>

            <Button variant="outline" className="w-full" onClick={reset}>
              Split Another File
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

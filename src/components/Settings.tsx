// Settings.tsx — chartreview-native-frontend
// Updated: 2026-08-30 — Fix bottom boundary scan: scan midpoint-downward instead of bottom-upward to find footer band START (not bottom border line)
// Updated: 2026-08-30 — Add diagnostic logging to letterhead margin detection
// Updated: 2026-08-30 — Fix letterhead margin detection: use band-based approach (min non-white pixels per row/col)
//   to filter out thin border frames and anti-aliasing artifacts that caused all margins to return minimum (720).
// Updated: 2026-08-30 — Fix TS2350: replaced new Image() with document.createElement('img') for CRA type check.
// Updated: 2026-08-30 — Auto-detect letterhead margins by scanning rendered image pixel data.
//   Margins stored in localStorage and used by export to set page margins dynamically.
// Updated: 2026-08-30 — Fixed PDF letterhead: pdfjs-dist 3.11.174 has no ESM build, dynamic import() returned no exports.
//   Now uses classic <script> tag loader (_getPdfjs), same working pattern as Library.tsx.
// Updated: 2026-08-30 — Removed auto-detect feature, letterhead now accepts PDF (rendered to PNG via pdf.js)

import React, { useState, useEffect, useRef } from 'react';
import {
  Settings as SettingsIcon, Save, FileText, Image, Upload, X,
  CheckCircle2, BookOpen, Plus, Trash2
} from 'lucide-react';

// ── Env vars ──────────────────────────────────────────────────────────────────
const AWS_API_URL = process.env.REACT_APP_AWS_API_URL || '';
const AWS_API_KEY = process.env.REACT_APP_AWS_API_KEY || '';
const ORG_ID      = process.env.REACT_APP_ORG_ID      || '';

// ── LocalStorage keys ─────────────────────────────────────────────────────────
export const LS_FONT_FAMILY   = 'crp_export_font_family';
export const LS_FONT_SIZE     = 'crp_export_font_size';
export const LS_LETTERHEAD    = 'crp_letterhead_url';
export const LS_LETTERHEAD_MARGINS = 'crp_letterhead_margins';
export const LS_MACROS        = 'crp_macros';

export function getExportPrefs() {
  return {
    fontFamily:    localStorage.getItem(LS_FONT_FAMILY)  || 'Calibri',
    fontSize:      parseInt(localStorage.getItem(LS_FONT_SIZE) || '11', 10),
    letterheadUrl: localStorage.getItem(LS_LETTERHEAD)   || null,
    letterheadMargins: (() => {
      try {
        const raw = localStorage.getItem(LS_LETTERHEAD_MARGINS);
        return raw ? JSON.parse(raw) : null;
      } catch { return null; }
    })(),
  };
}

export function getMacros(): { id: string; name: string; content: string; section: string }[] {
  try {
    return JSON.parse(localStorage.getItem(LS_MACROS) || '[]');
  } catch { return []; }
}

function saveMacros(macros: any[]) {
  localStorage.setItem(LS_MACROS, JSON.stringify(macros));
}

// ── PDF.js loader (classic script tag — pdfjs-dist 3.11.174 has no ESM build) ──
// Mirrors the working _getPdfjs pattern already used in Library.tsx.
declare global { interface Window { pdfjsLib: any; } }
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

// ── Letterhead margin auto-detection ──────────────────────────────────────────
// Scans the rendered letterhead canvas pixel-by-pixel to find where the design
// content starts and ends (top/bottom/left/right). Returns margins in twips
// (1 inch = 1440 twips) with a small padding so body text clears the design.
// Assumes US Letter (8.5 x 11 in) page size.
function detectLetterheadMargins(canvas: HTMLCanvasElement): { top: number; bottom: number; left: number; right: number } {
  const ctx = canvas.getContext('2d')!;
  const { width, height } = canvas;
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const WHITE_THRESHOLD = 245; // RGB below this = "content"

  // DPI from canvas dimensions assuming US Letter
  const dpiX = width / 8.5;
  const dpiY = height / 11;
  const twipsPerPxX = 1440 / dpiX;
  const twipsPerPxY = 1440 / dpiY;
  const PADDING_PX = Math.round(dpiY * 0.25); // ~0.25 inch breathing room

  // Minimum non-white pixels per row/column to count as "strong content"
  // This filters out thin border frames (e.g., 4-8px borders) and anti-aliasing artifacts.
  const MIN_STRONG = Math.max(15, Math.round(width * 0.01));

  // Count non-white pixels per row
  const rowStrength: number[] = new Array(height);
  for (let y = 0; y < height; y++) {
    let count = 0;
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (data[i] < WHITE_THRESHOLD || data[i+1] < WHITE_THRESHOLD || data[i+2] < WHITE_THRESHOLD) {
        count++;
      }
    }
    rowStrength[y] = count;
  }

  // Find header band: scan top half, find the LAST strong row (where header content ends)
  const midpoint = Math.floor(height / 2);
  let topBoundary = 0;
  for (let y = 0; y < midpoint; y++) {
    if (rowStrength[y] >= MIN_STRONG) {
      topBoundary = y;
    }
  }

  // Find footer band: scan from midpoint DOWNWARD, find the FIRST strong row (where footer content starts)
  // This mirrors the top scan and correctly finds the TOP of the footer band,
  // skipping thin border lines at the very bottom of the page.
  let bottomBoundary = height - 1;
  for (let y = midpoint; y < height; y++) {
    if (rowStrength[y] >= MIN_STRONG) {
      bottomBoundary = y;
      break;
    }
  }

  // Count non-white pixels per column (in the middle region only, excluding header/footer bands)
  // This avoids counting full-width header/footer text as side content
  const midStart = Math.min(topBoundary + 20, midpoint);
  const midEnd = Math.max(bottomBoundary - 20, midpoint);
  const colStrength: number[] = new Array(width);
  for (let x = 0; x < width; x++) {
    let count = 0;
    for (let y = midStart; y < midEnd; y++) {
      const i = (y * width + x) * 4;
      if (data[i] < WHITE_THRESHOLD || data[i+1] < WHITE_THRESHOLD || data[i+2] < WHITE_THRESHOLD) {
        count++;
      }
    }
    colStrength[x] = count;
  }

  // Find left boundary: last strong column in left 50% (where left border/content ends)
  const midX = Math.floor(width / 2);
  let leftBoundary = 0;
  for (let x = 0; x < midX; x++) {
    if (colStrength[x] >= MIN_STRONG) {
      leftBoundary = x;
    }
  }

  // Find right boundary: first strong column in right 50% (where right border/content starts)
  let rightBoundary = width - 1;
  for (let x = width - 1; x >= midX; x--) {
    if (colStrength[x] >= MIN_STRONG) {
      rightBoundary = x;
      break;
    }
  }

  // Convert to twips with padding, clamped to reasonable bounds
  const minMargin = 720;   // 0.5 inch minimum
  const maxMargin = 5760;  // 4 inch maximum

  const topTwips = Math.min(maxMargin, Math.max(minMargin, Math.round((topBoundary + PADDING_PX) * twipsPerPxY)));
  const bottomTwips = Math.min(maxMargin, Math.max(minMargin, Math.round((height - 1 - bottomBoundary + PADDING_PX) * twipsPerPxY)));
  const leftTwips = Math.min(maxMargin, Math.max(minMargin, Math.round((leftBoundary + PADDING_PX) * twipsPerPxX)));
  const rightTwips = Math.min(maxMargin, Math.max(minMargin, Math.round((width - 1 - rightBoundary + PADDING_PX) * twipsPerPxX)));

  // DEBUG: log detection results
  console.log('[CRP Margins] canvas:', width, 'x', height, 'DPI:', dpiX.toFixed(0), 'x', dpiY.toFixed(0));
  console.log('[CRP Margins] MIN_STRONG:', MIN_STRONG, 'PADDING_PX:', PADDING_PX);
  console.log('[CRP Margins] topBoundary:', topBoundary, 'bottomBoundary:', bottomBoundary, 'leftBoundary:', leftBoundary, 'rightBoundary:', rightBoundary);
  console.log('[CRP Margins] rowStrength[0]:', rowStrength[0], 'rowStrength[50]:', rowStrength[50], 'rowStrength[100]:', rowStrength[100], 'rowStrength[150]:', rowStrength[150], 'rowStrength[200]:', rowStrength[200], 'rowStrength[792]:', rowStrength[792]);
  console.log('[CRP Margins] rowStrength[1450]:', rowStrength[1450], 'rowStrength[1500]:', rowStrength[1500], 'rowStrength[1583]:', rowStrength[1583]);
  console.log('[CRP Margins] result:', { top: topTwips, bottom: bottomTwips, left: leftTwips, right: rightTwips });
  return { top: topTwips, bottom: bottomTwips, left: leftTwips, right: rightTwips };
}

// ── Section labels ─────────────────────────────────────────────────────────────
const SECTION_LABELS: Record<string, { label: string; color: string }> = {
  any:      { label: 'Any',            color: 'bg-slate-100 text-slate-700' },
  header:   { label: 'Header',         color: 'bg-blue-100 text-blue-700'   },
  footer:   { label: 'Footer',         color: 'bg-purple-100 text-purple-700' },
  pre_note: { label: 'Pre-Visit Note', color: 'bg-amber-100 text-amber-700' },
};

const FONT_OPTIONS = ['Calibri', 'Arial', 'Times New Roman', 'Georgia', 'Verdana'];
const SIZE_OPTIONS = [9, 10, 11, 12, 13, 14, 16];

// ── MacrosManager ──────────────────────────────────────────────────────────────
function MacrosManager() {
  const [macros, setMacros]     = useState(getMacros);
  const [showForm, setShowForm] = useState(false);
  const [name, setName]         = useState('');
  const [content, setContent]   = useState('');
  const [section, setSection]   = useState('any');

  const handleCreate = () => {
    if (!name.trim() || !content.trim()) return;
    const next = [...macros, { id: Date.now().toString(), name: name.trim(), content, section }];
    setMacros(next);
    saveMacros(next);
    setName(''); setContent(''); setSection('any'); setShowForm(false);
  };

  const handleDelete = (id: string) => {
    const next = macros.filter(m => m.id !== id);
    setMacros(next);
    saveMacros(next);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
      <div className="border-b border-slate-200 p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BookOpen className="w-5 h-5 text-blue-600" />
          <div>
            <h3 className="font-semibold text-slate-900">Note Macros</h3>
            <p className="text-xs text-slate-500 mt-0.5">Saved text templates for header, footer, and per-visit notes</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-700"
        >
          <Plus className="w-4 h-4" /> New Macro
        </button>
      </div>
      <div className="p-5 space-y-4">
        {showForm && (
          <div className="border border-slate-200 rounded-lg p-4 space-y-3 bg-slate-50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="Macro name (e.g. Personal Injury Intro)"
                value={name}
                onChange={e => setName(e.target.value)}
              />
              <select
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={section}
                onChange={e => setSection(e.target.value)}
              >
                <option value="any">Any section</option>
                <option value="header">Header Note</option>
                <option value="footer">Footer Note</option>
                <option value="pre_note">Pre-Visit Note</option>
              </select>
            </div>
            <textarea
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
              placeholder="Macro content..."
              rows={4}
              value={content}
              onChange={e => setContent(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowForm(false)}
                className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg hover:bg-slate-50"
              >Cancel</button>
              <button
                disabled={!name.trim() || !content.trim()}
                onClick={handleCreate}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-3.5 h-3.5" /> Save Macro
              </button>
            </div>
          </div>
        )}

        {macros.length === 0 && !showForm && (
          <p className="text-sm text-slate-500 text-center py-6">No macros yet. Click "New Macro" to create your first template.</p>
        )}

        <div className="space-y-2">
          {macros.map(macro => {
            const meta = SECTION_LABELS[macro.section] || SECTION_LABELS.any;
            return (
              <div key={macro.id} className="flex items-start justify-between gap-3 p-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm text-slate-900">{macro.name}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${meta.color}`}>{meta.label}</span>
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-2 whitespace-pre-wrap">{macro.content}</p>
                </div>
                <button
                  onClick={() => handleDelete(macro.id)}
                  className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg flex-shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Settings page ──────────────────────────────────────────────────────────────
export default function Settings({ onNavigate, idToken }: { onNavigate?: (p: string) => void; idToken?: string }) {
  const [fontFamily,          setFontFamily]          = useState(() => localStorage.getItem(LS_FONT_FAMILY) || 'Calibri');
  const [fontSize,            setFontSize]            = useState(() => parseInt(localStorage.getItem(LS_FONT_SIZE) || '11', 10));
  const [letterheadUrl,       setLetterheadUrl]       = useState(() => localStorage.getItem(LS_LETTERHEAD) || '');
  const [uploadingLetterhead, setUploadingLetterhead] = useState(false);
  const [saveSuccess,         setSaveSuccess]         = useState(false);
  const letterheadInputRef = useRef<HTMLInputElement>(null);

  const getFreshToken = () => {
    try {
      const key = Object.keys(localStorage).find(k => k.includes('.idToken'));
      if (key) return localStorage.getItem(key) || idToken || '';
    } catch {}
    return idToken || '';
  };

  // Upload letterhead (image or PDF) to S3
  const handleLetterheadUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLetterhead(true);

    // If PDF, render page 1 to PNG via pdf.js (classic script load — matches Library.tsx's _getPdfjs pattern;
    // pdfjs-dist 3.11.174 ships UMD only, no ESM build, so dynamic import() does not work here)
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (isPdf) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdfjs: any = await _getPdfjs();
        const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d')!;
        await page.render({ canvasContext: ctx, viewport }).promise;
        const pngDataUrl = canvas.toDataURL('image/png');
        const detectedMargins = detectLetterheadMargins(canvas);
        localStorage.setItem(LS_LETTERHEAD_MARGINS, JSON.stringify(detectedMargins));
        setLetterheadUrl(pngDataUrl);
      } catch (err) {
        console.error('PDF letterhead render failed:', err);
        alert('Could not process the PDF. Please try uploading a PNG or JPG image instead.');
      } finally {
        setUploadingLetterhead(false);
        if (letterheadInputRef.current) letterheadInputRef.current.value = '';
      }
      return;
    }

    // For images (PNG/JPG), load into a canvas to detect margins,
    // then upload to S3 (or fall back to data URL)
    try {
      const img = document.createElement('img');
      img.crossOrigin = 'anonymous';
      const imgLoaded = await new Promise<HTMLImageElement>((resolve, reject) => {
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Image load failed'));
        img.src = URL.createObjectURL(file);
      });

      // Draw to canvas at US Letter aspect ratio (8.5:11 = 816:1056 at 96 DPI)
      const canvas = document.createElement('canvas');
      canvas.width = 816;
      canvas.height = 1056;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 816, 1056);
      // Scale image to fit canvas while preserving aspect ratio (contain)
      const scale = Math.min(816 / img.width, 1056 / img.height);
      const drawW = img.width * scale;
      const drawH = img.height * scale;
      ctx.drawImage(img, (816 - drawW) / 2, (1056 - drawH) / 2, drawW, drawH);
      const detectedMargins = detectLetterheadMargins(canvas);
      localStorage.setItem(LS_LETTERHEAD_MARGINS, JSON.stringify(detectedMargins));
      URL.revokeObjectURL(img.src);

      // Try S3 upload of the original file
      const res = await fetch(`${AWS_API_URL}/get-upload-url?filename=${encodeURIComponent(file.name)}&contentType=${encodeURIComponent(file.type)}&orgId=${ORG_ID}&purpose=letterhead`, {
        headers: { 'x-api-key': AWS_API_KEY, 'x-org-id': ORG_ID },
      });
      if (res.ok) {
        const { upload_url, file_url } = await res.json();
        await fetch(upload_url, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
        setLetterheadUrl(file_url);
      } else {
        setLetterheadUrl(canvas.toDataURL('image/png'));
      }
    } catch {
      // Last resort: data URL without margin detection
      const reader = new FileReader();
      reader.onload = ev => setLetterheadUrl(ev.target?.result as string || '');
      reader.readAsDataURL(file);
      localStorage.removeItem(LS_LETTERHEAD_MARGINS);
    } finally {
      setUploadingLetterhead(false);
    }
  };

  const handleSave = () => {
    localStorage.setItem(LS_FONT_FAMILY, fontFamily);
    localStorage.setItem(LS_FONT_SIZE,   fontSize.toString());
    if (letterheadUrl) {
      localStorage.setItem(LS_LETTERHEAD, letterheadUrl);
    } else {
      localStorage.removeItem(LS_LETTERHEAD);
      localStorage.removeItem(LS_LETTERHEAD_MARGINS);
    }
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-lg flex items-center justify-center shadow-md">
            <SettingsIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
            <p className="text-slate-600 mt-1">Customize your export preferences</p>
          </div>
        </div>

        {/* Success banner */}
        {saveSuccess && (
          <div className="flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-200 rounded-lg text-green-900 text-sm">
            <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
            Settings saved successfully!
          </div>
        )}

        {/* Word Export Settings */}
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="border-b border-slate-200 p-5 flex items-center gap-3">
            <FileText className="w-5 h-5 text-blue-600" />
            <div>
              <h3 className="font-semibold text-slate-900">Word Export Settings</h3>
              <p className="text-xs text-slate-500 mt-0.5">Set default font style and size for medical summary exports</p>
            </div>
          </div>
          <div className="p-6 space-y-6">

            {/* Font Family */}
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">Font Family</label>
              <select
                value={fontFamily}
                onChange={e => setFontFamily(e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-full max-w-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                {FONT_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
              <p className="text-xs text-slate-500 mt-1">Default font for exported Word documents</p>
            </div>

            {/* Font Size */}
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">Font Size</label>
              <select
                value={fontSize.toString()}
                onChange={e => setFontSize(parseInt(e.target.value, 10))}
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-full max-w-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                {SIZE_OPTIONS.map(s => <option key={s} value={s}>{s} pt</option>)}
              </select>
              <p className="text-xs text-slate-500 mt-1">Default font size in points</p>
            </div>

            {/* Preview */}
            <div className="border-t border-slate-200 pt-5">
              <h4 className="text-sm font-semibold text-slate-900 mb-3">Preview</h4>
              <div
                className="p-4 bg-white border border-slate-200 rounded-lg"
                style={{ fontFamily, fontSize: `${fontSize}pt` }}
              >
                <p>This is how your exported medical summaries will look.</p>
                <p className="mt-2">The quick brown fox jumps over the lazy dog.</p>
              </div>
            </div>

            {/* Letterhead */}
            <div className="border-t border-slate-200 pt-5 space-y-3">
              <div className="flex items-center gap-3">
                <Image className="w-5 h-5 text-blue-600" />
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">Letterhead</h4>
                  <p className="text-xs text-slate-500">Upload a PNG, JPG, or PDF to use as a letterhead header on exports. PDF page 1 is automatically converted to an image. You'll be asked each time whether to apply it.</p>
                </div>
              </div>

              {letterheadUrl ? (
                <div className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg bg-slate-50">
                  <img
                    src={letterheadUrl}
                    alt="Letterhead preview"
                    className="h-16 w-auto object-contain border border-slate-200 rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-green-700 font-medium">Letterhead uploaded ✓</p>
                    <p className="text-xs text-slate-500 mt-0.5">Will be offered as watermark on next export</p>
                  </div>
                  <button
                    onClick={() => { setLetterheadUrl(''); localStorage.removeItem(LS_LETTERHEAD_MARGINS); if (letterheadInputRef.current) letterheadInputRef.current.value = ''; }}
                    className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <input
                    ref={letterheadInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,.pdf,application/pdf"
                    className="hidden"
                    id="letterhead-upload"
                    onChange={handleLetterheadUpload}
                  />
                  <label htmlFor="letterhead-upload">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-slate-300 rounded-lg cursor-pointer text-slate-700 hover:bg-slate-50 ${uploadingLetterhead ? 'opacity-60 cursor-not-allowed' : ''}`}>
                      {uploadingLetterhead
                        ? <><span className="animate-spin">⏳</span> Uploading...</>
                        : <><Upload className="w-4 h-4" /> Upload Letterhead (PNG/JPG/PDF)</>
                      }
                    </span>
                  </label>
                </>
              )}
            </div>

            {/* Save */}
            <div className="border-t border-slate-200 pt-5 flex justify-end">
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm shadow-sm"
              >
                <Save className="w-4 h-4" /> Save Settings
              </button>
            </div>
          </div>
        </div>

        {/* Macros Manager */}
        <MacrosManager />

      </div>
    </div>
  );
}

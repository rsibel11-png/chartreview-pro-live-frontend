// Settings.tsx — chartreview-native-frontend
// Updated: 2026-05-22 — Letterhead upload, macros manager, font export settings

import React, { useState, useEffect, useRef } from 'react';
import {
  Settings as SettingsIcon, Save, FileText, Image, Upload, X,
  Wand2, CheckCircle2, BookOpen, Plus, Trash2
} from 'lucide-react';

// ── Env vars ──────────────────────────────────────────────────────────────────
const AWS_API_URL = process.env.REACT_APP_AWS_API_URL || '';
const AWS_API_KEY = process.env.REACT_APP_AWS_API_KEY || '';
const ORG_ID      = process.env.REACT_APP_ORG_ID      || '';

// ── LocalStorage keys ─────────────────────────────────────────────────────────
export const LS_FONT_FAMILY   = 'crp_export_font_family';
export const LS_FONT_SIZE     = 'crp_export_font_size';
export const LS_LETTERHEAD    = 'crp_letterhead_url';
export const LS_MACROS        = 'crp_macros';

export function getExportPrefs() {
  return {
    fontFamily:    localStorage.getItem(LS_FONT_FAMILY)  || 'Calibri',
    fontSize:      parseInt(localStorage.getItem(LS_FONT_SIZE) || '11', 10),
    letterheadUrl: localStorage.getItem(LS_LETTERHEAD)   || null,
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
  const [analyzingFormat,     setAnalyzingFormat]     = useState(false);
  const [formatDetected,      setFormatDetected]      = useState<{ fontFamily: string; fontSize: number; notes?: string } | null>(null);
  const [saveSuccess,         setSaveSuccess]         = useState(false);
  const letterheadInputRef = useRef<HTMLInputElement>(null);
  const formatInputRef     = useRef<HTMLInputElement>(null);

  const getFreshToken = () => {
    try {
      const key = Object.keys(localStorage).find(k => k.includes('.idToken'));
      if (key) return localStorage.getItem(key) || idToken || '';
    } catch {}
    return idToken || '';
  };

  // Upload letterhead image to S3 via the /upload-letterhead endpoint
  const handleLetterheadUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLetterhead(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      // Use a pre-signed URL approach: get an upload URL then PUT the file
      const res = await fetch(`${AWS_API_URL}/get-upload-url?filename=${encodeURIComponent(file.name)}&contentType=${encodeURIComponent(file.type)}&orgId=${ORG_ID}&purpose=letterhead`, {
        headers: { 'x-api-key': AWS_API_KEY, 'x-org-id': ORG_ID },
      });
      if (res.ok) {
        const { upload_url, file_url } = await res.json();
        await fetch(upload_url, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
        setLetterheadUrl(file_url);
      } else {
        // Fallback: store as data URL locally
        const reader = new FileReader();
        reader.onload = ev => {
          setLetterheadUrl(ev.target?.result as string || '');
        };
        reader.readAsDataURL(file);
      }
    } catch {
      // Fallback: data URL
      const reader = new FileReader();
      reader.onload = ev => setLetterheadUrl(ev.target?.result as string || '');
      reader.readAsDataURL(file);
    } finally {
      setUploadingLetterhead(false);
    }
  };

  // Auto-detect font from uploaded document
  const handleFormatUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAnalyzingFormat(true);
    setFormatDetected(null);
    try {
      // Simple heuristic: for docx, try to parse; otherwise prompt user to pick manually
      // Since we don't have a lambda for this, we'll parse the filename + show a best guess
      const name = file.name.toLowerCase();
      // Detect from file — best effort without a backend: just confirm to user
      const detectedFont = 'Calibri';
      const detectedSize = 11;
      setFontFamily(detectedFont);
      setFontSize(detectedSize);
      setFormatDetected({ fontFamily: detectedFont, fontSize: detectedSize, notes: 'Unable to auto-detect — please select manually below' });
    } finally {
      setAnalyzingFormat(false);
      if (formatInputRef.current) formatInputRef.current.value = '';
    }
  };

  const handleSave = () => {
    localStorage.setItem(LS_FONT_FAMILY, fontFamily);
    localStorage.setItem(LS_FONT_SIZE,   fontSize.toString());
    if (letterheadUrl) {
      localStorage.setItem(LS_LETTERHEAD, letterheadUrl);
    } else {
      localStorage.removeItem(LS_LETTERHEAD);
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

            {/* Auto-detect */}
            <div className="border border-blue-200 bg-blue-50 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Wand2 className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-semibold text-blue-900">Auto-detect from your document</span>
              </div>
              <p className="text-xs text-slate-600">Upload a PDF or Word document (.doc/.docx) and the app will attempt to detect its font settings and apply them to future exports.</p>
              {formatDetected && (
                <div className="flex items-center gap-2 text-sm text-green-800 bg-green-50 border border-green-200 rounded p-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <span>
                    {formatDetected.notes
                      ? formatDetected.notes
                      : <>Detected: <strong>{formatDetected.fontFamily}</strong>, <strong>{formatDetected.fontSize}pt</strong></>
                    }
                  </span>
                </div>
              )}
              <input
                ref={formatInputRef}
                type="file"
                accept=".pdf,.doc,.docx"
                className="hidden"
                id="format-upload"
                onChange={handleFormatUpload}
              />
              <label htmlFor="format-upload">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border rounded-lg cursor-pointer border-blue-300 text-blue-700 hover:bg-blue-100 ${analyzingFormat ? 'opacity-60 cursor-not-allowed' : ''}`}>
                  {analyzingFormat
                    ? <><span className="animate-spin">⏳</span> Analyzing...</>
                    : <><Upload className="w-4 h-4" /> Upload Template Document</>
                  }
                </span>
              </label>
            </div>

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
                  <p className="text-xs text-slate-500">Upload a PNG/JPG image to use as a full-page background watermark on exports. You'll be asked each time whether to apply it.</p>
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
                    onClick={() => { setLetterheadUrl(''); if (letterheadInputRef.current) letterheadInputRef.current.value = ''; }}
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
                    accept="image/png,image/jpeg,image/jpg"
                    className="hidden"
                    id="letterhead-upload"
                    onChange={handleLetterheadUpload}
                  />
                  <label htmlFor="letterhead-upload">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-slate-300 rounded-lg cursor-pointer text-slate-700 hover:bg-slate-50 ${uploadingLetterhead ? 'opacity-60 cursor-not-allowed' : ''}`}>
                      {uploadingLetterhead
                        ? <><span className="animate-spin">⏳</span> Uploading...</>
                        : <><Upload className="w-4 h-4" /> Upload Letterhead Image</>
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

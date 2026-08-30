// MacroPicker.tsx — chartreview-native-frontend
// Updated: 2026-08-30 — Ported from original Base44 app (chartreview-pro), adapted for localStorage
// Original: src/components/summaries/MacroPicker.jsx in chartreview-pro Base44 app

import React, { useState } from "react";
import { getMacros } from "../Settings";
import { BookOpen, Save, Trash2, ChevronDown } from "lucide-react";

type Macro = { id: string; name: string; content: string; section: string };

function saveMacros(macros: Macro[]) {
  localStorage.setItem("crp_macros", JSON.stringify(macros));
}

/**
 * MacroPicker — shown inline below a text area.
 * Reads/writes macros from localStorage (via Settings.tsx exports).
 * Props:
 *   section: "header" | "footer" | "pre_note" | "any"
 *   currentText: string  — the textarea's current value
 *   onInsert: (text: string) => void — replaces textarea content
 */
export default function MacroPicker({
  section = "any",
  currentText,
  onInsert,
}: {
  section?: string;
  currentText: string;
  onInsert: (text: string) => void;
}) {
  const [saveName, setSaveName] = useState("");
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [open, setOpen] = useState(false);

  const macros: Macro[] = getMacros();
  const filteredMacros = macros.filter(
    (m: Macro) => m.section === "any" || m.section === section
  );

  const handleSaveAsMacro = () => {
    if (!saveName.trim() || !currentText?.trim()) return;
    const all = getMacros();
    const next = [...all, { id: Date.now().toString(), name: saveName.trim(), content: currentText, section }];
    saveMacros(next);
    setShowSaveDialog(false);
    setSaveName("");
  };

  const handleDeleteMacro = (id: string) => {
    const all = getMacros();
    saveMacros(all.filter((m: Macro) => m.id !== id));
  };

  return (
    <>
      <div className="flex items-center gap-2 mt-1">
        {/* Insert macro */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="inline-flex items-center gap-1 text-xs h-7 px-2 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium"
          >
            <BookOpen className="w-3 h-3" />
            Insert Macro
            <ChevronDown className="w-3 h-3" />
          </button>
          {open && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
              <div className="absolute z-20 mt-1 w-72 rounded-md border border-slate-200 bg-white shadow-lg p-2 max-h-60 overflow-y-auto">
                {filteredMacros.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-3">
                    No macros saved yet. Type some text and save it as a macro.
                  </p>
                ) : (
                  <div className="space-y-1">
                    {filteredMacros.map((macro: Macro) => (
                      <div
                        key={macro.id}
                        className="flex items-center justify-between gap-2 p-2 rounded hover:bg-slate-50 group"
                      >
                        <button
                          type="button"
                          className="flex-1 text-left text-sm text-slate-800 font-medium truncate"
                          onClick={() => { onInsert(macro.content); setOpen(false); }}
                        >
                          {macro.name}
                          <span className="block text-xs text-slate-400 font-normal truncate">
                            {macro.content.substring(0, 60)}{macro.content.length > 60 ? "…" : ""}
                          </span>
                        </button>
                        <button
                          type="button"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 text-red-500 hover:bg-red-50 rounded flex-shrink-0 flex items-center justify-center"
                          onClick={() => handleDeleteMacro(macro.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Save current as macro */}
        <button
          type="button"
          className="inline-flex items-center gap-1 text-xs h-7 px-2 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium disabled:opacity-40 disabled:cursor-not-allowed"
          disabled={!currentText?.trim()}
          onClick={() => setShowSaveDialog(true)}
        >
          <Save className="w-3 h-3" />
          Save as Macro
        </button>
      </div>

      {/* Save dialog */}
      {showSaveDialog && (
        <>
          <div className="fixed inset-0 bg-black/40 z-30" onClick={() => setShowSaveDialog(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 w-full max-w-sm bg-white rounded-lg shadow-xl p-6">
            <h3 className="font-semibold text-slate-900 text-lg mb-4">Save as Macro</h3>
            <div className="space-y-3">
              <input
                placeholder="Macro name (e.g. Personal Injury Intro)"
                value={saveName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSaveName(e.target.value)}
                onKeyDown={(e: React.KeyboardEvent) => e.key === "Enter" && handleSaveAsMacro()}
                autoFocus
                className="w-full px-3 py-2 rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="p-2 bg-slate-50 rounded text-xs text-slate-600 max-h-24 overflow-y-auto whitespace-pre-wrap">
                {currentText}
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="px-4 py-2 rounded-md text-sm font-medium border border-slate-300 text-slate-700 hover:bg-slate-50"
                  onClick={() => setShowSaveDialog(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="px-4 py-2 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 inline-flex items-center gap-1.5"
                  onClick={handleSaveAsMacro}
                  disabled={!saveName.trim()}
                >
                  <Save className="w-3.5 h-3.5" />
                  Save
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

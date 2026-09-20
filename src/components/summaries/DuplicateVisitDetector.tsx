// DuplicateVisitDetector.tsx — chartreview-native-frontend
// Restored 2026-05-29 — TypeScript, all shadcn/ui inlined, no external deps
// Updated: 2026-09-07 — Compare view ordering: same-date visit cards now sorted by
// rendering provider (case-insensitive) so same-provider entries sit adjacent; date
// groups sorted chronologically. Display-only — deletion indices unchanged.
// Updated: 2026-09-07 — Manual same-day ordering: ← / → controls on each compare card
// let the user arrange that date's visits into the order they want in the summary.
// Emits onDuplicateAction('reorder-date', indices-in-new-order); once a date is
// manually ordered it renders in visits-array order (parent reorders the real array)
// instead of the provider sort. Selections for that group are cleared on reorder so
// stale indices can never delete the wrong visit.
// Updated: 2026-09-08 — Typeable position: the position number next to the ←/→
// arrows is now an editable box. Type the target slot (1..N) and press Enter or
// click away to jump the card straight there — no more repeated arrow clicks for a
// multi-slot move. moveInGroup already supported an arbitrary target index (splice
// based, not a simple adjacent swap), so this only changes the input UI; the same
// reorder-date event and selection-clearing safety apply.
// Updated: 2026-09-08 — FIX: position box is now a CONTROLLED input (PositionInput
// component) instead of defaultValue. Bug: after a jump reorder the per-slot input
// keys were identical across reorders, so React reused stale input instances and
// the shifted cards kept their old numbers (move 7→1 left the tail card showing
// "1"). Controlled value always renders the card's true position; a local draft
// only buffers what the user is typing while focused.

import React, { useMemo, useState } from "react";

// ── Inline icons ─────────────────────────────────────────────────────────────
const AlertTriangle = ({ className = "" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} width="20" height="20">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
  </svg>
);
const Eye = ({ className = "" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} width="16" height="16">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.964-7.178z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);
const ChevronDown = ({ className = "" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} width="16" height="16">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
  </svg>
);
const ChevronUp = ({ className = "" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} width="16" height="16">
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
  </svg>
);
const X = ({ className = "" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} width="16" height="16">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

// ── VisitContentPanel ─────────────────────────────────────────────────────────
function VisitContentPanel({
  visit,
  index,
  isSelected,
  onToggle,
}: {
  visit: any;
  index: number;
  isSelected: boolean;
  onToggle: () => void;
}) {
  const fields = [
    { label: "Provider", value: visit.rendering_provider },
    { label: "Setting", value: visit.practice_setting },
    { label: "Chief Complaint", value: visit.chief_complaint },
    { label: "HPI", value: visit.hpi_summary },
    { label: "Physical Exam", value: visit.physical_exam_findings },
    { label: "Imaging", value: visit.imaging_findings },
    { label: "Impression / Diagnosis", value: visit.impression_diagnosis },
    { label: "Treatment Plan", value: visit.treatment_plan },
    { label: "Pain Scale", value: visit.pain_scale },
  ].filter((f: any) => f.value);

  return (
    <div
      className={`flex-1 min-w-[260px] rounded-lg border-2 overflow-hidden transition-all cursor-pointer ${
        isSelected
          ? "border-red-400 bg-red-50"
          : "border-slate-300 bg-white hover:border-slate-400"
      }`}
      onClick={onToggle}
    >
      {/* Header */}
      <div
        className={`px-3 py-2 flex items-center justify-between gap-2 ${
          isSelected ? "bg-red-200 text-red-800" : "bg-slate-100 text-slate-700"
        }`}
      >
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggle}
            className="w-4 h-4 cursor-pointer"
            onClick={(e: any) => e.stopPropagation()}
          />
          <span className="font-semibold text-sm">Visit {index + 1}</span>
          {visit.rendering_provider && (
            <span className="text-xs opacity-80 truncate max-w-[140px]">
              {visit.rendering_provider}
            </span>
          )}
        </div>
        {isSelected && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-600 text-white">
            Will delete
          </span>
        )}
      </div>

      {/* Content */}
      <div
        className="p-3 space-y-2 text-xs text-slate-700 overflow-y-auto"
        style={{ maxHeight: "360px" }}
      >
        {fields.length === 0 && (
          <p className="text-slate-400 italic">No content available</p>
        )}
        {fields.map(({ label, value }: any) => (
          <div key={label}>
            <span className="font-semibold text-slate-900">{label}: </span>
            <span>{value}</span>
          </div>
        ))}
        {visit.icd10_codes?.length > 0 && (
          <div>
            <span className="font-semibold text-slate-900">ICD-10: </span>
            <span>{visit.icd10_codes.join(", ")}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── DuplicateVisitDetector ────────────────────────────────────────────────────
// ── PositionInput (2026-09-08) ─────────────────────────────────────────────────
// Controlled position box: always displays the card's true position in the group
// (pos + 1). A local draft buffers typing; on blur it commits the target position.
function PositionInput({ pos, total, onCommit }: { pos: number; total: number; onCommit: (targetPos: number) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  const display = draft === null ? String(pos + 1) : draft;
  return (
    <input
      type="number"
      min={1}
      max={total}
      value={display}
      onFocus={(e: any) => {
        setDraft(String(pos + 1));
        e.currentTarget.select();
      }}
      onChange={(e: any) => setDraft(e.currentTarget.value)}
      onKeyDown={(e: any) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
      onBlur={() => {
        const raw = parseInt(draft === null ? "" : draft, 10);
        setDraft(null);
        if (isNaN(raw)) return;
        const targetPos = Math.min(Math.max(raw, 1), total) - 1;
        if (targetPos !== pos) onCommit(targetPos);
      }}
      className="w-9 text-center text-[11px] font-semibold text-slate-700 border border-slate-300 rounded-md py-0.5 focus:outline-none focus:ring-2 focus:ring-blue-400 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      title="Type a position and press Enter to move this visit there"
    />
  );
}

export default function DuplicateVisitDetector({
  visits,
  onDuplicateAction,
}: {
  visits: any[];
  onDuplicateAction: (action: string, indices: number[]) => void;
}) {
  const [selectedForDeletion, setSelectedForDeletion] = useState<
    Record<string, Set<number>>
  >({});
  // Dates the user has manually ordered — rendered in visits-array order
  const [manuallyOrderedDates, setManuallyOrderedDates] = useState<Set<string>>(
    new Set()
  );
  const [confirmDelete, setConfirmDelete] = useState<{
    indicesToDelete: number[];
  } | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Record<number, boolean>>(
    {}
  );

  const duplicateGroups: { index: number; visit: any }[][] = useMemo(() => {
    const dateMap: Record<string, { index: number; visit: any }[]> = {};
    (Array.isArray(visits) ? visits : []).forEach((visit: any, i: number) => {
      if (!visit.visit_date) return;
      if (!dateMap[visit.visit_date]) dateMap[visit.visit_date] = [];
      dateMap[visit.visit_date].push({ index: i, visit });
    });
    // 2026-09-07: deterministic ordering — date groups chronological, cards within
    // a group grouped by provider so the user compares like with like.
    // item.index stays the visits-array position (deletion indices unchanged).
    return Object.values(dateMap)
      .filter((g) => g.length > 1)
      .sort((a, b) => (a[0].visit.visit_date || "").localeCompare(b[0].visit.visit_date || ""))
      .map((g) =>
        manuallyOrderedDates.has(g[0].visit.visit_date)
          ? g // user chose the order — the parent already reorders the real array
          : [...g].sort((a, b) =>
              ((a.visit.rendering_provider || "").trim().toLowerCase()).localeCompare(
                (b.visit.rendering_provider || "").trim().toLowerCase()
              )
            )
      );
  }, [visits, manuallyOrderedDates]);

  if (duplicateGroups.length === 0) return null;

  const toggleExpand = (groupIdx: number) => {
    setExpandedGroups((prev) => ({ ...prev, [groupIdx]: !prev[groupIdx] }));
  };

  // 2026-09-07: move a card within its date group; emits the new index order to
  // the parent (MedicalSummaryForm) which physically reorders the visits array.
  const moveInGroup = (
    group: { index: number; visit: any }[],
    groupKey: string,
    date: string,
    from: number,
    to: number
  ) => {
    if (to < 0 || to >= group.length || from === to) return;
    const indices = group.map((it: any) => it.index);
    const next = [...indices];
    const moved = next.splice(from, 1)[0];
    next.splice(to, 0, moved);
    setManuallyOrderedDates((prev: Set<string>) => {
      const s = new Set(prev);
      s.add(date);
      return s;
    });
    // Indices shift after the reorder — drop this group's pending selections so
    // a stale index can never select (and delete) the wrong visit.
    setSelectedForDeletion((prev: Record<string, Set<number>>) => {
      const p: Record<string, Set<number>> = { ...prev };
      delete p[groupKey];
      return p;
    });
    onDuplicateAction("reorder-date", next);
  };

  const toggleItem = (groupKey: string, itemIndex: number) => {
    const selected = selectedForDeletion[groupKey] || new Set<number>();
    const newSelected = new Set<number>(selected);
    if (newSelected.has(itemIndex)) {
      newSelected.delete(itemIndex);
    } else {
      newSelected.add(itemIndex);
    }
    setSelectedForDeletion((prev) => ({
      ...prev,
      [groupKey]: newSelected.size > 0 ? newSelected : (undefined as any),
    }));
  };

  const totalSelected = Object.values(selectedForDeletion).reduce(
    (sum, s) => sum + (s ? s.size : 0),
    0
  );

  const handleConfirmedDelete = () => {
    if (!confirmDelete) return;
    onDuplicateAction("delete-selected", confirmDelete.indicesToDelete);
    setSelectedForDeletion({});
    setConfirmDelete(null);
  };

  return (
    <>
      {/* Confirm dialog */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              Delete {confirmDelete.indicesToDelete.length} visit
              {confirmDelete.indicesToDelete.length !== 1 ? "s" : ""}?
            </h3>
            <p className="text-sm text-slate-600 mb-4">
              This cannot be undone. The selected visits will be permanently
              removed from this summary.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmedDelete}
                className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2">
          <AlertTriangle className="text-amber-600 w-5 h-5" />
          <h3 className="font-bold text-amber-900 text-base">
            Same-Day Visits Detected &mdash; {duplicateGroups.length} date
            {duplicateGroups.length !== 1 ? "s" : ""} with multiple entries
          </h3>
        </div>
        <p className="text-sm text-amber-800">
          Click <strong>Compare</strong> to expand a date and select visits to
          delete. Checked visits will be removed when you click{" "}
          <strong>Delete Selected</strong>.
        </p>

        {/* Global delete button */}
        {totalSelected > 0 && (
          <div className="flex justify-end">
            <button
              onClick={() => {
                const allIndices = Object.values(selectedForDeletion).flatMap(
                  (s) => (s ? Array.from(s) : [])
                );
                setConfirmDelete({ indicesToDelete: allIndices });
              }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium"
            >
              <X className="w-4 h-4" />
              Delete All Selected ({totalSelected})
            </button>
          </div>
        )}

        {/* Duplicate groups */}
        {duplicateGroups.map((group, groupIdx) => {
          const groupKey = `group-${groupIdx}`;
          const isExpanded = !!expandedGroups[groupIdx];
          const selectedSet: Set<number> =
            selectedForDeletion[groupKey] || new Set<number>();
          const hasSelections = selectedSet.size > 0;

          // Format date label
          const dateLabel = (() => {
            try {
              return new Date(
                group[0].visit.visit_date + "T00:00:00"
              ).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              });
            } catch {
              return group[0].visit.visit_date;
            }
          })();

          return (
            <div
              key={groupIdx}
              className="border border-amber-200 rounded-lg bg-white overflow-hidden"
            >
              {/* Group header */}
              <div className="flex items-center justify-between px-4 py-3 bg-amber-50 border-b border-amber-200">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-semibold text-slate-900">
                    {dateLabel}
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-300">
                    {group.length} visits
                  </span>
                  {hasSelections && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-200">
                      {selectedSet.size} selected for deletion
                    </span>
                  )}
                </div>
                <button
                  onClick={() => toggleExpand(groupIdx)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-amber-300 text-slate-600 hover:text-slate-900 hover:bg-amber-100 text-sm"
                >
                  <Eye className="w-4 h-4" />
                  {isExpanded ? "Hide" : "Compare"}
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
              </div>

              {/* Side-by-side visit cards */}
              {isExpanded && (
                <div className="p-4">
                  <p className="text-xs text-slate-500 mb-3">
                    Click a visit card to select / deselect it for deletion. Use the
                    &larr; / &rarr; controls, or type a position number and press
                    Enter, to arrange that day's visits into the order you want in
                    the summary — your order is saved with it.
                  </p>
                  <div className="flex gap-3 overflow-x-auto pb-2">
                    {group.map((item, posInGroup) => (
                      <div key={item.index} className="flex flex-col items-stretch">
                        <div className="flex items-center justify-center gap-2 pb-1.5">
                          <button
                            type="button"
                            disabled={posInGroup === 0}
                            onClick={() =>
                              moveInGroup(group, groupKey, group[0].visit.visit_date, posInGroup, posInGroup - 1)
                            }
                            className="px-2 py-0.5 rounded-md border border-slate-300 text-slate-600 text-sm hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none"
                            title="Move earlier"
                          >
                            &larr;
                          </button>
                          <PositionInput
                            pos={posInGroup}
                            total={group.length}
                            onCommit={(targetPos: number) =>
                              moveInGroup(group, groupKey, group[0].visit.visit_date, posInGroup, targetPos)
                            }
                          />
                          <button
                            type="button"
                            disabled={posInGroup === group.length - 1}
                            onClick={() =>
                              moveInGroup(group, groupKey, group[0].visit.visit_date, posInGroup, posInGroup + 1)
                            }
                            className="px-2 py-0.5 rounded-md border border-slate-300 text-slate-600 text-sm hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none"
                            title="Move later"
                          >
                            &rarr;
                          </button>
                        </div>
                        <VisitContentPanel
                          visit={item.visit}
                          index={item.index}
                          isSelected={selectedSet.has(item.index)}
                          onToggle={() => toggleItem(groupKey, item.index)}
                        />
                      </div>
                    ))}
                  </div>
                  {/* Per-group delete button */}
                  {hasSelections && (
                    <div className="flex justify-end mt-3">
                      <button
                        onClick={() =>
                          setConfirmDelete({
                            indicesToDelete: Array.from(selectedSet),
                          })
                        }
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium"
                      >
                        <X className="w-4 h-4" />
                        Delete Selected ({selectedSet.size})
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

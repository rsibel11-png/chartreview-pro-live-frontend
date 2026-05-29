// DuplicateVisitDetector.tsx — chartreview-native-frontend
// Restored 2026-05-29 — TypeScript, all shadcn/ui inlined, no external deps

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
            onChange={() => {}}
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
    return Object.values(dateMap).filter((g) => g.length > 1);
  }, [visits]);

  if (duplicateGroups.length === 0) return null;

  const toggleExpand = (groupIdx: number) => {
    setExpandedGroups((prev) => ({ ...prev, [groupIdx]: !prev[groupIdx] }));
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
                    Click a visit card to select / deselect it for deletion:
                  </p>
                  <div className="flex gap-3 overflow-x-auto pb-2">
                    {group.map((item) => (
                      <VisitContentPanel
                        key={item.index}
                        visit={item.visit}
                        index={item.index}
                        isSelected={selectedSet.has(item.index)}
                        onToggle={() => toggleItem(groupKey, item.index)}
                      />
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

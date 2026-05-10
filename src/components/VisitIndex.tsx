/* eslint-disable @typescript-eslint/no-unused-vars */
// VisitIndex.tsx — chartreview-native-frontend
// Ported: 2026-05-03 — CRA/TypeScript
// Uses Lambda /visit-index/build + /jobs/{id} polling (no base44 InvokeLLM)
// Export: window.docx (CDN loaded in index.html)

import React, { useState, useEffect } from "react";

// ── Env vars ──────────────────────────────────────────────────────────────────
const AWS_API_URL = process.env.REACT_APP_AWS_API_URL || "";
const ORG_ID      = process.env.REACT_APP_ORG_ID      || "";
const API_KEY     = process.env.REACT_APP_AWS_API_KEY  || "";

declare global {
  interface Window { docx: any; }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const makeDateStr = (date: string) => {
  const d = date ? new Date(date + "T00:00:00") : null;
  return d ? d.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" }) : date || "";
};

const groupDocuments = (rawDocs: any[]): any[] => {
  const groups: any = {};
  const singles: any[] = [];
  rawDocs.forEach((doc: any) => {
    if (doc.original_document_id && doc.original_document_id !== doc.aws_document_id) {
      if (!groups[doc.original_document_id]) groups[doc.original_document_id] = [];
      groups[doc.original_document_id].push(doc);
    } else {
      singles.push(doc);
    }
  });
  const result: any[] = [];
  Object.entries(groups).forEach(([origId, parts]: [string, any]) => {
    const sorted = [...parts].sort((a: any, b: any) => (a.part_number || 0) - (b.part_number || 0));
    result.push({
      id: origId,
      file_name: sorted[0].file_name,
      _is_group: true,
      _parts: sorted,
      page_classifications: sorted.flatMap((p: any) => p.page_classifications || []),
    });
  });
  singles.forEach((d: any) => result.push({ ...d, _is_group: false, _parts: [] }));
  return result.sort((a: any, b: any) => (a.file_name || "").localeCompare(b.file_name || ""));
};

// ── Component ─────────────────────────────────────────────────────────────────
export default function VisitIndex({ onNavigate, idToken }: { onNavigate?: (page: string) => void; idToken?: string }) {
  // ── AWS proxy ─────────────────────────────────────────────────────────────
  const awsProxy = async (path: string, method = "GET", data?: any): Promise<any> => {
    const opts: any = {
      method,
      headers: { "Content-Type": "application/json", "x-api-key": API_KEY, "Authorization": `Bearer ${idToken || ""}`, "x-org-id": ORG_ID },
    };
    if (data !== undefined) opts.body = JSON.stringify(data);
    const res = await fetch(`${AWS_API_URL}${path}`, opts);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || `${method} ${path} failed: ${res.status}`);
    return json;
  };

  const [docs, setDocs] = useState<any[]>([]);
  const [groupedDocs, setGroupedDocs] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState("");
  const [visitIndexData, setVisitIndexData] = useState<any>(null);
  const [visitIndexView, setVisitIndexView] = useState<"chrono" | "grouped">("chrono");
  const [error, setError] = useState<string | null>(null);

  // ── Load documents ────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        let allDocs: any[] = [];
        let lastKey: any = null;
        do {
          const url = lastKey
            ? `${AWS_API_URL}/documents?last_key=${encodeURIComponent(JSON.stringify(lastKey))}`
            : `${AWS_API_URL}/documents`;
          const res = await fetch(url, {
            headers: { "Authorization": `Bearer ${idToken || ""}`, "x-api-key": API_KEY, "x-org-id": ORG_ID },
          });
          const data = await res.json();
          allDocs = allDocs.concat(data.documents || []);
          lastKey = data.last_key || null;
        } while (lastKey);

        const valid = allDocs.filter((d: any) => d.status === "processed");
        setDocs(valid);
        setGroupedDocs(groupDocuments(valid));
      } catch (e: any) {
        setError("Failed to load documents: " + e.message);
      }
    };
    load();
  }, []);

  // ── Selection ─────────────────────────────────────────────────────────────
  const toggleSelect = (id: string) => {
    setSelectedIds((prev: string[]) =>
      prev.includes(id) ? prev.filter((x: string) => x !== id) : [...prev, id]
    );
  };
  const selectAll = () => setSelectedIds(groupedDocs.map((d: any) => d.id));
  const clearAll  = () => setSelectedIds([]);

  // ── Build via Lambda ──────────────────────────────────────────────────────
  const generate = async () => {
    const selected = groupedDocs.filter((d: any) => selectedIds.includes(d.id));
    if (selected.length === 0) return;

    setRunning(true);
    setError(null);
    setVisitIndexData(null);
    setStatus("Starting Visit Index build...");

    try {
      // Collect all clinical part IDs
      const allPartIds: string[] = [];
      for (const doc of selected) {
        if (doc._is_group && doc._parts?.length) {
          for (const part of doc._parts) {
            const classif: any[] = part.page_classifications || [];
            const allNonClinical = classif.length > 0 && classif.every((p: any) => !p.is_clinical && !p.restored);
            if (!allNonClinical) allPartIds.push(part.aws_document_id);
          }
        } else {
          const classif: any[] = doc.page_classifications || [];
          const allNonClinical = classif.length > 0 && classif.every((p: any) => !p.is_clinical && !p.restored);
          if (!allNonClinical) allPartIds.push(doc.aws_document_id || doc.id);
        }
      }

      if (allPartIds.length === 0) {
        setError("No clinical document parts found in selection.");
        setRunning(false);
        return;
      }

      setStatus(`Sending ${allPartIds.length} parts to Lambda...`);

      // Fire Lambda start
      const startRes = await awsProxy("/visit-index/build", "POST", { doc_ids: allPartIds });
      const jobId = startRes.job_id;
      if (!jobId) throw new Error("No job_id returned from /visit-index/build");

      // Poll /jobs/{id}
      setStatus("Processing... (this may take a few minutes)");
      const MAX_POLLS = 180; // 15 min at 5s intervals
      for (let i = 0; i < MAX_POLLS; i++) {
        await new Promise(r => setTimeout(r, 5000));
        const job = await awsProxy(`/jobs/${jobId}`, "GET");

        if (job.status === "complete" || job.status === "completed") {
          const result = job.result || {};
          let entries: any[] = Array.isArray(result.known_visits) ? result.known_visits
            : Array.isArray(result.visits) ? result.visits : [];

          // Deduplicate
          const seen = new Set<string>();
          entries = entries.filter((v: any) => {
            if (!v.date) return false;
            const key = `${v.date}||${(v.provider || "").toLowerCase().trim()}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });

          // Sort chronologically
          entries.sort((a: any, b: any) => {
            if (!a.date) return 1;
            if (!b.date) return -1;
            return new Date(a.date + "T00:00:00").getTime() - new Date(b.date + "T00:00:00").getTime();
          });

          setVisitIndexData({ patient_name: result.patient_name || "", visits: entries });
          setStatus(`Complete — ${entries.length} visits found.`);
          setRunning(false);
          return;
        }

        if (job.status === "failed" || job.status === "error") {
          throw new Error(job.error || "Visit Index job failed");
        }

        const elapsed = Math.round(((i + 1) * 5) / 60);
        setStatus(`Processing... (~${elapsed} min elapsed)`);
      }

      throw new Error("Timed out waiting for Visit Index job");
    } catch (err: any) {
      setError("Visit Index generation failed: " + err.message);
      setRunning(false);
    }
  };

  // ── Export .docx ──────────────────────────────────────────────────────────
  const exportDocx = async () => {
    if (!visitIndexData) return;
    const { patient_name, visits } = visitIndexData;
    const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
            WidthType, ShadingType, AlignmentType, BorderStyle, HeadingLevel } = window.docx;

    const headerShading = { type: ShadingType.SOLID, color: "1e3a5f", fill: "1e3a5f" };
    const noBorder = { style: BorderStyle.NONE, size: 0, color: "auto" };
    const cellBorders = {
      top: noBorder,
      bottom: { style: BorderStyle.SINGLE, size: 4, color: "e5e7eb" },
      left: noBorder, right: noBorder,
    };

    const makeHeaderRow = (label: string, count: number) => new TableRow({
      children: [new TableCell({
        columnSpan: 4,
        shading: headerShading,
        borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder },
        children: [new Paragraph({
          children: [
            new TextRun({ text: label, bold: true, color: "FFFFFF", size: 22 }),
            new TextRun({ text: `  (${count} visit${count !== 1 ? "s" : ""})`, color: "CCDDEE", size: 20 }),
          ],
          spacing: { before: 80, after: 80 },
        })],
      })],
    });

    const makeDataRow = (col1: string, col2: string, col3: string, col4: string, shaded: boolean) => new TableRow({
      children: [col1, col2, col3, col4].map((text: string, idx: number) => new TableCell({
        width: idx === 0
          ? { size: 1400, type: WidthType.DXA }
          : idx === 3
          ? { size: 1600, type: WidthType.DXA }
          : { size: 3100, type: WidthType.DXA },
        shading: shaded ? { type: ShadingType.SOLID, color: "F8FAFC", fill: "F8FAFC" } : undefined,
        borders: cellBorders,
        children: [new Paragraph({
          children: [new TextRun({ text: text || "", size: 18 })],
          spacing: { before: 40, after: 40 },
        })],
      })),
    });

    const tableRows: any[] = [];

    if (visitIndexView === "grouped") {
      const groups: any = {};
      visits.forEach((v: any) => {
        const k = v.provider || "Unknown Provider";
        if (!groups[k]) groups[k] = [];
        groups[k].push(v);
      });
      Object.entries(groups)
        .sort(([a], [b]: [string, any]) => a.localeCompare(b))
        .forEach(([provider, pvVisits]: [string, any]) => {
          tableRows.push(makeHeaderRow(provider, pvVisits.length));
          pvVisits.forEach((v: any, i: number) =>
            tableRows.push(makeDataRow(makeDateStr(v.date), v.facility || "", v.visit_type || "", "", i % 2 !== 0))
          );
        });
    } else {
      // Chrono — header row
      tableRows.push(new TableRow({
        children: ["Date", "Provider", "Facility", "Type"].map((text: string, idx: number) => new TableCell({
          width: idx === 0 ? { size: 1400, type: WidthType.DXA } : idx === 3 ? { size: 1600, type: WidthType.DXA } : { size: 3100, type: WidthType.DXA },
          shading: headerShading,
          borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder },
          children: [new Paragraph({
            children: [new TextRun({ text, bold: true, color: "FFFFFF", size: 20 })],
            spacing: { before: 80, after: 80 },
          })],
        })),
      }));
      visits.forEach((v: any, i: number) =>
        tableRows.push(makeDataRow(makeDateStr(v.date), v.provider || "", v.facility || "", v.visit_type || "", i % 2 !== 0))
      );
    }

    const doc = new Document({
      sections: [{
        properties: {
          page: {
            margin: { top: 720, bottom: 720, left: 720, right: 720 },
          },
        },
        children: [
          new Paragraph({ text: "Visit Index", heading: HeadingLevel.HEADING_1, spacing: { after: 100 } }),
          new Paragraph({
            children: [new TextRun({ text: "Patient: ", bold: true }), new TextRun(patient_name || "")],
            spacing: { after: 60 },
          }),
          new Paragraph({
            children: [new TextRun({ text: "Generated: ", bold: true }), new TextRun(new Date().toLocaleDateString("en-US"))],
            spacing: { after: 200 },
          }),
          new Table({ width: { size: 9240, type: WidthType.DXA }, rows: tableRows }),
        ],
      }],
    });

    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `VisitIndex_${(patient_name || "Patient").replace(/\s+/g, "_")}_${new Date().toLocaleDateString("en-US").replace(/\//g, "-")}.docx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ── Render table ──────────────────────────────────────────────────────────
  const renderTable = () => {
    if (!visitIndexData) return null;
    const { visits } = visitIndexData;

    if (visitIndexView === "grouped") {
      const groups: any = {};
      visits.forEach((v: any) => {
        const k = v.provider || "Unknown Provider";
        if (!groups[k]) groups[k] = [];
        groups[k].push(v);
      });
      return Object.entries(groups)
        .sort(([a], [b]: [string, any]) => a.localeCompare(b))
        .map(([provider, pvVisits]: [string, any]) => (
          <div key={provider} className="mb-4">
            <div className="bg-slate-800 text-white px-4 py-2 text-sm font-semibold rounded-t">
              {provider}{" "}
              <span className="text-slate-300 font-normal">
                ({pvVisits.length} visit{pvVisits.length !== 1 ? "s" : ""})
              </span>
            </div>
            <table className="w-full text-sm border border-slate-200">
              <tbody>
                {pvVisits.map((v: any, i: number) => (
                  <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                    <td className="px-3 py-2 border-b border-slate-100 w-32">{makeDateStr(v.date)}</td>
                    <td className="px-3 py-2 border-b border-slate-100">{v.facility}</td>
                    <td className="px-3 py-2 border-b border-slate-100 w-36">{v.visit_type}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ));
    }

    return (
      <table className="w-full text-sm border border-slate-200">
        <thead>
          <tr className="bg-slate-800 text-white">
            <th className="px-3 py-2 text-left w-32">Date</th>
            <th className="px-3 py-2 text-left">Provider</th>
            <th className="px-3 py-2 text-left">Facility</th>
            <th className="px-3 py-2 text-left w-36">Type</th>
          </tr>
        </thead>
        <tbody>
          {visits.map((v: any, i: number) => (
            <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
              <td className="px-3 py-2 border-b border-slate-100">{makeDateStr(v.date)}</td>
              <td className="px-3 py-2 border-b border-slate-100">{v.provider}</td>
              <td className="px-3 py-2 border-b border-slate-100">{v.facility}</td>
              <td className="px-3 py-2 border-b border-slate-100">{v.visit_type}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  // ── JSX ───────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 max-w-6xl mx-auto">

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Build Visit Index</h1>
        <p className="text-slate-500 text-sm mt-1">
          Select documents to extract a chronological list of all clinical encounters.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">{error}</div>
      )}

      {/* Document selector */}
      <div className="bg-white rounded-lg border border-slate-200 mb-6">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <span className="text-sm font-semibold text-slate-700">
            Documents ({groupedDocs.length} available)
          </span>
          <div className="flex gap-2">
            <button onClick={selectAll} className="text-xs text-blue-600 hover:underline">Select All</button>
            <span className="text-slate-300">|</span>
            <button onClick={clearAll} className="text-xs text-slate-500 hover:underline">Clear</button>
          </div>
        </div>
        <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
          {groupedDocs.length === 0 && (
            <div className="px-4 py-6 text-center text-slate-400 text-sm">No processed documents found.</div>
          )}
          {groupedDocs.map((doc: any) => (
            <label key={doc.id} className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50">
              <input
                type="checkbox"
                checked={selectedIds.includes(doc.id)}
                onChange={() => toggleSelect(doc.id)}
                className="accent-blue-600"
              />
              <span className="text-sm text-slate-800">{doc.file_name || doc.id}</span>
              {doc._is_group && (
                <span className="text-xs text-slate-400">({doc._parts.length} parts)</span>
              )}
            </label>
          ))}
        </div>
      </div>

      {/* Action bar */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <button
          onClick={generate}
          disabled={running || selectedIds.length === 0}
          className="px-5 py-2 bg-blue-700 text-white text-sm font-semibold rounded hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {running ? (status || "Running...") : `Build Visit Index (${selectedIds.length} selected)`}
        </button>
        {visitIndexData && !running && (
          <>
            <button
              onClick={() => setVisitIndexView((v: "chrono" | "grouped") => v === "chrono" ? "grouped" : "chrono")}
              className="px-4 py-2 border border-slate-300 text-sm rounded hover:bg-slate-50"
            >
              {visitIndexView === "chrono" ? "Group by Provider" : "Chronological"}
            </button>
            <button
              onClick={exportDocx}
              className="px-4 py-2 bg-slate-800 text-white text-sm rounded hover:bg-slate-700"
            >
              Export .docx
            </button>
          </>
        )}
        {running && (
          <span className="text-sm text-slate-500 italic">{status}</span>
        )}
      </div>

      {/* Results */}
      {visitIndexData && (
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                {visitIndexData.patient_name || "Visit Index"}
              </h2>
              <p className="text-xs text-slate-400">{visitIndexData.visits.length} visits found</p>
            </div>
          </div>
          {renderTable()}
        </div>
      )}
    </div>
  );
}


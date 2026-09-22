// AdminSummaryLog.tsx — chartreview-pro-live-frontend
// Updated: 2026-09-21 — CSV export now includes a "Cost (USD)" column, sourced from
// estimated_cost_usd (the true per-run cost -- upload/classify + summary generation --
// already computed and persisted on the summary record by generate_summary.js). No
// backend change needed: listAllHandler already returns the full item, this field
// included.
// Added: 2026-09-21 — admin-only page listing every user's summaries (backend resolves
// each org_id to the owning user's email via Cognito AdminGetUser when called with
// ?all=true; see summaries.js). Read-only: clicking a row shows its visits in a simple
// panel, it does not open the full editing UI (MedicalSummaryForm/SummaryViewer), to
// avoid any risk to that already-stable editing surface. Also offers a CSV export of
// exactly what's on screen.
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Download, X, ShieldAlert } from "lucide-react";
import { getSessionToken } from "../api/authSession";

const AWS_API_URL = process.env.REACT_APP_AWS_API_URL || "https://1h4kpspbs6.execute-api.us-east-1.amazonaws.com/prod";
const ORG_ID      = process.env.REACT_APP_ORG_ID      || "69ceb1ab037acdd4467b31c3";

// ── Inline UI primitives (matches Dashboard.tsx's pattern) ───────────────────
function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-white rounded-xl border border-slate-200 shadow-sm ${className}`}>{children}</div>;
}
function Badge({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${className}`}>
      {children}
    </span>
  );
}
function Button({ children, onClick, className = "", variant = "default", disabled = false }: {
  children: React.ReactNode; onClick?: () => void; className?: string; variant?: string; disabled?: boolean;
}) {
  const base = "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors focus:outline-none px-4 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed";
  const variants: any = {
    default: "bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white",
    outline: "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
  };
  return (
    <button onClick={onClick} disabled={disabled} className={`${base} ${variants[variant] || variants.default} ${className}`}>
      {children}
    </button>
  );
}

const statusBadgeClass = (status: string) => {
  if (status === "finalized") return "bg-green-50 text-green-700 border-green-200";
  if (status === "reviewed")  return "bg-blue-50 text-blue-700 border-blue-200";
  return "bg-slate-50 text-slate-600 border-slate-200";
};

function toCsv(rows: any[]): string {
  const headers = ["Created", "User Email", "Patient", "Case Number", "Status", "Cost (USD)", "Summary ID"];
  const escape = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = [headers.map(escape).join(",")];
  rows.forEach((s) => {
    lines.push([
      s.created_at || s.created_date || "",
      s.user_email || "",
      s.patient_name || "",
      s.case_number || "",
      s.status || "",
      s.estimated_cost_usd != null ? s.estimated_cost_usd.toFixed(4) : "",
      s.aws_summary_id || s.id || "",
    ].map(escape).join(","));
  });
  return lines.join("\n");
}

export default function AdminSummaryLog({ idToken, cognitoUser, isFreeUser = false }: { idToken?: string; cognitoUser?: any; isFreeUser?: boolean }) {
  const [openSummary, setOpenSummary] = useState<any | null>(null);
  const [openLoading, setOpenLoading] = useState(false);
  const [openError, setOpenError]     = useState<string | null>(null);

  const awsProxy = async (path: string): Promise<any> => {
    const token: string = await getSessionToken(cognitoUser, idToken);
    const res = await fetch(`${AWS_API_URL}${path}`, {
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}`, "x-org-id": ORG_ID },
    });
    const json = await res.json();
    if (res.status === 401) throw new Error("Your login session expired — log in again, then retry.");
    if (!res.ok) throw new Error(json.error || `Request failed: ${res.status}`);
    return json;
  };

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["adminSummaryLog"],
    queryFn: async () => {
      const result = await awsProxy("/summaries?all=true");
      const list: any[] = result.summaries || [];
      return list.sort((a, b) => new Date(b.created_at || b.created_date || 0).getTime() - new Date(a.created_at || a.created_date || 0).getTime());
    },
    enabled: !!isFreeUser,
  });

  const rows: any[] = data || [];

  const handleExportCsv = () => {
    const csv = toCsv(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `all-summaries-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleOpen = async (summary: any) => {
    setOpenLoading(true);
    setOpenError(null);
    setOpenSummary(null);
    try {
      const id = summary.aws_summary_id || summary.id;
      const full = await awsProxy(`/summaries/${id}`);
      setOpenSummary(full);
    } catch (e: any) {
      setOpenError(e.message);
    } finally {
      setOpenLoading(false);
    }
  };

  if (!isFreeUser) {
    return (
      <div className="p-6 md:p-8">
        <Card className="p-8 text-center">
          <ShieldAlert className="w-8 h-8 mx-auto text-slate-400 mb-2" />
          <p className="text-slate-600">Admin access only.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">All Summaries (Admin)</h1>
          <p className="text-slate-600">Every summary across every user, for QC.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Refresh
          </Button>
          <Button onClick={handleExportCsv} disabled={!rows.length}>
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {error ? (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">{(error as any).message}</div>
      ) : null}

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-slate-500">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
            Loading every user's summaries…
          </div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center text-slate-500">No summaries found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-500 text-xs uppercase tracking-wide">
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Patient</th>
                  <th className="px-4 py-3">Case #</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s: any) => (
                  <tr key={s.aws_summary_id || s.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {new Date(s.created_at || s.created_date || 0).toLocaleString(undefined, { month: "numeric", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}
                    </td>
                    <td className="px-4 py-3 text-slate-900">{s.user_email || "—"}</td>
                    <td className="px-4 py-3 text-slate-900">{s.patient_name || "Unnamed Patient"}</td>
                    <td className="px-4 py-3 text-slate-600">{s.case_number || "—"}</td>
                    <td className="px-4 py-3">
                      <Badge className={statusBadgeClass(s.status)}>{s.status || "unknown"}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="outline" onClick={() => handleOpen(s)}>Open</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {(openLoading || openSummary || openError) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => { setOpenSummary(null); setOpenError(null); }}>
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="font-semibold text-slate-900">
                {openSummary ? (openSummary.patient_name || "Summary") : "Loading…"}
              </h3>
              <button onClick={() => { setOpenSummary(null); setOpenError(null); }} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              {openLoading && <div className="text-center text-slate-500 py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>}
              {openError && <div className="text-red-600 text-sm">{openError}</div>}
              {openSummary && (
                <div className="space-y-3">
                  <p className="text-sm text-slate-500">Case #{openSummary.case_number || "—"} · {(openSummary.visits || []).length} visit(s)</p>
                  {(openSummary.visits || []).map((v: any, i: number) => (
                    <div key={i} className="border border-slate-200 rounded-lg p-3">
                      <p className="font-medium text-slate-900 text-sm">{v.visit_date || "Unknown date"} — {v.provider_name || v.facility_name || "Unknown provider"}</p>
                      <p className="text-slate-600 text-sm mt-1 whitespace-pre-wrap">{v.note || v.summary_text || ""}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

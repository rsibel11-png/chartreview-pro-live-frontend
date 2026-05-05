/* eslint-disable @typescript-eslint/no-unused-vars */
// Dashboard.tsx — chartreview-native-frontend
// Updated: 2026-05-03 — ported from v5 Dashboard.jsx, AWS DynamoDB instead of base44 entities

import React, { useState, useEffect } from "react";
import {
  FileText, Upload, FileCheck, TrendingUp,
  AlertCircle, Calendar, BarChart3
} from "lucide-react";

// ── Env vars ──────────────────────────────────────────────────────────────────
const AWS_API_URL = process.env.REACT_APP_AWS_API_URL || "";
const ORG_ID      = process.env.REACT_APP_ORG_ID      || "";

// ── Inline UI primitives ──────────────────────────────────────────────────────
function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-white rounded-xl border border-slate-200 shadow-sm ${className}`}>{children}</div>;
}
function CardContent({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`p-6 ${className}`}>{children}</div>;
}
function CardHeader({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`px-6 py-4 border-b border-slate-100 ${className}`}>{children}</div>;
}
function CardTitle({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <h3 className={`font-semibold text-slate-900 ${className}`}>{children}</h3>;
}
function Badge({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${className}`}>
      {children}
    </span>
  );
}
function Button({ children, onClick, className = "", variant = "default", size = "default" }: {
  children: React.ReactNode; onClick?: () => void; className?: string; variant?: string; size?: string;
}) {
  const base = "inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none";
  const variants: any = {
    default: "bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white",
    outline: "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
  };
  const sizes: any = { default: "px-4 py-2 text-sm", sm: "px-3 py-1.5 text-xs" };
  return (
    <button onClick={onClick} className={`${base} ${variants[variant] || variants.default} ${sizes[size] || sizes.default} ${className}`}>
      {children}
    </button>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function Dashboard({ onNavigate, idToken }: { onNavigate?: (page: string) => void; idToken?: string }) {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);

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
            headers: { "Authorization": `Bearer ${idToken || ""}`, "x-org-id": ORG_ID },
          });
          if (!res.ok) throw new Error(`Failed to load documents: ${res.status}`);
          const data = await res.json();
          allDocs = allDocs.concat(data.documents || []);
          lastKey = data.last_key || null;
        } while (lastKey);
        setDocuments(allDocs);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // ── Stats ──────────────────────────────────────────────────────────────────
  const processed   = documents.filter((d: any) => d.status === "processed");
  const pending     = documents.filter((d: any) => d.status === "pending_upload" || d.status === "processing");
  const errored     = documents.filter((d: any) => d.status === "error");

  // Group into logical documents by original_document_id
  const grouped: any = {};
  const singles: any[] = [];
  documents.forEach((d: any) => {
    if (d.original_document_id && d.original_document_id !== d.aws_document_id) {
      if (!grouped[d.original_document_id]) grouped[d.original_document_id] = [];
      grouped[d.original_document_id].push(d);
    } else {
      singles.push(d);
    }
  });
  const totalLogicalDocs = Object.keys(grouped).length + singles.length;

  // Group by upload session (within 10 min = same session)
  const sessions: any[] = [];
  [...documents]
    .sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
    .forEach((doc: any) => {
      const t = new Date(doc.created_at || 0).getTime();
      const existing = sessions.find((s: any) => Math.abs(t - new Date(s.timestamp).getTime()) < 10 * 60 * 1000);
      if (existing) { existing.documents.push(doc); }
      else { sessions.push({ timestamp: doc.created_at, documents: [doc] }); }
    });

  const latestSession = sessions[0];
  const recentDocs = documents
    .slice()
    .sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
    .slice(0, 20);

  // ── Status badge helper ────────────────────────────────────────────────────
  const statusBadge = (status: string) => {
    if (status === "processed") return "bg-green-50 text-green-700 border-green-200";
    if (status === "processing") return "bg-yellow-50 text-yellow-700 border-yellow-200";
    if (status === "error") return "bg-red-50 text-red-700 border-red-200";
    return "bg-slate-50 text-slate-600 border-slate-200";
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 md:p-8 space-y-8">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-600">Medical-Legal document management overview</p>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">{error}</div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button onClick={() => onNavigate?.('Upload')} className="text-left">
          <Card className="hover:shadow-lg transition-all duration-300 border-2 border-transparent hover:border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50 cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-md">
                  <Upload className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-slate-600 font-medium">Upload New</p>
                  <p className="text-lg font-bold text-slate-900">Documents</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </button>

        <button onClick={() => onNavigate?.('Library')} className="text-left">
          <Card className="hover:shadow-lg transition-all duration-300 border-2 border-transparent hover:border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50 cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-md">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-slate-600 font-medium">View All</p>
                  <p className="text-lg font-bold text-slate-900">Library</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </button>

        <button onClick={() => onNavigate?.('MedicalSummaries')} className="text-left">
          <Card className="hover:shadow-lg transition-all duration-300 border-2 border-transparent hover:border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-md">
                  <FileCheck className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-slate-600 font-medium">Generate</p>
                  <p className="text-lg font-bold text-slate-900">Summaries</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Documents", value: loading ? "…" : totalLogicalDocs, icon: FileText,   color: "text-blue-600",   bg: "w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center" },
          { label: "Processed",       value: loading ? "…" : processed.length,  icon: FileCheck,  color: "text-green-600",  bg: "w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center" },
          { label: "Processing",      value: loading ? "…" : pending.length,    icon: TrendingUp, color: "text-yellow-600", bg: "w-8 h-8 rounded-lg bg-yellow-100 flex items-center justify-center" },
          { label: "Errors",          value: loading ? "…" : errored.length,    icon: AlertCircle,color: "text-red-600",    bg: "w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label} className="shadow-md">
            <CardHeader className="pb-3 border-0 px-4 pt-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-medium text-slate-600">{label}</CardTitle>
                <div className={bg}><Icon className={`w-4 h-4 ${color}`} /></div>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0">
              <p className={`text-3xl font-bold ${color}`}>{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Latest Upload Session */}
      {latestSession && (
        <Card className="shadow-lg border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white">
          <CardHeader className="border-b border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-bold text-slate-900">Latest Upload Session</CardTitle>
                <p className="text-sm text-slate-600 mt-1">
                  {new Date(latestSession.timestamp).toLocaleString()} &bull; {latestSession.documents.length} document{latestSession.documents.length !== 1 ? "s" : ""}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => onNavigate?.('Library')}>View All</Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-blue-100">
              {latestSession.documents.slice(0, 10).map((doc: any) => (
                <div key={doc.aws_document_id} className="p-4 hover:bg-blue-100/50 transition-colors">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-cyan-100 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-4 h-4 text-cyan-600" />
                      </div>
                      <p className="font-medium text-slate-900 truncate text-sm">{doc.file_name || doc.aws_document_id}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge className={statusBadge(doc.status)}>{doc.status || "unknown"}</Badge>
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(doc.created_at || 0).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Documents */}
      <Card className="shadow-lg">
        <CardHeader className="border-b border-slate-200">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-bold">All Recent Documents</CardTitle>
            <Button variant="outline" size="sm" onClick={() => onNavigate?.('Library')}>View All</Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center text-slate-400 text-sm">Loading documents…</div>
          ) : recentDocs.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {recentDocs.map((doc: any) => (
                <div key={doc.aws_document_id} className="p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-4 h-4 text-slate-500" />
                      </div>
                      <p className="font-medium text-slate-900 truncate text-sm">{doc.file_name || doc.aws_document_id}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge className={statusBadge(doc.status)}>{doc.status || "unknown"}</Badge>
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(doc.created_at || 0).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 mb-4">No documents yet. Upload your first document to get started.</p>
              <Button onClick={() => onNavigate?.('Upload')}>
                <Upload className="w-4 h-4 mr-2" />
                Upload Documents
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

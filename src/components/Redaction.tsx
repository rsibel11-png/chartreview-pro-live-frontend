/* eslint-disable @typescript-eslint/no-unused-vars */
// Redaction.tsx — chartreview-native-frontend
// Multi-select batch redaction with checkboxes + "Redact Selected" queue.

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';

// ── Env vars ──────────────────────────────────────────────────────────────────
const AWS_API_URL = process.env.REACT_APP_AWS_API_URL || 'https://1h4kpspbs6.execute-api.us-east-1.amazonaws.com/prod';
const ORG_ID      = process.env.REACT_APP_ORG_ID      || '69ceb1ab037acdd4467b31c3';

// ── Auth ──────────────────────────────────────────────────────────────────────
function getFreshToken(): string {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i) || '';
      if (k.includes('CognitoIdentityServiceProvider') && k.endsWith('.idToken')) {
        return localStorage.getItem(k) || '';
      }
    }
  } catch { }
  return '';
}

async function awsProxy(path: string, method = 'GET', data?: any): Promise<any> {
  const opts: any = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getFreshToken()}`,
      'x-org-id': ORG_ID,
    },
  };
  if (data) opts.body = JSON.stringify(data);
  const res = await fetch(`${AWS_API_URL}${path}`, opts);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `${method} ${path} failed: ${res.status}`);
  return json;
}

// ── UI primitives ─────────────────────────────────────────────────────────────
function Button({ children, onClick, disabled, className = '', variant = 'default', size = 'default', title }: {
  children: React.ReactNode; onClick?: () => void; disabled?: boolean;
  className?: string; variant?: string; size?: string; title?: string;
}) {
  const base = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none disabled:opacity-50 disabled:pointer-events-none';
  const variants: any = {
    default:     'bg-blue-600 text-white hover:bg-blue-700',
    outline:     'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
    ghost:       'bg-transparent hover:bg-slate-100 text-slate-700',
    destructive: 'bg-red-600 text-white hover:bg-red-700',
    dark:        'bg-slate-800 text-white hover:bg-slate-700',
  };
  const sizes: any = { default: 'px-4 py-2 text-sm', sm: 'px-3 py-1.5 text-xs', icon: 'p-1.5' };
  return (
    <button title={title} onClick={onClick} disabled={disabled}
      className={`${base} ${variants[variant] || variants.default} ${sizes[size] || sizes.default} ${className}`}>
      {children}
    </button>
  );
}

function Badge({ children, className = '', variant = 'default' }: {
  children: React.ReactNode; className?: string; variant?: string;
}) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
      variant === 'outline' ? 'bg-white border-slate-300 text-slate-700' : 'bg-slate-100 border-transparent text-slate-700'
    } ${className}`}>{children}</span>
  );
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-white rounded-xl border border-slate-200 shadow-sm ${className}`}>{children}</div>;
}
function CardContent({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`p-6 ${className}`}>{children}</div>;
}

function Dialog({ open, onOpenChange, children }: { open: boolean; onOpenChange: (v: boolean) => void; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={() => onOpenChange(false)} />
      <div className="relative z-10 bg-white rounded-xl shadow-xl w-full mx-4 max-w-3xl">
        {children}
      </div>
    </div>
  );
}
function DialogContent({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`p-6 overflow-y-auto ${className}`} style={{ maxHeight: '85vh' }}>{children}</div>;
}
function DialogHeader({ children }: { children: React.ReactNode }) {
  return <div className="mb-4">{children}</div>;
}
function DialogFooter({ children }: { children: React.ReactNode }) {
  return <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 mt-4">{children}</div>;
}
function DialogTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-lg font-semibold text-slate-900">{children}</h2>;
}
function DialogDescription({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-slate-500 mt-1">{children}</p>;
}

// ── Icons ─────────────────────────────────────────────────────────────────────
const ShieldOff = ({ className = '' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M20.618 5.984A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016zM3 3l18 18" />
  </svg>
);
const Folder = ({ className = '' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
  </svg>
);
const FileIcon = ({ className = '' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
  </svg>
);
const Loader = ({ className = '' }) => (
  <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
  </svg>
);
const Download = ({ className = '' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
);

// ── Types ─────────────────────────────────────────────────────────────────────
interface DocItem {
  id: string;
  aws_document_id: string;
  original_filename?: string;
  title?: string;
  file_name?: string;
  folder_name?: string;
  provider_name?: string;
  status?: string;
  is_redacted?: boolean;
  original_document_id?: string | null;
  created_at?: string;
}

interface CaseGroup {
  key: string;
  isMultiPart: boolean;
  parts: DocItem[];
  label: string;
  providerName?: string;
  date?: string;
}

interface RedactionJob {
  job_id: string;
  status: 'processing' | 'complete' | 'error';
  progress_message: string;
  result?: {
    new_doc_id: string;
    download_url: string;
    redaction_count: number;
    redacted_pages?: number;
  };
}

// ── PII Modal ─────────────────────────────────────────────────────────────────
interface PiiField { label: string; key: string; placeholder: string; }
const PII_FIELDS: PiiField[] = [
  { label: 'Patient Name (Last, First)',  key: 'patientName',  placeholder: 'e.g. GARCIA, CARLOS' },
  { label: 'Date of Birth',               key: 'dob',          placeholder: 'e.g. 02/06/1976' },
  { label: 'Street Address',              key: 'street',       placeholder: 'e.g. 383 FREE FALL AVE' },
  { label: 'City',                        key: 'city',         placeholder: 'e.g. NORTH LAS VEGAS' },
  { label: 'State / Zip',                 key: 'stateZip',     placeholder: 'e.g. NV 89084' },
  { label: 'Phone Number',                key: 'phone',        placeholder: 'e.g. 702-575-2864' },
  { label: 'SSN (or last 4)',             key: 'ssn',          placeholder: 'e.g. XXX-XX-1234' },
  { label: 'MRN / Account #',            key: 'mrn',          placeholder: 'e.g. 21633854' },
  { label: 'Employer',                    key: 'employer',     placeholder: 'e.g. TIER 1 DEMOLITION' },
  { label: 'Spouse / Partner Name',       key: 'spouse',       placeholder: 'e.g. MARIA GARCIA' },
  { label: 'Next of Kin / POA Name',      key: 'nokPoa',       placeholder: 'e.g. LUIS MORA' },
  { label: 'Son / Daughter / Other Rel.', key: 'relative',     placeholder: 'e.g. SOFIA GARCIA' },
  { label: 'Additional value #1',         key: 'extra1',       placeholder: 'Any other value to redact' },
  { label: 'Additional value #2',         key: 'extra2',       placeholder: 'Any other value to redact' },
];
type PiiFormState = Record<string, string>;

function buildUserPiiArray(form: PiiFormState): string[] {
  return Object.values(form).map(v => v.trim()).filter(v => v.length > 0);
}

function PiiModal({ open, groupLabel, onClose, onConfirm }: {
  open: boolean; groupLabel: string;
  onClose: () => void; onConfirm: (pii: string[]) => void;
}) {
  const [form, setForm] = useState<PiiFormState>({});
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="text-base font-semibold text-slate-900">Redaction Settings</h3>
          <p className="text-xs text-slate-500 mt-0.5 truncate">{groupLabel}</p>
        </div>
        <div className="px-6 py-4 overflow-y-auto" style={{ maxHeight: '60vh' }}>
          <p className="text-xs text-slate-500 mb-4">
            The system will auto-detect PII from the document. Add any values below that may be missed
            (spouse, next of kin, employer, etc.).
          </p>
          <div className="space-y-3">
            {PII_FIELDS.map(f => (
              <div key={f.key}>
                <label className="block text-xs font-medium text-slate-600 mb-1">{f.label}</label>
                <input
                  type="text"
                  value={form[f.key] || ''}
                  placeholder={f.placeholder}
                  onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ))}
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50">Cancel</button>
          <button onClick={() => { onConfirm(buildUserPiiArray(form)); setForm({}); }}
            className="px-4 py-2 text-sm rounded-md bg-blue-600 text-white font-medium hover:bg-blue-700">Redact Document</button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
interface RedactionProps {
  onNavigate?: (page: string, params?: any) => void;
  idToken?: string;
  isFreeUser?: boolean;
}

const Redaction: React.FC<RedactionProps> = ({ onNavigate }) => {

  // ── State ────────────────────────────────────────────────────────────────
  const [showDialog, setShowDialog]         = useState(false);
  const [running, setRunning]               = useState(false);
  const [statusMsg, setStatusMsg]           = useState('');
  const [completedJobs, setCompletedJobs]   = useState<RedactionJob[]>([]);
  const [error, setError]                   = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // PII modal (single-doc flow only)
  const [piiModalOpen, setPiiModalOpen]     = useState(false);
  const [pendingGroup, setPendingGroup]     = useState<CaseGroup | null>(null);

  // Multi-select: set of checked group keys
  const [checkedKeys, setCheckedKeys]       = useState<Set<string>>(new Set());

  // ── Fetch all docs ───────────────────────────────────────────────────────
  const { data: documents = [], isLoading: docsLoading } = useQuery({
    queryKey: ['aws-documents-for-redaction'],
    queryFn: async () => {
      const res = await fetch(`${AWS_API_URL}/documents`, {
        headers: { 'Authorization': `Bearer ${getFreshToken()}`, 'x-org-id': ORG_ID },
      });
      if (!res.ok) throw new Error('Failed to fetch documents');
      const data = await res.json();
      const list: any[] = Array.isArray(data) ? data
        : Array.isArray(data?.items) ? data.items
        : Array.isArray(data?.documents) ? data.documents : [];
      return list
        .filter((d: any) => d.status === 'processed' && !d.is_redacted
          && !(d.original_document_id === null && d.status === 'pending_upload'))
        .map((d: any) => ({ ...d, id: d.aws_document_id || d.id }));
    },
    staleTime: 30000,
  });

  // ── Build case groups ────────────────────────────────────────────────────
  const documentsByFolder: Record<string, DocItem[]> = (documents as DocItem[]).reduce(
    (acc: Record<string, DocItem[]>, doc: DocItem) => {
      const folder = doc.folder_name || 'Unfiled';
      if (!acc[folder]) acc[folder] = [];
      acc[folder].push(doc);
      return acc;
    }, {}
  );

  const caseGroupsByFolder: Record<string, CaseGroup[]> = {};
  for (const folder of Object.keys(documentsByFolder)) {
    const docs = documentsByFolder[folder];
    const groupMap: Record<string, DocItem[]> = {};
    for (const doc of docs) {
      const key = doc.original_document_id || doc.id;
      if (!groupMap[key]) groupMap[key] = [];
      groupMap[key].push(doc);
    }
    caseGroupsByFolder[folder] = Object.entries(groupMap).map(([key, parts]: [string, DocItem[]]) => {
      const sorted = parts.slice().sort((a: DocItem, b: DocItem) => {
        const aM = (a.original_filename || '').match(/[Pp]art(\d+)/);
        const bM = (b.original_filename || '').match(/[Pp]art(\d+)/);
        return (aM ? parseInt(aM[1]) : 0) - (bM ? parseInt(bM[1]) : 0);
      });
      const rawLabel = sorted[0].original_filename || sorted[0].title || sorted[0].file_name || key;
      const label = rawLabel.replace(/_?[Pp]art\d+\.pdf$/i, '').replace(/\.pdf$/i, '');
      return { key, isMultiPart: sorted.length > 1, parts: sorted, label, providerName: sorted[0].provider_name, date: sorted[0].created_at };
    });
  }

  // All groups flat list
  const allGroups: CaseGroup[] = Object.values(caseGroupsByFolder).flat();

  // Select-all state: all checked, none checked, or mixed
  const allChecked = allGroups.length > 0 && allGroups.every(g => checkedKeys.has(g.key));
  const someChecked = allGroups.some(g => checkedKeys.has(g.key));
  const checkedCount = checkedKeys.size;

  // Initialize: check all when dialog opens
  const openDialog = () => {
    const allKeys = new Set(allGroups.map(g => g.key));
    setCheckedKeys(allKeys);
    setShowDialog(true);
    setError(null);
  };

  const toggleGroup = (key: string) => {
    setCheckedKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const toggleAll = () => {
    if (allChecked) {
      setCheckedKeys(new Set());
    } else {
      setCheckedKeys(new Set(allGroups.map(g => g.key)));
    }
  };

  // ── Poll a job until complete ─────────────────────────────────────────────
  const pollJobUntilDone = (jobId: string): Promise<RedactionJob> => {
    return new Promise((resolve) => {
      const poll = async () => {
        try {
          const job: RedactionJob = await awsProxy(`/jobs/${jobId}`);
          setStatusMsg(job.progress_message || '');
          if (job.status === 'complete' || job.status === 'error') {
            resolve(job);
          } else {
            pollRef.current = setTimeout(poll, 3000);
          }
        } catch { pollRef.current = setTimeout(poll, 5000); }
      };
      pollRef.current = setTimeout(poll, 2000);
    });
  };

  useEffect(() => () => { if (pollRef.current) clearTimeout(pollRef.current); }, []);

  // ── Execute one group (used by both single and batch) ────────────────────
  const executeGroup = async (group: CaseGroup, userPii: string[] = []) => {
    const extra = userPii.length > 0 ? { user_supplied_pii: userPii } : {};
    if (group.isMultiPart) {
      setStatusMsg(`Redacting ${group.label} (${group.parts.length} parts)…`);
      const resp = await awsProxy('/documents/redact-case/redact', 'POST', {
        doc_ids: group.parts.map((p: DocItem) => p.id),
        original_document_id: group.key,
        ...extra,
      });
      if (resp.job_id) {
        const job = await pollJobUntilDone(resp.job_id);
        setCompletedJobs(prev => [job, ...prev]);
        if (job.status === 'error') setError(job.progress_message);
      }
    } else {
      setStatusMsg(`Redacting ${group.label}…`);
      const resp = await awsProxy(`/documents/${group.parts[0].id}/redact`, 'POST',
        userPii.length > 0 ? extra : undefined);
      if (resp.job_id) {
        const job = await pollJobUntilDone(resp.job_id);
        setCompletedJobs(prev => [job, ...prev]);
        if (job.status === 'error') setError(job.progress_message);
      }
    }
  };

  // ── Single-doc flow (PII modal) ──────────────────────────────────────────
  const handleSingleRedact = (group: CaseGroup) => {
    if (running) return;
    setShowDialog(false);
    setPendingGroup(group);
    setPiiModalOpen(true);
  };

  const handlePiiConfirm = async (userPii: string[]) => {
    if (!pendingGroup) return;
    setPiiModalOpen(false);
    setRunning(true);
    setError(null);
    try {
      await executeGroup(pendingGroup, userPii);
    } catch (err: any) {
      setError(`Redaction failed: ${err.message}`);
    }
    setRunning(false);
    setStatusMsg('');
    setPendingGroup(null);
  };

  // ── Batch flow (checked groups, sequential) ──────────────────────────────
  const handleRedactSelected = async () => {
    const queue = allGroups.filter(g => checkedKeys.has(g.key));
    if (!queue.length || running) return;
    setShowDialog(false);
    setRunning(true);
    setError(null);
    for (let i = 0; i < queue.length; i++) {
      const group = queue[i];
      setStatusMsg(`Redacting ${i + 1} of ${queue.length} — ${group.label}…`);
      try {
        await executeGroup(group);
      } catch (err: any) {
        setError(`Failed on "${group.label}": ${err.message}`);
        // continue with next item even on error
      }
    }
    setRunning(false);
    setStatusMsg('');
  };

  // ── Render ───────────────────────────────────────────────────────────────
  const successJobs = completedJobs.filter(j => j.status === 'complete');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">

      {/* ── Page header ── */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center shadow-md">
            <ShieldOff className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Document Redaction</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Automatically detect and black out patient PII — names, SSN, DOB, insurance IDs, photos, signatures
            </p>
          </div>
        </div>
        <Button variant="dark" onClick={openDialog} disabled={running} className="gap-2 shadow-sm">
          <ShieldOff className="w-4 h-4" />
          Select Documents
        </Button>
      </div>

      {/* ── Running banner ── */}
      {running && (
        <div className="mb-6 rounded-xl bg-blue-50 border border-blue-200 p-4 flex items-center gap-3">
          <Loader className="w-5 h-5 text-blue-500 shrink-0" />
          <div>
            <p className="font-semibold text-blue-800 text-sm">Redaction in progress</p>
            <p className="text-blue-600 text-sm mt-0.5">{statusMsg}</p>
          </div>
        </div>
      )}

      {/* ── Error banner ── */}
      {error && !running && (
        <div className="mb-6 rounded-xl bg-red-50 border border-red-200 p-4">
          <p className="font-semibold text-red-800 text-sm">Redaction error</p>
          <p className="text-red-600 text-sm mt-0.5">{error}</p>
        </div>
      )}

      {/* ── Results ── */}
      {successJobs.length > 0 && (
        <div className="mb-6 space-y-3">
          {successJobs.map((job, idx) => (
            <div key={idx} className="rounded-xl bg-green-50 border border-green-200 p-4 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <span className="text-green-500 text-lg mt-0.5">✓</span>
                <div>
                  <p className="font-semibold text-green-800 text-sm">Redaction complete</p>
                  <p className="text-green-700 text-sm mt-0.5">
                    {job.result?.redaction_count ?? 0} item(s) redacted
                    {job.result?.redacted_pages ? ` across ${job.result.redacted_pages} page(s)` : ''}.
                    The redacted copy has been saved to your library.
                  </p>
                </div>
              </div>
              {job.result?.download_url && (
                <button
                  onClick={async () => {
                    try {
                      const resp = await fetch(job.result!.download_url);
                      const blob = await resp.blob();
                      const url  = URL.createObjectURL(blob);
                      const a    = document.createElement('a');
                      a.href     = url;
                      a.download = (job.result!.download_url.split('/').pop() || 'redacted.pdf').split('?')[0];
                      document.body.appendChild(a); a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                    } catch { alert('Download failed. Please try again.'); }
                  }}
                  className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg font-medium"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Empty / intro state ── */}
      {!running && completedJobs.length === 0 && (
        <Card className="max-w-xl mx-auto mt-16 text-center">
          <CardContent>
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <ShieldOff className="w-8 h-8 text-slate-400" />
            </div>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">No redactions yet</h2>
            <p className="text-sm text-slate-500 mb-6">
              Click <strong>Select Documents</strong> to choose which files to redact.
              All are selected by default — uncheck any you want to skip.
              The original is never modified.
            </p>
            <div className="grid grid-cols-2 gap-3 text-left text-xs text-slate-600 bg-slate-50 rounded-lg p-4 mb-6">
              {['🔒 Patient name','🔒 Date of birth','🔒 Social Security Number','🔒 Address & phone',
                '🔒 Insurance / Member ID','🔒 Medical Record Number','🔒 Driver\'s license','🔒 Photos & signatures',
              ].map(item => <div key={item} className="flex items-center gap-1.5">{item}</div>)}
            </div>
            <Button variant="dark" onClick={openDialog} className="gap-2">
              <ShieldOff className="w-4 h-4" />
              Select Documents
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Document picker dialog ── */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Select Documents to Redact</DialogTitle>
            <DialogDescription>
              All documents are checked by default. Uncheck any you want to skip.
              Click a single row's <strong>Redact</strong> button to run just that document with custom PII settings.
            </DialogDescription>
          </DialogHeader>

          {/* Select-all bar */}
          <div className="mb-3 flex items-center justify-between px-1">
            <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-slate-700">
              <input
                type="checkbox"
                checked={allChecked}
                ref={el => { if (el) el.indeterminate = someChecked && !allChecked; }}
                onChange={toggleAll}
                className="w-4 h-4 rounded accent-blue-600 cursor-pointer"
              />
              <span className="font-medium">
                {allChecked ? 'Deselect all' : someChecked ? `${checkedCount} selected` : 'Select all'}
              </span>
            </label>
            {someChecked && (
              <span className="text-xs text-slate-500">
                {checkedCount} document{checkedCount !== 1 ? 's' : ''} will be redacted
              </span>
            )}
          </div>

          {/* Document list */}
          {docsLoading ? (
            <div className="flex items-center justify-center py-12 text-slate-400 gap-2">
              <Loader className="w-5 h-5" /> Loading documents…
            </div>
          ) : allGroups.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">
              No processed documents found. Upload and process documents in the Library first.
            </div>
          ) : (
            <div className="space-y-4 overflow-y-auto" style={{ maxHeight: '50vh' }}>
              {Object.keys(caseGroupsByFolder).sort().map(folderName => {
                const groups = caseGroupsByFolder[folderName];
                const folderChecked = groups.every(g => checkedKeys.has(g.key));
                const folderSome = groups.some(g => checkedKeys.has(g.key));

                const toggleFolder = () => {
                  setCheckedKeys(prev => {
                    const next = new Set(prev);
                    if (folderChecked) { groups.forEach(g => next.delete(g.key)); }
                    else { groups.forEach(g => next.add(g.key)); }
                    return next;
                  });
                };

                return (
                  <div key={folderName} className="border-2 border-slate-200 rounded-xl p-4">
                    {/* Folder header */}
                    <div className="flex items-center gap-2 mb-3">
                      <input
                        type="checkbox"
                        checked={folderChecked}
                        ref={el => { if (el) el.indeterminate = folderSome && !folderChecked; }}
                        onChange={toggleFolder}
                        className="w-4 h-4 rounded accent-blue-600 cursor-pointer"
                      />
                      <Folder className="w-4 h-4 text-blue-500" />
                      <span className="font-semibold text-slate-800 text-sm">{folderName}</span>
                      <Badge variant="outline" className="text-slate-500 border-slate-300">
                        {groups.length} case{groups.length !== 1 ? 's' : ''}
                      </Badge>
                    </div>

                    {/* Case group rows */}
                    <div className="space-y-2">
                      {groups.map((group: CaseGroup) => {
                        const isChecked = checkedKeys.has(group.key);
                        return (
                          <div
                            key={group.key}
                            onClick={() => toggleGroup(group.key)}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors ${
                              isChecked
                                ? 'bg-blue-50 border-blue-300'
                                : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleGroup(group.key)}
                              onClick={e => e.stopPropagation()}
                              className="w-4 h-4 rounded accent-blue-600 cursor-pointer shrink-0"
                            />
                            <FileIcon className="w-4 h-4 text-slate-400 shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-slate-800 truncate">{group.label}</p>
                              <p className="text-xs text-slate-400 truncate">
                                {group.providerName && <span>{group.providerName}</span>}
                                {group.isMultiPart && <span className="ml-1 text-blue-500">· {group.parts.length} parts</span>}
                              </p>
                            </div>
                            {group.date && (
                              <span className="text-xs text-slate-400 shrink-0">
                                {new Date(group.date).toLocaleDateString()}
                              </span>
                            )}
                            {/* Single-doc redact with PII override */}
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={running}
                              onClick={e => { e.stopPropagation(); handleSingleRedact(group); }}
                              className="gap-1 shrink-0 text-xs"
                              title="Redact this document with custom PII settings"
                            >
                              <ShieldOff className="w-3 h-3" />
                              Redact
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button
              variant="dark"
              disabled={running || checkedCount === 0}
              onClick={handleRedactSelected}
              className="gap-2 min-w-[180px]"
            >
              <ShieldOff className="w-4 h-4" />
              Redact Selected ({checkedCount})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── PII modal (single-doc flow) ── */}
      <PiiModal
        open={piiModalOpen}
        groupLabel={pendingGroup?.label || ''}
        onClose={() => { setPiiModalOpen(false); setPendingGroup(null); setShowDialog(true); }}
        onConfirm={handlePiiConfirm}
      />

    </div>
  );
};

export default Redaction;

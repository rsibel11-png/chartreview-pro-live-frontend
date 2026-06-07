/* eslint-disable @typescript-eslint/no-unused-vars */
// Redaction.tsx — chartreview-native-frontend
// Standalone PII auto-redaction page. Mirrors MedicalSummaries doc-picker pattern.
// No changes to Library.tsx. Redacted copy saved back to DynamoDB with is_redacted: true.

import React, { useState, useEffect, useRef } from 'react';
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

// ── Inlined UI primitives (same as MedicalSummaries) ─────────────────────────
function Button({ children, onClick, disabled, className = '', variant = 'default', size = 'default', title }: {
  children: React.ReactNode; onClick?: (e?: any) => void; disabled?: boolean;
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
function CardHeader({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`px-6 py-4 border-b border-slate-100 ${className}`}>{children}</div>;
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

function Checkbox({ checked, onCheckedChange }: {
  checked: boolean; onCheckedChange?: (v: boolean) => void;
}) {
  return (
    <input type="checkbox" checked={checked} readOnly
      onChange={() => onCheckedChange?.(!checked)}
      className="w-4 h-4 rounded accent-blue-600 cursor-pointer"
    />
  );
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
const CheckSquare = ({ className = '' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
  </svg>
);
const Square = ({ className = '' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth={2} />
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
const ClipboardList = ({ className = '' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
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
  folder?: string;
  provider_name?: string;
  status?: string;
  is_redacted?: boolean;
  original_document_id?: string | null;
  created_at?: string;
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
  { label: 'Patient Name (Last, First)',  key: 'patientName',  placeholder: 'e.g. SMITH, JANE' },
  { label: 'Date of Birth',               key: 'dob',          placeholder: 'e.g. 01/15/1980' },
  { label: 'Street Address',              key: 'street',       placeholder: 'e.g. 123 MAIN ST' },
  { label: 'City',                        key: 'city',         placeholder: 'e.g. LAS VEGAS' },
  { label: 'State / Zip',                 key: 'stateZip',     placeholder: 'e.g. NV 89101' },
  { label: 'Phone Number',                key: 'phone',        placeholder: 'e.g. 702-555-0100' },
  { label: 'SSN (or last 4)',             key: 'ssn',          placeholder: 'e.g. XXX-XX-1234' },
  { label: 'MRN / Account #',            key: 'mrn',          placeholder: 'e.g. 00000001' },
  { label: 'Employer',                    key: 'employer',     placeholder: 'e.g. ACME CORPORATION' },
  { label: 'Spouse / Partner Name',       key: 'spouse',       placeholder: 'e.g. JOHN SMITH' },
  { label: 'Next of Kin / POA Name',      key: 'nokPoa',       placeholder: 'e.g. MARY JOHNSON' },
  { label: 'Son / Daughter / Other Rel.', key: 'relative',     placeholder: 'e.g. ALEX SMITH' },
  { label: 'Additional value #1',         key: 'extra1',       placeholder: 'Any other value to redact' },
  { label: 'Additional value #2',         key: 'extra2',       placeholder: 'Any other value to redact' },
];
type PiiFormState = Record<string, string>;

// Street suffix variants — when user enters "383 Free Fall Lane", also match
// all common street type suffixes so "383 Free Fall Ave" is also caught.
const STREET_SUFFIXES = [
  'AVE','AVENUE','ST','STREET','BLVD','BOULEVARD','DR','DRIVE',
  'RD','ROAD','LN','LANE','CT','COURT','WAY','PL','PLACE',
  'CIR','CIRCLE','PKWY','PARKWAY','HWY','HIGHWAY','TER','TERRACE',
  'TRAIL','TRL','LOOP','RUN','PATH','PASS',
];

function buildUserPiiArray(form: PiiFormState): string[] {
  const values: string[] = [];
  const add = (v: string) => { const t = (v || '').trim().toUpperCase(); if (t.length >= 2) values.push(t); };

  // NAME: add full name + both orderings, plus each part ≥2 chars
  // Do NOT add common single words like "NORTH", "FALL" without context
  if (form.patientName) {
    const n = form.patientName.trim().toUpperCase();
    add(n);
    // Split on comma/space to get parts
    const parts = n.split(/[,\s]+/).filter((p: string) => p.length >= 2);
    parts.forEach((p: string) => add(p));
    // Also add reversed ordering if comma-separated (GARCIA, CARLOS → CARLOS GARCIA)
    if (n.includes(',')) {
      const [last, ...first] = n.split(/,\s*/);
      if (first.length) add((first.join(' ') + ' ' + last).trim());
    }
  }

  // DOB: add as-is — backend expandDob handles all format variants
  if (form.dob) add(form.dob);

  // STREET: generate number+name+suffix variants (the complete address phrase).
  // The sliding window does exact match on consecutive tokens, so:
  //   "383 FREE FALL AVE"  → piiNorm "383freefallave"  → matches Textract ["383","FREE","FALL","AVE"]
  //   "FREE" alone                                      → never matches anything ✅
  // We generate every common suffix variant so whichever OCR reads is covered.
  if (form.street) {
    const s = form.street.trim().toUpperCase();
    const streetMatch = s.match(/^(\d+)\s+(.+)$/);
    if (streetMatch) {
      const num = streetMatch[1];
      const nameRaw = streetMatch[2];
      // Strip any trailing suffix to get the invariant base name
      const suffixRe = new RegExp(
        '\\b(' + STREET_SUFFIXES.join('|') + ')\\.?\\s*$', 'i'
      );
      const baseName = nameRaw.replace(suffixRe, '').trim(); // e.g. "FREE FALL"
      if (baseName) {
        // Add every suffix variant: "383 FREE FALL AVE", "383 FREE FALL ST", etc.
        STREET_SUFFIXES.forEach((sfx: string) => {
          add(num + ' ' + baseName + ' ' + sfx);
        });
        // Also add base without suffix as fallback (catches OCR that drops the type word)
        add(num + ' ' + baseName);
      } else {
        add(s); // street name IS the suffix somehow — add as-is
      }
    } else {
      add(s); // no leading number — add as-is
    }
  }

  // CITY: add only as a WHOLE phrase — do NOT split into individual words
  // "North Las Vegas" should only match as the full city name, not "NORTH" alone
  if (form.city) add(form.city.trim().toUpperCase());

  /// STATE/ZIP: add all variants so OCR-merged "NV89084" and split "NV 89084" both match
  if (form.stateZip) {
    const sz = form.stateZip.trim().toUpperCase();
    add(sz);
    const szMatch = sz.match(/^([A-Z]{2})\s*(\d{5})(-\d{4})?$/);
    if (szMatch) {
      const st = szMatch[1], zip = szMatch[2], zip4 = szMatch[3] || '';
      add(zip);
      add(st + zip);
      add(st + ' ' + zip);
      if (zip4) { add(zip + zip4); add(zip + zip4.replace('-','')); }
    } else {
      const zm = sz.match(/(\d{5})(-\d{4})?/);
      if (zm) { add(zm[1]); if (zm[2]) add(zm[1] + zm[2]); }
    }
  }
  // PHONE, SSN, MRN: add as-is
  if (form.phone) add(form.phone);
  if (form.ssn)   add(form.ssn);
  if (form.mrn)   add(form.mrn);

  // EMPLOYER: add full name only — no word splitting
  if (form.employer) add(form.employer.trim().toUpperCase());

  // NAMES (spouse, NOK, relative): add full + individual parts ≥2 chars
  const addName = (v: string) => {
    if (!v) return;
    const n = v.trim().toUpperCase();
    add(n);
    n.split(/[,\s]+/).filter((p: string) => p.length >= 2).forEach((p: string) => add(p));
  };
  addName(form.spouse);
  addName(form.nokPoa);
  addName(form.relative);

  if (form.extra1) add(form.extra1);
  if (form.extra2) add(form.extra2);

  return Array.from(new Set(values.filter((v: string) => v.length >= 2)));
}

function PiiModal({ open, onClose, onConfirm, caseLabel, initialValues }: {
  open: boolean; onClose: () => void; onConfirm: (piiValues: string[]) => void;
  caseLabel: string; initialValues?: PiiFormState;
}) {
  const [form, setForm] = React.useState<PiiFormState>(initialValues || {});
  const setF = (key: string, val: string) => setForm(prev => ({ ...prev, [key]: val }));
  // Re-seed when initialValues change (new facesheet loaded)
  React.useEffect(() => { if (initialValues) setForm(initialValues); }, [JSON.stringify(initialValues)]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 bg-white rounded-xl shadow-2xl w-full mx-4 max-w-lg flex flex-col" style={{ maxHeight: '90vh' }}>
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900">Redaction Settings</h2>
          <p className="text-sm text-slate-500 mt-0.5 truncate">{caseLabel}</p>
        </div>
        <div className="px-6 py-4 overflow-y-auto flex-1">
          {initialValues && Object.values(initialValues).some((v: string) => v) && (
            <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-xs text-green-800">
              <ClipboardList className="w-4 h-4 text-green-600 shrink-0" />
              <span>Pre-filled from saved facesheet — review and adjust as needed.</span>
            </div>
          )}
          {initialValues && Object.values(initialValues).some((v: any) => v) && (
            <div className="mb-3 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800">
              ✓ Patient info pre-filled from admission record — review and adjust as needed.
            </div>
          )}
          <p className="text-sm text-slate-600 mb-4">
            PII is detected automatically. Entering known patient details below improves accuracy — fields left blank are still auto-detected.
          </p>
          <div className="space-y-3">
            {PII_FIELDS.map((f: PiiField) => (
              <div key={f.key}>
                <label className="block text-xs font-medium text-slate-600 mb-1">{f.label}</label>
                <input type="text" value={form[f.key] || ''} onChange={e => setF(f.key, e.target.value)}
                  placeholder={f.placeholder}
                  className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-4 leading-relaxed">
            Spouse, next-of-kin, POA, son/daughter, emergency contacts, and employer names are also detected automatically from document field labels throughout the file.
          </p>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50">Cancel</button>
          <button onClick={() => { onConfirm(buildUserPiiArray(form)); setForm(initialValues || {}); }}
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
  const [showDialog, setShowDialog]               = useState(false);
  const [selectedDocs, setSelectedDocs]           = useState<string[]>([]);
  const [running, setRunning]                     = useState(false);
  const [statusMsg, setStatusMsg]                 = useState('');
  const [completedJobs, setCompletedJobs]         = useState<RedactionJob[]>([]);
  const [error, setError]                         = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [piiModalOpen, setPiiModalOpen]   = useState(false);
  const [pendingGroup, setPendingGroup]   = useState<CaseGroup | null>(null);
  const [facesheetPii, setFacesheetPii]   = useState<Record<string, string> | undefined>(undefined);
  const [checkedKeys, setCheckedKeys]     = useState<Set<string>>(new Set());
  const [pendingBatch, setPendingBatch]   = useState<CaseGroup[]>([]);

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

  // ── Group docs: by folder, then by original_document_id (case grouping) ──
  // A "case group" is a set of parts sharing the same original_document_id.
  // Single docs (no original_document_id) are treated as their own group.
  interface CaseGroup {
    key: string;                  // original_document_id or aws_document_id
    isMultiPart: boolean;
    parts: DocItem[];             // sorted by part number
    label: string;                // display name (strip _PartN suffix)
    providerName?: string;
    date?: string;
  }

  const documentsByFolder: Record<string, DocItem[]> = (documents as DocItem[]).reduce(
    (acc: Record<string, DocItem[]>, doc: DocItem) => {
      const folder = ((doc.folder || doc.folder_name || '').trim()) || 'Unfiled';
      if (!acc[folder]) acc[folder] = [];
      acc[folder].push(doc);
      return acc;
    }, {}
  );

  // Build case groups per folder
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
      return {
        key,
        isMultiPart: sorted.length > 1,
        parts: sorted,
        label,
        providerName: sorted[0].provider_name,
        date: sorted[0].created_at,
      };
    });
  }

  const getDocLabel = (doc: DocItem) =>
    doc.title || doc.original_filename || doc.file_name || doc.aws_document_id;

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

  const pollJob = async (jobId: string) => {
    const job = await pollJobUntilDone(jobId);
    setRunning(false);
    setCompletedJobs(prev => [job, ...prev]);
    if (job.status === 'error') setError(job.progress_message);
    if (pollRef.current) clearTimeout(pollRef.current);
  };

  useEffect(() => () => { if (pollRef.current) clearTimeout(pollRef.current); }, []);

  // ── Redact a case group (multi-part → merge, single → existing flow) ──────
  const handleRedactCase = (group: CaseGroup) => {
    if (running) return;
    setShowDialog(false);
    setPendingGroup(group);
    setFacesheetPii(undefined);
    setPiiModalOpen(true);
    // Fetch folder PII from backend (written by processWorker when admission record detected)
    const folderName = ((group.parts[0]?.folder || group.parts[0]?.folder_name || '').trim()) || 'Unfiled';
    if (folderName && folderName !== 'Unfiled') {
      awsProxy(`/folders/${encodeURIComponent(folderName)}/pii`)
        .then((pii: any) => { if (pii && !pii.error) setFacesheetPii(pii); })
        .catch(() => {}); // modal already open — silently ignore if no record exists
    }
  };

  const executeRedactCase = async (group: CaseGroup, userPii: string[]) => {
    setRunning(true);
    setError(null);
    const extra = userPii.length > 0 ? { user_supplied_pii: userPii } : {};
    try {
      if (group.isMultiPart) {
        setStatusMsg(`Redacting ${group.parts.length} parts and merging…`);
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
        setStatusMsg('Starting redaction…');
        const resp = await awsProxy(`/documents/${group.parts[0].id}/redact`, 'POST',
          userPii.length > 0 ? extra : undefined);
        if (resp.job_id) {
          const job = await pollJobUntilDone(resp.job_id);
          setCompletedJobs(prev => [job, ...prev]);
          if (job.status === 'error') setError(job.progress_message);
        }
      }
    } catch (err: any) {
      setError(`Redaction failed: ${err.message}`);
    }
    setRunning(false);
    setStatusMsg('');
  };

  // ── Legacy: redact individually selected docs (kept for folder-level select) 
  const handleRedact = async () => {
    if (!selectedDocs.length || running) return;
    setShowDialog(false);
    setRunning(true);
    setError(null);
    setStatusMsg('Starting redaction…');
    for (const docId of selectedDocs) {
      try {
        setStatusMsg(`Redacting document…`);
        const resp = await awsProxy(`/documents/${docId}/redact`, 'POST');
        if (resp.job_id) {
          const job = await pollJobUntilDone(resp.job_id);
          setCompletedJobs(prev => [job, ...prev]);
          if (job.status === 'error') setError(job.progress_message);
        }
      } catch (err: any) {
        setError(`Failed to redact document: ${err.message}`);
      }
    }
    setRunning(false);
    setSelectedDocs([]);
    setStatusMsg('');
  };

  // ── Folder selection helpers ─────────────────────────────────────────────
  const toggleDoc = (id: string) => {
    setSelectedDocs(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleFolder = (folderDocs: DocItem[]) => {
    const ids = folderDocs.map(d => d.id);
    const allSelected = ids.every(id => selectedDocs.includes(id));
    if (allSelected) {
      setSelectedDocs(prev => prev.filter(id => !ids.includes(id)));
    } else {
      setSelectedDocs(prev => Array.from(new Set([...prev, ...ids])));
    }
  };

  const selectAll = () => {
    const allIds = (documents as DocItem[]).map(d => d.id);
    setSelectedDocs(allIds);
  };

  const clearAll = () => setSelectedDocs([]);

  // ── Checkbox multi-select helpers ────────────────────────────────────────
  const allGroups: CaseGroup[] = Object.values(caseGroupsByFolder).flat();
  const allChecked   = allGroups.length > 0 && allGroups.every(g => checkedKeys.has(g.key));
  const someChecked  = allGroups.some(g => checkedKeys.has(g.key));
  const checkedCount = checkedKeys.size;

  const toggleGroup = (key: string) => {
    setCheckedKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const toggleAll = () => {
    if (allChecked) setCheckedKeys(new Set());
    else setCheckedKeys(new Set(allGroups.map(g => g.key)));
  };

  const handleRedactSelected = () => {
    const queue = allGroups.filter((g: CaseGroup) => checkedKeys.has(g.key));
    if (!queue.length || running) return;
    setShowDialog(false);
    setPendingGroup(null);
    setFacesheetPii(undefined);
    // If all selected docs share one folder, fetch its PII
    const folders = [...new Set(queue.flatMap((g: CaseGroup) =>
      g.parts.map((p: any) => ((p.folder || p.folder_name || '').trim()) || 'Unfiled')
    ))];
    if (folders.length === 1 && folders[0] !== 'Unfiled') {
      awsProxy(`/folders/${encodeURIComponent(folders[0])}/pii`)
        .then((pii: any) => { if (pii && !pii.error) setFacesheetPii(pii); })
        .catch(() => {});
    }
    setPendingBatch(queue);
    setPiiModalOpen(true);
  };

  // ── Render ───────────────────────────────────────────────────────────────
  const successJobs = completedJobs.filter(j => j.status === 'complete');
  const failedJobs  = completedJobs.filter(j => j.status === 'error');

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
        <Button
          variant="dark"
          onClick={() => { setShowDialog(true); setError(null); }}
          disabled={running}
          className="gap-2 shadow-sm"
        >
          <ShieldOff className="w-4 h-4" />
          Redact Document
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
          <p className="font-semibold text-red-800 text-sm">Redaction failed</p>
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
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                    } catch (e) {
                      alert('Download failed. Please try again.');
                    }
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
              Click <strong>Redact Document</strong> to select one or more documents from your library.
              The AI will automatically detect and black out all patient PII — the original is never modified.
            </p>
            <div className="grid grid-cols-2 gap-3 text-left text-xs text-slate-600 bg-slate-50 rounded-lg p-4 mb-6">
              {[
                '🔒 Patient name',
                '🔒 Date of birth',
                '🔒 Social Security Number',
                '🔒 Address & phone',
                '🔒 Insurance / Member ID',
                '🔒 Medical Record Number',
                '🔒 Driver\'s license',
                '🔒 Photos & signatures',
              ].map(item => (
                <div key={item} className="flex items-center gap-1.5">{item}</div>
              ))}
            </div>
            <Button
              variant="dark"
              onClick={() => { setShowDialog(true); setError(null); }}
              className="gap-2"
            >
              <ShieldOff className="w-4 h-4" />
              Redact Document
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
              Check the documents to redact. Use <strong>Redact Selected</strong> for a batch with shared PII settings,
              or click an individual <strong>Redact</strong> button for custom PII per document.
            </DialogDescription>
          </DialogHeader>

          {/* Select-all bar */}
          <div className="mb-3 flex items-center justify-between px-1">
            <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-slate-700">
              <input
                type="checkbox"
                checked={allChecked}
                ref={(el: HTMLInputElement | null) => { if (el) el.indeterminate = someChecked && !allChecked; }}
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

          {/* Selection summary */}
          {selectedDocs.length > 0 && (
            <div className="mb-4 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
              <span className="text-blue-800 text-sm font-medium">
                {selectedDocs.length} document{selectedDocs.length !== 1 ? 's' : ''} selected
              </span>
              <div className="flex gap-2">
                <button onClick={selectAll} className="text-xs text-blue-600 hover:underline">Select all</button>
                <span className="text-blue-300">|</span>
                <button onClick={clearAll} className="text-xs text-blue-600 hover:underline">Clear</button>
              </div>
            </div>
          )}

          {/* Document list grouped by folder → case groups */}
          {docsLoading ? (
            <div className="flex items-center justify-center py-12 text-slate-400 gap-2">
              <Loader className="w-5 h-5" /> Loading documents…
            </div>
          ) : Object.keys(caseGroupsByFolder).length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">
              No processed documents found. Upload and process documents in the Library first.
            </div>
          ) : (
            <div className="space-y-4 overflow-y-auto" style={{ maxHeight: '52vh' }}>
              {Object.keys(caseGroupsByFolder).sort().map(folderName => {
                const groups = caseGroupsByFolder[folderName];
                return (
                  <div key={folderName} className="border-2 border-slate-200 rounded-xl p-4">
                    {/* Folder header */}
                    <div className="flex items-center gap-2 mb-3">
                      <input
                        type="checkbox"
                        checked={groups.every(g => checkedKeys.has(g.key))}
                        ref={(el: HTMLInputElement | null) => {
                          if (el) el.indeterminate = groups.some(g => checkedKeys.has(g.key)) && !groups.every(g => checkedKeys.has(g.key));
                        }}
                        onChange={() => {
                          const allIn = groups.every(g => checkedKeys.has(g.key));
                          setCheckedKeys(prev => {
                            const next = new Set(prev);
                            if (allIn) groups.forEach(g => next.delete(g.key));
                            else groups.forEach(g => next.add(g.key));
                            return next;
                          });
                        }}
                        onClick={(e: any) => e.stopPropagation()}
                        className="w-4 h-4 rounded accent-blue-600 cursor-pointer shrink-0"
                      />
                      <Folder className="w-4 h-4 text-blue-500" />
                      <span className="font-semibold text-slate-800 text-sm">{folderName}</span>
                      <Badge variant="outline" className="text-slate-500 border-slate-300">
                        {groups.length} case{groups.length !== 1 ? 's' : ''}
                      </Badge>
                    </div>

                    {/* Case group rows */}
                    <div className="space-y-2">
                      {groups.map((group: CaseGroup) => (
                        <div
                          key={group.key}
                          onClick={() => toggleGroup(group.key)}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors ${
                            checkedKeys.has(group.key)
                              ? 'bg-blue-50 border-blue-300'
                              : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checkedKeys.has(group.key)}
                            onChange={() => toggleGroup(group.key)}
                            onClick={(e: any) => e.stopPropagation()}
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
                          <Button
                            variant="dark"
                            size="sm"
                            disabled={running}
                            onClick={(e: any) => { e.stopPropagation(); handleRedactCase(group); }}
                            className="gap-1.5 shrink-0"
                          >
                            <ShieldOff className="w-3.5 h-3.5" />
                            {group.isMultiPart ? `Redact Case (${group.parts.length} parts)` : 'Redact'}
                          </Button>
                        </div>
                      ))}
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
      <PiiModal
        open={piiModalOpen}
        initialValues={facesheetPii}
        caseLabel={
          pendingBatch.length > 1
            ? `${pendingBatch.length} documents selected`
            : pendingGroup?.label || pendingBatch[0]?.label || ''
        }
        onClose={() => { setFacesheetPii(undefined);
          setPiiModalOpen(false);
          setPendingGroup(null);
          setPendingBatch([]);
          setShowDialog(true);
        }}
        onConfirm={async (userPii: string[]) => {
          setPiiModalOpen(false);
          if (pendingBatch.length > 0) {
            const queue = pendingBatch;
            setPendingBatch([]);
            setRunning(true);
            setError(null);
            const errors: string[] = [];
            for (let i = 0; i < queue.length; i++) {
              setStatusMsg(`Redacting ${i + 1} of ${queue.length} — ${queue[i].label}…`);
              try { await executeRedactCase(queue[i], userPii); }
              catch (err: any) { errors.push(`"${queue[i].label}": ${err.message}`); }
            }
            if (errors.length) setError(errors.join(' | '));
            setRunning(false);
            setStatusMsg('');
          } else if (pendingGroup) {
            executeRedactCase(pendingGroup, userPii);
            setPendingGroup(null);
          }
        }}
      />
    </div>
  );
};

export default Redaction;

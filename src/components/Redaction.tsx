import React, { useState, useEffect, useCallback, useRef } from 'react';

// ─── AWS proxy (same pattern as rest of native app) ───────────────────────────
const AWS_API_URL = process.env.REACT_APP_AWS_API_URL || 'https://1h4kpspbs6.execute-api.us-east-1.amazonaws.com/prod';
const AWS_API_KEY = process.env.REACT_APP_AWS_API_KEY || 'ChartReview#2026$ProdKey!Rx';

function getFreshToken(): string | null {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i) || '';
      if (key.includes('CognitoIdentityServiceProvider') && key.endsWith('.idToken')) {
        return localStorage.getItem(key);
      }
    }
  } catch { }
  return null;
}

async function awsProxy(path: string, method = 'GET', body?: any) {
  const token = getFreshToken();
  const headers: any = {
    'Content-Type': 'application/json',
    'x-api-key': AWS_API_KEY,
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const resp = await fetch(`${AWS_API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`${resp.status}: ${txt}`);
  }
  return resp.json();
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface Doc {
  aws_document_id: string;
  original_filename: string;
  patient_id: string;
  status: string;
  is_redacted?: boolean;
  created_at?: string;
}

interface Job {
  job_id: string;
  status: 'processing' | 'complete' | 'error';
  progress_message: string;
  result?: {
    new_doc_id: string;
    download_url: string;
    redaction_count: number;
  };
}

// ─── Component ────────────────────────────────────────────────────────────────
interface RedactionProps {
  patientId?: string;
  onNavigate?: (page: string, params?: any) => void;
}

const Redaction: React.FC<RedactionProps> = ({ patientId, onNavigate }) => {
  const [docs, setDocs]             = useState<Doc[]>([]);
  const [loading, setLoading]       = useState(false);
  const [search, setSearch]         = useState('');
  const [activeJob, setActiveJob]   = useState<{ docId: string; jobId: string } | null>(null);
  const [jobStatus, setJobStatus]   = useState<Job | null>(null);
  const [completedJobs, setCompletedJobs] = useState<Record<string, Job>>({});
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Load docs ──────────────────────────────────────────────────────────────
  const loadDocs = useCallback(async () => {
    setLoading(true);
    try {
      const path = patientId
        ? `/patients/${patientId}/documents`
        : '/documents';
      const data = await awsProxy(path);
      const items: Doc[] = (data.documents || data.items || data || [])
        .filter((d: Doc) => d.status === 'processed' && !d.is_redacted);
      items.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
      setDocs(items);
    } catch (err: any) {
      console.error('Failed to load documents:', err);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => { loadDocs(); }, [loadDocs]);

  // ─── Poll job status ─────────────────────────────────────────────────────────
  const pollJob = useCallback(async (jobId: string, docId: string) => {
    try {
      const data = await awsProxy(`/jobs/${jobId}`);
      setJobStatus(data);
      if (data.status === 'complete' || data.status === 'error') {
        setCompletedJobs(prev => ({ ...prev, [docId]: data }));
        setActiveJob(null);
        if (pollRef.current) clearTimeout(pollRef.current);
        if (data.status === 'complete') loadDocs();
      } else {
        pollRef.current = setTimeout(() => pollJob(jobId, docId), 3000);
      }
    } catch (err) {
      console.error('Poll error:', err);
      pollRef.current = setTimeout(() => pollJob(jobId, docId), 5000);
    }
  }, [loadDocs]);

  useEffect(() => () => { if (pollRef.current) clearTimeout(pollRef.current); }, []);

  // ─── Start redaction ─────────────────────────────────────────────────────────
  const startRedaction = async (doc: Doc) => {
    if (activeJob) return;
    setActiveJob({ docId: doc.aws_document_id, jobId: '' });
    setJobStatus(null);
    try {
      const data = await awsProxy(`/documents/${doc.aws_document_id}/redact`, 'POST');
      const jobId = data.job_id;
      setActiveJob({ docId: doc.aws_document_id, jobId });
      pollRef.current = setTimeout(() => pollJob(jobId, doc.aws_document_id), 2000);
    } catch (err: any) {
      setActiveJob(null);
      alert('Failed to start redaction: ' + err.message);
    }
  };

  // ─── Filtered docs ───────────────────────────────────────────────────────────
  const filtered = docs.filter(d =>
    !search || d.original_filename?.toLowerCase().includes(search.toLowerCase())
  );

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-xl">
            🕵️
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Document Redaction</h1>
            <p className="text-sm text-gray-500">
              Automatically detect and black out patient PII — names, SSN, DOB, insurance IDs, photos and more.
            </p>
          </div>
        </div>
      </div>

      {/* Active job banner */}
      {activeJob && jobStatus && (
        <div className="mb-5 rounded-xl bg-blue-50 border border-blue-200 p-4 flex items-start gap-3">
          <div className="mt-0.5">
            <svg className="animate-spin h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
          </div>
          <div>
            <p className="font-medium text-blue-800 text-sm">Redaction in progress</p>
            <p className="text-blue-600 text-sm mt-0.5">{jobStatus.progress_message}</p>
          </div>
        </div>
      )}

      {/* Completed job result */}
      {Object.values(completedJobs).map((job) =>
        job.status === 'complete' && job.result ? (
          <div key={job.job_id} className="mb-5 rounded-xl bg-green-50 border border-green-200 p-4 flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="text-green-500 text-lg mt-0.5">✓</span>
              <div>
                <p className="font-medium text-green-800 text-sm">Redaction complete</p>
                <p className="text-green-600 text-sm mt-0.5">
                  {job.result.redaction_count} item(s) redacted. The redacted document has been saved to your library.
                </p>
              </div>
            </div>
            <a
              href={job.result.download_url}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg font-medium"
            >
              Download
            </a>
          </div>
        ) : job.status === 'error' ? (
          <div key={job.job_id} className="mb-5 rounded-xl bg-red-50 border border-red-200 p-4">
            <p className="font-medium text-red-800 text-sm">Redaction failed</p>
            <p className="text-red-600 text-sm mt-0.5">{job.progress_message}</p>
          </div>
        ) : null
      )}

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search documents…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full max-w-md px-4 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>

      {/* Info callout */}
      <div className="mb-5 rounded-xl bg-amber-50 border border-amber-200 p-3 flex gap-2 text-sm text-amber-800">
        <span>ℹ️</span>
        <span>
          Only processed documents from your library are shown. The redacted copy is saved back to your library with a
          <span className="mx-1 font-medium">🕵️ Redacted</span> label. The original is not modified.
        </span>
      </div>

      {/* Document list */}
      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading documents…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          {search ? 'No documents match your search.' : 'No processed documents found. Upload and process documents in the Library first.'}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(doc => {
            const isRunning = activeJob?.docId === doc.aws_document_id;
            const isDone    = !!completedJobs[doc.aws_document_id];
            return (
              <div
                key={doc.aws_document_id}
                className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center justify-between gap-4 hover:border-gray-300 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0 text-sm">
                    📄
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {doc.original_filename}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {doc.created_at ? new Date(doc.created_at).toLocaleDateString() : ''}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => startRedaction(doc)}
                  disabled={!!activeJob || isDone}
                  className={`shrink-0 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    isDone
                      ? 'bg-green-100 text-green-700 cursor-default'
                      : isRunning
                      ? 'bg-blue-100 text-blue-600 cursor-not-allowed'
                      : activeJob
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-slate-800 hover:bg-slate-700 text-white'
                  }`}
                >
                  {isDone ? '✓ Redacted' : isRunning ? 'Redacting…' : '🕵️ Redact'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Redaction;

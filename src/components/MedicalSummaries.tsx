
  // Safe date formatter -- never passes YYYY-MM-DD through new Date() to avoid UTC→local shift
  const formatVisitDate = (dateStr) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-').map(Number);
    if (parts.length === 3 && !isNaN(parts[0])) {
      return `${String(parts[1]).padStart(2,'0')}/${String(parts[2]).padStart(2,'0')}/${parts[0]}`;
    }
    return dateStr;
  };
/**
 * MedicalSummaries.jsx - CRPv5 (HIPAA-compliant AWS version) v56
 * v2: grouped document picker (same shell/part grouping as Library)
 *     text fetch concatenates parts in order for split documents
 * v2.1: fix /fulltext   /text (correct AWS route)
 * v6: sanitizeVisits filters PACU/anesthesia/nursing docs; corrects misdated ER visits
 * v7: misdated ER date fix is now dynamic (no hardcoded dates) -- uses visit_date===injury_date heuristic
 * v8: generation survives page navigation -- state held in module-level singleton, not component state
 * v14: button row center-justified (no flex-wrap, icon-only, flex-1 per button)
 * v15: mountedRef fix -- generation loop survives navigation; setEditing/setEditingSummary guarded by mountedRef.current
 * v16: C-4 prompt forces "(C-4 Report)" suffix in practice_setting, preventing bleed into real visit; docx export uses Table/TableCell layout matching HTML two-column format
 * v17: PT consolidation no longer prompts -- always auto-consolidates when PT visits are present
 * v18: docx date column fixed width (1540 twips) + 8pt right margin -- prevents date/narrative overlap regardless of date length
 * v19: toTitleCase() normalizes all-caps provider names; formatDate and all sort comparisons use string-split, never new Date() to avoid UTC shift (OCR artifact) in sanitizeVisits; mixed-case and credentials preserved
 * v20: C-4 identification rule tightened -- ONLY flags explicit WCB form headers/structure, not regular office notes that mention injury date
 * v21: C-4 prompt updated with concrete OCR text anchors from actual Nevada C-4 form (FORM C-4 header, 3-day mailing notice, three-party structure) to eliminate false positives
 * v22: PT extraction consistency -- prompt rule forces one record per session; normalizePTSetting() canonicalizes facility name variants; dedup and grouping both use normalized key
 * v23: C-4 false positive fix -- removed "Date of Injury" from positive ID criteria; added worked example of the exact false-positive pattern (orthopedic SOAP note with Injury Date in HPI) to explicitly prevent mislabeling
 * v24: Replaced case-specific worked example with universal SOAP note test -- any doc with HPI+Exam+Diagnosis+Plan = office visit, never C-4; removed hardcoded provider/facility names from prompt
 * v25: C-4 content extraction restored -- reads from form first, supplements from same-date office visit note if handwritten form is illegible; single entry if no additional content in associated note
 * v26: C-4 logic replaced with original app logic -- strict WCB form header identification only; practice_setting="C-4 Workers Compensation Report" (flat); HPI/CC/exam/plan left empty; cross-reference from same-date office visit if illegible
 * v27: One C-4 per case rule -- C-4 only valid at earliest date in document set (initial injury visit); all subsequent WC form references treated as regular office visits
 * v28: C-4 must be physically present in document text -- form header/fields must actually appear in the chunk being analyzed; no inference from WC context alone; if no form text found, no C-4 entry created
 * v8.1: tightened Bedrock prompt -- explicitly forbids using injury_date as visit_date for ER visits
 * v9: C-4 whitelist in sanitizeVisits, broadened isLikelyMisdatedER, chunk text backtick sanitization
 * v10: fixed ${ escape in buildPrompt sanitization (split/join instead of regex replace)
 * v11: broadened isShell to catch all statuses (not just pending_upload/uploaded) -- fixes grouped 1 parts bug
 * v12: clarified practice_setting prompt (visit type != facility name), strengthened date rule for specialist consult notes, removed debug logs
 * v13: replaced chunked-text approach with pre-signed S3 URL + file_urls (matches original app quality, faster, better date accuracy)
 * v14: PT consolidation prompt cached per-summary (no double-prompt); C-4 and radiology practice_setting now extracts actual facility name
 * v35: Visit Index pre-pass, checklist injection, recovery pass for missing non-PT dates.
 * v47: Fix NaN dates in sort, tighter provider dedup, fix saveVisitIndex, skip parts >= 9MB in pre-pass and runBatch.
 * v48: Retry wrapper on runBatch LLM call -- on JSON parse error retries once with simplified schema.
 * v51: Visit Index pre-pass tags each visit with source_doc_id + source_part_label.
 *       Recovery pass uses exact source part -- no positional guessing, 1 LLM call per missing visit.
 * v53: Pre-pass now runs parts in parallel (VI_CONCURRENCY=4) -- same speed as batched, full source tagging.
 *       runBatch: page_classifications skip list injected into buildPrompt -- Bedrock ignores non-clinical pages.
 * v56: Dynamic greedy batching replaces fixed BATCH_SIZE. Restored _all_rejected filter on selection dialogs (summary + Visit Index) -- fully non-clinical docs hidden from picker. Groups parts until combined file_size would exceed 8.5MB (Base44 combined limit). Small parts pack multiple per call; large parts go solo. 3 concurrent batches preserved for speed. BATCH_OVERLAP=1 retained for boundary context.
 * v50:
 *      All parts sent via file_url -- no 9MB size skip in runBatch.
 *      splitPdf.ts binary-search guarantees all chunks < 9MB at upload time.
 *      Only fully non-clinical parts (all pages flagged by Library) are skipped; restored pages are included.
*/

const AWS_API_URL = import.meta.env.VITE_AWS_API_URL || "";
const AWS_API_KEY = import.meta.env.VITE_AWS_API_KEY || "";
const ORG_ID      = import.meta.env.VITE_ORG_ID      || "";

import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FileCheck,
  Plus,
  Download,
  Edit,
  Eye,
  Loader2,
  Sparkles,
  Trash2,
  CheckSquare,
  Square,
  Users,
  AlertCircle,
  Folder,
  Merge,
  Filter,
  List,
  FileDown,
  Save,
  ShieldCheck,
  ShieldAlert
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import MedicalSummaryForm from "../components/summaries/MedicalSummaryForm";
import SummaryViewer from "../components/summaries/SummaryViewer";


// ---------------------------------------------------------------------------
// Module-level generation store -- survives component unmount/remount.
// The async generateSummary loop writes here; the component subscribes.
// ---------------------------------------------------------------------------
const genStore = {
  state: {
    running: false,
    statusMsg: "",
    completionMsg: "",
    error: null,
    elapsedSeconds: 0,
    timerHandle: null,
  },
  listeners: new Set(),
  notify() {
    this.listeners.forEach(fn => fn({ ...this.state }));
  },
  set(patch) {
    Object.assign(this.state, patch);
    this.notify();
  },
  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  },
};

export default function MedicalSummaries() {
  const queryClient = useQueryClient();

  // --- AWS proxy helper (inside component for correct auth context) ----------
  const awsProxy = async (path, method = "GET", data = undefined) => {
    const url = `${AWS_API_URL}${path}`;
    const opts = {
      method,
      headers: {
        "Content-Type": "application/json",
        "x-api-key": AWS_API_KEY,
        "x-org-id": ORG_ID,
      },
    };
    if (data !== undefined) opts.body = JSON.stringify(data);
    const res = await fetch(url, opts);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || `awsProxy ${method} ${path} failed: ${res.status}`);
    return json;
  };

  const [selectedDocuments, setSelectedDocuments] = useState([]);
  const [viewingSummary, setViewingSummary] = useState(null);
  const [editingSummary, setEditingSummary] = useState(null);
  const [deleteSummary, setDeleteSummary] = useState(null);
  const [showDialog, setShowDialog] = useState(false);
  const [showCombineDialog, setShowCombineDialog] = useState(false);
  const [selectedSummariesToCombine, setSelectedSummariesToCombine] = useState([]);
  const [_editing, _setEditing] = useState(false);
  const setEditing = (v) => _setEditing(v);

  // --- Generation state: sourced from module-level store, not component state ---
  const [genState, setGenState] = useState({ ...genStore.state });
  useEffect(() => {
    // Sync on mount (pick up any in-progress generation) then subscribe to updates
    setGenState({ ...genStore.state });
    return genStore.subscribe(setGenState);
  }, []);
  // Track whether this component instance is still mounted
  // so the async generation loop can skip component-state updates after nav away
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);
  const generatingSummary = genState.running;
  const statusMsg        = genState.statusMsg;
  const completionMsg    = genState.completionMsg;
  const error            = genState.error;
  const elapsedSeconds   = genState.elapsedSeconds;
  // setError still used by non-generation code paths
  const setError = (msg) => genStore.set({ error: msg });

  // // --- Data fetching from AWS -----------------------------------------------
  const { data: documents = [], isLoading: documentsLoading } = useQuery({
    queryKey: ["aws-documents"],
    queryFn: async () => {
      const res = await fetch(`${AWS_API_URL}/documents`, {
        method: "GET",
        headers: {
          "x-api-key": AWS_API_KEY,
          "x-org-id": ORG_ID,
        },
      });
      if (!res.ok) throw new Error("Failed to fetch documents");
      const data = await res.json();
      const list = Array.isArray(data) ? data : (Array.isArray(data?.items) ? data.items : (Array.isArray(data?.documents) ? data.documents : []));
      const validDocs = list.filter(d => !(d.original_document_id === null && d.status === "pending_upload"));
      console.log("DynamoDB raw docs:", list.length, "valid:", validDocs.length, validDocs.map(d => d.file_name || d.original_filename || d.aws_document_id));
      return validDocs.map((d) => ({ ...d, id: d.aws_document_id || d.id }));
    },
    staleTime: 30000,
    retry: 1,
  });

  const { data: summariesRaw, isLoading: summariesLoading } = useQuery({
    queryKey: ["aws-summaries"],
    queryFn: async () => {
      const res = await awsProxy("/summaries", "GET");
      // Normalize: backend may return array directly, or wrapped in { items: [] } or { summaries: [] }
      if (Array.isArray(res)) return res;
      if (Array.isArray(res?.items)) return res.items;
      if (Array.isArray(res?.summaries)) return res.summaries;
      return [];
    },
    refetchOnWindowFocus: false,
  });
  const summaries = Array.isArray(summariesRaw) ? summariesRaw : [];

  // Get unique folders from documents
  const folders = [...new Set(documents.map(d => d.folder).filter(Boolean))].sort();
  const unfiledCount = documents.filter(d => !d.folder).length;

  const [deleteAllDialog, setDeleteAllDialog] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: (id) => awsProxy(`/summaries/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aws-summaries"] });
      setDeleteSummary(null);
    },
  });

  const deleteAllMutation = useMutation({
    mutationFn: async () => {
      await Promise.all((Array.isArray(summaries) ? summaries : []).map(s => awsProxy(`/summaries/${s.aws_summary_id || s.id}`, "DELETE")));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aws-summaries"] });
      setDeleteAllDialog(false);
    },
  });

  // Deduplicates visits by date + provider + setting (exact match = true duplicate, removed).
  // Normalize PT/OT facility name variations so dedup and grouping treat them as the same provider
  // e.g. "Dignity Health PT", "Dignity Health Physical Therapy", "Dignity Health Phys Therapy" -> canonical
  const normalizePTSetting = (setting) => {
    if (!setting) return setting;
    let s = setting.trim();
    // Expand common abbreviations to full form for consistent keying
    s = s.replace(/\bPhys\.?\s*Ther\.?\b/gi, 'Physical Therapy');
    s = s.replace(/\bOcc\.?\s*Ther\.?\b/gi, 'Occupational Therapy');
    s = s.replace(/\bOT\b(?!\s*[A-Z])/g, 'Occupational Therapy');
    // Trailing " PT" or " OT" at end of facility name -> expand
    s = s.replace(/\s+PT$/i, ' Physical Therapy');
    s = s.replace(/\s+OT$/i, ' Occupational Therapy');
    // Normalize whitespace
    s = s.replace(/\s+/g, ' ').trim();
    return s;
  };

  // Normalize provider name for dedup -- strips credentials and middle initials
  // so "Arthur J. Taylor, MD" and "Arthur Taylor, M.D." both become "arthur taylor"
  const normalizeProviderForDedup = (name) => {
    return (name || '')
      .toLowerCase()
      .replace(/,?\s*(m\.?d\.?|d\.?o\.?|ph\.?d\.?|np|pa|pt|dpt|ot|rn|lcsw|psyd|esq\.?)/gi, '')
      .replace(/[a-z]\.\s*/g, '') // remove middle initials like "J."
      .replace(/[^a-z\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

  
// Normalize a summary record for the edit form -- ensures visits is always an array
const normalizeSummaryForEdit = (s) => {
  if (!s) return s;
  let visits = s.visits;
  if (!Array.isArray(visits)) {
    if (typeof visits === 'string') {
      try { visits = JSON.parse(visits); } catch { visits = []; }
    } else {
      visits = [];
    }
  }
  return { ...s, visits };
};

const deduplicateVisits = (visits) => {
    const visitList = visits || [];
    const exactKeys = new Set();
    const deduped = visitList.filter((visit) => {
      const dateKey = (visit.visit_date || '').trim().toLowerCase();
      const providerKey = normalizeProviderForDedup(visit.rendering_provider);
      // Normalize PT setting for dedup key so facility name variants don't create duplicates
      const settingKey = normalizePTSetting(visit.practice_setting || '').trim().toLowerCase();
      if (!dateKey && !providerKey) return true;
      const key = `${dateKey}|${providerKey}|${settingKey}`;
      if (exactKeys.has(key)) return false;
      exactKeys.add(key);
      return true;
    });
    return deduped;
  };

  const deduplicateMutation = useMutation({
    mutationFn: async (summary) => {
      const deduped = deduplicateVisits(summary.visits);
      const removed = (summary.visits || []).length - deduped.length;
      const summaryId = summary.aws_summary_id || summary.id;
      await awsProxy(`/summaries/${summaryId}`, "PUT", { visits: deduped });
      return { removed };
    },
    onSuccess: (result, summary) => {
      queryClient.invalidateQueries({ queryKey: ["aws-summaries"] });
      alert(result.removed > 0
        ? `Merged/removed ${result.removed} duplicate visit(s) from ${summary.patient_name || 'this summary'}.`
        : `No duplicate visits found in ${summary.patient_name || 'this summary'}.`
      );
    },
  });

  // Group split parts into shell records (same logic as Library)
  const groupedDocuments = (() => {
    const shellMap = {};
    const grouped = {};
    const singles = [];
    for (const doc of documents) {
      // Shell = no parent_filename AND no original_document_id (it IS the parent)
      // Status can be anything (pending_upload, uploaded, complete, processed, etc.)
      const isShell = !doc.parent_filename && !doc.original_document_id;
      if (isShell) {
        shellMap[doc.id] = doc;
      } else if (doc.original_document_id) {
        if (!grouped[doc.original_document_id]) grouped[doc.original_document_id] = [];
        grouped[doc.original_document_id].push(doc);
      } else {
        singles.push(doc);
      }
    }
    const merged = Object.entries(grouped).map(([shellId, parts]) => {
      parts.sort((a, b) => (a.part_index ?? 0) - (b.part_index ?? 0));
      const shell = shellMap[shellId];
      const displayTitle = shell?.file_name || shell?.title || parts[0].parent_filename || parts[0].title;
      const _allRejected = parts.length > 0 && parts.every(p => {
        const pc = p.page_classifications || [];
        return pc.length > 0 && pc.every(pg => !pg.is_clinical && !pg.restored);
      });
      return {
        ...parts[0],
        id: shellId,
        title: displayTitle,
        file_name: displayTitle,
        folder: shell?.folder || parts[0].folder,
        created_date: shell?.created_date || shell?.created_at || parts[0].created_date,
        _is_group: true,
        _part_ids: parts.map(p => p.id),
        _parts: parts,
        _all_rejected: _allRejected,
      };
    });
    // Include shell records that have no parts yet
    const groupedShellIds = new Set(Object.keys(grouped));
    Object.entries(shellMap).forEach(([shellId, shell]) => {
      if (!groupedShellIds.has(shellId)) singles.push(shell);
    });
    return [...singles, ...merged];
  })();

  // Group all documents by folder (uses grouped documents, not raw parts)
  const documentsByFolder = groupedDocuments.reduce((acc, doc) => {
    const folderKey = doc.folder || 'Unfiled';
    if (!acc[folderKey]) acc[folderKey] = [];
    acc[folderKey].push(doc);
    return acc;
  }, {});

  // Shared helpers for provider normalization and part number extraction
  const normalizeProviderName = (name) => {
    return (name || '')
      .trim()
      .toLowerCase()
      .replace(/\s+and\s+rehabilitation\b/gi, '')
      .replace(/\s+rehabilitation\b/gi, '')
      .replace(/\s+center\b/gi, '')
      .replace(/\s+clinic\b/gi, '')
      .replace(/\s+medical\s+group\b/gi, '')
      .replace(/\s+associates\b/gi, '')
      .replace(/\s+hospital\b/gi, '')
      .replace(/\s+health\s*care\b/gi, '')
      .replace(/[^a-z0-9]/g, '')
      .trim();
  };

  const getPartNumber = (title) => {
    const stem = title.replace(/\.[^.]+$/, '');
    const patterns = [
      /part[_\-\s]*(\d+)/i,
      /[_\-\s](\d+)$/,
      /\((\d+)\)$/,
      /(\d+)$/
    ];
    for (const p of patterns) {
      const m = stem.match(p);
      if (m) return parseInt(m[1], 10);
    }
    return null;
  };

  // Group documents by facility/provider
  const documentGroups = documents.reduce((groups, doc) => {
    const providerName = doc.provider_name || 'Unknown Facility';
    const normalizedKey = normalizeProviderName(providerName) || 'unknown';
    if (!groups[normalizedKey]) groups[normalizedKey] = { displayName: providerName, docs: [] };
    groups[normalizedKey].docs.push(doc);
    return groups;
  }, {});

  Object.keys(documentGroups).forEach(key => {
    documentGroups[key].docs.sort((a, b) => {
      const numA = getPartNumber(a.title || a.file_name || '');
      const numB = getPartNumber(b.title || b.file_name || '');
      if (numA !== null && numB !== null) return numA - numB;
      if (numA !== null) return -1;
      if (numB !== null) return 1;
      return (a.title || '').localeCompare(b.title || '');
    });
  });

  const toggleDocumentSelection = (docId) => {
    setSelectedDocuments(prev =>
      prev.includes(docId) ? prev.filter(id => id !== docId) : [...prev, docId]
    );
  };

  const selectGroup = (groupDocs) => {
    const groupIds = groupDocs.map(d => d.id);
    setSelectedDocuments(prev => {
      const allSelectedInGroup = groupIds.every(id => prev.includes(id));
      if (allSelectedInGroup) return prev.filter(id => !groupIds.includes(id));
      return [...new Set([...prev, ...groupIds])];
    });
  };

  const [queueProgress, setQueueProgress] = useState(null);
  const [generateMode, setGenerateMode] = useState('batch');

  // --- Visit Index state -------------------------------------------------------
  const [showVisitIndexDialog, setShowVisitIndexDialog] = useState(false);
  const [visitIndexRunning, setVisitIndexRunning] = useState(false);
  const [visitIndexData, setVisitIndexData] = useState(null);   // { patient_name, visits: [{date,provider,facility}] }
  const [visitIndexView, setVisitIndexView] = useState('chrono'); // 'chrono' | 'grouped'
  const [showVisitIndexViewer, setShowVisitIndexViewer] = useState(false);
  const [visitIndexCrossCheck, setVisitIndexCrossCheck] = useState(null); // { missing, extra }
  const [visitIndexDocsSelected, setVisitIndexDocsSelected] = useState([]);

  // // --- AI generation prompt builder ----------------------------------------
  const buildPrompt = (rawChunkText, docCount, chunkLabel = '', knownVisitsChecklist = [], skipPages = []) => {
    // In v13, chunkText is empty string -- documents are passed as file_urls directly to the LLM.
    // The sanitization is kept for safety but the text section is omitted when empty.
    const chunkText = String(rawChunkText || '').replace(/`/g, "'").split('${').join('(');
    return `You are a medical-legal document analyst. Your job is to extract EVERY clinical encounter from this document   including but not limited to:
- Emergency Room (ER) visits
- Urgent Care visits  
- Private or group physician office visits (orthopedic, neurology, pain management, primary care, etc.)
- Surgical visits and operative reports
- Radiology center visits (MRI, CT, X-ray, ultrasound reports)
- Physical Therapy / Occupational Therapy sessions
- Chiropractic visits
- Ambulance / EMS reports
- C-4 Workers' Compensation forms
- IME / Expert reports / Chart reviews
- Hospital admissions and discharge summaries
- Any other clinical or medical-legal encounter

${skipPages.length > 0 ? `SKIP PAGES: The following page numbers in this PDF contain non-clinical photographs or surveillance images -- do NOT extract visits from pages: ${skipPages.join(', ')}.\n` : ''}
DO NOT skip any encounter type. Every date with a provider interaction is a separate entry.

${chunkText ? `DOCUMENT TEXT${chunkLabel}:\n${chunkText}\n` : ''}DOCUMENT TYPE HANDLING:
You may encounter different types of documents. Handle each type as follows:

A) OFFICE VISIT / CLINICAL NOTES (standard patient visit records):
    Extract each visit as a separate entry with all standard fields.
    CRITICAL: Always extract and include the actual practice setting/facility name from the document. Do NOT default to generic "office visit" or leave practice_setting empty.
    Examples of what to extract:
    - If document says "Smith Family Medical Group", use "Smith Family Medical Group" as practice_setting
    - If from "XYZ Orthopedic Associates", use "XYZ Orthopedic Associates" 
    - If from "Community Hospital Emergency Department", use "Community Hospital Emergency Department"
    - NEVER label as simply "Office Visit" or "Clinic" -- always include the specific facility/provider name from the document header, letterhead, or provider information section
    IMPORTANT: Visit type labels are NOT facility names. "Follow-up Consultation", "New Patient Visit", "Follow-up", "Initial Consultation", "Progress Note" -- these describe the TYPE of visit, NOT the facility. Look past these labels to find the actual practice or facility name in the letterhead, header, or footer. If you cannot find a facility name, use the rendering provider's name + "Office" (e.g., "James Dettling, M.D. Office").

B) EXPERT MEDICAL REPORTS / INDEPENDENT MEDICAL EXAMINATIONS (IME) / CHART REVIEWS / CONSULTATIONS / RADIOLOGY REPORTS:
   Use the EXACT document type as labeled in the document itself. Do NOT relabel or generalize   use the specific type stated. Examples:
   - If the document says "Independent Medical Examination" or "IME"   practice_setting: "Independent Medical Examination"
   - If the document says "Consultation Report" or "Consultative Evaluation"   practice_setting: "Consultation Report"
   - If the document says "Chart Review" or "Record Review"   practice_setting: "Chart Review"
   - If the document says "Radiology Report", "MRI Report", "X-Ray Report", "CT Report"   practice_setting: use the imaging facility name if present (e.g., "Pueblo Medical Imaging", "Centennial Hills Radiology"), followed by the modality in parentheses if helpful (e.g., "Pueblo Medical Imaging (MRI)"). If no facility name is identifiable, use the modality type (e.g., "MRI Report", "CT Report")
   - If the document says "Narrative Report" or "Narrative Summary"   practice_setting: "Narrative Report"
   - If the document says "Agreed Medical Examination" or "AME"   practice_setting: "Agreed Medical Examination"
   - If the document says "Qualified Medical Evaluation" or "QME"   practice_setting: "Qualified Medical Evaluation"
   - If none of the above apply, use the most accurate label based on what is stated in the document header or title
   NEVER default to "Independent Medical Examination" unless those exact words (or "IME") appear in the document.
   For all of these types:
   - rendering_provider: the expert/reviewing physician's name
   - chief_complaint: the stated purpose of the report
   - hpi_summary: the expert's review of history and background as summarized in the report
   - physical_exam_findings: examination findings if the expert physically examined the patient, otherwise leave empty
   - impression_diagnosis: the expert's opinions, conclusions, and diagnoses
   - treatment_plan: the expert's recommendations or causation opinions
   - imaging_findings: any imaging reviewed or interpreted by the expert
   - visit_date: the date the report was authored or the examination was performed

C) POLICE REPORTS:
   Treat as a single entry with:
   - rendering_provider: the reporting officer's name and badge number if available
   - practice_setting: "Police Report"
   - chief_complaint: the incident type (e.g., "Motor Vehicle Collision", "Incident Report")
   - hpi_summary: narrative description of the incident
   - physical_exam_findings: any observations about injuries noted by the officer at the scene
   - impression_diagnosis: officer's conclusions, fault determination, or citations issued
   - treatment_plan: any emergency services dispatched or recommended at scene
   - visit_date: the date of the incident or report

D) AMBULANCE / EMS REPORTS (pre-hospital care records):
   Treat as a single entry with:
   - rendering_provider: the paramedic/EMT name or unit number
   - practice_setting: "Ambulance / EMS Report"
   - chief_complaint: the patient's chief complaint at the scene
   - hpi_summary: mechanism of injury, scene description, patient condition on arrival
   - physical_exam_findings: vital signs, physical findings, and neurological status at scene
   - impression_diagnosis: EMS impression/working diagnosis
   - treatment_plan: treatment administered on scene and during transport, and destination facility
   - visit_date: the date of the incident/transport

E) C-4 FORMS (Workers' Compensation Board Doctor's Report / WCB Form C-4):
    STRICT IDENTIFICATION: Only treat as a C-4 if ALL of the following are true:
    1. The actual text of the C-4 form is physically present in the document you are reading -- you must see the WCB Form C-4 header, title block, or form fields in the text itself (e.g., "Form C-4", "Workers' Compensation Board", "WCB Report", form field labels like "Date of Injury", "Last Day Worked", "Supervisor Name" in a structured form layout). Do NOT infer or assume a C-4 exists based on the visit being workers' comp related.
    2. The visit date is at or near the EARLIEST date in the entire document set -- the C-4 is the intake form completed at the FIRST visit for the industrial accident. There is only ONE C-4 per case. It will typically be found embedded within the initial ER or first office visit records, not in follow-up notes.
    3. Do NOT label any follow-up visits, post-operative visits, or subsequent office visits as C-4, even if those notes reference the workers' comp claim or injury. Only the initial treating visit generates a C-4 form.

    If you find what appears to be C-4 form text at multiple dates, include ONLY the one with the earliest date and treat all others as regular office visits.
    If no actual C-4 form text is found anywhere in the documents, do not create a C-4 entry at all.

    For the ONE C-4 entry:
    - rendering_provider: the treating physician's name (look for signature block or printed name at bottom of form)
    - practice_setting: "C-4 Workers' Compensation Report"
    - impression_diagnosis: diagnosis only -- ICD codes if present, otherwise the written diagnosis
    - visit_date: the date the form was completed or the examination date -- this is CRITICAL to extract even if the rest of the form is illegible
    - hpi_summary: leave empty
    - chief_complaint: leave empty
    - physical_exam_findings: leave empty
    - treatment_plan: leave empty
    - CROSS-REFERENCE: If the C-4 date matches an office visit in the same document set, use that visit's rendering provider and/or diagnosis to fill in any illegible C-4 fields. Explicitly note when extrapolated (e.g., "Extrapolated from same-date office visit").
    - ORDERING: Place the C-4 entry BEFORE the regular office visit entry of the same date.
DEDUPLICATION RULE: If the same date has BOTH a physician progress report AND an office visit from the SAME provider, IGNORE the physician progress report and ONLY include the office visit.

CRITICAL DATE AND TIMELINE ACCURACY:
- Pay EXTREME attention to dates mentioned in the documents
- Multiple visits can occur at the SAME LOCATION on DIFFERENT DATES - treat each as a separate visit
- Match ALL findings, exams, and imaging to the CORRECT visit date
- NEVER include information from a future visit in an earlier visit
- NEVER reference events that haven't occurred yet chronologically
- The visit_date MUST be the DATE OF SERVICE (the date the clinical encounter actually occurred) -- NOT the date of injury, NOT the date the report was typed, NOT the date of dictation
- "Date of Injury" and "Date of Accident" are NEVER the visit_date unless the patient was seen on that exact day (e.g. same-day ER visit). Even then, use the actual clinical service date from the note header, not the injury date field
- For ER visits: the service date is typically in the note header or the "Date of Service" / "Encounter Date" field -- it is almost always ONE DAY AFTER the injury date for overnight incidents. Use that date, not the injury date
- If you see only one date on a document and it matches a known injury date, look harder -- there is almost always a separate service/encounter date elsewhere in the document
- The visit_date will almost always appear in the DOCUMENT HEADER (top of the note), not in the body narrative (HPI, subjective section). The injury date is commonly mentioned in the HPI/narrative -- do NOT use that date as the visit_date
- For orthopedic/specialist consultation notes (e.g. "Follow-up Consultation", "Orthopedic Consultation"): the visit date is in the note header or the date the note was authored -- NOT the date of injury mentioned in the HPI. Example: if HPI says "patient injured on 8/12/2024" but the note header says "Date of Service: 3/15/2025", use 3/15/2025.
- EXCEPTION: Occupational medicine / workers comp facilities (e.g. Concentra, Workcare, Occumed, or any note labeled "Workers Compensation" or "Occupational Medicine") often include BOTH the date of injury AND the date of service in the header -- in that case use the "Date of Service" or "Visit Date" field, not the "Date of Injury" field

For EACH entry found, extract:
1. Visit date (YYYY-MM-DD)   BE PRECISE
2. Rendering provider name   doctor's name only, not patient name
3. Practice/setting   specific facility name or document type
4. Visit type   classify as one of: Office Visit, Surgery, Physical Therapy, Radiology, Emergency Visit, IME/Expert Report, C-4 Form, Police Report, Ambulance Report, Consultation, Other
5. HPI   SUMMARIZE CONCISELY: key symptoms, injury date (first visit only), pain scale, mechanism, symptom progression. 3-5 sentences max.
6. Physical Examination   key pertinent positives only: pain location/severity, ROM with measurements, neurological findings, swelling. Do NOT list normal findings. 3-5 key findings max.
7. Imaging findings   include EXACTLY as written, ONLY if performed on THIS visit date
8. Lab findings   ONLY if labs actually performed on THIS visit date
9. Impression/diagnosis   with ICD-10 codes if provided (do NOT add codes if not in source)
10. Treatment Plan   SUMMARIZE: main interventions, expert recommendations, restrictions, follow-up. 2-4 key points.

CRITICAL EXTRACTION RULES:
(1) Extract EVERY clinical encounter   office visits, ER visits, surgical reports, radiology reports, IMEs, C-4 forms, ambulance reports, police reports. Do NOT skip any.
(2) For EVERY non-PT visit, you MUST populate hpi_summary, impression_diagnosis, and treatment_plan if that information exists anywhere in the text for that encounter. A visit with only date/provider and empty content fields is almost always an error   go back and fill it in.
(3) NEVER return a visit with all content fields empty unless it is truly just a C-4 form with no clinical notes.
(4) NEVER hallucinate   only use information explicitly in the text.
(5) Every field must be a plain text string. NEVER return null, arrays, or objects for text fields.
(6) If information is truly not available, return an empty string "".
(7) The icd10_codes field must always be an array of strings (can be empty []).
(8) PHYSICAL/OCCUPATIONAL THERAPY VISITS: Extract EVERY individual PT/OT session as its own separate record. Do NOT collapse multiple PT sessions into one. Do NOT summarize a series of visits as a single entry. Each visit date = one record. PT notes are often brief one-liners (date, therapist initials, modalities, exercise sets) -- each one is a separate visit and must be extracted individually. If a page contains 10 PT visit dates, return 10 separate visit records.
(9) For PT visits: practice_setting should be the full facility name (e.g. "Dignity Health Physical Therapy", "Nevada Rehabilitation Institute"). Do NOT abbreviate to just "PT" or "Physical Therapy". Consistent facility naming across all records is critical.

Return ALL entries found as separate entries in the visits array.
Also extract: patient_name, case_number.` + (knownVisitsChecklist.length > 0 ? ('\n\nKNOWN VISIT CHECKLIST (pre-pass):\nThe following clinical encounters are known to exist in this document set. Scan carefully for each and ensure it appears in your output. If a note is present but partially cut off, extract what is available -- do not skip it entirely.\n' + knownVisitsChecklist.map(function(v) { return '- ' + v.date + ' | ' + v.provider + ' | ' + v.facility + ' | ' + v.visit_type; }).join('\n') + '\n\nIf a listed visit is NOT found in the documents you are currently reviewing, omit it -- it may be in a different batch. Only include visits you can see evidence of in these documents.') : '');
  };

  // Normalize provider names: if entirely uppercase (e.g. "ARTHUR J. TAYLOR MD"), convert to title case
  const toTitleCase = (str) => {
    if (!str) return str;
    // Only normalize if the alphabetic portion is all-caps (OCR artifact)
    const letters = str.replace(/[^a-zA-Z]/g, '');
    if (letters.length > 2 && letters === letters.toUpperCase()) {
      // Title-case each word; preserve known credential abbreviations
      const credentials = new Set(['MD', 'DO', 'PA', 'NP', 'RN', 'LPN', 'PT', 'OT', 'DC', 'DDS', 'DMD', 'DPM', 'PHD', 'APRN', 'LCSW', 'OTR', 'ATC', 'EMT', 'RPA']);
      return str.replace(/[A-Z]+/g, word => credentials.has(word) ? word : word.charAt(0) + word.slice(1).toLowerCase());
    }
    return str;
  };

  const sanitizeVisits = (visits, patientName) => {
    if (!Array.isArray(visits)) return [];
    const stringFields = ['visit_date','rendering_provider','practice_setting','visit_type','chief_complaint','hpi_summary','injury_date','pain_scale','symptom_progression','physical_exam_findings','imaging_findings','lab_findings','impression_diagnosis','treatment_plan'];
    const validProgressions = ['improved','same','worse','not_documented'];

    // Exclude purely administrative/perioperative supporting documents -- not clinical visits
    const EXCLUDED_PATTERNS = [
      /pacu/i,
      /post.?anesthesia/i,
      /anesthesia\s+record/i,
      /pre.?op\s+nursing/i,
      /perioperative\s+nursing/i,
      /nursing\s+document/i,
      /preop\s+nursing/i,
    ];

    const isExcluded = (visit) => {
      // Never exclude C-4 forms regardless of other content
      const setting = (visit.practice_setting || '').toLowerCase();
      if (setting.includes('c-4') || setting.includes('workers') || setting.includes('wcb')) return false;
      const combined = `${visit.practice_setting || ''} ${visit.rendering_provider || ''} ${visit.chief_complaint || ''}`;
      return EXCLUDED_PATTERNS.some(rx => rx.test(combined));
    };

    // Detect visits where Bedrock used the injury_date as visit_date instead of the service date.
    // Broadened: any visit where visit_date === injury_date is almost certainly misdated in a workers comp case.
    // The only legitimate exception would be a same-day injury + treatment, but we add +1 day even then
    // because the ER service date is always the actual encounter date (which may span midnight).
    const isLikelyMisdatedER = (visit) => {
      if (!visit.visit_date || !visit.injury_date) return false;
      if (visit.visit_date !== visit.injury_date) return false;
      // Exclude C-4 forms -- their visit_date is intentionally the injury date
      const settingLower = (visit.practice_setting || '').toLowerCase();
      if (settingLower.includes('c-4') || settingLower.includes('workers') || settingLower.includes('wcb')) return false;
      return true;
    };

    // Shift a YYYY-MM-DD string forward by one day
    const addOneDay = (dateStr) => {
      const [y, m, d] = dateStr.split('-').map(Number);
      const dt = new Date(y, m - 1, d + 1);
      return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
    };

    // Hard enforcement: only one C-4 entry per case (the earliest one).
    // Even if Bedrock returns multiple C-4 entries, strip down to the first chronologically.
    const enforceOneC4 = (visitList) => {
      const isC4 = (v) => {
        const s = (v.practice_setting || '').toLowerCase();
        return s.includes('c-4') || s.includes('wcb') || s.includes("workers' compensation report");
      };
      const c4s = visitList.filter(isC4);
      if (c4s.length <= 1) return visitList;
      // Find the earliest C-4 date
      const sorted = [...c4s].sort((a, b) => {
        if (!a.visit_date) return 1;
        if (!b.visit_date) return -1;
        const dateDiff2 = (a.visit_date||"").localeCompare(b.visit_date||"");
        if (dateDiff2 !== 0) return dateDiff2;
        const aIsC4b = (a.practice_setting || '').toLowerCase().includes('c-4');
        const bIsC4b = (b.practice_setting || '').toLowerCase().includes('c-4');
        if (aIsC4b && !bIsC4b) return -1;
        if (!aIsC4b && bIsC4b) return 1;
        return dateDiff2;
      });
      const earliestDate = sorted[0].visit_date;
      // Among all C-4s on the earliest date, keep the one with the most content
      const c4sOnEarliestDate = c4s.filter(v => v.visit_date === earliestDate);
      const contentLength = (v) =>
        [v.impression_diagnosis, v.rendering_provider, v.imaging_findings, v.hpi_summary, v.treatment_plan]
          .map(s => (s || '').trim()).join('').length;
      const keepC4 = c4sOnEarliestDate.sort((a, b) => contentLength(b) - contentLength(a))[0];
      // Convert all other C-4s to plain office visits
      return visitList.map(v => {
        if (isC4(v) && v !== keepC4) {
          const cleaned = { ...v };
          cleaned.practice_setting = (cleaned.practice_setting || '')
            .replace(/c-4 workers'? compensation report/i, '')
            .replace(/\(c-4 report\)/i, '')
            .trim() || 'Office Visit';
          return cleaned;
        }
        return v;
      });
    };

    return enforceOneC4((visits || [])
      .filter(visit => !isExcluded(visit)))
      .map(visit => {
        const clean = { ...visit };
        stringFields.forEach(field => {
          const val = clean[field];
          if (val === null || val === undefined || val === false) clean[field] = '';
          else if (typeof val === 'object') clean[field] = JSON.stringify(val);
          else if (typeof val !== 'string') clean[field] = String(val);
        });
        if (!Array.isArray(clean.icd10_codes)) clean.icd10_codes = [];
        // Normalize all-caps provider names from OCR
        if (clean.rendering_provider) clean.rendering_provider = toTitleCase(clean.rendering_provider);
        // Normalize PT/OT facility name abbreviations for consistent dedup and grouping
        if (clean.practice_setting) clean.practice_setting = normalizePTSetting(clean.practice_setting);
        if (!validProgressions.includes(clean.symptom_progression)) clean.symptom_progression = 'not_documented';
        const patientLower = patientName?.toLowerCase();
        if (clean.practice_setting && patientLower && clean.practice_setting.toLowerCase().includes(patientLower)) {
          clean.practice_setting = '';
        }
        // Strip street addresses from practice_setting (name only, no "123 Main St, City, ST")
        if (clean.practice_setting) {
          clean.practice_setting = clean.practice_setting
            .replace(/,\s*\d+\s+[A-Za-z].*$/, '')   // ", 2800 East Desert Inn Road..."
            .replace(/\s*\d{5}(?:-\d{4})?\s*$/, '')  // trailing zip codes
            .replace(/,\s*(?:Ste|Suite|Floor|Fl|Bldg|Building|Unit|#)\s*[\w-]+\s*$/i, '') // suite/unit
            .trim()
            .replace(/,\s*$/, ''); // trailing comma cleanup
        }
        // Correct ER visits where Bedrock used injury_date instead of actual service date
        if (isLikelyMisdatedER(clean)) {
          clean.visit_date = addOneDay(clean.injury_date);
        }
        return clean;
      });
  };

  // // --- Visit Index generation -------------------------------------------
  const buildVisitIndexPrompt = () => {
    return `You are reviewing medical-legal documents. Your ONLY task is to extract a complete list of every clinical encounter date, provider name, and facility/location.

For each clinical encounter found, extract:
1. date - the date of service (YYYY-MM-DD format). PRIMARY SOURCE: the document header or note title (e.g. "Visit Note - November 7, 2022" → 2022-11-07). The vitals table Date column also confirms the visit date. NEVER use the injury date or any date mentioned inside the HPI narrative as the visit date.
2. provider - the treating provider's name and credentials (e.g. "Arthur J. Taylor, MD")
3. facility - the facility or practice name (e.g. "Nevada Orthopedic & Spine Center", "Centennial Hills Hospital Emergency Department", "Dignity Health Physical Therapy")
4. visit_type - a brief label: "Office Visit", "ER Visit", "Surgery", "Physical Therapy", "Radiology", "C-4 Form", "IME", "Chiropractic", etc.

RULES:
- Include EVERY encounter -- office visits, ER, surgery, PT/OT, radiology, C-4 forms, IMEs, ambulance, etc.
- Each unique date + provider combination is a separate entry.
- Do NOT include administrative documents (therapy orders, authorization requests, appointment reminders, fax covers). ALWAYS include radiology visits (MRI, X-ray, CT, bone scan, etc.) -- these are clinical encounters.
- CRITICAL: The HPI section often mentions the date of injury (e.g. "injury date 10/31/2022") -- this is NOT the visit date. The visit date is ALWAYS in the document header (e.g. "Visit Note November 7, 2022" or "Visit Note - November 7, 2022") or vitals table.
- IMPORTANT: Textract OCR may output page footers and headers from adjacent pages mixed into the text stream. Always look for the pattern "Visit Note [Month] [Day], [Year]" or "Visit Note [Month] [Day] [Year]" (with or without dash/comma) -- this is the authoritative visit date. A date in the HPI like "she fell on 10/31/2022 and went to the ER" does NOT make 10/31 or 11/1 a visit date for THIS note.
- Do NOT include the date of injury as a visit date unless confirmed by a "Visit Note [date]" header on that exact date.
- Keep it fast and simple -- no clinical content needed, just date/provider/facility/type.
- If a date appears in a document header but no provider is identifiable, still include the entry with provider as "Not Documented".

Return all entries in the visits array.`;
  };

const generateVisitIndex = async () => {
    // Use exact same doc selection logic as generateSummary — let Lambda handle everything
    const selectedDocs = groupedDocuments
      .filter(d => visitIndexDocsSelected.includes(d.id))
      .sort((a, b) => (a.id || '').localeCompare(b.id || ''));

    console.log('[VI] selectedDocs:', selectedDocs.length);
    if (selectedDocs.length === 0) return;
    setShowVisitIndexDialog(false);
    setVisitIndexDocsSelected([]);
    setVisitIndexRunning(true);
    setVisitIndexData(null);
    setVisitIndexCrossCheck(null);

    try {
      // Collect doc IDs — identical to generateSummary's docIds logic
      const docIds = [];
      for (const doc of selectedDocs) {
        if (doc._is_group && doc._parts?.length) {
          for (const part of doc._parts) {
            const partClassif = part.page_classifications || [];
            const allNonClinical = partClassif.length > 0 && partClassif.every(p => !p.is_clinical && !p.restored);
            if (!allNonClinical) docIds.push(part.id);
          }
        } else {
          const docClassif = doc.page_classifications || [];
          const allNonClinical = docClassif.length > 0 && docClassif.every(p => !p.is_clinical && !p.restored);
          if (!allNonClinical) docIds.push(doc.id);
        }
      }

      console.log('[VI] docIds to send:', docIds.length, docIds);
      if (docIds.length === 0) {
        setVisitIndexRunning(false);
        return;
      }

      // Fire dedicated Visit Index Lambda — completely separate from summary generation
      const startRes = await awsProxy('/visit-index/build', 'POST', {
        doc_ids: docIds,
        org_id: ORG_ID,
      });

      const job_id = startRes?.job_id;
      if (!job_id) throw new Error('No job_id returned');
      console.log('[VI] job_id:', job_id);

      // Poll until complete
      const POLL_MS = 5000;
      const MAX_POLLS = 120; // 10 min max
      let viResult = null;
      for (let poll = 0; poll < MAX_POLLS; poll++) {
        await new Promise(res => setTimeout(res, POLL_MS));
        const jobStatus = await awsProxy(`/jobs/${job_id}`, 'GET');
        console.log(`[VI] poll ${poll+1}: status=${jobStatus?.status}`);
        if (jobStatus?.status === 'complete') { viResult = jobStatus.result; break; }
        if (jobStatus?.status === 'failed') throw new Error('VI job failed: ' + (jobStatus?.error_message || 'unknown'));
      }

      if (!viResult) throw new Error('Visit Index timed out');

      // Result contains known_visits from the pre-pass
      const visits = Array.isArray(viResult.known_visits) ? viResult.known_visits : [];
      const patientName = viResult.patient_name || '';
      console.log('[VI] complete:', visits.length, 'visits');

      // Deduplicate by date+provider
      const seen = new Set();
      const deduped = visits.filter(v => {
        if (!v.date) return false;
        const key = `${v.date}||${(v.provider || '').toLowerCase().trim()}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      // Sort chronologically
      deduped.sort((a, b) => (a.date || '').localeCompare(b.date || ''));

      setVisitIndexData({ patient_name: patientName, visits: deduped });
      setVisitIndexRunning(false);
      setShowVisitIndexViewer(true);
    } catch (err) {
      setVisitIndexRunning(false);
      console.error('Visit Index generation failed:', err);
    }
  };

  // Export Visit Index as real .docx
  const exportVisitIndex = async () => {
    if (!visitIndexData) return;
    const { patient_name, visits } = visitIndexData;
    const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, ShadingType, AlignmentType, BorderStyle, HeadingLevel } = window.docx;

    const headerShading = { type: ShadingType.SOLID, color: '1e3a5f', fill: '1e3a5f' };
    const noBorder = { style: BorderStyle.NONE, size: 0, color: 'auto' };
    const cellBorders = { top: noBorder, bottom: { style: BorderStyle.SINGLE, size: 4, color: 'e5e7eb' }, left: noBorder, right: noBorder };

    const makeHeaderRow = (label, count) => new TableRow({
      children: [
        new TableCell({
          columnSpan: 3,
          shading: headerShading,
          borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder },
          children: [new Paragraph({
            children: [
              new TextRun({ text: label, bold: true, color: 'FFFFFF', size: 22 }),
              new TextRun({ text: `  (${count} visit${count !== 1 ? 's' : ''})`, color: 'CCDDEE', size: 20 }),
            ],
            spacing: { before: 80, after: 80 },
          })],
        }),
      ],
    });

    const makeDateStr = (date) => {
      const d = date || null; // string only -- no new Date()
      if (!date) return ''; const parts = date.split('-').map(Number); return (parts.length === 3 && !isNaN(parts[0])) ? `${String(parts[1]).padStart(2,'0')}/${String(parts[2]).padStart(2,'0')}/${parts[0]}` : date;
    };

    const makeDataRow = (col1, col2, col3, shaded) => new TableRow({
      children: [col1, col2, col3].map((text, idx) => new TableCell({
        width: idx === 0 ? { size: 1500, type: WidthType.DXA } : idx === 2 ? { size: 1800, type: WidthType.DXA } : { size: 4500, type: WidthType.DXA },
        shading: shaded ? { type: ShadingType.SOLID, color: 'F8FAFC', fill: 'F8FAFC' } : undefined,
        borders: cellBorders,
        children: [new Paragraph({ children: [new TextRun({ text: text || '', size: 18 })], spacing: { before: 40, after: 40 } })],
      })),
    });

    const tableRows = [];

    if (visitIndexView === 'grouped') {
      const groups = {};
      visits.forEach(v => { const k = v.provider || 'Unknown Provider'; if (!groups[k]) groups[k] = []; groups[k].push(v); });
      Object.entries(groups).sort(([a], [b]) => a.localeCompare(b)).forEach(([provider, pvVisits]) => {
        tableRows.push(makeHeaderRow(provider, pvVisits.length));
        pvVisits.forEach((v, i) => tableRows.push(makeDataRow(makeDateStr(v.date), v.facility || '', v.visit_type || '', i % 2 !== 0)));
      });
    } else {
      visits.forEach((v, i) => tableRows.push(makeDataRow(makeDateStr(v.date), v.provider || '', v.facility || '', i % 2 !== 0)));
    }

    const doc = new Document({
      sections: [{
        children: [
          new Paragraph({ text: 'Visit Index', heading: HeadingLevel.HEADING_1, spacing: { after: 100 } }),
          new Paragraph({ children: [new TextRun({ text: 'Patient: ', bold: true }), new TextRun(patient_name || '')], spacing: { after: 60 } }),
          new Paragraph({ children: [new TextRun({ text: 'Generated: ', bold: true }), new TextRun(new Date().toLocaleDateString('en-US'))], spacing: { after: 200 } }),
          new Table({ width: { size: 9240, type: WidthType.DXA }, rows: tableRows }),
        ],
      }],
    });

    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `VisitIndex_${(patient_name || 'Patient').replace(/\s+/g, '_')}_${new Date().toLocaleDateString('en-US').replace(/\//g, '-')}.docx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Save Visit Index as a library card (stored in summaries list)
  const saveVisitIndex = async () => {
    if (!visitIndexData) return;
    try {
      const payload = {
        patient_name: visitIndexData.patient_name || '',
        case_number: '',
        visits: [],
        visit_index: visitIndexData.visits,
        summary_type: 'visit_index',
        generated_date: new Date().toISOString(),
      };
      const res = await awsProxy('/summaries', 'POST', payload);
      queryClient.invalidateQueries({ queryKey: ['aws-summaries'] });
      alert('Visit Index saved to library.');
    } catch (err) {
      console.error('saveVisitIndex error:', err);
      alert('Could not save Visit Index: ' + err.message);
    }
  };

  // Cross-check Visit Index against an existing summary
  const crossCheckVisitIndex = (summary) => {
    if (!visitIndexData || !summary) return;
    const indexDates = new Set(visitIndexData.visits.map(v => v.date));
    const summaryDates = new Set((summary.visits || []).map(v => v.visit_date).filter(Boolean));

    const missing = [...indexDates].filter(d => !summaryDates.has(d)).sort();
    const extra = [...summaryDates].filter(d => !indexDates.has(d)).sort();
    setVisitIndexCrossCheck({ missing, extra, summaryName: summary.patient_name || summary.id });
  };

  // // --- Generate summary (chunked, text-only, ChartReview AI via Base44 LLM) ----
  // // --- Generate summary — ChartReview AI direct (Gamma architecture) -----------
  // Updated: 2026-04-25 — replaced Base44 InvokeLLM with direct AWS Lambda/Bedrock
  // Flow: POST /summaries/generate -> { job_id } -> poll GET /jobs/{job_id} -> process result
  const generateSummary = async () => {
    const selectedDocs = groupedDocuments
      .filter(d => selectedDocuments.includes(d.id))
      .sort((a, b) => (a.id || '').localeCompare(b.id || ''));

    if (selectedDocs.length === 0) {
      setError("Please select at least one document to generate a summary.");
      return;
    }

    setShowDialog(false);
    setSelectedDocuments([]);
    genStore.set({ running: true, statusMsg: "Starting...", completionMsg: "", error: null, elapsedSeconds: 0 });

    if (genStore.state.timerHandle) clearInterval(genStore.state.timerHandle);
    let elapsed = 0;
    const timerHandle = setInterval(() => {
      elapsed += 1;
      genStore.set({ elapsedSeconds: elapsed });
    }, 1000);
    genStore.set({ timerHandle });

    try {
      // Collect all part IDs to send to the Lambda
      const docIds = [];
      for (const doc of selectedDocs) {
        if (doc._is_group && doc._parts?.length) {
          for (const part of doc._parts) {
            const partClassif = part.page_classifications || [];
            const allNonClinical = partClassif.length > 0 && partClassif.every(p => !p.is_clinical && !p.restored);
            if (!allNonClinical) docIds.push(part.id);
          }
        } else {
          const docClassif = doc.page_classifications || [];
          const allNonClinical = docClassif.length > 0 && docClassif.every(p => !p.is_clinical && !p.restored);
          if (!allNonClinical) docIds.push(doc.id);
        }
      }

      if (docIds.length === 0) {
        genStore.set({ running: false, timerHandle: null, statusMsg: "", error: "All selected documents are non-clinical." });
        clearInterval(timerHandle);
        return;
      }

      console.log(`generateSummary: firing Lambda with ${docIds.length} doc IDs`);
      genStore.set({ statusMsg: `Sending ${docIds.length} documents to ChartReview AI...` });

      // Fire the job
      const startRes = await awsProxy('/summaries/generate', 'POST', {
        doc_ids: docIds,
        patient_name: '',
        run_vi_prepass: true,
      });

      const job_id = startRes?.job_id;
      if (!job_id) throw new Error('No job_id returned from generateSummaryStart');
      console.log(`generateSummary: job_id=${job_id}`);

      // Poll for completion
      genStore.set({ statusMsg: 'Sending documents for processing...' });
      let jobResult = null;
      const POLL_INTERVAL_MS = 5000;
      const MAX_POLLS = 360; // 30 minutes max
      for (let poll = 0; poll < MAX_POLLS; poll++) {
        await new Promise(res => setTimeout(res, POLL_INTERVAL_MS));
        const jobStatus = await awsProxy(`/jobs/${job_id}`, 'GET');
        console.log(`Poll ${poll + 1}: status=${jobStatus?.status} visits=${jobStatus?.result?.visit_count ?? '?'}`);

        if (jobStatus?.status === 'complete') {
          jobResult = jobStatus.result;
          break;
        }
        if (jobStatus?.status === 'failed') {
          throw new Error('Generation failed on server: ' + (jobStatus?.error_message || 'unknown error'));
        }
        const serverMsg = jobStatus?.status_msg || 'Processing...';
        genStore.set({ statusMsg: serverMsg });
      }

      if (!jobResult) throw new Error('Generation timed out after 30 minutes');

      // Process result
      const rawVisits = Array.isArray(jobResult.visits) ? jobResult.visits : [];
      const patientName = jobResult.patient_name || '';
      const caseNumber = jobResult.case_number || '';
      console.log(`generateSummary: received ${rawVisits.length} visits from Lambda`);

      genStore.set({ statusMsg: `Processing ${rawVisits.length} visits...` });

      // Sanitize visits
      const cleanVisits = sanitizeVisits(rawVisits, patientName);
      console.log(`generateSummary: after sanitize: ${cleanVisits.length} visits`);

      if (cleanVisits.length === 0) {
        genStore.set({ running: false, timerHandle: null, statusMsg: "", completionMsg: "No clinical visits found in selected documents." });
        clearInterval(timerHandle);
        return;
      }

      // Sort by date
      const sorted = [...cleanVisits].sort((a, b) => {
        if (!a.visit_date) return 1;
        if (!b.visit_date) return -1;
        return (a.visit_date||"").localeCompare(b.visit_date||"");
      });

      // Save to DynamoDB via awsProxy
      const aws_summary_id = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
      const summaryPayload = {
        aws_summary_id,
        patient_name: patientName,
        case_number: caseNumber,
        visits: sorted,
        doc_ids: docIds,
        visit_count: sorted.length,
        generated_at: new Date().toISOString(),
        org_id: import.meta.env.VITE_ORG_ID,
      };

      await awsProxy('/summaries', 'POST', summaryPayload);
      queryClient.invalidateQueries({ queryKey: ['aws-summaries'] });

      clearInterval(timerHandle);
      genStore.set({
        running: false,
        timerHandle: null,
        statusMsg: "",
        completionMsg: `Done! ${sorted.length} visits extracted from ${docIds.length} document parts.`,
        error: null,
        elapsedSeconds: elapsed,
      });
    } catch (err) {
      clearInterval(genStore.state.timerHandle);
      genStore.set({ running: false, timerHandle: null, statusMsg: "", error: "Generation failed: " + err.message });
    }
  };
  // // --- Combine summaries ----------------------------------------------------
  const combineSummaries = async () => {
    if (selectedSummariesToCombine.length < 2) return;
    const selected = summaries.filter(s => selectedSummariesToCombine.includes(s.aws_summary_id || s.id));
    let allVisits = selected.flatMap(s => s.visits || []);
    allVisits.sort((a, b) => {
      if (!a.visit_date) return 1;
      if (!b.visit_date) return -1;
      const dateDiff = (a.visit_date||"").localeCompare(b.visit_date||"");
      if (dateDiff !== 0) return dateDiff;
      const aIsC4 = (a.practice_setting || '').toLowerCase().includes('c-4');
      const bIsC4 = (b.practice_setting || '').toLowerCase().includes('c-4');
      if (aIsC4 && !bIsC4) return -1;
      if (!aIsC4 && bIsC4) return 1;
      return 0;
    });
    const exactKeys = new Set();
    allVisits = allVisits.filter((visit) => {
      const dateKey = (visit.visit_date || '').trim().toLowerCase();
      const providerKey = (visit.rendering_provider || '').trim().toLowerCase();
      const settingKey = (visit.practice_setting || '').trim().toLowerCase();
      if (!dateKey && !providerKey) return true;
      const key = `${dateKey}|${providerKey}|${settingKey}`;
      if (exactKeys.has(key)) return false;
      exactKeys.add(key);
      return true;
    });
    const base = selected[0];
    const combinedData = {
      document_id: [...new Set(selected.flatMap(s => (s.document_id || '').split(',').filter(Boolean)))].join(','),
      patient_name: base.patient_name || '',
      case_number: base.case_number || '',
      visits: allVisits,
      status: 'draft',
      notes: `Combined from ${selected.length} summaries: ${selected.map(s => s.patient_name || s.id).join(', ')}`,
    };
    const newSummary = await awsProxy("/summaries", "POST", combinedData);
    await queryClient.invalidateQueries({ queryKey: ["aws-summaries"] });
    await queryClient.refetchQueries({ queryKey: ["aws-summaries"] });
    setSelectedSummariesToCombine([]);
    setShowCombineDialog(false);
    setEditing(true);
    setEditingSummary(normalizeSummaryForEdit(newSummary));
  };

  // // --- Export to Word -------------------------------------------------------
  // -- True .docx export using the docx.js library (loaded from CDN) --
  // Replicates the two-column HTML table layout: date column (left) + content column (right)
  const downloadAsDocx = async (summary, visits, fontFamily = 'Calibri', fontSize = 11, externalVI = null) => {
    const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle, VerticalAlign } = await import('https://esm.sh/docx@8');

    const ptToHalfPt = (pt) => pt * 2;
    const FONT = fontFamily || 'Calibri';
    const SIZE = ptToHalfPt(fontSize || 11);
    const SIZE_SM = ptToHalfPt(9);
    const SIZE_TITLE = ptToHalfPt(16);
    const NO_BORDER = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
    const NO_BORDERS = { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER, insideHorizontal: NO_BORDER, insideVertical: NO_BORDER };
    const DASHED_TOP = { style: BorderStyle.DASHED, size: 4, color: '999999' };

    const bold = (text, size) => new TextRun({ text: String(text || ''), bold: true, font: FONT, size: size || SIZE });
    const normal = (text, size) => new TextRun({ text: String(text || ''), font: FONT, size: size || SIZE });

    const para = (children, opts = {}) => new Paragraph({ children, spacing: { after: 40 }, ...opts });
    const emptyPara = () => new Paragraph({ children: [], spacing: { after: 60 } });

    // Build a two-column table row matching the HTML layout:
    //   Left cell:  fixed 1540 twips (~1.07in) -- wide enough for "10/16/2024:" at 11pt + right padding gap
    //   Right cell: fills remainder, holds all content
    const DATE_COL_WIDTH = 1540; // twips -- fits longest date "10/16/2024:" with breathing room
    const makeVisitTable = (leftChildren, rightChildren, topBorder = false) => {
      const leftBorder = topBorder
        ? { top: DASHED_TOP, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER }
        : NO_BORDERS;
      const rightBorder = topBorder
        ? { top: DASHED_TOP, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER }
        : NO_BORDERS;
      return new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: NO_BORDERS,
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: { size: DATE_COL_WIDTH, type: WidthType.DXA },
                verticalAlign: VerticalAlign.TOP,
                borders: leftBorder,
                margins: { right: 120 }, // ~8pt gap between date and narrative
                children: leftChildren,
              }),
              new TableCell({
                width: { size: 100, type: WidthType.PERCENTAGE },
                verticalAlign: VerticalAlign.TOP,
                borders: rightBorder,
                children: rightChildren,
              }),
            ],
          }),
        ],
      });
    };

    const sections_content = [];

    // ── Visit Index page (its own page before the Medical Summary) ──────────
    // Use the externally-built VI (from Build Visit Index) if available, else fall back to summary visits
    const viSource = externalVI?.visits
      ? externalVI.visits.map(v => ({
          visit_date: v.date || v.visit_date || '',
          rendering_provider: v.provider || v.rendering_provider || '',
          practice_setting: v.facility || v.practice_setting || '',
          visit_type: v.visit_type || '',
        }))
      : [...(visits || [])].filter(v => !v._ptBridge).map(v => {
          // Derive visit_type from practice_setting when not explicitly set
          const deriveVisitType = (ps) => {
            if (!ps) return 'Office Visit';
            const s = ps.toLowerCase();
            if (s.includes('c-4') || s.includes('wcb') || s.includes('workers') || s.includes("worker's comp")) return 'C-4 Form';
            if (s.includes('surgery') || s.includes('surgical') || s.includes('operative') || s.includes(' ios') || s.includes('ambulatory surgery')) return 'Surgery';
            if (s.includes('emergency') || s.includes(' er ') || s.includes('urgent care') || s.includes('trauma')) return 'ER Visit';
            if (s.includes('physical therapy') || s.includes('occupational therapy') || s.includes(' pt ') || s.includes('rehab') || s.includes('rehabilitation')) return 'Physical Therapy';
            if (s.includes('mri') || s.includes('radiology') || s.includes('imaging') || s.includes('x-ray') || s.includes('xray') || s.includes(' ct ') || s.includes('ultrasound')) return 'Radiology';
            if (s.includes('chiropractic') || s.includes('chiropractor')) return 'Chiropractic';
            if (s.includes('independent medical') || s.includes(' ime') || s.includes('chart review') || s.includes('record review') || s.includes('agreed medical') || s.includes(' ame') || s.includes('qualified medical') || s.includes(' qme') || s.includes('narrative report')) return 'IME/Expert Report';
            if (s.includes('ambulance') || s.includes(' ems') || s.includes('paramedic')) return 'Ambulance';
            if (s.includes('police') || s.includes('incident report')) return 'Police Report';
            return 'Office Visit';
          };
          return { ...v, visit_type: v.visit_type || deriveVisitType(v.practice_setting) };
        });
    const viVisits = viSource.sort((a, b) => {
      const da = (a.visit_date || '').trim();
      const db = (b.visit_date || '').trim();
      if (!da) return 1; if (!db) return -1;
      return da < db ? -1 : da > db ? 1 : 0;
    });
    if (viVisits.length > 0) {
      // VI page — styled to match standalone VisitIndex export
      // Blue heading, left-aligned, patient/generated/visit-count, then bordered table
      sections_content.push(new Paragraph({
        children: [new TextRun({ text: 'Visit Index', bold: true, color: '2563EB', size: ptToHalfPt(18), font: FONT })],
        spacing: { after: 100 },
      }));
      sections_content.push(para([bold('Patient: '), normal(summary.patient_name || 'N/A')]));
      sections_content.push(para([bold('Case Number: '), normal(summary.case_number || 'N/A')]));
      sections_content.push(new Paragraph({
        children: [new TextRun({ text: `${viVisits.length} visit${viVisits.length !== 1 ? 's' : ''} found`, italics: true, color: '555555', size: ptToHalfPt(9), font: FONT })],
        spacing: { after: 200 },
      }));
      // Thin single border for all cells
      const viCellBorder = { style: 'single', size: 4, color: 'auto' };
      const viBorders = { top: viCellBorder, bottom: viCellBorder, left: viCellBorder, right: viCellBorder };
      // Col widths as % of page: Date=12, Provider=25, Facility=38, Type=25
      const viColWidths = [12, 25, 38, 25];
      const makeViHeaderCell = (label, colIdx) => new TableCell({
        width: { size: viColWidths[colIdx], type: WidthType.PERCENTAGE },
        shading: { type: 'solid', color: '1e3a5f', fill: '1e3a5f' },
        borders: NO_BORDERS,
        margins: { top: 60, bottom: 60, left: 80, right: 80 },
        children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, color: 'FFFFFF', font: FONT, size: ptToHalfPt(9) })] })],
      });
      const viRows = [new TableRow({ children: ['Date', 'Provider', 'Facility', 'Visit Type'].map((l, ci) => makeViHeaderCell(l, ci)) })];
      viVisits.forEach((v, i) => {
        const dateParts = v.visit_date ? v.visit_date.split('-').map(Number) : null;
        const dateStr = dateParts ? `${String(dateParts[1]).padStart(2,'0')}/${String(dateParts[2]).padStart(2,'0')}/${dateParts[0]}` : '';
        const rowBg = i % 2 === 0 ? 'FFFFFF' : 'EBF3FB';
        const makeViCell = (text, colIdx) => new TableCell({
          width: { size: viColWidths[colIdx], type: WidthType.PERCENTAGE },
          shading: { type: 'solid', color: rowBg, fill: rowBg },
          borders: viBorders,
          margins: { top: 40, bottom: 40, left: 80, right: 80 },
          children: [new Paragraph({ children: [new TextRun({ text: String(text || ''), font: FONT, size: ptToHalfPt(9) })] })],
        });
        viRows.push(new TableRow({
          children: [
            makeViCell(dateStr, 0),
            makeViCell(v.rendering_provider || '', 1),
            makeViCell(v.practice_setting || '', 2),
            makeViCell(v.visit_type || '', 3),
          ],
        }));
      });
      sections_content.push(new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: viRows,
      }));
      // Page break — Medical Summary starts on next page
      sections_content.push(new Paragraph({ pageBreakBefore: true, children: [] }));
    }

    // Medical Summary title + patient info
    sections_content.push(new Paragraph({
      children: [bold('MEDICAL RECORD SUMMARY', SIZE_TITLE)],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }));
    sections_content.push(para([bold('Patient: '), normal(summary.patient_name || 'N/A')]));
    sections_content.push(para([bold('Case Number: '), normal(summary.case_number || 'N/A')]));
    sections_content.push(emptyPara());

    // Sort visits
    const sortedV = [...(visits || [])].sort((a, b) => {
      const da = (a.visit_date || '').trim();
      const db = (b.visit_date || '').trim();
      if (!da) return 1; if (!db) return -1;
      if (da !== db) return da < db ? -1 : 1;
      const aIsC4 = (a.practice_setting || '').toLowerCase().includes('c-4');
      const bIsC4 = (b.practice_setting || '').toLowerCase().includes('c-4');
      if (aIsC4 && !bIsC4) return -1; if (!aIsC4 && bIsC4) return 1;
      return 0;
    });

    for (const visit of sortedV) {
      // PT bridge row (dashed separator)
      if (visit._ptBridge) {
        sections_content.push(makeVisitTable(
          [para([])],
          [para([normal(`[ ${visit._ptCount} additional ${visit._ptProvider} visit${visit._ptCount !== 1 ? 's' : ''} omitted - see full record ]`, SIZE_SM)], { spacing: { before: 80, after: 80 } })],
          true
        ));
        continue;
      }

      // Date string
      const dateParts = visit.visit_date ? visit.visit_date.split('-').map(Number) : null;
      const dateStr = dateParts ? `${dateParts[1]}/${dateParts[2]}/${dateParts[0]}:` : '';

      // Build right-column content runs (all inline, matching HTML layout)
      const contentRuns = [];
      if (visit.practice_setting) contentRuns.push(normal(visit.practice_setting + '. '));
      if (visit.rendering_provider) contentRuns.push(normal(visit.rendering_provider + '. '));
      if (visit.hpi_summary) {
        contentRuns.push(bold('HPI: '));
        contentRuns.push(normal(visit.hpi_summary + ' '));
        if (visit.injury_date) {
          const [iy, im, id2] = visit.injury_date.split('-').map(Number);
          contentRuns.push(normal(`Injury Date: ${im}/${id2}/${iy}. `));
        }
        if (visit.pain_scale && visit.pain_scale !== 'not_documented') {
          contentRuns.push(normal(`Pain Scale: ${visit.pain_scale}. `));
        }
        if (visit.symptom_progression && visit.symptom_progression !== 'not_documented') {
          const sp = visit.symptom_progression.charAt(0).toUpperCase() + visit.symptom_progression.slice(1);
          contentRuns.push(normal(`Symptom Progression: ${sp}. `));
        }
      }
      if (visit.physical_exam_findings) {
        contentRuns.push(bold('Physical Examination: '));
        contentRuns.push(normal(visit.physical_exam_findings + ' '));
      }
      if (visit.imaging_findings) {
        contentRuns.push(bold('Imaging Findings: '));
        contentRuns.push(normal(visit.imaging_findings + ' '));
      }
      if (visit.lab_findings && visit.lab_findings.trim()) {
        contentRuns.push(bold('Laboratory Findings: '));
        contentRuns.push(normal(visit.lab_findings + ' '));
      }

      // Main visit row: date left, narrative right
      sections_content.push(makeVisitTable(
        [para([bold(dateStr)], { spacing: { before: 160, after: 0 } })],
        [para(contentRuns, { spacing: { before: 160, after: 40 } })]
      ));

      // Diagnosis row: empty left cell, diagnosis indented right
      if (visit.impression_diagnosis) {
        const diagRuns = [bold('Diagnosis: '), normal(visit.impression_diagnosis)];
        if (visit.icd10_codes && visit.icd10_codes.length > 0) {
          diagRuns.push(normal(` (ICD-10: ${visit.icd10_codes.join(', ')})`));
        }
        sections_content.push(makeVisitTable(
          [para([])],
          [para(diagRuns, { spacing: { before: 40, after: 40 } })]
        ));
      }

      // Treatment Plan row: empty left cell, treatment indented right
      if (visit.treatment_plan) {
        sections_content.push(makeVisitTable(
          [para([])],
          [para([bold('Treatment Plan: '), normal(visit.treatment_plan)], { spacing: { before: 40, after: 120 } })]
        ));
      }
    }

    // Footer
    sections_content.push(emptyPara());
    sections_content.push(new Paragraph({
      children: [normal(`Generated by ChartReview Pro on ${new Date().toLocaleDateString()}`, SIZE_SM)],
      alignment: AlignmentType.CENTER,
    }));

    const doc = new Document({
      sections: [{
        properties: {
          page: { margin: { top: 720, bottom: 720, left: 1080, right: 1080 } },
        },
        children: sections_content,
      }],
    });

    const buffer = await Packer.toBlob(doc);
    const url = URL.createObjectURL(buffer);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Medical_Summary_${summary.patient_name || 'Document'}_${new Date().toISOString().split('T')[0]}.docx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportToWord = async (summary) => {
    const user = await base44.auth.me();
    const fontFamily = user?.export_font_family || 'Calibri';
    const fontSize = user?.export_font_size || 11;

    let useLetterhead = false;
    const letterheadUrl = user?.letterhead_url;
    if (letterheadUrl) {
      useLetterhead = window.confirm('Would you like to apply your letterhead as a background watermark on this export?');
    }

    // Sort visits chronologically; C-4 entries come before same-date visits
    // Use string comparison on YYYY-MM-DD to avoid timezone offset shifting dates
    const sortedVisits = summary.visits ? [...summary.visits].sort((a, b) => {
      const da = (a.visit_date || '').trim();
      const db = (b.visit_date || '').trim();
      if (!da) return 1;
      if (!db) return -1;
      if (da !== db) return da < db ? -1 : 1;  // lexicographic on YYYY-MM-DD is correct
      // Same date: C-4 comes first
      const aIsC4 = (a.practice_setting || '').toLowerCase().includes('c-4');
      const bIsC4 = (b.practice_setting || '').toLowerCase().includes('c-4');
      if (aIsC4 && !bIsC4) return -1;
      if (!aIsC4 && bIsC4) return 1;
      return 0;
    }) : [];

    // Guard: warn if no visits
    if (!sortedVisits.length) {
      alert('This summary has no visits saved. Please open Edit, make any change, and Save Summary before exporting.');
      return;
    }

    // // -- PT consolidation --------------------------------------------------
    const isPTVisit = (v) => {
      const s = (v.practice_setting || '').toLowerCase();
      return s.includes('physical therapy') || s.includes('occupational therapy') ||
             s.includes('physio') || s === 'pt' || s.includes(' pt ') ||
             s.includes('rehabilitation') || s.includes('hand therapy') ||
             (s.includes('sport') && s.includes('rehab'));
    };
    const hasPTVisits = sortedVisits.some(isPTVisit);
    // Reuse prior PT consolidation answer for this summary if already asked (e.g. viewed then exported)
    const summaryKey = summary.id || summary.aws_document_id || 'default';
    // Always consolidate PT visits -- no prompt
    const consolidatePT = hasPTVisits;

    const buildVisitList = (visits, collapse) => {
      if (!collapse) return visits;
      // Group PT visits by facility/provider   each distinct PT provider collapses
      // independently so ankle PT and back PT are NOT merged together
      const ptGroups = {};
      visits.forEach((v, idx) => {
        if (!isPTVisit(v)) return;
        // Group strictly by practice_setting (location/facility)   same facility = same group
        const key = normalizePTSetting(v.practice_setting || 'pt').toLowerCase().trim();
        if (!ptGroups[key]) ptGroups[key] = [];
        ptGroups[key].push(idx);
      });
      // Mark which indices should be bridged (not first or last of their group)
      const bridgedIndices = new Set();
      const bridgeInsertAfter = {}; // index   bridge object
      Object.values(ptGroups).forEach(indices => {
        if (indices.length <= 2) return;
        // keep first and last, bridge everything in between
        const first = indices[0];
        const last  = indices[indices.length - 1];
        indices.slice(1, -1).forEach(i => bridgedIndices.add(i));
        // insert bridge marker after the first visit of this group
        bridgeInsertAfter[first] = {
          _ptBridge: true,
          _ptCount: indices.length - 2,
          _ptProvider: visits[first].practice_setting || 'Physical/Occupational Therapy',
        };
      });
      const result = [];
      visits.forEach((v, i) => {
        if (bridgedIndices.has(i)) return; // skip middle PT visits
        result.push(v);
        if (bridgeInsertAfter[i]) result.push(bridgeInsertAfter[i]);
      });
      return result;
    };

    const finalVisits = buildVisitList(deduplicateVisits(sortedVisits), consolidatePT);

    const letterheadStyle = useLetterhead && letterheadUrl
      ? `body::before { content: ''; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-image: url('${letterheadUrl}'); background-size: 100% 100%; background-repeat: no-repeat; opacity: 0.15; z-index: -1; }`
      : '';

    // Plain text / dictation mode   only use this path if there is actual free-text content
    if (summary.summary_content && typeof summary.summary_content === "string" && summary.summary_content.trim().length > 0) {
      const preText = summary.summary_content
        .split('\n')
        .map(line => `<p style="margin: 0 0 4pt 0;">${line.replace(/^\t/, '&nbsp;&nbsp;&nbsp;&nbsp;') || '&nbsp;'}</p>`)
        .join('');
      const htmlContent = `<!DOCTYPE html><html><head><meta charset='utf-8'><title>Medical Record Summary</title><style>${letterheadStyle}</style></head>
<body style="font-family: ${fontFamily}, Arial, sans-serif; font-size: ${fontSize}pt; line-height: 1.6; margin: 0.5in;">
<h1 style="font-size: 16pt; font-weight: bold; text-align: center; margin-bottom: 24pt; text-decoration: underline;">MEDICAL RECORD SUMMARY</h1>
${preText}
<p style="font-size: 10pt; text-align: center; margin-top: 24pt;">Generated by ChartReview Pro on ${new Date().toLocaleDateString()}</p>
</body></html>`;
      await downloadAsDocx(summary, finalVisits, fontFamily, fontSize, visitIndexData);
      return;
    }

    const sectionHeaderTag = (title) =>
      `<p style="font-size: 16pt; font-weight: bold; text-align: center; text-decoration: underline; margin: 24pt 0 12pt 0;">${title}</p>`;

    let headerNoteHtml = '';
    if (summary.ime_note) {
      headerNoteHtml += `${sectionHeaderTag('INDEPENDENT MEDICAL EXAMINATION')}<p style="margin: 0 0 12pt 0; white-space: pre-wrap;">${summary.ime_note.replace(/\n/g, '<br/>')}</p>`;
    }
    if (summary.chart_review_note) {
      headerNoteHtml += `${sectionHeaderTag('CHART REVIEW')}<p style="margin: 0 0 12pt 0; white-space: pre-wrap;">${summary.chart_review_note.replace(/\n/g, '<br/>')}</p>`;
    }
    if (!summary.ime_note && !summary.chart_review_note && summary.header_note) {
      headerNoteHtml = `<p style="margin: 0 0 18pt 0; white-space: pre-wrap;">${summary.header_note.replace(/\n/g, '<br/>')}</p>`;
    }
    if (headerNoteHtml) headerNoteHtml += '<p>&nbsp;</p>';

    // Document list   fetch from AWS
    let documentListHtml = '';
    if (summary.include_document_list && summary.document_id) {
      const docIds = summary.document_id.split(',').map(s => s.trim()).filter(Boolean);
      if (docIds.length > 0) {
        try {
          const allDocsRes = await fetch(`${AWS_API_URL}/documents`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': AWS_API_KEY,
              'x-org-id': ORG_ID,
            },
          });
          const allDocs = allDocsRes.ok ? await allDocsRes.json() : [];
          const linkedDocs = (Array.isArray(allDocs) ? allDocs : []).filter(d =>
            docIds.includes(d.aws_document_id || d.id)
          );
          if (linkedDocs.length > 0) {
            documentListHtml = `<ol style="margin: 0 0 18pt 0; padding-left: 24px; font-family: ${fontFamily}, Arial, sans-serif; font-size: ${fontSize}pt;">`;
            linkedDocs.forEach(doc => {
              documentListHtml += `<li style="margin-bottom: 4pt;">${doc.file_name || doc.title || doc.aws_document_id}</li>`;
            });
            documentListHtml += '</ol><p>&nbsp;</p>';
          }
        } catch (_) {}
      }
    }

    const physicalExamHtml = summary.physical_examination_note
      ? `<p>&nbsp;</p>${sectionHeaderTag('PHYSICAL EXAMINATION')}<p style="margin: 0; white-space: pre-wrap;">${summary.physical_examination_note.replace(/\n/g, '<br/>')}</p>`
      : '';
    const discussionHtml = summary.discussion_note
      ? `<p>&nbsp;</p>${sectionHeaderTag('DISCUSSION')}<p style="margin: 0; white-space: pre-wrap;">${summary.discussion_note.replace(/\n/g, '<br/>')}</p>`
      : '';
    const footerNoteHtml = (!summary.physical_examination_note && !summary.discussion_note && summary.footer_note)
      ? `<p>&nbsp;</p><p style="margin: 18pt 0 0 0; white-space: pre-wrap;">${summary.footer_note.replace(/\n/g, '<br/>')}</p>`
      : '';

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset='utf-8'>
  <title>Medical Record Summary</title>
  <style>
    p.visit { margin-bottom: 18pt; margin-top: 18pt; text-align: left; }
    ${letterheadStyle}
  </style>
</head>
<body style="font-family: ${fontFamily}, Arial, sans-serif; font-size: ${fontSize}pt; line-height: 1.6; margin: 0.1in;">

${(!summary.ime_note && !summary.chart_review_note) ? '<h1 style="font-size: 16pt; font-weight: bold; text-align: center; margin-bottom: 24pt; text-decoration: underline;">MEDICAL RECORD SUMMARY</h1>' : ''}

<p><strong>Patient:</strong> ${summary.patient_name || 'N/A'}</p>

<p>&nbsp;</p>
${headerNoteHtml}
${documentListHtml}

${finalVisits.map((visit) => {
  // PT bridge row
  if (visit._ptBridge) {
    return `<table width="100%" cellpadding="0" cellspacing="0" style="margin: 12pt 0; font-family: ${fontFamily}, Arial, sans-serif; font-size: ${fontSize}pt;"><tr>` +
      `<td style="width: 120px; border-top: 1px dashed #999;"></td>` +
      `<td style="border-top: 1px dashed #999; padding: 4pt 0; color: #555; font-style: italic;">` +
      `[ ${visit._ptCount} additional ${visit._ptProvider} visit${visit._ptCount !== 1 ? 's' : ''} omitted   see full record ]` +
      `</td></tr></table>`;
  }

  let visitHTML = '';

  if (visit.pre_note && visit.pre_note.trim()) {
    visitHTML += `<p style="margin: 18pt 0 6pt 0; font-family: ${fontFamily}, Arial, sans-serif; font-size: ${fontSize}pt; white-space: pre-wrap;">${visit.pre_note.replace(/\n/g, '<br/>')}</p>`;
  }

  visitHTML += '<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 0; margin-top: 18pt; font-family: ' + fontFamily + ', Arial, sans-serif; font-size: ' + fontSize + 'pt;"><tr>';
  visitHTML += '<td valign="top" style="width: 120px; padding-right: 0; font-family: ' + fontFamily + ', Arial, sans-serif; font-size: ' + fontSize + 'pt;">';
  if (visit.visit_date) {
    const [yr, mo, dy] = visit.visit_date.split('-').map(Number);
    visitHTML += `<strong>${mo}/${dy}/${yr}:</strong>`;
  }
  visitHTML += '</td>';
  visitHTML += '<td valign="top" style="text-align: left; font-family: ' + fontFamily + ', Arial, sans-serif; font-size: ' + fontSize + 'pt;">';

  if (visit.practice_setting) visitHTML += `${visit.practice_setting}. `;
  if (visit.rendering_provider) visitHTML += `${visit.rendering_provider}. `;

  if (visit.hpi_summary) {
    visitHTML += `<strong>HPI:</strong> ${visit.hpi_summary} `;
    if (visit.injury_date) { const [iy,im,id2] = visit.injury_date.split('-').map(Number); visitHTML += `Injury Date: ${im}/${id2}/${iy}. `; }
    if (visit.pain_scale && visit.pain_scale !== 'not_documented') visitHTML += `Pain Scale: ${visit.pain_scale}. `;
    if (visit.symptom_progression && visit.symptom_progression !== 'not_documented') visitHTML += `Symptom Progression: ${visit.symptom_progression.charAt(0).toUpperCase() + visit.symptom_progression.slice(1)}. `;
  }

  if (visit.physical_exam_findings) visitHTML += `<strong>Physical Examination:</strong> ${visit.physical_exam_findings} `;
  if (visit.imaging_findings) visitHTML += `<strong>Imaging Findings:</strong> ${visit.imaging_findings} `;
  if (visit.lab_findings && visit.lab_findings.trim().length > 0) visitHTML += `<strong>Laboratory Findings:</strong> ${visit.lab_findings}`;

  visitHTML += '</td></tr></table>';

  if (visit.impression_diagnosis) {
    visitHTML += '<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 0; margin-top: 6pt; font-family: ' + fontFamily + ', Arial, sans-serif; font-size: ' + fontSize + 'pt;"><tr>';
    visitHTML += '<td style="width: 120px;"></td>';
    visitHTML += '<td valign="top" style="text-align: left;"><strong>Diagnosis:</strong> ';
    const diagnosisText = visit.impression_diagnosis.trim();
    const hasMultipleDiagnoses = diagnosisText.match(/^\d+[\.\)]/m) || diagnosisText.includes('\n');
    if (hasMultipleDiagnoses) {
      const diagnoses = diagnosisText.split(/(?:\r?\n)+|\d+[\.\)]\s*/).filter(d => d.trim());
      visitHTML += '<ol style="margin: 0; padding-left: 20px;">';
      diagnoses.forEach(d => { if (d.trim()) visitHTML += `<li style="margin-bottom: 3pt;">${d.trim()}</li>`; });
      visitHTML += '</ol>';
    } else {
      visitHTML += diagnosisText;
    }
    if (visit.icd10_codes && visit.icd10_codes.length > 0) visitHTML += ` (ICD-10: ${visit.icd10_codes.join(', ')})`;
    visitHTML += '</td></tr></table>';
  }

  if (visit.treatment_plan) {
    visitHTML += '<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 18pt; margin-top: 6pt; font-family: ' + fontFamily + ', Arial, sans-serif; font-size: ' + fontSize + 'pt;"><tr>';
    visitHTML += '<td style="width: 120px;"></td>';
    visitHTML += `<td valign="top" style="text-align: left;"><strong>Treatment Plan:</strong> ${visit.treatment_plan}</td></tr></table>`;
  }

  return visitHTML;
}).join('') || ''}

${physicalExamHtml}
${discussionHtml}
${footerNoteHtml}

<p>&nbsp;</p>
<p style="font-size: 10pt; text-align: center; margin-top: 24pt;">
  Initial Visit: ${(() => { const d = sortedVisits.find(v => !v._ptBridge && v.visit_date); if (!d) return 'N/A'; const [y,m,dd] = d.visit_date.split('-').map(Number); return m+'/'+dd+'/'+y; })()} &nbsp;|&nbsp;
  Final Visit: ${(() => { const d = [...sortedVisits].reverse().find(v => !v._ptBridge && v.visit_date); if (!d) return 'N/A'; const [y,m,dd] = d.visit_date.split('-').map(Number); return m+'/'+dd+'/'+y; })()}. ${sortedVisits.filter(v => !v._ptBridge).length} visits attended.
</p>
<p style="font-size: 10pt; text-align: center; margin-top: 6pt;">Generated by ChartReview Pro on ${new Date().toLocaleDateString()}</p>

</body>
</html>`.trim();

    await downloadAsDocx(summary, finalVisits, fontFamily, fontSize, visitIndexData);
  };

  // // --- Render ---------------------------------------------------------------
  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Medical Summaries</h1>
          <p className="text-slate-600 mt-1">Generate structured summaries from any documents</p>
        </div>

        <div className="flex gap-2">
          {summaries.length >= 2 && (
            <Button variant="outline" onClick={() => { setSelectedSummariesToCombine([]); setShowCombineDialog(true); }}>
              <Merge className="w-4 h-4 mr-2" />
              Combine Summaries
            </Button>
          )}
          {summaries.length > 0 && (
            <Button variant="destructive" onClick={() => setDeleteAllDialog(true)} className="bg-red-600 hover:bg-red-700">
              <Trash2 className="w-4 h-4 mr-2" />
              Delete All
            </Button>
          )}
          <Button
            onClick={() => { setVisitIndexDocsSelected([]); setShowVisitIndexDialog(true); }}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            disabled={visitIndexRunning}
          >
            {visitIndexRunning
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Building Index...</>
              : <><List className="w-4 h-4 mr-2" />Build Visit Index</>
            }
          </Button>
          <Button
            onClick={() => { setSelectedDocuments([]); setError(null); setShowDialog(true); }}
            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Generate Summary
          </Button>
        </div>
      </div>

      {/* Generation progress banner */}
      {generatingSummary && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-4">
          <Loader2 className="w-5 h-5 text-blue-600 animate-spin flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-blue-800">{statusMsg || "Generating..."}</p>
          </div>
          <span className="text-sm font-mono text-blue-600">
            {Math.floor(elapsedSeconds / 60)}:{String(elapsedSeconds % 60).padStart(2, "0")}
          </span>
        </div>
      )}

      {completionMsg && !generatingSummary && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
          <span className="text-sm text-green-800">{completionMsg}</span>
        </div>
      )}

      {error && !showDialog && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Generate Summary Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Select Documents</DialogTitle>
            <DialogDescription>
              Select documents from any folder(s) to generate a comprehensive medical summary. Multiple documents will be combined into a single summary with all visits.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {selectedDocuments.length > 0 && (
              <Alert className="bg-blue-50 border-blue-200">
                <Users className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  {selectedDocuments.length} document{selectedDocuments.length !== 1 ? 's' : ''} selected from {[...new Set(documents.filter(d => selectedDocuments.includes(d.id)).map(d => d.folder || 'Unfiled'))].length} folder{[...new Set(documents.filter(d => selectedDocuments.includes(d.id)).map(d => d.folder || 'Unfiled'))].length !== 1 ? 's' : ''}.
                  {selectedDocuments.length > 1 && ' All visits will be combined into one summary.'}
                </AlertDescription>
              </Alert>
            )}

            {/* Documents grouped by folder */}
            <div className="space-y-6">
              {Object.keys(documentsByFolder).sort().map(folderName => {
                const folderDocsAll = documentsByFolder[folderName];
                // Hide fully non-clinical docs from selection (all parts assessed + all pages non-clinical)
                const folderDocs = folderDocsAll.filter(doc => {
                  if (doc._all_rejected) return false;
                  const pc = doc.page_classifications || [];
                  if (pc.length > 0 && pc.every(pg => !pg.is_clinical && !pg.restored)) return false;
                  return true;
                });
                if (folderDocs.length === 0) return null;
                const folderSelected = folderDocs.filter(d => selectedDocuments.includes(d.id)).length;

                const folderGroups = folderDocs.reduce((groups, doc) => {
                  const providerName = doc.provider_name || 'Unknown Facility';
                  const normalizedKey = normalizeProviderName(providerName) || 'unknown';
                  if (!groups[normalizedKey]) groups[normalizedKey] = { displayName: providerName, docs: [] };
                  groups[normalizedKey].docs.push(doc);
                  return groups;
                }, {});

                Object.keys(folderGroups).forEach(key => {
                  folderGroups[key].docs.sort((a, b) => {
                    const numA = getPartNumber(a.title || a.file_name || '');
                    const numB = getPartNumber(b.title || b.file_name || '');
                    if (numA !== null && numB !== null) return numA - numB;
                    if (numA !== null) return -1;
                    if (numB !== null) return 1;
                    return (a.title || '').localeCompare(b.title || '');
                  });
                });

                const allFolderSelected = folderDocs.every(d => selectedDocuments.includes(d.id));

                const selectAllFolder = () => {
                  const folderIds = folderDocs.map(d => d.id);
                  if (allFolderSelected) {
                    setSelectedDocuments(prev => prev.filter(id => !folderIds.includes(id)));
                  } else {
                    setSelectedDocuments(prev => [...new Set([...prev, ...folderIds])]);
                  }
                };

                return (
                  <div key={folderName} className="border-2 border-slate-200 rounded-lg p-4">
                    <div className="flex items-center justify-between gap-3 mb-4">
                      <div className="flex items-center gap-3">
                        <Folder className="w-5 h-5 text-blue-600" />
                        <h3 className="font-semibold text-slate-900">{folderName}</h3>
                        {folderSelected > 0 && (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700">{folderSelected} selected</Badge>
                        )}
                      </div>
                      <Button
                        variant="outline" size="sm" onClick={selectAllFolder}
                        className={allFolderSelected ? 'bg-blue-50 border-blue-300 text-blue-700' : 'text-slate-600'}
                      >
                        {allFolderSelected ? <CheckSquare className="w-4 h-4 mr-1" /> : <Square className="w-4 h-4 mr-1" />}
                        {allFolderSelected ? 'Deselect All' : 'Select All'}
                      </Button>
                    </div>

                    <div className="space-y-3">
                      {Object.entries(folderGroups).sort(([a], [b]) => a.localeCompare(b)).map(([groupKey, groupData]) => {
                        const groupDocs = groupData.docs;
                        const allSelected = groupDocs.every(d => selectedDocuments.includes(d.id));

                        return (
                          <Card key={groupKey} className="border">
                            <CardHeader className="bg-slate-50 pb-3 pt-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <Button
                                    variant="outline" size="sm"
                                    onClick={() => selectGroup(groupDocs)}
                                    className={allSelected ? 'bg-blue-50 border-blue-300' : ''}
                                  >
                                    {allSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                                  </Button>
                                  <h4 className="font-medium text-sm text-slate-900">{groupData.displayName}</h4>
                                </div>
                                <Badge variant="outline" className="text-xs">
                                  {groupDocs.length} doc{groupDocs.length !== 1 ? 's' : ''}
                                </Badge>
                              </div>
                            </CardHeader>
                            <CardContent className="pt-3 space-y-2">
                              {groupDocs.map(doc => (
                                <div
                                  key={doc.id}
                                  className={`flex items-start gap-3 p-2 rounded-lg border transition-all cursor-pointer ${selectedDocuments.includes(doc.id) ? 'bg-blue-50 border-blue-300' : 'bg-white border-slate-200 hover:border-slate-300'}`}
                                  onClick={() => toggleDocumentSelection(doc.id)}
                                >
                                  <Checkbox
                                    checked={selectedDocuments.includes(doc.id)}
                                    onCheckedChange={() => toggleDocumentSelection(doc.id)}
                                    onClick={e => e.stopPropagation()}
                                    className="mt-0.5"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-slate-900 truncate">{doc.file_name || doc.title}</p>
                                    <div className="flex flex-wrap gap-2 mt-1 text-xs text-slate-500">
                                      {doc.category && (
                                        <Badge variant="outline" className={
                                          doc.category === 'medical' ? 'bg-cyan-50 text-cyan-700 border-cyan-200'
                                          : doc.category === 'legal' ? 'bg-blue-50 text-blue-700 border-blue-200'
                                          : 'bg-slate-50 text-slate-700 border-slate-200'
                                        }>{doc.category}</Badge>
                                      )}
                                      {doc.document_date && <span>  {formatVisitDate(doc.document_date)}</span>}
                                      {doc.file_size && <span>  {(doc.file_size / (1024 * 1024)).toFixed(2)} MB</span>}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {documentsLoading && (
                <div style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
                  <p>Loading documents...</p>
                </div>
              )}
              {!documentsLoading && documents.length === 0 && (
                <div className="text-center py-12 text-slate-500">
                  <FileCheck className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                  <p>No documents found</p>
                  <p className="text-sm mt-2">Upload documents first to generate summaries</p>
                </div>
              )}
            </div>

            {queueProgress && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium">Processing batch {queueProgress.current} of {queueProgress.total}...</span>
                  <span className="text-xs">{Math.round((queueProgress.current / queueProgress.total) * 100)}%</span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-1.5">
                  <div className="bg-blue-600 h-1.5 rounded-full transition-all" style={{ width: `${(queueProgress.current / queueProgress.total) * 100}%` }} />
                </div>
              </div>
            )}

            <Button
              onClick={generateSummary}
              disabled={selectedDocuments.length === 0 || generatingSummary}
              className="w-full bg-gradient-to-r from-blue-600 to-cyan-600"
            >
              {generatingSummary ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analyzing...</>
              ) : (
                <><Sparkles className="w-4 h-4 mr-2" />Generate Summary from {selectedDocuments.length || 0} Document{selectedDocuments.length !== 1 ? 's' : ''}</>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Summaries Grid */}
      {summariesLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse"><CardContent className="p-6"><div className="h-32 bg-slate-200 rounded"></div></CardContent></Card>
          ))}
        </div>
      ) : summaries.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {summaries.map((summary) => (
            <Card key={summary.aws_summary_id || summary.id} className="hover:shadow-lg transition-all duration-300 group">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-100 to-emerald-100 flex items-center justify-center">
                      <FileCheck className="w-6 h-6 text-green-600" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={
                        summary.status === 'finalized' ? 'bg-green-50 text-green-700 border-green-200'
                        : summary.status === 'reviewed' ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                      }>{summary.status}</Badge>
                      <Button
                        variant="ghost" size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => setDeleteSummary(summary)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-slate-900 mb-2">{summary.patient_name || 'Unnamed Patient'}</h3>

                    <p className="text-sm text-slate-600">{summary.visits?.length || 0} visit{summary.visits?.length !== 1 ? 's' : ''}</p>
                    {summary.document_id?.includes(',') && (
                      <Badge variant="outline" className="mt-2 bg-purple-50 text-purple-700 border-purple-200">
                        <Users className="w-3 h-3 mr-1" />Combined
                      </Badge>
                    )}

                    {/* Verification banner */}
                    {(() => {
                      const vr = summary.verification_result;
                      if (!vr) {
                        const ageMs = Date.now() - new Date(summary.created_at || summary.created_date || 0).getTime();
                        if (ageMs < 5 * 60 * 1000) return (
                          <div className="flex items-center gap-1.5 mt-2 text-xs text-amber-600">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span>Verifying visits…</span>
                          </div>
                        );
                        return null;
                      }
                      if (vr.status === 'verified') return (
                        <div className="flex items-center gap-1.5 mt-2 text-xs text-green-600">
                          <ShieldCheck className="w-3 h-3" />
                          <span>Visit index verified</span>
                        </div>
                      );
                      if (vr.status === 'verified_with_corrections') return (
                        <div className="mt-2 text-xs">
                          <div className="flex items-center gap-1.5 text-amber-600">
                            <ShieldAlert className="w-3 h-3 flex-shrink-0" />
                            <span className="font-medium">
                              {vr.date_corrections?.length > 0 && `${vr.date_corrections.length} date${vr.date_corrections.length > 1 ? 's' : ''} corrected`}
                              {vr.date_corrections?.length > 0 && vr.missing_visits?.length > 0 && ' · '}
                              {vr.missing_visits?.length > 0 && `${vr.missing_visits.length} visit${vr.missing_visits.length > 1 ? 's' : ''} flagged`}
                            </span>
                          </div>
                          {vr.date_corrections?.map((c: any, i: number) => (
                            <div key={i} className="ml-4 mt-0.5 text-slate-500">
                              {c.provider}: {c.original_date} → {c.corrected_date}
                            </div>
                          ))}
                          {vr.missing_visits?.map((mv: any, i: number) => (
                            <div key={i} className="ml-4 mt-0.5 text-slate-400">
                              ⚠ {mv.date} {mv.provider} not in summary
                            </div>
                          ))}
                        </div>
                      );
                      if (vr.status === 'verify_failed') return (
                        <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-400">
                          <ShieldAlert className="w-3 h-3" />
                          <span>Verify unavailable</span>
                        </div>
                      );
                      return null;
                    })()}
                  </div>

                  <div className="flex gap-1.5 justify-center">
                    <Button variant="outline" size="sm" className="flex-1" title="View" onClick={() => setViewingSummary(summary)}>
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1" title="Edit" onClick={() => { setEditing(true); setEditingSummary(normalizeSummaryForEdit(summary)); }}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1" title="Export to Word" onClick={() => exportToWord(summary)}>
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline" size="sm" className="flex-1" title="Remove duplicate visits"
                      onClick={() => deduplicateMutation.mutate(summary)}
                      disabled={deduplicateMutation.isPending}
                    >
                      <Filter className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="pt-3 border-t border-slate-200 text-xs text-slate-500">
                    Created {new Date(summary.created_at || summary.created_date).toLocaleDateString()}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="shadow-md">
          <CardContent className="p-12 text-center">
            <FileCheck className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-900 text-lg font-semibold">No summaries yet</p>
            <p className="text-slate-500 text-sm mt-2">Generate your first medical summary from one or more documents</p>
          </CardContent>
        </Card>
      )}

      {/* 閳光偓閳光偓 Visit Index: Document Selection Dialog 閳光偓閳光偓 */}
      <Dialog open={showVisitIndexDialog} onOpenChange={setShowVisitIndexDialog}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Build Visit Index</DialogTitle>
            <DialogDescription>Select documents to extract a fast chronological list of all visit dates, providers, and facilities.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            {groupedDocuments.filter(doc => {
                if (doc._all_rejected) return false;
                const pc = doc.page_classifications || [];
                if (pc.length > 0 && pc.every(pg => !pg.is_clinical && !pg.restored)) return false;
                return true;
              }).map(doc => (
              <div key={doc.id} className="flex items-center gap-3 p-2 rounded hover:bg-gray-50 cursor-pointer"
                onClick={() => setVisitIndexDocsSelected(prev =>
                  prev.includes(doc.id) ? prev.filter(i => i !== doc.id) : [...prev, doc.id]
                )}>
                <input type="checkbox" readOnly checked={visitIndexDocsSelected.includes(doc.id)} className="w-4 h-4" />
                <span className="text-sm">{doc.file_name || doc.title || doc.id}</span>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVisitIndexDialog(false)}>Cancel</Button>
            <Button
              disabled={visitIndexDocsSelected.length === 0}
              onClick={generateVisitIndex}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              <List className="w-4 h-4 mr-2" />
              Build Index ({visitIndexDocsSelected.length} doc{visitIndexDocsSelected.length !== 1 ? 's' : ''})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 閳光偓閳光偓 Visit Index Viewer 閳光偓閳光偓 */}
      {showVisitIndexViewer && visitIndexData && (
        <Dialog open={showVisitIndexViewer} onOpenChange={setShowVisitIndexViewer}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <List className="w-5 h-5 text-blue-600" />
                Visit Index 閳�  {visitIndexData.patient_name || 'Patient'}
              </DialogTitle>
              <DialogDescription>{visitIndexData.visits.length} encounters found</DialogDescription>
            </DialogHeader>

            {/* Controls */}
            <div className="flex flex-wrap items-center gap-2 py-2 border-b">
              <Button size="sm" variant={visitIndexView === 'chrono' ? 'default' : 'outline'} onClick={() => setVisitIndexView('chrono')}>Chronological</Button>
              <Button size="sm" variant={visitIndexView === 'grouped' ? 'default' : 'outline'} onClick={() => setVisitIndexView('grouped')}>By Provider</Button>
              <div className="flex-1" />
              {summaries.length > 0 && (
                <select
                  className="text-sm border rounded px-2 py-1"
                  defaultValue=""
                  onChange={e => {
                    const s = summaries.find(s => (s.aws_summary_id || s.id) === e.target.value);
                    if (s) crossCheckVisitIndex(s);
                  }}
                >
                  <option value="">Check Against Summary...</option>
                  {summaries.map(s => (
                    <option key={s.aws_summary_id || s.id} value={s.aws_summary_id || s.id}>
                      {s.patient_name || s.id} ({(s.visits || []).length} visits)
                    </option>
                  ))}
                </select>
              )}
              <Button size="sm" variant="outline" onClick={saveVisitIndex}>
                <Save className="w-4 h-4 mr-1" />Save to Library
              </Button>
              <Button size="sm" variant="outline" onClick={exportVisitIndex}>
                <FileDown className="w-4 h-4 mr-1" />Export .docx
              </Button>
            </div>

            {/* Cross-check results */}
            {visitIndexCrossCheck && (
              <div className="grid grid-cols-2 gap-3 my-2">
                <div className="bg-red-50 border border-red-200 rounded p-3">
                  <p className="text-xs font-semibold text-red-700 mb-1">In Index, Missing from Summary ({visitIndexCrossCheck.missing.length})</p>
                  {visitIndexCrossCheck.missing.length === 0
                    ? <p className="text-xs text-red-500">None -- all index dates are in the summary</p>
                    : visitIndexCrossCheck.missing.map(d => {
                        const entry = visitIndexData.visits.find(v => v.date === d);
                        const label = entry ? `${formatVisitDate(d)} 閳�  ${entry.provider || ''}` : formatVisitDate(d);
                        return <p key={d} className="text-xs text-red-600 font-mono">{label}</p>;
                      })
                  }
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded p-3">
                  <p className="text-xs font-semibold text-amber-700 mb-1">In Summary, Not in Index ({visitIndexCrossCheck.extra.length})</p>
                  {visitIndexCrossCheck.extra.length === 0
                    ? <p className="text-xs text-amber-500">None -- all summary dates are in the index</p>
                    : visitIndexCrossCheck.extra.map(d => {
                        const entry = (summaries.find(s => (s.visits || []).some(v => v.visit_date === d))?.visits || []).find(v => v.visit_date === d);
                        const label = entry ? `${formatVisitDate(d)} 閳�  ${entry.rendering_provider || ''}` : formatVisitDate(d);
                        return <p key={d} className="text-xs text-amber-600 font-mono">{label}</p>;
                      })
                  }
                </div>
              </div>
            )}

            {/* Visit table */}
            <div className="overflow-auto">
              {visitIndexView === 'chrono' ? (
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-left">
                      <th className="px-3 py-2 font-semibold text-slate-700 w-28">Date</th>
                      <th className="px-3 py-2 font-semibold text-slate-700">Provider</th>
                      <th className="px-3 py-2 font-semibold text-slate-700">Facility</th>
                      <th className="px-3 py-2 font-semibold text-slate-700 w-32">Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visitIndexData.visits.map((v, i) => {
                      const d = v.date || null; // use string directly -- no new Date() to avoid UTC shift
                      const dateStr = d ? formatVisitDate(d) : v.date || '';
                      return (
                        <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                          <td className="px-3 py-1.5 font-mono text-xs">{dateStr}</td>
                          <td className="px-3 py-1.5">{v.provider || ''}</td>
                          <td className="px-3 py-1.5 text-slate-600">{v.facility || ''}</td>
                          <td className="px-3 py-1.5 text-slate-500 text-xs">{v.visit_type || ''}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                (() => {
                  const groups = {};
                  visitIndexData.visits.forEach(v => {
                    const key = v.provider || 'Unknown Provider';
                    if (!groups[key]) groups[key] = [];
                    groups[key].push(v);
                  });
                  return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b)).map(([provider, pvVisits]) => (
                    <div key={provider} className="mb-4">
                      <div className="bg-slate-700 text-white px-3 py-1.5 text-sm font-semibold rounded-t flex items-center justify-between">
                        <span>{provider}</span>
                        <span className="text-slate-300 font-normal text-xs">{pvVisits.length} visit{pvVisits.length !== 1 ? 's' : ''}</span>
                      </div>
                      <table className="w-full text-sm border-collapse border border-slate-200 rounded-b overflow-hidden">
                        <tbody>
                          {pvVisits.map((v, i) => {
                            const d = v.date || null; // use string directly -- no new Date() to avoid UTC shift
                            const dateStr = d ? formatVisitDate(d) : v.date || '';
                            return (
                              <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                                <td className="px-3 py-1.5 font-mono text-xs w-28">{dateStr}</td>
                                <td className="px-3 py-1.5 text-slate-600">{v.facility || ''}</td>
                                <td className="px-3 py-1.5 text-slate-500 text-xs w-32">{v.visit_type || ''}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ));
                })()
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => { setShowVisitIndexViewer(false); setVisitIndexCrossCheck(null); }}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* View Summary Dialog */}
      {viewingSummary && (
        <SummaryViewer
          summary={viewingSummary}
          onClose={() => setViewingSummary(null)}
          onEdit={() => { setEditing(true); setEditingSummary(normalizeSummaryForEdit(viewingSummary)); setViewingSummary(null); }}
          onExport={() => exportToWord(viewingSummary)}
        />
      )}

      {/* Edit Summary Dialog */}
      {editingSummary && (
        <MedicalSummaryForm
          summary={editingSummary}
          onClose={() => { setEditing(false); setEditingSummary(null); }}
          onSave={() => { setEditing(false); queryClient.invalidateQueries({ queryKey: ["aws-summaries"] }); setEditingSummary(null); }}
        />
      )}

      {/* Combine Summaries Dialog */}
      <Dialog open={showCombineDialog} onOpenChange={setShowCombineDialog}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Combine Summaries</DialogTitle>
            <DialogDescription>Select 2 or more summaries to merge their visits into a single combined summary.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            {summaries.map(s => {
              const sId = s.aws_summary_id || s.id;
              const isSelected = selectedSummariesToCombine.includes(sId);
              return (
                <div
                  key={sId}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${isSelected ? 'bg-blue-50 border-blue-300' : 'bg-white border-slate-200 hover:border-slate-300'}`}
                  onClick={() => setSelectedSummariesToCombine(prev =>
                    prev.includes(sId) ? prev.filter(id => id !== sId) : [...prev, sId]
                  )}
                >
                  <Checkbox checked={isSelected} onCheckedChange={() => {}} className="pointer-events-none" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-slate-900">{s.patient_name || 'Unnamed Patient'}</p>
                    <p className="text-xs text-slate-500">
                      {s.visits?.length || 0} visits   Created {new Date(s.created_at || s.created_date).toLocaleDateString()}
                      {s.case_number && `   Case: ${s.case_number}`}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={() => setShowCombineDialog(false)}>Cancel</Button>
            <Button
              disabled={selectedSummariesToCombine.length < 2}
              onClick={combineSummaries}
              className="bg-gradient-to-r from-purple-600 to-indigo-600"
            >
              <Merge className="w-4 h-4 mr-2" />
              Combine {selectedSummariesToCombine.length} Summaries
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete All Confirmation */}
      <AlertDialog open={deleteAllDialog} onOpenChange={setDeleteAllDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete All Summaries</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete all {summaries.length} medical summaries? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteAllMutation.mutate()}
              disabled={deleteAllMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteAllMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Deleting...</> : `Delete All ${summaries.length} Summaries`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteSummary} onOpenChange={() => setDeleteSummary(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Medical Summary</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this medical summary for {deleteSummary?.patient_name || 'this patient'}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(deleteSummary.aws_summary_id || deleteSummary.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Summary
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

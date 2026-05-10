/* eslint-disable @typescript-eslint/no-unused-vars */
// MedicalSummaries.tsx Ã¢â‚¬â€ chartreview-native-frontend
// Ported: 2026-05-03 Ã¢â‚¬â€ CRA/TypeScript port of MedicalSummaries v56
// Fixes: env vars, no base44 imports, all callbacks typed, opts:any,
//        Array.from for Set spreads, Object.entries typed, MedicalSummaryForm/SummaryViewer inlined as stubs

import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import MedicalSummaryForm from "./summaries/MedicalSummaryForm";
import SummaryViewer from "./summaries/SummaryViewer";

// Ã¢â€â‚¬Ã¢â€â‚¬ Env vars (CRA) Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
const AWS_API_URL = process.env.REACT_APP_AWS_API_URL || "https://1h4kpspbs6.execute-api.us-east-1.amazonaws.com/prod";
const ORG_ID      = process.env.REACT_APP_ORG_ID      || "69ceb1ab037acdd4467b31c3";
const API_KEY     = process.env.REACT_APP_AWS_API_KEY  || "";

// Ã¢â€â‚¬Ã¢â€â‚¬ Date formatter Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
const formatVisitDate = (dateStr: string) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-').map(Number);
  if (parts.length === 3 && !isNaN(parts[0])) {
    return `${String(parts[1]).padStart(2,'0')}/${String(parts[2]).padStart(2,'0')}/${parts[0]}`;
  }
  return dateStr;
};

// Ã¢â€â‚¬Ã¢â€â‚¬ Inlined UI primitives Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
function Button({ children, onClick, disabled, className = "", variant = "default", size = "default", title }: {
  children: React.ReactNode; onClick?: () => void; disabled?: boolean;
  className?: string; variant?: string; size?: string; title?: string;
}) {
  const base = "inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none disabled:opacity-50 disabled:pointer-events-none";
  const variants: any = {
    default: "bg-blue-600 text-white hover:bg-blue-700",
    outline: "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
    ghost: "bg-transparent hover:bg-slate-100 text-slate-700",
    destructive: "bg-red-600 text-white hover:bg-red-700",
  };
  const sizes: any = { default: "px-4 py-2 text-sm", sm: "px-3 py-1.5 text-xs", icon: "p-1.5" };
  return (
    <button title={title} onClick={onClick} disabled={disabled}
      className={`${base} ${variants[variant] || variants.default} ${sizes[size] || sizes.default} ${className}`}>
      {children}
    </button>
  );
}

function Badge({ children, className = "", variant = "default" }: {
  children: React.ReactNode; className?: string; variant?: string;
}) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
      variant === 'outline' ? 'bg-white border-slate-300 text-slate-700' : 'bg-slate-100 border-transparent text-slate-700'
    } ${className}`}>{children}</span>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-white rounded-xl border border-slate-200 shadow-sm ${className}`}>{children}</div>;
}
function CardContent({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`p-6 ${className}`}>{children}</div>;
}
function CardHeader({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`px-6 py-4 border-b border-slate-100 ${className}`}>{children}</div>;
}

function Dialog({ open, onOpenChange, children }: { open: boolean; onOpenChange: (v: boolean) => void; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={() => onOpenChange(false)} />
      <div className="relative z-10 bg-white rounded-xl shadow-xl w-full mx-4" style={{ maxWidth: 700 }}>
        {children}
      </div>
    </div>
  );
}
function DialogContent({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`p-6 overflow-y-auto ${className}`} style={{ maxHeight: '85vh' }}>{children}</div>;
}
function DialogHeader({ children }: { children: React.ReactNode }) {
  return <div className="mb-4">{children}</div>;
}
function DialogFooter({ children }: { children: React.ReactNode }) {
  return <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 mt-4">{children}</div>;
}
function DialogTitle({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <h2 className={`text-lg font-semibold text-slate-900 ${className}`}>{children}</h2>;
}
function DialogDescription({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-slate-500 mt-1">{children}</p>;
}

function AlertDialog({ open, onOpenChange, children }: { open: boolean; onOpenChange: (v: boolean) => void; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={() => onOpenChange(false)} />
      <div className="relative z-10 bg-white rounded-xl shadow-xl w-full mx-4 max-w-md p-6">{children}</div>
    </div>
  );
}
function AlertDialogContent({ children }: { children: React.ReactNode }) { return <>{children}</>; }
function AlertDialogHeader({ children }: { children: React.ReactNode }) { return <div className="mb-4">{children}</div>; }
function AlertDialogFooter({ children }: { children: React.ReactNode }) { return <div className="flex justify-end gap-2 mt-4">{children}</div>; }
function AlertDialogTitle({ children }: { children: React.ReactNode }) { return <h2 className="text-lg font-semibold text-slate-900">{children}</h2>; }
function AlertDialogDescription({ children }: { children: React.ReactNode }) { return <p className="text-sm text-slate-500 mt-1">{children}</p>; }
function AlertDialogAction({ children, onClick, disabled, className = "" }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; className?: string }) {
  return <button onClick={onClick} disabled={disabled} className={`px-4 py-2 rounded-md text-sm font-medium text-white ${className}`}>{children}</button>;
}
function AlertDialogCancel({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return <button onClick={onClick} className="px-4 py-2 rounded-md text-sm font-medium border border-slate-300 text-slate-700 hover:bg-slate-50">{children}</button>;
}

function Alert({ children, variant = "default", className = "" }: { children: React.ReactNode; variant?: string; className?: string }) {
  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border ${
      variant === 'destructive' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-blue-50 border-blue-200 text-blue-800'
    } ${className}`}>{children}</div>
  );
}
function AlertDescription({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <span className={`text-sm ${className}`}>{children}</span>;
}
function Checkbox({ checked, onCheckedChange, onClick, className = "" }: {
  checked: boolean; onCheckedChange?: (v: boolean) => void; onClick?: (e: React.MouseEvent) => void; className?: string;
}) {
  return (
    <input type="checkbox" checked={checked} readOnly
      onChange={() => onCheckedChange?.(!checked)}
      onClick={onClick}
      className={`w-4 h-4 rounded accent-blue-600 cursor-pointer ${className}`}
    />
  );
}

// Ã¢â€â‚¬Ã¢â€â‚¬ Icon stubs Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
const FileCheck = ({ className = "" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
  </svg>
);
const Plus = ({ className = "" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);
const Download = ({ className = "" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
);
const Edit = ({ className = "" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);
const Eye = ({ className = "" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);
const Sparkles = ({ className = "" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3l1.5 3L10 7.5 6.5 9 5 12l-1.5-3L0 7.5 3.5 6 5 3zM19 9l1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2zM13 1l1.5 3L18 5.5 14.5 7 13 10l-1.5-3L8 5.5 11.5 4 13 1z" />
  </svg>
);
const Trash2 = ({ className = "" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);
const CheckSquare = ({ className = "" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
  </svg>
);
const Square = ({ className = "" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" strokeWidth={2} />
  </svg>
);
const Users = ({ className = "" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
  </svg>
);
const AlertCircle = ({ className = "" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const Folder = ({ className = "" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
  </svg>
);
const Merge = ({ className = "" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4M4 17H2m0 0l4 4m-4-4l4-4" />
  </svg>
);
const Filter = ({ className = "" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h18M7 12h10M10 20h4" />
  </svg>
);
const List = ({ className = "" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7m2 0h10M9 12H7m2 0h10M9 19H7m2 0h10M5 5h.01M5 12h.01M5 19h.01" />
  </svg>
);
const FileDown = ({ className = "" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 11v4m0 0l-2-2m2 2l2-2M13 2v6h6" />
  </svg>
);
const Save = ({ className = "" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
  </svg>
);



// Ã¢â€â‚¬Ã¢â€â‚¬ Module-level generation store Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
const genStore: any = {
  state: {
    running: false, statusMsg: "", completionMsg: "", error: null,
    elapsedSeconds: 0, timerHandle: null,
  },
  listeners: new Set<(s: any) => void>(),
  notify() { this.listeners.forEach((fn: any) => fn({ ...this.state })); },
  set(patch: any) { Object.assign(this.state, patch); this.notify(); },
  subscribe(fn: (s: any) => void) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  },
};

// Ã¢â€â‚¬Ã¢â€â‚¬ Main component Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
export default function MedicalSummaries({ onNavigate, idToken }: { onNavigate?: (page: string) => void; idToken?: string }) {
  const queryClient = useQueryClient();

  // Always read the freshest token from localStorage (Cognito SDK auto-refreshes it).
  // Falls back to the prop passed at login time if localStorage is unavailable.
  const getFreshToken = (): string => {
    try {
      const key = Object.keys(localStorage).find(k => k.includes('.idToken'));
      if (key) return localStorage.getItem(key) || idToken || '';
    } catch (e) { /* ignore */ }
    return idToken || '';
  };

  const awsProxy = async (path: string, method = "GET", data?: any): Promise<any> => {
    const url = `${AWS_API_URL}${path}`;
    const opts: any = {
      method,
      "x-api-key": API_KEY,
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${getFreshToken()}`, "x-org-id": ORG_ID },
    };
    if (data !== undefined) opts.body = JSON.stringify(data);
    const res = await fetch(url, opts);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || `awsProxy ${method} ${path} failed: ${res.status}`);
    return json;
  };

  // Ã¢â€â‚¬Ã¢â€â‚¬ State Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [caseNumber, setCaseNumber] = useState<string>('');
  const [viewingSummary, setViewingSummary] = useState<any>(null);
  const [editingSummary, setEditingSummary] = useState<any>(null);
  const [deleteSummary, setDeleteSummary] = useState<any>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [showCombineDialog, setShowCombineDialog] = useState(false);
  const [selectedSummariesToCombine, setSelectedSummariesToCombine] = useState<string[]>([]);
  const [_editing, _setEditing] = useState(false);
  const setEditing = (v: boolean) => _setEditing(v);
  const [deleteAllDialog, setDeleteAllDialog] = useState(false);
  const [queueProgress, setQueueProgress] = useState<any>(null);
  const [showVisitIndexDialog, setShowVisitIndexDialog] = useState(false);
  const [visitIndexRunning, setVisitIndexRunning] = useState(false);
  const [visitIndexData, setVisitIndexData] = useState<any>(null);
  const [visitIndexView, setVisitIndexView] = useState<'chrono' | 'grouped'>('chrono');
  const [showVisitIndexViewer, setShowVisitIndexViewer] = useState(false);
  const [visitIndexCrossCheck, setVisitIndexCrossCheck] = useState<any>(null);
  const [visitIndexDocsSelected, setVisitIndexDocsSelected] = useState<string[]>([]);

  // Generation state from module-level store
  const [genState, setGenState] = useState<any>({ ...genStore.state });
  useEffect(() => {
    setGenState({ ...genStore.state });
    return genStore.subscribe(setGenState);
  }, []);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const generatingSummary = genState.running;
  const statusMsg = genState.statusMsg;
  const completionMsg = genState.completionMsg;
  const error = genState.error;
  const elapsedSeconds = genState.elapsedSeconds;
  const setError = (msg: string | null) => genStore.set({ error: msg });

  // Ã¢â€â‚¬Ã¢â€â‚¬ Queries Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  const { data: documents = [], isLoading: documentsLoading } = useQuery({
    queryKey: ["aws-documents"],
    queryFn: async () => {
      const res = await fetch(`${AWS_API_URL}/documents`, {
        method: "GET",
        "x-api-key": API_KEY,
        headers: { "Authorization": `Bearer ${getFreshToken()}`, "x-org-id": ORG_ID },
      });
      if (!res.ok) throw new Error("Failed to fetch documents");
      const data = await res.json();
      const list: any[] = Array.isArray(data) ? data
        : Array.isArray(data?.items) ? data.items
        : Array.isArray(data?.documents) ? data.documents : [];
      const validDocs = list.filter((d: any) => !(d.original_document_id === null && d.status === "pending_upload"));
      return validDocs.map((d: any) => ({ ...d, id: d.aws_document_id || d.id }));
    },
    staleTime: 30000, retry: 1,
  });

  const { data: summariesRaw, isLoading: summariesLoading } = useQuery({
    queryKey: ["aws-summaries"],
    queryFn: async () => {
      const res = await awsProxy("/summaries", "GET");
      if (Array.isArray(res)) return res;
      if (Array.isArray(res?.items)) return res.items;
      if (Array.isArray(res?.summaries)) return res.summaries;
      return [];
    },
    refetchOnWindowFocus: false,
  });
  const summaries: any[] = Array.isArray(summariesRaw) ? summariesRaw : [];

  // Ã¢â€â‚¬Ã¢â€â‚¬ Mutations Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  const deleteMutation = useMutation({
    mutationFn: (id: any) => awsProxy(`/summaries/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aws-summaries"] });
      setDeleteSummary(null);
    },
  });

  const deleteAllMutation = useMutation({
    mutationFn: async () => {
      await Promise.all((Array.isArray(summaries) ? summaries : []).map((s: any) =>
        awsProxy(`/summaries/${s.aws_summary_id || s.id}`, "DELETE")
      ));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aws-summaries"] });
      setDeleteAllDialog(false);
    },
  });

  const deduplicateMutation = useMutation({
    mutationFn: async (summary: any) => {
      const deduped = deduplicateVisits(summary.visits);
      const removed = (summary.visits || []).length - deduped.length;
      await awsProxy(`/summaries/${summary.aws_summary_id || summary.id}`, "PUT", { visits: deduped });
      return { removed };
    },
    onSuccess: (result: any, summary: any) => {
      queryClient.invalidateQueries({ queryKey: ["aws-summaries"] });
      alert(result.removed > 0
        ? `Merged/removed ${result.removed} duplicate visit(s) from ${summary.patient_name || 'this summary'}.`
        : `No duplicate visits found in ${summary.patient_name || 'this summary'}.`
      );
    },
  });

  // Ã¢â€â‚¬Ã¢â€â‚¬ Helpers Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  const normalizePTSetting = (setting: string) => {
    if (!setting) return setting;
    let s = setting.trim();
    s = s.replace(/\bPhys\.?\s*Ther\.?\b/gi, 'Physical Therapy');
    s = s.replace(/\bOcc\.?\s*Ther\.?\b/gi, 'Occupational Therapy');
    s = s.replace(/\s+PT$/i, ' Physical Therapy');
    s = s.replace(/\s+OT$/i, ' Occupational Therapy');
    s = s.replace(/\s+/g, ' ').trim();
    return s;
  };

  const normalizeProviderForDedup = (name: string) => {
    return (name || '')
      .toLowerCase()
      .replace(/,?\s*(m\.?d\.?|d\.?o\.?|ph\.?d\.?|np|pa|pt|dpt|ot|rn|lcsw|psyd|esq\.?)/gi, '')
      .replace(/[a-z]\.\s*/g, '')
      .replace(/[^a-z\s]/g, '')
      .replace(/\s+/g, ' ').trim();
  };

  const normalizeSummaryForEdit = (s: any) => {
    if (!s) return s;
    let visits = s.visits;
    if (!Array.isArray(visits)) {
      if (typeof visits === 'string') { try { visits = JSON.parse(visits); } catch { visits = []; } }
      else { visits = []; }
    }
    return { ...s, visits };
  };

  const deduplicateVisits = (visits: any[]) => {
    const visitList = visits || [];
    const exactKeys = new Set<string>();
    return visitList.filter((visit: any) => {
      const dateKey = (visit.visit_date || '').trim().toLowerCase();
      const providerKey = normalizeProviderForDedup(visit.rendering_provider);
      const settingKey = normalizePTSetting(visit.practice_setting || '').trim().toLowerCase();
      if (!dateKey && !providerKey) return true;
      const key = `${dateKey}|${providerKey}|${settingKey}`;
      if (exactKeys.has(key)) return false;
      exactKeys.add(key);
      return true;
    });
  };

  const normalizeProviderName = (name: string) => {
    return (name || '').trim().toLowerCase()
      .replace(/\s+and\s+rehabilitation\b/gi, '')
      .replace(/\s+rehabilitation\b/gi, '')
      .replace(/\s+center\b/gi, '')
      .replace(/\s+clinic\b/gi, '')
      .replace(/\s+medical\s+group\b/gi, '')
      .replace(/\s+associates\b/gi, '')
      .replace(/\s+hospital\b/gi, '')
      .replace(/\s+health\s*care\b/gi, '')
      .replace(/[^a-z0-9]/g, '').trim();
  };

  const getPartNumber = (title: string) => {
    const stem = title.replace(/\.[^.]+$/, '');
    const patterns = [/part[_\-\s]*(\d+)/i, /[_\-\s](\d+)$/, /\((\d+)\)$/, /(\d+)$/];
    for (const p of patterns) {
      const m = stem.match(p);
      if (m) return parseInt(m[1], 10);
    }
    return null;
  };

  const toggleDocumentSelection = (id: string) => {
    setSelectedDocuments((prev: string[]) =>
      prev.includes(id) ? prev.filter((d: string) => d !== id) : [...prev, id]
    );
  };

  // Ã¢â€â‚¬Ã¢â€â‚¬ Grouped documents (same logic as Library) Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  const groupedDocuments: any[] = (() => {
    const shellMap: any = {};
    const grouped: any = {};
    const singles: any[] = [];
    for (const doc of documents as any[]) {
      const isShell = !doc.parent_filename && !doc.original_document_id;
      if (isShell) { shellMap[doc.id] = doc; }
      else if (doc.original_document_id) {
        if (!grouped[doc.original_document_id]) grouped[doc.original_document_id] = [];
        grouped[doc.original_document_id].push(doc);
      } else { singles.push(doc); }
    }
    const merged = Object.entries(grouped).map(([shellId, parts]: [string, any[]]) => {
      parts.sort((a: any, b: any) => (a.part_index ?? 0) - (b.part_index ?? 0));
      const shell = shellMap[shellId];
      const displayTitle = shell?.file_name || shell?.title || parts[0].parent_filename || parts[0].title;
      const _allRejected = parts.length > 0 && parts.every((p: any) => {
        const pc = p.page_classifications || [];
        return pc.length > 0 && pc.every((pg: any) => !pg.is_clinical && !pg.restored);
      });
      return {
        ...parts[0], id: shellId, title: displayTitle, file_name: displayTitle,
        folder: shell?.folder || parts[0].folder,
        created_date: shell?.created_date || shell?.created_at || parts[0].created_date,
        _is_group: true, _part_ids: parts.map((p: any) => p.id), _parts: parts, _all_rejected: _allRejected,
      };
    });
    const groupedShellIds = new Set(Object.keys(grouped));
    Object.entries(shellMap).forEach(([shellId, shell]: [string, any]) => {
      if (!groupedShellIds.has(shellId)) singles.push(shell);
    });
    return [...singles, ...merged];
  })();

  const documentsByFolder: any = groupedDocuments.reduce((acc: any, doc: any) => {
    const folderKey = doc.folder || 'Unfiled';
    if (!acc[folderKey]) acc[folderKey] = [];
    acc[folderKey].push(doc);
    return acc;
  }, {});

  // Ã¢â€â‚¬Ã¢â€â‚¬ Generate summary Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

  // ── LLM extraction prompt (full production version matching v5) ──────────
  const buildPrompt = (rawChunkText: string, docCount: number, chunkLabel: string = '', knownVisitsChecklist: any[] = [], skipPages: number[] = []): string => {
    const chunkText = String(rawChunkText || '').replace(/`/g, "'").split('${').join('(');
    const skipSection = skipPages.length > 0
      ? 'SKIP PAGES: The following page numbers contain non-clinical content -- do NOT extract visits from pages: ' + skipPages.join(', ') + '.\n'
      : '';
    const docSection = chunkText ? ('DOCUMENT TEXT' + chunkLabel + ':\n' + chunkText + '\n') : '';
    const checklistSection = knownVisitsChecklist.length > 0
      ? '\n\nKNOWN VISIT CHECKLIST (pre-pass):\nThe following clinical encounters are known to exist. Scan carefully for each:\n'
        + knownVisitsChecklist.map((v: any) => '- ' + v.date + ' | ' + v.provider + ' | ' + v.facility + ' | ' + v.visit_type).join('\n')
        + '\n\nIf a listed visit is NOT found in the current documents, omit it -- it may be in a different batch.'
      : '';
    return 'You are a medical-legal document analyst. Your job is to extract EVERY clinical encounter from this document including but not limited to:\n'
      + '- Emergency Room (ER) visits\n'
      + '- Urgent Care visits\n'
      + '- Private or group physician office visits (orthopedic, neurology, pain management, primary care, etc.)\n'
      + '- Surgical visits and operative reports\n'
      + '- Radiology center visits (MRI, CT, X-ray, ultrasound reports)\n'
      + '- Physical Therapy / Occupational Therapy sessions\n'
      + '- Chiropractic visits\n'
      + '- Ambulance / EMS reports\n'
      + "- C-4 Workers' Compensation forms\n"
      + '- IME / Expert reports / Chart reviews\n'
      + '- Hospital admissions and discharge summaries\n'
      + '- Any other clinical or medical-legal encounter\n\n'
      + skipSection
      + 'DO NOT skip any encounter type. Every date with a provider interaction is a separate entry.\n\n'
      + docSection
      + 'DOCUMENT TYPE HANDLING:\n\n'
      + 'A) OFFICE VISIT / CLINICAL NOTES: Extract each visit as a separate entry. CRITICAL: Always extract the actual practice setting/facility name. NEVER label as simply "Office Visit" -- use the specific facility name from the document header, letterhead, or provider section.\n\n'
      + 'B) EXPERT MEDICAL REPORTS / IME / CHART REVIEWS / RADIOLOGY: Use the EXACT document type as labeled. Examples: "Independent Medical Examination", "Consultation Report", "Chart Review", "Narrative Report", "Agreed Medical Examination", "Qualified Medical Evaluation". For radiology: use the imaging facility name if present.\n\n'
      + 'C) POLICE REPORTS: practice_setting: "Police Report". Extract incident narrative, officer observations, conclusions.\n\n'
      + 'D) AMBULANCE / EMS REPORTS: practice_setting: "Ambulance / EMS Report". Extract scene narrative, vitals, treatment administered.\n\n'
      + "E) C-4 FORMS: STRICT IDENTIFICATION -- only label as C-4 if the actual WCB Form C-4 text is physically present AND the date is at or near the earliest date in the document set. ONE C-4 per case. practice_setting: \"C-4 Workers' Compensation Report\".\n\n"
      + 'CRITICAL DATE ACCURACY:\n'
      + '- visit_date MUST be the DATE OF SERVICE -- NOT injury date, NOT report date\n'
      + '- For ER visits: service date is typically ONE DAY AFTER injury date for overnight incidents\n'
      + '- The visit_date appears in the DOCUMENT HEADER, not in the HPI narrative\n'
      + '- "Date of Injury" mentioned in HPI is NEVER the visit_date\n\n'
      + 'For EACH entry extract:\n'
      + '1. visit_date (YYYY-MM-DD)\n'
      + '2. rendering_provider (doctor name only)\n'
      + '3. practice_setting (specific facility name)\n'
      + '4. chief_complaint (brief visit purpose)\n'
      + '5. hpi_summary (3-5 sentences: key symptoms, pain scale, mechanism, progression)\n'
      + '6. physical_exam_findings (key pertinent positives only, 3-5 findings max)\n'
      + '7. imaging_findings (ONLY if performed THIS visit)\n'
      + '8. lab_findings (ONLY if performed THIS visit)\n'
      + '9. impression_diagnosis (with ICD-10 codes if provided)\n'
      + '10. treatment_plan (2-4 key points: interventions, restrictions, follow-up)\n\n'
      + 'CRITICAL EXTRACTION RULES:\n'
      + '(1) Extract EVERY clinical encounter -- do NOT skip any.\n'
      + '(2) For every non-PT visit, MUST populate hpi_summary, impression_diagnosis, treatment_plan if info exists.\n'
      + '(3) NEVER return a visit with all content fields empty unless it is truly just a C-4 form.\n'
      + '(4) NEVER hallucinate -- only use information explicitly in the text.\n'
      + '(5) Every field must be a plain text string. NEVER return null, arrays, or objects for text fields.\n'
      + '(6) If information is truly not available, return "".\n'
      + '(7) icd10_codes must always be an array of strings (can be []).\n'
      + '(8) PT/OT: Extract EVERY individual session as its own separate record. Each visit date = one record.\n'
      + '(9) For PT visits: practice_setting should be the full facility name.\n\n'
      + 'Return ALL entries in the visits array. Also extract: patient_name, case_number.'
      + checklistSection;
  };

  // ── Visit Index prompt ───────────────────────────────────────────────────
  const buildVisitIndexPrompt = (): string => {
    return 'You are reviewing medical-legal documents. Your ONLY task is to extract a complete list of every clinical encounter date, provider name, and facility/location.\n\n'
      + 'For each clinical encounter found, extract:\n'
      + '1. date - the date of service (YYYY-MM-DD format). PRIMARY SOURCE: the document header or note title. NEVER use the injury date or any date mentioned inside the HPI narrative.\n'
      + '2. provider - the treating provider name and credentials (e.g. "Arthur J. Taylor, MD")\n'
      + '3. facility - the facility or practice name (e.g. "Nevada Orthopedic & Spine Center")\n'
      + '4. visit_type - a brief label: "Office Visit", "ER Visit", "Surgery", "Physical Therapy", "Radiology", "C-4 Form", "IME", "Chiropractic", etc.\n\n'
      + 'RULES:\n'
      + '- Include EVERY encounter -- office visits, ER, surgery, PT/OT, radiology, C-4 forms, IMEs, ambulance, etc.\n'
      + '- Each unique date + provider combination is a separate entry.\n'
      + '- Do NOT include administrative documents.\n'
      + '- CRITICAL: The HPI section often mentions the date of injury -- this is NOT the visit date.\n'
      + '- The visit date is ALWAYS in the document header.\n'
      + '- Keep it fast and simple -- no clinical content needed, just date/provider/facility/type.\n'
      + '- If a date appears in a document header but no provider is identifiable, still include the entry with provider as "Not Documented".\n\n'
      + 'Return all entries in the visits array.';
  };
  // ── Provider/setting normalizers ─────────────────────────────────────────
  const toTitleCase = (str: string): string => {
    if (!str) return str;
    const letters = str.replace(/[^a-zA-Z]/g, '');
    if (letters.length > 2 && letters === letters.toUpperCase()) {
      const credentials = new Set(['MD', 'DO', 'PA', 'NP', 'RN', 'LPN', 'PT', 'OT', 'DC', 'DDS', 'DMD', 'DPM', 'PHD', 'APRN', 'LCSW', 'OTR', 'ATC', 'EMT', 'RPA']);
      return str.replace(/[A-Z]+/g, (word: string) => credentials.has(word) ? word : word.charAt(0) + word.slice(1).toLowerCase());
    }
    return str;
  };

  // ── Sanitize helpers (full v5 logic) ─────────────────────────────────────
  const EXCLUDED_PATTERNS = [/pacu/i, /post.?anesthesia/i, /anesthesia\s+record/i, /pre.?op\s+nursing/i, /perioperative\s+nursing/i, /nursing\s+document/i, /preop\s+nursing/i];

  const isExcluded = (visit: any): boolean => {
    const setting = (visit.practice_setting || '').toLowerCase();
    if (setting.includes('c-4') || setting.includes('workers') || setting.includes('wcb')) return false;
    const combined = (visit.practice_setting || '') + ' ' + (visit.rendering_provider || '') + ' ' + (visit.chief_complaint || '');
    return EXCLUDED_PATTERNS.some((rx: RegExp) => rx.test(combined));
  };

  const isLikelyMisdatedER = (visit: any): boolean => {
    if (!visit.visit_date || !visit.injury_date) return false;
    if (visit.visit_date !== visit.injury_date) return false;
    const settingLower = (visit.practice_setting || '').toLowerCase();
    if (settingLower.includes('c-4') || settingLower.includes('workers') || settingLower.includes('wcb')) return false;
    return true;
  };

  const addOneDay = (dateStr: string): string => {
    const [y, m, day] = dateStr.split('-').map(Number);
    const dt = new Date(y, m - 1, day + 1);
    return dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0');
  };

  const enforceOneC4 = (visitList: any[]): any[] => {
    const isC4 = (v: any) => { const s = (v.practice_setting || '').toLowerCase(); return s.includes('c-4') || s.includes('wcb') || s.includes("workers' compensation report"); };
    const c4s = visitList.filter(isC4);
    if (c4s.length <= 1) return visitList;
    const sortedC4 = [...c4s].sort((a: any, b: any) => {
      if (!a.visit_date) return 1; if (!b.visit_date) return -1;
      const diff = (a.visit_date || '').localeCompare(b.visit_date || '');
      if (diff !== 0) return diff;
      return (a.practice_setting || '').toLowerCase().includes('c-4') ? -1 : 1;
    });
    const earliestDate = sortedC4[0].visit_date;
    const c4sOnDate = c4s.filter((v: any) => v.visit_date === earliestDate);
    const contentLength = (v: any) => [v.impression_diagnosis, v.rendering_provider, v.imaging_findings, v.hpi_summary, v.treatment_plan].map((s: any) => (s || '').trim()).join('').length;
    const keepC4 = c4sOnDate.sort((a: any, b: any) => contentLength(b) - contentLength(a))[0];
    return visitList.map((v: any) => {
      if (isC4(v) && v !== keepC4) {
        const cleaned = { ...v };
        cleaned.practice_setting = (cleaned.practice_setting || '').replace(/c-4 workers'? compensation report/i, '').replace(/\(c-4 report\)/i, '').trim() || 'Office Visit';
        return cleaned;
      }
      return v;
    });
  };

  // ── PT collapse helpers (for export) ────────────────────────────────────
  const isPTVisit = (v: any): boolean => {
    const s = (v.practice_setting || '').toLowerCase();
    return s.includes('physical therapy') || s.includes('occupational therapy') || s.includes('physio') || s === 'pt' || s.includes(' pt ') || s.includes('rehabilitation') || s.includes('hand therapy') || (s.includes('sport') && s.includes('rehab'));
  };

  const buildVisitList = (visits: any[], collapse: boolean): any[] => {
    if (!collapse) return visits;
    const ptGroups: any = {};
    visits.forEach((v: any, idx: number) => {
      if (!isPTVisit(v)) return;
      const key = normalizePTSetting(v.practice_setting || 'pt').toLowerCase().trim();
      if (!ptGroups[key]) ptGroups[key] = [];
      ptGroups[key].push(idx);
    });
    const bridgedIndices = new Set<number>();
    const bridgeInsertAfter: any = {};
    Object.values(ptGroups).forEach((indices: any) => {
      if (indices.length <= 2) return;
      const first = indices[0];
      indices.slice(1, -1).forEach((i: number) => bridgedIndices.add(i));
      bridgeInsertAfter[first] = { _ptBridge: true, _ptCount: indices.length - 2, _ptProvider: visits[first].practice_setting || 'Physical/Occupational Therapy' };
    });
    const result: any[] = [];
    visits.forEach((v: any, i: number) => {
      if (bridgedIndices.has(i)) return;
      result.push(v);
      if (bridgeInsertAfter[i]) result.push(bridgeInsertAfter[i]);
    });
    return result;
  };

  // Sanitize visits — full v5 logic: exclusions, C-4 dedup, ER date fix, field normalization
  const sanitizeVisits = (visits: any[], patientName: string = ''): any[] => {
    const stringFields = ['visit_date','rendering_provider','practice_setting','chief_complaint',
      'hpi_summary','injury_date','pain_scale','symptom_progression','physical_exam_findings',
      'imaging_findings','lab_findings','impression_diagnosis','treatment_plan'];
    const validProgressions = ['improved','same','worse','not_documented'];

    return enforceOneC4((visits || []).filter((visit: any) => !isExcluded(visit))).map((visit: any) => {
      const clean: any = {};
      stringFields.forEach((field: string) => {
        const val = visit[field];
        if (val === null || val === undefined || val === false) clean[field] = '';
        else if (typeof val === 'object') clean[field] = JSON.stringify(val);
        else if (typeof val !== 'string') clean[field] = String(val);
        else clean[field] = val;
      });
      if (!Array.isArray(visit.icd10_codes)) clean.icd10_codes = [];
      else clean.icd10_codes = visit.icd10_codes;
      // Normalize all-caps provider names from OCR
      if (clean.rendering_provider) clean.rendering_provider = toTitleCase(clean.rendering_provider);
      // Normalize PT facility names
      if (clean.practice_setting) clean.practice_setting = normalizePTSetting(clean.practice_setting);
      if (!validProgressions.includes(clean.symptom_progression)) clean.symptom_progression = 'not_documented';
      // Strip patient name from practice_setting (OCR artifact)
      const patientLower = patientName?.toLowerCase();
      if (clean.practice_setting && patientLower && clean.practice_setting.toLowerCase().includes(patientLower)) {
        clean.practice_setting = '';
      }
      // Strip street addresses from practice_setting
      if (clean.practice_setting) {
        clean.practice_setting = clean.practice_setting
          .replace(/,\s*\d+\s+[A-Za-z].*$/, '')
          .replace(/\s*\d{5}(?:-\d{4})?\s*$/, '')
          .replace(/,\s*(?:Ste|Suite|Floor|Fl|Bldg|Building|Unit|#)\s*[\w-]+\s*$/i, '')
          .trim().replace(/,\s*$/, '');
      }
      // Fix ER visits where Bedrock used injury_date as visit_date
      if (isLikelyMisdatedER(clean)) clean.visit_date = addOneDay(clean.injury_date);
      return clean;
    });
  };

  const generateSummary = async () => {
    const selectedDocs = groupedDocuments
      .filter((d: any) => selectedDocuments.includes(d.id))
      .sort((a: any, b: any) => (a.id || '').localeCompare(b.id || ''));
    if (selectedDocs.length === 0) { setError("Please select at least one document."); return; }
    setShowDialog(false);
    setSelectedDocuments([]);
    genStore.set({ running: true, statusMsg: "Starting...", completionMsg: "", error: null, elapsedSeconds: 0 });
    if (genStore.state.timerHandle) clearInterval(genStore.state.timerHandle);
    let elapsed = 0;
    const timerHandle = setInterval(() => { elapsed += 1; genStore.set({ elapsedSeconds: elapsed }); }, 1000);
    genStore.set({ timerHandle });
    try {
      const docIds: string[] = [];
      for (const doc of selectedDocs) {
        if (doc._is_group && doc._parts?.length) {
          for (const part of doc._parts) {
            const partClassif = part.page_classifications || [];
            const allNonClinical = partClassif.length > 0 && partClassif.every((p: any) => !p.is_clinical && !p.restored);
            if (!allNonClinical) docIds.push(part.id);
          }
        } else {
          const docClassif = doc.page_classifications || [];
          const allNonClinical = docClassif.length > 0 && docClassif.every((p: any) => !p.is_clinical && !p.restored);
          if (!allNonClinical) docIds.push(doc.id);
        }
      }
      if (docIds.length === 0) {
        genStore.set({ running: false, timerHandle: null, statusMsg: "", error: "All selected documents are non-clinical." });
        clearInterval(timerHandle);
        return;
      }
      genStore.set({ statusMsg: `Sending ${docIds.length} documents to ChartReview AI...` });
      const startRes = await awsProxy('/summaries/generate', 'POST', {
        doc_ids: docIds, patient_name: '', run_vi_prepass: true,
      });
      const job_id = startRes?.job_id;
      if (!job_id) throw new Error('No job_id returned from generateSummaryStart');
      genStore.set({ statusMsg: 'Sending documents for processing...' });
      let jobResult: any = null;
      const POLL_INTERVAL_MS = 5000;
      const MAX_POLLS = 360;
      for (let poll = 0; poll < MAX_POLLS; poll++) {
        await new Promise((res) => setTimeout(res, POLL_INTERVAL_MS));
        const jobStatus = await awsProxy(`/jobs/${job_id}`, 'GET');
        if (jobStatus?.status === 'complete') { jobResult = jobStatus.result; break; }
        if (jobStatus?.status === 'failed') throw new Error('Generation failed: ' + (jobStatus?.error_message || 'unknown error'));
        genStore.set({ statusMsg: jobStatus?.status_msg || 'Processing...' });
      }
      if (!jobResult) throw new Error('Generation timed out after 30 minutes');
      const rawVisits: any[] = Array.isArray(jobResult.visits) ? jobResult.visits : [];
      const patientName: string = jobResult.patient_name || '';
      clearInterval(timerHandle);
      genStore.set({ timerHandle: null });
      // â”€â”€ Save summary record to DynamoDB â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      try {
        // Sanitize visits to known fields only — keeps DynamoDB item under 400KB limit
        const cleanVisits = sanitizeVisits(rawVisits, patientName);
        await awsProxy('/summaries', 'POST', {
          patient_name: patientName,
          case_number: caseNumber,
          visits: cleanVisits,
          visit_count: cleanVisits.length,
          job_id: job_id,
          status: 'complete',
          org_id: ORG_ID,
        });
      } catch (saveErr: any) {
        console.error('Failed to save summary record:', saveErr);
      }

      queryClient.invalidateQueries({ queryKey: ["aws-summaries"] });
      genStore.set({
        running: false, statusMsg: "",
        completionMsg: `✅ Generated ${rawVisits.length} visits for ${patientName || 'patient'} in ${Math.floor(elapsed / 60)}m ${elapsed % 60}s`,
      });
    } catch (err: any) {
      clearInterval(genStore.state.timerHandle);
      genStore.set({ running: false, timerHandle: null, statusMsg: "", error: err.message || "Generation failed" });
    }
  };

  // Ã¢â€â‚¬Ã¢â€â‚¬ Export to Word Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  const exportToWord = async (summary: any) => {
    // Re-fetch full visits — prefer job_id result (raw narratives) over sanitized DynamoDB record
    let freshSummary = summary;
    try {
      if (summary.job_id) {
        const jobResult = await awsProxy(`/jobs/${summary.job_id}`, 'GET');
        if (jobResult?.result?.visits?.length > 0) {
          freshSummary = { ...summary, visits: jobResult.result.visits, patient_name: jobResult.result.patient_name || summary.patient_name };
        }
      } else {
        const fetched = await awsProxy(`/summaries/${summary.aws_summary_id || summary.id}`, 'GET');
        if (fetched && (Array.isArray(fetched.visits) ? fetched.visits.length > 0 : fetched.visits)) {
          freshSummary = fetched;
        }
      }
    } catch (_) {}

    const sortedVisits: any[] = freshSummary.visits
      ? [...freshSummary.visits].sort((a: any, b: any) => {
          const da = (a.visit_date || '').trim();
          const db = (b.visit_date || '').trim();
          if (!da) return 1; if (!db) return -1;
          if (da !== db) return da < db ? -1 : 1;
          const aIsC4 = (a.practice_setting || '').toLowerCase().includes('c-4');
          const bIsC4 = (b.practice_setting || '').toLowerCase().includes('c-4');
          if (aIsC4 && !bIsC4) return -1; if (!aIsC4 && bIsC4) return 1;
          return 0;
        })
      : [];

    if (!sortedVisits.length) {
      alert('This summary has no visits saved.');
      return;
    }

    const isPT = (v: any) => isPTVisit(v);
    const hasPTVisits = sortedVisits.some(isPT);
    const finalVisits = buildVisitList(deduplicateVisits(sortedVisits), hasPTVisits);

    try {
      const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle } = await import('docx');

      const auditFooter = () => {
        const now = new Date();
        const pdt = now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles', month: '2-digit', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
        return new Paragraph({ alignment: AlignmentType.LEFT, spacing: { before: 300 }, children: [new TextRun({ text: 'ChartReview Pro  |  Generated: ' + pdt + ' PDT', size: 14, color: '9CA3AF', font: FONT })] });
      };

      const FONT = 'Calibri';
      const SIZE = 22;     // 11pt in half-points
      const SIZE_SM = 18;  // 9pt
      const SIZE_TTL = 32; // 16pt
      const DATE_INDENT = 1540;

      const bold = (text: string, size?: number) => new TextRun({ text: String(text || ''), bold: true, font: FONT, size: size || SIZE });
      const normal = (text: string, size?: number) => new TextRun({ text: String(text || ''), font: FONT, size: size || SIZE });

      const visitPara = (dateStr: string, runs: any[], spacing: any = {}) => new Paragraph({
        indent: { left: DATE_INDENT, hanging: DATE_INDENT },
        tabStops: [{ type: 'left' as any, position: DATE_INDENT }],
        spacing: { before: 200, after: 40, ...spacing },
        children: dateStr
          ? [bold(dateStr), new TextRun({ text: '\t', font: FONT, size: SIZE }), ...runs]
          : runs,
      });

      const subPara = (runs: any[], spacing: any = {}) => new Paragraph({
        indent: { left: DATE_INDENT },
        spacing: { before: 40, after: 40, ...spacing },
        children: runs,
      });

      const emptyPara = () => new Paragraph({ children: [], spacing: { after: 60 } });

      const fmtDate = (dateStr: string) => {
        if (!dateStr) return '';
        const parts = dateStr.split('-').map(Number);
        if (parts.length === 3 && !isNaN(parts[0])) {
          return `${String(parts[1]).padStart(2,'0')}/${String(parts[2]).padStart(2,'0')}/${parts[0]}`;
        }
        return dateStr;
      };

      const inferVisitType = (ps: string) => {
        const s = (ps || '').toLowerCase();
        if (s.includes('physical therapy') || s.includes('occupational therapy') || s.includes('physio') || s.includes('hand therapy')) return 'Physical Therapy';
        if (s.includes('emergency') || s.includes(' er ') || s === 'er' || s.includes('urgent care')) return 'ER Visit';
        if (s.includes('radiology') || s.includes('imaging') || s.includes('mri') || s.includes('x-ray') || s.includes('ct scan')) return 'Radiology';
        if (s.includes('surgery') || s.includes('surgical') || s.includes('operative')) return 'Surgery';
        if (s.includes('c-4') || s.includes("workers' compensation report") || s.includes('wcb')) return 'C-4 Form';
        if (s.includes('ime') || s.includes('independent medical')) return 'IME';
        if (s.includes('chiropractic') || s.includes('chiropractor')) return 'Chiropractic';
        return 'Office Visit';
      };

      const sections_content: any[] = [];

      // ── Visit Index ──────────────────────────────────────────────────────
      const viVisits = [...finalVisits].filter((v: any) => !v._ptBridge).map((v: any) => ({
        ...v, visit_type: v.visit_type || inferVisitType(v.practice_setting || ''),
      }));

      sections_content.push(new Paragraph({ children: [new TextRun({ text: 'Visit Index', bold: true, color: '2563EB', size: 36, font: FONT })], spacing: { after: 100 } }));
      sections_content.push(new Paragraph({ spacing: { after: 40 }, children: [bold('Patient: '), normal(freshSummary.patient_name || 'N/A')] }));
      sections_content.push(new Paragraph({ spacing: { after: 40 }, children: [bold('Case Number: '), normal(freshSummary.case_number || 'N/A')] }));
      sections_content.push(new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: `${viVisits.length} visit${viVisits.length !== 1 ? 's' : ''} found`, italics: true, color: '555555', size: SIZE_SM, font: FONT })] }));

      const viCellBorder: any = { style: BorderStyle.SINGLE, size: 4, color: 'auto' };
      const viBorders = { top: viCellBorder, bottom: viCellBorder, left: viCellBorder, right: viCellBorder };
      const viColWidths = [12, 25, 38, 25];
      const makeViHeaderCell = (label: string, colIdx: number) => new TableCell({
        width: { size: viColWidths[colIdx], type: WidthType.PERCENTAGE },
        borders: viBorders, margins: { top: 60, bottom: 60, left: 80, right: 80 },
        children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, font: FONT, size: SIZE_SM })] })],
      });
      const viRows: any[] = [new TableRow({ children: ['Date', 'Provider', 'Facility', 'Visit Type'].map((l, ci) => makeViHeaderCell(l, ci)) })];
      viVisits.forEach((v: any, i: number) => {
        const rowBg = i % 2 === 0 ? 'FFFFFF' : 'EBF3FB';
        const makeViCell = (text: string, colIdx: number) => new TableCell({
          width: { size: viColWidths[colIdx], type: WidthType.PERCENTAGE },
          shading: { type: 'solid' as any, color: rowBg, fill: rowBg },
          borders: viBorders, margins: { top: 40, bottom: 40, left: 80, right: 80 },
          children: [new Paragraph({ children: [new TextRun({ text: String(text || ''), font: FONT, size: SIZE_SM })] })],
        });
        viRows.push(new TableRow({ children: [makeViCell(fmtDate(v.visit_date), 0), makeViCell(v.rendering_provider || '', 1), makeViCell(v.practice_setting || '', 2), makeViCell(v.visit_type || '', 3)] }));
      });
      sections_content.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: viRows }));
      sections_content.push(new Paragraph({ pageBreakBefore: true, children: [] }));

      // ── Medical Summary ──────────────────────────────────────────────────
      sections_content.push(new Paragraph({ children: [bold('MEDICAL RECORD SUMMARY', SIZE_TTL)], alignment: AlignmentType.CENTER, spacing: { after: 200 } }));
      sections_content.push(new Paragraph({ spacing: { after: 40 }, children: [bold('Patient: '), normal(freshSummary.patient_name || 'N/A')] }));
      sections_content.push(new Paragraph({ spacing: { after: 40 }, children: [bold('Case Number: '), normal(freshSummary.case_number || 'N/A')] }));
      sections_content.push(emptyPara());

      for (const visit of finalVisits) {
        if ((visit as any)._ptBridge) {
          sections_content.push(new Paragraph({
            indent: { left: DATE_INDENT },
            spacing: { before: 80, after: 80 },
            border: { top: { style: BorderStyle.DASHED, size: 4, color: '999999' } },
            children: [new TextRun({ text: `[ ${(visit as any)._ptCount} additional ${(visit as any)._ptProvider} visit${(visit as any)._ptCount !== 1 ? 's' : ''} omitted - see full record ]`, italics: true, color: '666666', size: SIZE_SM, font: FONT })],
          }));
          continue;
        }
        const v = visit as any;
        const dateStr = v.visit_date ? fmtDate(v.visit_date) + ':' : '';
        const contentRuns: any[] = [];
        if (v.practice_setting)   contentRuns.push(normal(v.practice_setting + '. '));
        if (v.rendering_provider) contentRuns.push(normal(v.rendering_provider + '. '));
        if (v.hpi_summary) {
          contentRuns.push(bold('HPI: '));
          contentRuns.push(normal(v.hpi_summary + ' '));
          if (v.injury_date) contentRuns.push(normal(`Injury Date: ${fmtDate(v.injury_date)}. `));
          if (v.pain_scale && v.pain_scale !== 'not_documented') contentRuns.push(normal(`Pain Scale: ${v.pain_scale}. `));
          if (v.symptom_progression && v.symptom_progression !== 'not_documented') {
            const sp = v.symptom_progression.charAt(0).toUpperCase() + v.symptom_progression.slice(1);
            contentRuns.push(normal(`Symptom Progression: ${sp}. `));
          }
        }
        if (v.physical_exam_findings) { contentRuns.push(bold('Physical Examination: ')); contentRuns.push(normal(v.physical_exam_findings + ' ')); }
        if (v.imaging_findings)       { contentRuns.push(bold('Imaging Findings: '));     contentRuns.push(normal(v.imaging_findings + ' ')); }
        if (v.lab_findings && v.lab_findings.trim()) { contentRuns.push(bold('Laboratory Findings: ')); contentRuns.push(normal(v.lab_findings + ' ')); }

        sections_content.push(visitPara(dateStr, contentRuns));
        if (v.impression_diagnosis) sections_content.push(subPara([bold('Diagnosis: '), normal(v.impression_diagnosis)]));
        if (v.treatment_plan)       sections_content.push(subPara([bold('Treatment Plan: '), normal(v.treatment_plan)], { after: 120 }));
      }

      sections_content.push(emptyPara());
      sections_content.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [normal(`Generated by ChartReview Pro on ${new Date().toLocaleDateString()}`, SIZE_SM)] }));
      sections_content.push(auditFooter());

      const doc = new Document({
        sections: [{ properties: { page: { margin: { top: 720, bottom: 720, left: 720, right: 720 } } }, children: sections_content }],
      });

      const buffer = await Packer.toBlob(doc);
      const url = URL.createObjectURL(buffer);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Medical_Summary_${(freshSummary.patient_name || 'Document').replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (exportErr: any) {
      console.error('Export failed:', exportErr);
      alert('Export failed: ' + (exportErr?.message || String(exportErr)));
    }
  };

  // Ã¢â€â‚¬Ã¢â€â‚¬ Visit Index Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  const generateVisitIndex = async () => {
    if (visitIndexDocsSelected.length === 0) return;
    setVisitIndexRunning(true);
    setShowVisitIndexDialog(false);
    try {
      const startRes = await awsProxy('/visit-index/build', 'POST', { doc_ids: visitIndexDocsSelected });
      const job_id = startRes?.job_id;
      if (!job_id) throw new Error('No job_id');
      let result: any = null;
      for (let poll = 0; poll < 120; poll++) {
        await new Promise((r) => setTimeout(r, 5000));
        const status = await awsProxy(`/jobs/${job_id}`, 'GET');
        if (status?.status === 'complete') { result = status.result; break; }
        if (status?.status === 'failed') throw new Error('Visit index failed');
      }
      if (!result) throw new Error('Visit index timed out');
      setVisitIndexData(result);
      setShowVisitIndexViewer(true);
    } catch (err: any) {
      alert('Visit Index error: ' + err.message);
    } finally {
      setVisitIndexRunning(false);
    }
  };

  const exportVisitIndex = async () => {
    if (!visitIndexData) return;
    const { patient_name, visits } = visitIndexData;
    const rows = (visits || []).map((v: any) =>
      `<p style="font-family:Calibri;font-size:10pt;margin:2pt 0"><b>${formatVisitDate(v.date || v.visit_date || '')}</b> Ã¢â‚¬â€ ${v.provider || v.rendering_provider || ''} Ã¢â‚¬â€ ${v.facility || v.practice_setting || ''}</p>`
    ).join('\n');
    const html = `<html><body style="margin:0.5in"><h2 style="font-family:Calibri">Visit Index: ${patient_name || 'Patient'}</h2>${rows}</body></html>`;
    const blob = new Blob([html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `VisitIndex_${(patient_name || 'Patient').replace(/\s+/g, '_')}.doc`;
    a.click(); URL.revokeObjectURL(url);
  };

  const saveVisitIndex = async () => {
    if (!visitIndexData) return;
    try {
      await awsProxy('/summaries/visit-index', 'POST', {
        patient_name: visitIndexData.patient_name, visits: visitIndexData.visits,
      });
      alert('Visit index saved to Library.');
    } catch (err: any) { alert('Save failed: ' + err.message); }
  };

  const crossCheckVisitIndex = (summary: any) => {
    if (!visitIndexData || !summary) return;
    const indexDates = new Set<string>((visitIndexData.visits || []).map((v: any) =>
      (v.date || v.visit_date || '').trim()
    ));
    const summaryDates = new Set<string>((summary.visits || []).map((v: any) =>
      (v.visit_date || '').trim()
    ));
    const missing = Array.from(indexDates).filter((d: string) => !summaryDates.has(d));
    const extra = Array.from(summaryDates).filter((d: string) => !indexDates.has(d));
    setVisitIndexCrossCheck({ missing, extra });
  };

  // Ã¢â€â‚¬Ã¢â€â‚¬ Combine summaries Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  const combineSummaries = async () => {
    if (selectedSummariesToCombine.length < 2) return;
    const selected = summaries.filter((s: any) => selectedSummariesToCombine.includes(s.aws_summary_id || s.id));
    const allVisits: any[] = [];
    for (const s of selected) allVisits.push(...(s.visits || []));
    const deduped = deduplicateVisits(allVisits);
    try {
      await awsProxy('/summaries', 'POST', {
        patient_name: selected[0].patient_name || 'Combined Patient',
        visits: deduped, status: 'draft',
      });
      queryClient.invalidateQueries({ queryKey: ["aws-summaries"] });
      setShowCombineDialog(false);
      setSelectedSummariesToCombine([]);
      alert(`Combined ${selected.length} summaries into one (${deduped.length} visits).`);
    } catch (err: any) { alert('Combine failed: ' + err.message); }
  };

  // Ã¢â€â‚¬Ã¢â€â‚¬ Render Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  return (
    <div className="p-6 md:p-8 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Medical Summaries</h1>
          <p className="text-slate-600 mt-1">Generate structured summaries from any documents</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {summaries.length >= 2 && (
            <Button variant="outline" onClick={() => { setSelectedSummariesToCombine([]); setShowCombineDialog(true); }}>
              <Merge className="w-4 h-4 mr-2" />Combine Summaries
            </Button>
          )}
          {summaries.length > 0 && (
            <Button variant="destructive" onClick={() => setDeleteAllDialog(true)}>
              <Trash2 className="w-4 h-4 mr-2" />Delete All
            </Button>
          )}
          <Button onClick={() => { setVisitIndexDocsSelected([]); setShowVisitIndexDialog(true); }}
            className="bg-gradient-to-r from-blue-600 to-indigo-600" disabled={visitIndexRunning}>
            {visitIndexRunning
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Building Index...</>
              : <><List className="w-4 h-4 mr-2" />Build Visit Index</>}
          </Button>
          <Button onClick={() => { setSelectedDocuments([]); setError(null); setShowDialog(true); }}
            className="bg-gradient-to-r from-green-600 to-emerald-600">
            <Plus className="w-4 h-4 mr-2" />Generate Summary
          </Button>
        </div>
      </div>

      {/* Generation banner */}
      {generatingSummary && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-4">
          <Loader2 className="w-5 h-5 text-blue-600 animate-spin flex-shrink-0" />
          <div className="flex-1"><p className="text-sm font-medium text-blue-800">{statusMsg || "Generating..."}</p></div>
          <span className="text-sm font-mono text-blue-600">
            {Math.floor(elapsedSeconds / 60)}:{String(elapsedSeconds % 60).padStart(2, "0")}
          </span>
        </div>
      )}
      {completionMsg && !generatingSummary && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
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
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Select Documents</DialogTitle>
            <DialogDescription>Select documents from any folder(s) to generate a comprehensive medical summary.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {selectedDocuments.length > 0 && (
              <Alert>
                <Users className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  {selectedDocuments.length} document{selectedDocuments.length !== 1 ? 's' : ''} selected.
                  {selectedDocuments.length > 1 && ' All visits will be combined into one summary.'}
                </AlertDescription>
              </Alert>
            )}
            <div className="space-y-6">
              {Object.keys(documentsByFolder).sort().map((folderName: string) => {
                const folderDocsAll: any[] = documentsByFolder[folderName];
                const folderDocs = folderDocsAll.filter((doc: any) => {
                  if (doc._all_rejected) return false;
                  const pc = doc.page_classifications || [];
                  if (pc.length > 0 && pc.every((pg: any) => !pg.is_clinical && !pg.restored)) return false;
                  return true;
                });
                if (folderDocs.length === 0) return null;
                const folderSelected = folderDocs.filter((d: any) => selectedDocuments.includes(d.id)).length;
                const allFolderSelected = folderDocs.every((d: any) => selectedDocuments.includes(d.id));
                const folderGroups: any = folderDocs.reduce((groups: any, doc: any) => {
                  const providerName = doc.provider_name || 'Unknown Facility';
                  const normalizedKey = normalizeProviderName(providerName) || 'unknown';
                  if (!groups[normalizedKey]) groups[normalizedKey] = { displayName: providerName, docs: [] };
                  groups[normalizedKey].docs.push(doc);
                  return groups;
                }, {});
                Object.keys(folderGroups).forEach((key: string) => {
                  folderGroups[key].docs.sort((a: any, b: any) => {
                    const numA = getPartNumber(a.title || a.file_name || '');
                    const numB = getPartNumber(b.title || b.file_name || '');
                    if (numA !== null && numB !== null) return numA - numB;
                    if (numA !== null) return -1; if (numB !== null) return 1;
                    return (a.title || '').localeCompare(b.title || '');
                  });
                });
                const selectAllFolder = () => {
                  const folderIds = folderDocs.map((d: any) => d.id);
                  if (allFolderSelected) {
                    setSelectedDocuments((prev: string[]) => prev.filter((id: string) => !folderIds.includes(id)));
                  } else {
                    setSelectedDocuments((prev: string[]) => Array.from(new Set([...prev, ...folderIds])));
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
                      <Button variant="outline" size="sm" onClick={selectAllFolder}
                        className={allFolderSelected ? 'bg-blue-50 border-blue-300 text-blue-700' : 'text-slate-600'}>
                        {allFolderSelected ? <CheckSquare className="w-4 h-4 mr-1" /> : <Square className="w-4 h-4 mr-1" />}
                        {allFolderSelected ? 'Deselect All' : 'Select All'}
                      </Button>
                    </div>
                    <div className="space-y-3">
                      {Object.entries(folderGroups).sort(([a], [b]) => a.localeCompare(b)).map(([groupKey, groupData]: [string, any]) => {
                        const groupDocs: any[] = groupData.docs;
                        const allSelected = groupDocs.every((d: any) => selectedDocuments.includes(d.id));
                        const selectGroup = (docs: any[]) => {
                          if (allSelected) {
                            setSelectedDocuments((prev: string[]) => prev.filter((id: string) => !docs.map((d: any) => d.id).includes(id)));
                          } else {
                            setSelectedDocuments((prev: string[]) => Array.from(new Set([...prev, ...docs.map((d: any) => d.id)])));
                          }
                        };
                        return (
                          <Card key={groupKey}>
                            <CardHeader className="bg-slate-50 pb-3 pt-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <Button variant="outline" size="sm" onClick={() => selectGroup(groupDocs)}
                                    className={allSelected ? 'bg-blue-50 border-blue-300' : ''}>
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
                              {groupDocs.map((doc: any) => (
                                <div key={doc.id}
                                  className={`flex items-start gap-3 p-2 rounded-lg border transition-all cursor-pointer ${
                                    selectedDocuments.includes(doc.id) ? 'bg-blue-50 border-blue-300' : 'bg-white border-slate-200 hover:border-slate-300'
                                  }`}
                                  onClick={() => toggleDocumentSelection(doc.id)}>
                                  <Checkbox checked={selectedDocuments.includes(doc.id)}
                                    onCheckedChange={() => toggleDocumentSelection(doc.id)}
                                    onClick={(e: React.MouseEvent) => e.stopPropagation()} className="mt-0.5" />
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
                                      {doc.document_date && <span>{formatVisitDate(doc.document_date)}</span>}
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
            </div>
            {documentsLoading && <div className="text-center py-10 text-slate-500">Loading documents...</div>}
            {!documentsLoading && documents.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                <FileCheck className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                <p>No documents found. Upload documents first.</p>
              </div>
            )}
          </div>
          {queueProgress && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800 mt-3">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium">Processing batch {queueProgress.current} of {queueProgress.total}...</span>
                <span className="text-xs">{Math.round((queueProgress.current / queueProgress.total) * 100)}%</span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-1.5">
                <div className="bg-blue-600 h-1.5 rounded-full transition-all"
                  style={{ width: `${(queueProgress.current / queueProgress.total) * 100}%` }} />
              </div>
            </div>
          )}
          <Button onClick={generateSummary} disabled={selectedDocuments.length === 0 || generatingSummary}
            className="w-full mt-4 bg-gradient-to-r from-blue-600 to-cyan-600">
            {generatingSummary
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analyzing...</>
              : <><Sparkles className="w-4 h-4 mr-2" />Generate Summary from {selectedDocuments.length || 0} Document{selectedDocuments.length !== 1 ? 's' : ''}</>}
          </Button>
        </DialogContent>
      </Dialog>

      {/* Summaries Grid */}
      {summariesLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_: any, i: number) => (
            <Card key={i} className="animate-pulse"><CardContent className="p-6"><div className="h-32 bg-slate-200 rounded" /></CardContent></Card>
          ))}
        </div>
      ) : summaries.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {summaries.map((summary: any) => (
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
                      <Button variant="ghost" size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => setDeleteSummary(summary)}>
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
                  </div>
                  <div className="flex gap-1.5 justify-center">
                    <Button variant="outline" size="sm" className="flex-1" title="View" onClick={() => setViewingSummary(summary)}>
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1" title="Edit"
                      onClick={() => { setEditing(true); setEditingSummary(normalizeSummaryForEdit(summary)); }}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1" title="Export to Word"
                      onClick={() => exportToWord(summary)}>
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1" title="Remove duplicate visits"
                      onClick={() => deduplicateMutation.mutate(summary)} disabled={deduplicateMutation.isPending}>
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

      {/* Visit Index Dialog */}
      <Dialog open={showVisitIndexDialog} onOpenChange={setShowVisitIndexDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Build Visit Index</DialogTitle>
            <DialogDescription>Select documents to extract a chronological list of all visits.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            {groupedDocuments.filter((doc: any) => {
              if (doc._all_rejected) return false;
              const pc = doc.page_classifications || [];
              if (pc.length > 0 && pc.every((pg: any) => !pg.is_clinical && !pg.restored)) return false;
              return true;
            }).map((doc: any) => (
              <div key={doc.id} className="flex items-center gap-3 p-2 rounded hover:bg-gray-50 cursor-pointer"
                onClick={() => setVisitIndexDocsSelected((prev: string[]) =>
                  prev.includes(doc.id) ? prev.filter((i: string) => i !== doc.id) : [...prev, doc.id]
                )}>
                <input type="checkbox" readOnly checked={visitIndexDocsSelected.includes(doc.id)} className="w-4 h-4" />
                <span className="text-sm">{doc.file_name || doc.title || doc.id}</span>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVisitIndexDialog(false)}>Cancel</Button>
            <Button disabled={visitIndexDocsSelected.length === 0} onClick={generateVisitIndex}
              className="bg-gradient-to-r from-blue-600 to-indigo-600">
              <List className="w-4 h-4 mr-2" />
              Build Index ({visitIndexDocsSelected.length} doc{visitIndexDocsSelected.length !== 1 ? 's' : ''})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Visit Index Viewer */}
      {showVisitIndexViewer && visitIndexData && (
        <Dialog open={showVisitIndexViewer} onOpenChange={setShowVisitIndexViewer}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <List className="w-5 h-5 text-blue-600" />
                Visit Index Ã¢â‚¬â€ {visitIndexData.patient_name || 'Patient'}
              </DialogTitle>
              <DialogDescription>{visitIndexData.visits.length} encounters found</DialogDescription>
            </DialogHeader>
            <div className="flex flex-wrap items-center gap-2 py-2 border-b">
              <Button size="sm" variant={visitIndexView === 'chrono' ? 'default' : 'outline'}
                onClick={() => setVisitIndexView('chrono')}>Chronological</Button>
              <Button size="sm" variant={visitIndexView === 'grouped' ? 'default' : 'outline'}
                onClick={() => setVisitIndexView('grouped')}>By Provider</Button>
              <div className="flex-1" />
              {summaries.length > 0 && (
                <select className="text-sm border rounded px-2 py-1" defaultValue=""
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                    const s = summaries.find((s: any) => (s.aws_summary_id || s.id) === e.target.value);
                    if (s) crossCheckVisitIndex(s);
                  }}>
                  <option value="">Check Against Summary...</option>
                  {summaries.map((s: any) => (
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
            {visitIndexCrossCheck && (
              <div className="grid grid-cols-2 gap-3 my-2">
                <div className="bg-red-50 border border-red-200 rounded p-3">
                  <p className="text-xs font-semibold text-red-700 mb-1">In Index but NOT in Summary ({visitIndexCrossCheck.missing.length})</p>
                  {visitIndexCrossCheck.missing.slice(0, 10).map((d: string, i: number) => (
                    <p key={i} className="text-xs text-red-600">{formatVisitDate(d)}</p>
                  ))}
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                  <p className="text-xs font-semibold text-yellow-700 mb-1">In Summary but NOT in Index ({visitIndexCrossCheck.extra.length})</p>
                  {visitIndexCrossCheck.extra.slice(0, 10).map((d: string, i: number) => (
                    <p key={i} className="text-xs text-yellow-600">{formatVisitDate(d)}</p>
                  ))}
                </div>
              </div>
            )}
            <div className="space-y-1 max-h-96 overflow-y-auto">
              {(visitIndexData.visits || []).map((v: any, i: number) => (
                <div key={i} className="flex gap-3 py-1 border-b border-slate-100 text-sm">
                  <span className="font-medium text-slate-700 w-24 shrink-0">{formatVisitDate(v.date || v.visit_date || '')}</span>
                  <span className="text-slate-600">{v.provider || v.rendering_provider || 'Ã¢â‚¬â€'}</span>
                  <span className="text-slate-400 ml-auto">{v.facility || v.practice_setting || ''}</span>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Combine Summaries Dialog */}
      <Dialog open={showCombineDialog} onOpenChange={setShowCombineDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Combine Summaries</DialogTitle>
            <DialogDescription>Select 2 or more summaries to merge their visits into a single combined summary.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            {summaries.map((s: any) => {
              const sId = s.aws_summary_id || s.id;
              const isSelected = selectedSummariesToCombine.includes(sId);
              return (
                <div key={sId}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    isSelected ? 'bg-blue-50 border-blue-300' : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                  onClick={() => setSelectedSummariesToCombine((prev: string[]) =>
                    prev.includes(sId) ? prev.filter((id: string) => id !== sId) : [...prev, sId]
                  )}>
                  <Checkbox checked={isSelected} onCheckedChange={() => {}} className="pointer-events-none" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-slate-900">{s.patient_name || 'Unnamed Patient'}</p>
                    <p className="text-xs text-slate-500">
                      {s.visits?.length || 0} visits Ã‚Â· Created {new Date(s.created_at || s.created_date).toLocaleDateString()}
                      {s.case_number && ` Ã‚Â· Case: ${s.case_number}`}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCombineDialog(false)}>Cancel</Button>
            <Button disabled={selectedSummariesToCombine.length < 2} onClick={combineSummaries}
              className="bg-gradient-to-r from-purple-600 to-indigo-600">
              <Merge className="w-4 h-4 mr-2" />
              Combine {selectedSummariesToCombine.length} Summaries
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete All Confirmation */}
      <AlertDialog open={deleteAllDialog} onOpenChange={setDeleteAllDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete All Summaries</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete all {summaries.length} medical summaries? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteAllDialog(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteAllMutation.mutate(undefined as any)}
              disabled={deleteAllMutation.isPending} className="bg-red-600 hover:bg-red-700">
              {deleteAllMutation.isPending
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Deleting...</>
                : `Delete All ${summaries.length} Summaries`}
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
              Are you sure you want to delete this medical summary for {deleteSummary?.patient_name || 'this patient'}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteSummary(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMutation.mutate(deleteSummary.aws_summary_id || deleteSummary.id)}
              className="bg-red-600 hover:bg-red-700">
              Delete Summary
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View Summary */}
      {viewingSummary && (
        <SummaryViewer summary={viewingSummary} onClose={() => setViewingSummary(null)}
          onEdit={() => { setEditing(true); setEditingSummary(normalizeSummaryForEdit(viewingSummary)); setViewingSummary(null); }}
          onExport={() => exportToWord(viewingSummary)} />
      )}

      {/* Edit Summary */}
      {editingSummary && (
        <MedicalSummaryForm summary={editingSummary}
          onClose={() => { setEditing(false); setEditingSummary(null); }}
          onSave={() => { setEditing(false); queryClient.invalidateQueries({ queryKey: ["aws-summaries"] }); setEditingSummary(null); }}
          idToken={idToken} />
      )}

    </div>
  );
}

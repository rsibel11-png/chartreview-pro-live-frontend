/* eslint-disable @typescript-eslint/no-unused-vars */
// App.tsx — chartreview-native-frontend
// Updated: 2026-05-04 — Cognito JWT auth gating, token passed to all pages

import React, { useState, useCallback } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import {
  FileText, LayoutDashboard, Upload, Library,
  FileCheck, LogOut, Menu, ListOrdered, Settings as SettingsIcon
} from 'lucide-react';
import Dashboard        from './components/Dashboard';
import UploadPage       from './components/Upload';
import LibraryPage      from './components/Library';
import MedicalSummaries from './components/MedicalSummaries';
import VisitIndex       from './components/VisitIndex';
import Login, { AuthUser } from './components/Login';
import Settings from './components/Settings';

// ── QueryClient ───────────────────────────────────────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30000 } },
});

// ── Nav config ────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { name: 'Dashboard',        label: 'Dashboard',          Icon: LayoutDashboard },
  { name: 'Upload',           label: 'Upload Documents',   Icon: Upload          },
  { name: 'Library',          label: 'Document Library',   Icon: Library         },
  { name: 'MedicalSummaries', label: 'Medical Summaries',  Icon: FileCheck       },
  { name: 'VisitIndex',       label: 'Visit Index',        Icon: ListOrdered     },
  { name: 'Settings',         label: 'Settings',           Icon: SettingsIcon    },
];

// ── Free users (no billing) ───────────────────────────────────────────────────
const FREE_USERS = ['rsibel11@gmail.com'];

// ── Cast to any to bypass onNavigate/authToken prop mismatch ──────────────────
const DashboardAny = Dashboard        as any;
const UploadAny    = UploadPage       as any;
const LibraryAny   = LibraryPage      as any;
const MedSumAny    = MedicalSummaries as any;
const VisitIdxAny  = VisitIndex       as any;
const SettingsAny  = Settings         as any;

// ── App shell ─────────────────────────────────────────────────────────────────
function AppInner() {
  const [authUser,     setAuthUser]     = useState<AuthUser | null>(null);
  const [currentPage,  setCurrentPage]  = useState<string>('Dashboard');
  const [sidebarOpen,  setSidebarOpen]  = useState<boolean>(false);

  const navigate = (page: string) => {
    setCurrentPage(page);
    setSidebarOpen(false);
  };

  const handleLogin = useCallback((user: AuthUser) => {
    setAuthUser(user);
  }, []);

  const handleLogout = () => {
    if (authUser?.cognitoUser) {
      authUser.cognitoUser.signOut();
    }
    setAuthUser(null);
    setCurrentPage('Dashboard');
  };

  // ── Not logged in — show login screen ─────────────────────────────────────
  if (!authUser) {
    return <Login onLogin={handleLogin} />;
  }

  const isFreeUser = FREE_USERS.includes(authUser.email);
  const initials   = authUser.email.charAt(0).toUpperCase();

  // ── Token prop passed to every page ───────────────────────────────────────
  const authProps = {
    idToken:    authUser.idToken,
    isFreeUser,
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'Dashboard':        return <DashboardAny onNavigate={navigate} {...authProps} />;
      case 'Upload':           return <UploadAny    onNavigate={navigate} {...authProps} />;
      case 'Library':          return <LibraryAny   onNavigate={navigate} {...authProps} />;
      case 'MedicalSummaries': return <MedSumAny    onNavigate={navigate} {...authProps} />;
      case 'VisitIndex':       return <VisitIdxAny  onNavigate={navigate} {...authProps} />;
      case 'Settings':        return <SettingsAny  onNavigate={navigate} {...authProps} />;
      default:                 return <DashboardAny onNavigate={navigate} {...authProps} />;
    }
  };

  // ── Sidebar content ────────────────────────────────────────────────────────
  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white">

      {/* Logo */}
      <div className="border-b border-slate-200 p-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-lg flex items-center justify-center shadow-md">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-lg text-slate-900">ChartReview Pro</h2>
            <p className="text-xs text-slate-500">Document Management</p>
          </div>
        </div>
      </div>

      {/* Nav items */}
      <div className="flex-1 overflow-y-auto p-3">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 py-2">
          Navigation
        </p>
        <nav className="space-y-1">
          {NAV_ITEMS.map(({ name, label, Icon }) => {
            const active = currentPage === name;
            return (
              <button
                key={name}
                onClick={() => navigate(name)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
                  ${active
                    ? 'bg-gradient-to-r from-blue-50 to-cyan-50 text-blue-700 shadow-sm'
                    : 'text-slate-700 hover:bg-blue-50 hover:text-blue-700'
                  }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer — user info + logout */}
      <div className="border-t border-slate-200 p-4">
        <div className="flex items-center gap-3 px-2 mb-3">
          <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center shadow-sm">
            <span className="text-white font-semibold text-sm">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-900 text-sm truncate">{authUser.email}</p>
            {isFreeUser && (
              <p className="text-xs text-green-600 font-medium">Admin • Free access</p>
            )}
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex w-full bg-gradient-to-br from-slate-50 to-blue-50">

      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col w-64 border-r border-slate-200 shadow-sm flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <aside className="relative z-10 w-64 h-full shadow-xl">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Mobile top bar */}
        <header className="md:hidden bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 shadow-sm">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-600"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <div className="w-7 h-7 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-md flex items-center justify-center">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-slate-900 text-sm">ChartReview Pro</span>
          </div>
          <button onClick={handleLogout} className="p-2 text-slate-500 hover:text-red-600">
            <LogOut className="w-4 h-4" />
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {renderPage()}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppInner />
      <Toaster position="top-right" />
    </QueryClientProvider>
  );
}

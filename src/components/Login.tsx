/* eslint-disable @typescript-eslint/no-unused-vars */
// Login.tsx — chartreview-native-frontend
// Updated: 2026-05-04 — Cognito email/password auth, JWT stored in memory

import React, { useState } from 'react';
import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserSession,
} from 'amazon-cognito-identity-js';
import { FileText, Lock, Mail, Eye, EyeOff } from 'lucide-react';

// ── Cognito config ─────────────────────────────────────────────────────────
const USER_POOL_ID = 'us-east-1_HGvNxEFP6';
const CLIENT_ID    = '12tdr6tcnuvc7kn40ka1vubo6m';

const userPool = new CognitoUserPool({
  UserPoolId: USER_POOL_ID,
  ClientId:   CLIENT_ID,
});

// ── Types ──────────────────────────────────────────────────────────────────
export interface AuthUser {
  email: string;
  idToken: string;
  accessToken: string;
  cognitoUser: CognitoUser;
}

interface LoginProps {
  onLogin: (user: AuthUser) => void;
}

// ── Component ──────────────────────────────────────────────────────────────
export default function Login({ onLogin }: LoginProps) {
  const [email,       setEmail]       = useState('');
  const [password,    setPassword]    = useState('');
  const [showPass,    setShowPass]    = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  // ── New password challenge state ─────────────────────────────────────────
  const [needsNewPassword,  setNeedsNewPassword]  = useState(false);
  const [newPassword,       setNewPassword]       = useState('');
  const [newPasswordAgain,  setNewPasswordAgain]  = useState('');
  const [pendingUser,       setPendingUser]        = useState<CognitoUser | null>(null);

  // ── Sign in ───────────────────────────────────────────────────────────────
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const cognitoUser = new CognitoUser({ Username: email.trim(), Pool: userPool });
    const authDetails = new AuthenticationDetails({
      Username: email.trim(),
      Password: password,
    });

    cognitoUser.authenticateUser(authDetails, {
      onSuccess: (session: CognitoUserSession) => {
        setLoading(false);
        onLogin({
          email:       email.trim(),
          idToken:     session.getIdToken().getJwtToken(),
          accessToken: session.getAccessToken().getJwtToken(),
          cognitoUser,
        });
      },
      onFailure: (err: any) => {
        setLoading(false);
        setError(err.message || 'Login failed');
      },
      newPasswordRequired: (_userAttributes: any) => {
        setLoading(false);
        setPendingUser(cognitoUser);
        setNeedsNewPassword(true);
      },
    });
  };

  // ── Complete new password challenge ───────────────────────────────────────
  const handleNewPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword !== newPasswordAgain) {
      setError('Passwords do not match');
      return;
    }
    if (newPassword.length < 12) {
      setError('Password must be at least 12 characters');
      return;
    }

    setLoading(true);
    pendingUser!.completeNewPasswordChallenge(newPassword, {}, {
      onSuccess: (session: CognitoUserSession) => {
        setLoading(false);
        onLogin({
          email:       email.trim(),
          idToken:     session.getIdToken().getJwtToken(),
          accessToken: session.getAccessToken().getJwtToken(),
          cognitoUser: pendingUser!,
        });
      },
      onFailure: (err: any) => {
        setLoading(false);
        setError(err.message || 'Failed to set new password');
      },
    });
  };

  // ── Render: new password form ─────────────────────────────────────────────
  if (needsNewPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 px-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
            <div className="text-center mb-8">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-2xl flex items-center justify-center shadow-lg mx-auto mb-4">
                <Lock className="w-7 h-7 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900">Set New Password</h1>
              <p className="text-slate-500 text-sm mt-1">Your account requires a new password</p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleNewPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Min 12 characters"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Confirm Password</label>
                <input
                  type="password"
                  value={newPasswordAgain}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPasswordAgain(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Repeat password"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold rounded-lg transition-all duration-200 disabled:opacity-60"
              >
                {loading ? 'Setting password…' : 'Set Password & Sign In'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // ── Render: main login form ───────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 px-4">
      <div className="w-full max-w-md">

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8">

          {/* Logo */}
          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-2xl flex items-center justify-center shadow-lg mx-auto mb-4">
              <FileText className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">ChartReview Pro</h1>
            <p className="text-slate-500 text-sm mt-1">Medical-Legal Document Management</p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="you@example.com"
                  required
                  autoFocus
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold rounded-lg transition-all duration-200 disabled:opacity-60 mt-2"
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>

          </form>

          {/* Footer note */}
          <p className="text-center text-xs text-slate-400 mt-6">
            HIPAA-compliant • Secure access only
          </p>
        </div>
      </div>
    </div>
  );
}

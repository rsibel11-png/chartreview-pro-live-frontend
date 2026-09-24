/* eslint-disable @typescript-eslint/no-unused-vars */
// Login.tsx — chartreview-native-frontend
// Updated: 2026-09-21 — Added password recovery (Cognito forgotPassword +
// email reset code + confirmPassword + auto sign-in), alongside the existing
// self-service account creation and admin-created "set new password" flows.
// No backend changes required: Cognito's AccountRecoverySetting already
// falls through to verified_email (no phone numbers are ever collected), so
// forgotPassword() delivers its code the same way signUp()'s verification
// code is delivered.

import React, { useState } from 'react';
import {
  CognitoUserPool,
  CognitoUser,
  CognitoUserAttribute,
  AuthenticationDetails,
  CognitoUserSession,
} from 'amazon-cognito-identity-js';
import { FileText, Lock, Mail, Eye, EyeOff } from 'lucide-react';
import { TOS_VERSION, TOS_SECTIONS, TOS_LAST_UPDATED } from '../legal/termsOfService';

// ── Cognito config ─────────────────────────────────────────────────────────
const USER_POOL_ID = 'us-east-1_HGvNxEFP6';
const CLIENT_ID    = '12tdr6tcnuvc7kn40ka1vubo6m';

// Updated: 2026-09-23 — used by the post-verify acceptTerms/credits calls below (ToS gate).
const AWS_API_URL = process.env.REACT_APP_AWS_API_URL || '';

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

type Mode = 'signin' | 'signup' | 'verify' | 'newPassword' | 'forgot' | 'reset' | 'terms';

// ── Password policy (mirrors the Cognito User Pool policy) ─────────────────
function passwordPolicyError(pw: string): string | null {
  if (pw.length < 12) return 'Password must be at least 12 characters';
  if (!/[A-Z]/.test(pw)) return 'Password must include an uppercase letter';
  if (!/[a-z]/.test(pw)) return 'Password must include a lowercase letter';
  if (!/[0-9]/.test(pw)) return 'Password must include a number';
  if (!/[^A-Za-z0-9]/.test(pw)) return 'Password must include a symbol';
  return null;
}

// ── Shared shell ─────────────────────────────────────────────────────────────
// IMPORTANT: this must live at module scope, not inside Login(). A component
// defined inside another component's render body gets a brand-new function
// identity every render, which forces React to unmount+remount the whole
// subtree on every keystroke -- and any autoFocus input inside re-fires,
// stealing focus back on every render. (This caused the "focus jumps back to
// email" bug on Create Account / Verify / Forgot / Reset screens.)
function Shell({ title, subtitle, icon, error, info, children }: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  error: string | null;
  info: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-2xl flex items-center justify-center shadow-lg mx-auto mb-4">
              {icon}
            </div>
            <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
            <p className="text-slate-500 text-sm mt-1">{subtitle}</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}
          {info && !error && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg text-sm">
              {info}
            </div>
          )}

          {children}

          <p className="text-center text-xs text-slate-400 mt-6">
            HIPAA-compliant • Secure access only
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────────────
export default function Login({ onLogin }: LoginProps) {
  const [mode, setMode] = useState<Mode>('signin');

  const [email,       setEmail]       = useState('');
  const [password,    setPassword]    = useState('');
  const [showPass,    setShowPass]    = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [info,        setInfo]        = useState<string | null>(null);

  // ── New password challenge state (admin-created users) ──────────────────
  const [needsNewPassword,  setNeedsNewPassword]  = useState(false);
  const [newPassword,       setNewPassword]       = useState('');
  const [newPasswordAgain,  setNewPasswordAgain]  = useState('');
  const [pendingUser,       setPendingUser]        = useState<CognitoUser | null>(null);

  // ── Create-account state ──────────────────────────────────────────────────
  const [signupPassword,       setSignupPassword]       = useState('');
  const [signupPasswordAgain,  setSignupPasswordAgain]  = useState('');
  const [verificationCode,     setVerificationCode]     = useState('');
  const [signupUser,           setSignupUser]           = useState<CognitoUser | null>(null);
  const [resendCooldown,       setResendCooldown]       = useState(false);
  const [tosAccepted,          setTosAccepted]          = useState(false);
  // Updated: 2026-09-23 — which mode to return to when the user closes the /terms view
  // (opened from Create Account, so it should come back to 'signup', preserving entered fields).
  const [termsReturnMode,      setTermsReturnMode]      = useState<Mode>('signup');

  // ── Password recovery state ────────────────────────────────────────────────
  const [resetCode,            setResetCode]            = useState('');
  const [resetPassword,        setResetPassword]        = useState('');
  const [resetPasswordAgain,   setResetPasswordAgain]   = useState('');
  const [forgotUser,           setForgotUser]           = useState<CognitoUser | null>(null);

  const resetMessages = () => {
    setError(null);
    setInfo(null);
  };

  // ── Sign in ───────────────────────────────────────────────────────────────
  // Updated: 2026-09-23 — best-effort ToS acceptance record. Calls GET /stripe/credits FIRST
  // (which lazily creates the user's USER_CREDITS_TABLE record with its default free-page
  // grant if none exists yet) and only THEN POSTs /users/accept-terms, so the accept-terms
  // UpdateCommand always lands on an already-existing record and can never race
  // stripe.js's ensureUserRecord "create with defaults only if no record exists yet" check.
  // Fire-and-forget: a network blip here must never block a user from reaching the app they
  // already successfully created and verified — errors are only logged to the console.
  const recordTermsAcceptance = async (idToken: string) => {
    if (!AWS_API_URL) return;
    try {
      await fetch(`${AWS_API_URL}/stripe/credits`, {
        headers: { 'Authorization': `Bearer ${idToken}` },
      });
      await fetch(`${AWS_API_URL}/users/accept-terms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({ version: TOS_VERSION }),
      });
    } catch (err) {
      console.error('recordTermsAcceptance failed (non-blocking):', err);
    }
  };

  const signIn = (signInEmail: string, signInPassword: string, recordTerms: boolean = false) => {
    setLoading(true);
    resetMessages();

    const cognitoUser = new CognitoUser({ Username: signInEmail.trim(), Pool: userPool });
    const authDetails = new AuthenticationDetails({
      Username: signInEmail.trim(),
      Password: signInPassword,
    });

    cognitoUser.authenticateUser(authDetails, {
      onSuccess: (session: CognitoUserSession) => {
        setLoading(false);
        const idToken = session.getIdToken().getJwtToken();
        if (recordTerms) {
          recordTermsAcceptance(idToken);
        }
        onLogin({
          email:       signInEmail.trim(),
          idToken,
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

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    signIn(email, password);
  };

  // ── Complete new password challenge (admin-created users) ────────────────
  const handleNewPassword = (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();

    if (newPassword !== newPasswordAgain) {
      setError('Passwords do not match');
      return;
    }
    const pwErr = passwordPolicyError(newPassword);
    if (pwErr) {
      setError(pwErr);
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

  // ── Create account ────────────────────────────────────────────────────────
  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();

    if (signupPassword !== signupPasswordAgain) {
      setError('Passwords do not match');
      return;
    }
    const pwErr = passwordPolicyError(signupPassword);
    if (pwErr) {
      setError(pwErr);
      return;
    }
    if (!tosAccepted) {
      setError('You must agree to the Terms of Service to create an account.');
      return;
    }

    setLoading(true);
    const attributes = [new CognitoUserAttribute({ Name: 'email', Value: email.trim() })];

    userPool.signUp(email.trim(), signupPassword, attributes, [], (err: any, result: any) => {
      setLoading(false);
      if (err) {
        if (err.code === 'UsernameExistsException') {
          setError('An account with this email already exists. Try signing in instead.');
        } else {
          setError(err.message || 'Could not create account');
        }
        return;
      }
      setSignupUser(result.user);
      setInfo(`We sent a verification code to ${email.trim()}.`);
      setMode('verify');
    });
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();

    if (!signupUser) {
      setError('Something went wrong — please start account creation again.');
      setMode('signup');
      return;
    }

    setLoading(true);
    signupUser.confirmRegistration(verificationCode.trim(), true, (err: any) => {
      if (err) {
        setLoading(false);
        if (err.code === 'CodeMismatchException') {
          setError('Incorrect verification code. Please try again.');
        } else if (err.code === 'ExpiredCodeException') {
          setError('That code expired. Click "Resend code" below to get a new one.');
        } else {
          setError(err.message || 'Verification failed');
        }
        return;
      }
      // Verified — sign the new user straight in, and record their ToS acceptance.
      signIn(email, signupPassword, true);
    });
  };

  const handleResendCode = () => {
    if (!signupUser || resendCooldown) return;
    resetMessages();
    setResendCooldown(true);
    signupUser.resendConfirmationCode((err: any) => {
      setResendCooldown(false);
      if (err) {
        setError(err.message || 'Could not resend code');
      } else {
        setInfo(`A new code was sent to ${email.trim()}.`);
      }
    });
  };

  // ── Password recovery ───────────────────────────────────────────────────────
  const handleForgotPassword = (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();

    if (!email.trim()) {
      setError('Enter your email first');
      return;
    }

    setLoading(true);
    const cognitoUser = new CognitoUser({ Username: email.trim(), Pool: userPool });
    cognitoUser.forgotPassword({
      onSuccess: () => {
        setLoading(false);
        setForgotUser(cognitoUser);
        setInfo(`We sent a password reset code to ${email.trim()}.`);
        setMode('reset');
      },
      onFailure: (err: any) => {
        setLoading(false);
        if (err.code === 'UserNotFoundException') {
          // Don't reveal whether the account exists — same UX either way.
          setForgotUser(cognitoUser);
          setInfo(`If an account exists for ${email.trim()}, a reset code was sent.`);
          setMode('reset');
        } else {
          setError(err.message || 'Could not send reset code');
        }
      },
    });
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();

    if (!forgotUser) {
      setError('Something went wrong — please request a new reset code.');
      setMode('forgot');
      return;
    }
    if (resetPassword !== resetPasswordAgain) {
      setError('Passwords do not match');
      return;
    }
    const pwErr = passwordPolicyError(resetPassword);
    if (pwErr) {
      setError(pwErr);
      return;
    }

    setLoading(true);
    forgotUser.confirmPassword(resetCode.trim(), resetPassword, {
      onSuccess: () => {
        signIn(email, resetPassword);
      },
      onFailure: (err: any) => {
        setLoading(false);
        if (err.code === 'CodeMismatchException') {
          setError('Incorrect reset code. Please try again.');
        } else if (err.code === 'ExpiredCodeException') {
          setError('That code expired. Request a new one.');
        } else {
          setError(err.message || 'Could not reset password');
        }
      },
    });
  };

  const switchMode = (next: Mode) => {
    resetMessages();
    setMode(next);
  };

  // ── Render: admin-created user must set a new password ───────────────────
  if (needsNewPassword) {
    return (
      <Shell error={error} info={info} title="Set New Password" subtitle="Your account requires a new password" icon={<Lock className="w-7 h-7 text-white" />}>
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
      </Shell>
    );
  }

  // ── Render: verify email code (new self-signup) ──────────────────────────
  if (mode === 'verify') {
    return (
      <Shell error={error} info={info} title="Verify Your Email" subtitle={`Enter the code sent to ${email.trim()}`} icon={<Mail className="w-7 h-7 text-white" />}>
        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Verification Code</label>
            <input
              type="text"
              inputMode="numeric"
              value={verificationCode}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setVerificationCode(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg text-sm tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="123456"
              required
              autoFocus
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold rounded-lg transition-all duration-200 disabled:opacity-60"
          >
            {loading ? 'Verifying…' : 'Verify & Sign In'}
          </button>
          <button
            type="button"
            onClick={handleResendCode}
            disabled={resendCooldown}
            className="w-full text-center text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50"
          >
            Resend code
          </button>
        </form>
      </Shell>
    );
  }

  // ── Render: create account ────────────────────────────────────────────────
  // ── Render: Terms of Service (opened from Create Account) ────────────────
  if (mode === 'terms') {
    return (
      <Shell error={error} info={info} title="Terms of Service" subtitle={`Last updated: ${TOS_LAST_UPDATED}`} icon={<FileText className="w-7 h-7 text-white" />}>
        <div className="space-y-5 max-h-[60vh] overflow-y-auto pr-1 text-sm text-slate-700">
          {TOS_SECTIONS.map((section, i) => (
            <div key={i}>
              <h3 className="font-semibold text-slate-800 mb-1">{section.heading}</h3>
              {(section.paragraphs || []).map((p, pi) => (
                <p key={pi} className="mb-2 leading-relaxed">{p}</p>
              ))}
              {section.bullets && (
                <ul className="list-disc pl-5 space-y-1">
                  {section.bullets.map((b, bi) => (
                    <li key={bi} className="leading-relaxed">{b}</li>
                  ))}
                </ul>
              )}
              {(section.closing || []).map((c, ci) => (
                <p key={`closing-${ci}`} className="mt-2 mb-2 leading-relaxed">{c}</p>
              ))}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setMode(termsReturnMode)}
          className="w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold rounded-lg transition-all duration-200 mt-4"
        >
          Back
        </button>
      </Shell>
    );
  }

  if (mode === 'signup') {
    return (
      <Shell error={error} info={info} title="Create Account" subtitle="Set up your ChartReview Pro access" icon={<FileText className="w-7 h-7 text-white" />}>
        <form onSubmit={handleSignUp} className="space-y-4">
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
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input
              type={showPass ? 'text' : 'password'}
              value={signupPassword}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSignupPassword(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Min 12 characters, mixed case, number, symbol"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Confirm Password</label>
            <input
              type={showPass ? 'text' : 'password'}
              value={signupPasswordAgain}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSignupPasswordAgain(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Repeat password"
              required
            />
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-500">
            <input type="checkbox" checked={showPass} onChange={() => setShowPass(!showPass)} />
            Show passwords
          </label>
          <label className="flex items-start gap-2 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={tosAccepted}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTosAccepted(e.target.checked)}
              className="mt-0.5"
              required
            />
            <span>
              I agree to the{' '}
              <button
                type="button"
                onClick={() => { setTermsReturnMode('signup'); setMode('terms'); }}
                className="text-blue-600 hover:text-blue-700 font-medium underline"
              >
                Terms of Service
              </button>
            </span>
          </label>
          <button
            type="submit"
            disabled={loading || !tosAccepted}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold rounded-lg transition-all duration-200 disabled:opacity-60 mt-2"
          >
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
          <p className="text-center text-sm text-slate-500 mt-2">
            Already have an account?{' '}
            <button type="button" onClick={() => switchMode('signin')} className="text-blue-600 hover:text-blue-700 font-medium">
              Sign in
            </button>
          </p>
        </form>
      </Shell>
    );
  }

  // ── Render: forgot password — request reset code ─────────────────────────
  if (mode === 'forgot') {
    return (
      <Shell error={error} info={info} title="Reset Password" subtitle="We'll email you a reset code" icon={<Lock className="w-7 h-7 text-white" />}>
        <form onSubmit={handleForgotPassword} className="space-y-4">
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
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold rounded-lg transition-all duration-200 disabled:opacity-60"
          >
            {loading ? 'Sending code…' : 'Send Reset Code'}
          </button>
          <p className="text-center text-sm text-slate-500 mt-2">
            <button type="button" onClick={() => switchMode('signin')} className="text-blue-600 hover:text-blue-700 font-medium">
              Back to sign in
            </button>
          </p>
        </form>
      </Shell>
    );
  }

  // ── Render: reset password — enter code + new password ───────────────────
  if (mode === 'reset') {
    return (
      <Shell error={error} info={info} title="Set New Password" subtitle={`Enter the code sent to ${email.trim()}`} icon={<Lock className="w-7 h-7 text-white" />}>
        <form onSubmit={handleResetPassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Reset Code</label>
            <input
              type="text"
              inputMode="numeric"
              value={resetCode}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setResetCode(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg text-sm tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="123456"
              required
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
            <input
              type={showPass ? 'text' : 'password'}
              value={resetPassword}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setResetPassword(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Min 12 characters, mixed case, number, symbol"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Confirm Password</label>
            <input
              type={showPass ? 'text' : 'password'}
              value={resetPasswordAgain}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setResetPasswordAgain(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Repeat password"
              required
            />
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-500">
            <input type="checkbox" checked={showPass} onChange={() => setShowPass(!showPass)} />
            Show passwords
          </label>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold rounded-lg transition-all duration-200 disabled:opacity-60 mt-2"
          >
            {loading ? 'Resetting…' : 'Reset Password & Sign In'}
          </button>
          <button
            type="button"
            onClick={handleForgotPassword}
            className="w-full text-center text-sm text-blue-600 hover:text-blue-700"
          >
            Resend code
          </button>
        </form>
      </Shell>
    );
  }

  // ── Render: main sign-in form ─────────────────────────────────────────────
  return (
    <Shell error={error} info={info} title="ChartReview Pro" subtitle="Medical-Legal Document Management" icon={<FileText className="w-7 h-7 text-white" />}>
      <form onSubmit={handleLogin} className="space-y-4">
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

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-slate-700">Password</label>
            <button type="button" onClick={() => switchMode('forgot')} className="text-xs text-blue-600 hover:text-blue-700 font-medium">
              Forgot password?
            </button>
          </div>
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

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold rounded-lg transition-all duration-200 disabled:opacity-60 mt-2"
        >
          {loading ? 'Signing in…' : 'Sign In'}
        </button>

        <p className="text-center text-sm text-slate-500 mt-2">
          New here?{' '}
          <button type="button" onClick={() => switchMode('signup')} className="text-blue-600 hover:text-blue-700 font-medium">
            Create an account
          </button>
        </p>
      </form>
    </Shell>
  );
}

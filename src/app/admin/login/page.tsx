'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ShieldAlert,
  ShieldCheck,
  Phone,
  Mail,
  ArrowRight,
  ArrowLeft,
  Lock,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  HelpCircle,
  ExternalLink
} from 'lucide-react';
import {
  sendPhoneOtp,
  sendEmailOtp,
  verifyPhoneOtp,
  verifyEmailOtp,
} from '@/lib/supabase/auth';
import { checkAdminLoginAuthorizationAction } from '@/server/actions/admin.actions';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

function AdminLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const nextParam = searchParams.get('next') || '/admin/dashboard';
  const errorParam = searchParams.get('error');

  const [method, setMethod] = useState<'phone' | 'email'>('phone');
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [email, setEmail] = useState('');
  const [step, setStep] = useState<'enter-contact' | 'enter-otp'>('enter-contact');
  const [otp, setOtp] = useState('');

  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [resendCountdown, setResendCountdown] = useState(0);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (errorParam === 'unauthorized') {
      setErrorMessage('You are not authorized to access the admin panel.');
    } else if (errorParam === 'suspended') {
      setErrorMessage('Access Denied: Your administrative account has been suspended.');
    } else if (errorParam === 'auth_failed') {
      setErrorMessage('Authentication link expired or invalid. Please request a fresh magic link.');
    }

    // Auto-detect if user already authenticated in browser (only if no error was reported)
    async function checkExistingAuth() {
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const authCheck = await checkAdminLoginAuthorizationAction();
          if (authCheck.authorized) {
            setSuccessMessage('Admin session confirmed! Loading Control Center...');
            setTimeout(() => {
              router.push(nextParam);
            }, 500);
          }
        }
      } catch {
        // Continue showing standard login
      }
    }
    if (!errorParam) {
      checkExistingAuth();
    }
  }, [errorParam, nextParam, router]);

  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  const startResendCountdown = () => {
    setResendCountdown(60);
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setResendCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setIsSending(true);

    try {
      let res;
      if (method === 'phone') {
        const cleanPhone = phone.replace(/\D/g, '');
        if (cleanPhone.length < 10) {
          setErrorMessage('Please enter a valid 10-digit mobile number.');
          setIsSending(false);
          return;
        }
        const fullPhone = `${countryCode}${cleanPhone}`;
        res = await sendPhoneOtp(fullPhone);
      } else {
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          setErrorMessage('Please enter a valid administrative email.');
          setIsSending(false);
          return;
        }
        const siteUrl = typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');
        const adminRedirect = `${siteUrl}/auth/callback?next=${encodeURIComponent(nextParam)}`;
        // Set short-lived SameSite=Lax cookie remembering admin login origin (Requirement 19)
        if (typeof document !== 'undefined') {
          document.cookie = 'sm_admin_login_intent=1; path=/; max-age=900; SameSite=Lax';
        }
        res = await sendEmailOtp(email.trim(), adminRedirect);
      }

      if (res.success) {
        setStep('enter-otp');
        startResendCountdown();
        setSuccessMessage(
          method === 'phone'
            ? `Verification code dispatched to ${countryCode} ${phone}`
            : `Verification code dispatched to ${email}`
        );
      } else {
        setErrorMessage(res.error || 'Failed to dispatch verification code. Try again.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error requesting verification code.');
    } finally {
      setIsSending(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 6) {
      setErrorMessage('Please enter the full 6-digit verification code.');
      return;
    }

    setErrorMessage('');
    setIsVerifying(true);

    try {
      let verifyRes;
      if (method === 'phone') {
        const cleanPhone = phone.replace(/\D/g, '');
        const fullPhone = `${countryCode}${cleanPhone}`;
        verifyRes = await verifyPhoneOtp(fullPhone, otp);
      } else {
        verifyRes = await verifyEmailOtp(email.trim(), otp);
      }

      if (!verifyRes.success) {
        setErrorMessage(verifyRes.error || 'Invalid or expired verification code.');
        setIsVerifying(false);
        return;
      }

      // Step 2: Supabase OTP succeeded. Now verify administrative authorization record
      const authCheck = await checkAdminLoginAuthorizationAction();

      if (!authCheck.authorized) {
        // Immediate session purge to prevent non-admins from holding any admin state
        const supabase = createClient();
        await supabase.auth.signOut();

        setErrorMessage('You are not authorized to access the admin panel.');
        setStep('enter-contact');
        setOtp('');
        setIsVerifying(false);
        return;
      }

      setSuccessMessage('Credentials authenticated. Opening control center...');
      setTimeout(() => {
        router.push(nextParam);
        router.refresh();
      }, 500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Authorization check failed.');
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden">
      {/* Subtle ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-indigo-600/10 blur-3xl pointer-events-none" />

      <div className="max-w-md w-full relative z-10">
        {/* Branding header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white shadow-xl shadow-indigo-600/30 mb-4">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            Shop<span className="text-indigo-400">Mitra</span> Governance Desk
          </h1>
          <p className="text-xs text-slate-400 mt-1.5">
            Restricted Access • Super Admin & Staff Authentication Gateway
          </p>
        </div>

        {/* Security Alert Messages */}
        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-3 animate-fade-in">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed font-medium">{errorMessage}</div>
          </div>
        )}

        {successMessage && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-3 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed font-medium">{successMessage}</div>
          </div>
        )}

        {/* Auth Card */}
        <div className="bg-slate-900/80 border border-slate-800 backdrop-blur-xl rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
          {step === 'enter-contact' ? (
            <form onSubmit={handleSendOtp} className="space-y-5">
              {/* Method Switcher */}
              <div className="flex p-1 rounded-xl bg-slate-950 border border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setMethod('phone');
                    setErrorMessage('');
                  }}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                    method === 'phone'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Phone OTP</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMethod('email');
                    setErrorMessage('');
                  }}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                    method === 'email'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Email OTP</span>
                </button>
              </div>

              {/* Input field */}
              {method === 'phone' ? (
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                    Registered Mobile Number
                  </label>
                  <div className="flex gap-2">
                    <div className="px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300 select-none">
                      {countryCode}
                    </div>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="9876543210"
                      autoFocus
                      maxLength={10}
                      className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-sm font-mono tracking-wider focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1.5">
                    Enter the authorized 10-digit phone linked to your administrative role.
                  </p>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                    Administrative Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@shopmitra.in"
                    autoFocus
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                  <p className="text-[11px] text-slate-500 mt-1.5">
                    One-time login passcode will be dispatched to this mailbox.
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={isSending}
                className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs tracking-wider uppercase transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSending ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Dispatching Passcode...</span>
                  </>
                ) : (
                  <>
                    <span>Send Verification Code</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setStep('enter-contact');
                    setOtp('');
                    setErrorMessage('');
                  }}
                  className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Change {method === 'phone' ? 'Phone' : 'Email'}</span>
                </button>
                <span className="text-xs text-slate-400 font-mono">
                  {method === 'phone' ? `${countryCode} ${phone}` : email}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Enter 6-Digit Passcode
                </label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="• • • • • •"
                  autoFocus
                  maxLength={6}
                  className="w-full py-3 px-4 text-center text-2xl font-mono tracking-[0.5em] rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Didn&apos;t receive code?</span>
                {resendCountdown > 0 ? (
                  <span className="text-slate-500 font-mono">Resend in {resendCountdown}s</span>
                ) : (
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={isSending}
                    className="text-indigo-400 hover:text-indigo-300 font-semibold"
                  >
                    Resend Code
                  </button>
                )}
              </div>

              <button
                type="submit"
                disabled={isVerifying || otp.length < 6}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-xs tracking-wider uppercase transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isVerifying ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verifying Authorization...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Authorize & Enter</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* Security policy notice */}
          <div className="pt-4 border-t border-slate-800/80 text-[11px] text-slate-500 leading-relaxed text-center space-y-1">
            <p>Passwordless architecture enforced. Sessions are tied to isolated cryptographic cookies.</p>
            <p>Every login attempt is logged into the immutable audit ledger.</p>
          </div>
        </div>

        {/* Back to Discovery */}
        <div className="text-center mt-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            <span>Return to Public Storefront</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-500 text-xs">Loading Security Gateway...</div>}>
      <AdminLoginContent />
    </Suspense>
  );
}

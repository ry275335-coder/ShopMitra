// ==============================================================================
// src/lib/supabase/auth.ts
// Supabase OTP Passwordless Authentication Helpers
// Wraps all auth operations — NO passwords, NO custom OTP storage
// ==============================================================================

import { createClient } from './client';
import { 
  checkOtpRateLimit, 
  recordOtpRequest, 
  checkOtpVerifyRateLimit, 
  recordOtpVerifyFailure, 
  recordOtpVerifySuccess 
} from '@/lib/rateLimit';

export type OtpChannel = 'phone' | 'email';

export interface OtpSendResult {
  success: boolean;
  error?: string;
  rateLimited?: boolean;
  retryAfterSeconds?: number;
}

export interface OtpVerifyResult {
  success: boolean;
  isNewUser?: boolean;
  error?: string;
  expired?: boolean;
  invalid?: boolean;
  tooManyAttempts?: boolean;
  remainingAttempts?: number;
}

// ── Send OTP ──────────────────────────────────────────────────────────────────

/**
 * Send OTP to a phone number via Supabase Auth (SMS provider must be configured
 * in Supabase Dashboard → Authentication → Providers → Phone).
 *
 * Phone must be in E.164 format: +91XXXXXXXXXX
 */
export async function sendPhoneOtp(phone: string): Promise<OtpSendResult> {
  // Rate limit check (60-sec cooldown, max 3 per 10 mins)
  const rateLimit = checkOtpRateLimit(phone);
  if (!rateLimit.allowed) {
    return {
      success: false,
      rateLimited: true,
      retryAfterSeconds: rateLimit.retryAfterSeconds,
      error: rateLimit.message || 'OTP rate limit exceeded.',
    };
  }

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithOtp({
    phone,
    options: {
      // channel: 'sms' is the default for phone OTP
      shouldCreateUser: true,
    },
  });

  if (!error) {
    recordOtpRequest(phone);
    return { success: true };
  }

  return parseOtpSendError(error.message);
}

/**
 * Send OTP to an email address via Supabase Auth.
 * Uses Supabase's built-in email OTP (no SMTP setup required for hosted Supabase).
 */
export async function sendEmailOtp(email: string, redirectTo?: string): Promise<OtpSendResult> {
  // Rate limit check (60-sec cooldown, max 3 per 10 mins)
  const rateLimit = checkOtpRateLimit(email);
  if (!rateLimit.allowed) {
    return {
      success: false,
      rateLimited: true,
      retryAfterSeconds: rateLimit.retryAfterSeconds,
      error: rateLimit.message || 'OTP rate limit exceeded.',
    };
  }

  const supabase = createClient();
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
  const targetRedirect = redirectTo || `${siteUrl}/auth/callback`;
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: targetRedirect,
    },
  });

  if (!error) {
    recordOtpRequest(email);
    return { success: true };
  }

  return parseOtpSendError(error.message);
}

// ── Verify OTP ────────────────────────────────────────────────────────────────

/**
 * Verify a phone OTP token received via SMS.
 */
export async function verifyPhoneOtp(
  phone: string,
  token: string
): Promise<OtpVerifyResult> {
  // Brute-force lockout check
  const verifyLimit = checkOtpVerifyRateLimit(phone);
  if (!verifyLimit.allowed) {
    return {
      success: false,
      tooManyAttempts: true,
      error: verifyLimit.message || 'Too many failed attempts. Please try again later.',
    };
  }

  const supabase = createClient();
  const { data, error } = await supabase.auth.verifyOtp({
    phone,
    token,
    type: 'sms',
  });

  if (!error && data.session) {
    recordOtpVerifySuccess(phone);
    const isNewUser =
      data.user?.created_at &&
      Math.abs(new Date(data.user.created_at).getTime() - Date.now()) < 30000;
    return { success: true, isNewUser: !!isNewUser };
  }

  const failResult = recordOtpVerifyFailure(phone);
  if (failResult.locked) {
    return {
      success: false,
      tooManyAttempts: true,
      error: 'Account locked for 15 minutes due to multiple failed verification attempts.',
    };
  }

  const parsed = parseOtpVerifyError(error?.message || 'Verification failed');
  if (failResult.remainingAttempts <= 3) {
    parsed.error = `${parsed.error || 'Verification failed.'} (${failResult.remainingAttempts} attempts remaining)`;
  }
  parsed.remainingAttempts = failResult.remainingAttempts;
  return parsed;
}

/**
 * Verify an email OTP token received via email.
 */
export async function verifyEmailOtp(
  email: string,
  token: string
): Promise<OtpVerifyResult> {
  // Brute-force lockout check
  const verifyLimit = checkOtpVerifyRateLimit(email);
  if (!verifyLimit.allowed) {
    return {
      success: false,
      tooManyAttempts: true,
      error: verifyLimit.message || 'Too many failed attempts. Please try again later.',
    };
  }

  const supabase = createClient();
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'email',
  });

  if (!error && data.session) {
    recordOtpVerifySuccess(email);
    const isNewUser =
      data.user?.created_at &&
      Math.abs(new Date(data.user.created_at).getTime() - Date.now()) < 30000;
    return { success: true, isNewUser: !!isNewUser };
  }

  const failResult = recordOtpVerifyFailure(email);
  if (failResult.locked) {
    return {
      success: false,
      tooManyAttempts: true,
      error: 'Account locked for 15 minutes due to multiple failed verification attempts.',
    };
  }

  const parsed = parseOtpVerifyError(error?.message || 'Verification failed');
  if (failResult.remainingAttempts <= 3) {
    parsed.error = `${parsed.error || 'Verification failed.'} (${failResult.remainingAttempts} attempts remaining)`;
  }
  parsed.remainingAttempts = failResult.remainingAttempts;
  return parsed;
}

// ── Session ───────────────────────────────────────────────────────────────────

export async function getSession() {
  const supabase = createClient();
  const { data, error } = await supabase.auth.getSession();
  if (error) return null;
  return data.session;
}

export async function getAuthUser() {
  const supabase = createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user;
}

export async function signOut(): Promise<{ error?: string }> {
  const supabase = createClient();
  const { error } = await supabase.auth.signOut();
  if (error) return { error: error.message };
  return {};
}

// ── Error Parsers ─────────────────────────────────────────────────────────────

function parseOtpSendError(message: string): OtpSendResult {
  const m = message.toLowerCase();

  if (m.includes('rate limit') || m.includes('too many') || m.includes('sms_send_rate_limit')) {
    return {
      success: false,
      rateLimited: true,
      error: 'Too many OTP requests. Please wait a few minutes before trying again.',
    };
  }
  if (m.includes('invalid phone') || m.includes('phone number')) {
    return { success: false, error: 'Invalid phone number. Please check and try again.' };
  }
  if (m.includes('invalid email') || m.includes('email')) {
    return { success: false, error: 'Invalid email address. Please check and try again.' };
  }
  if (m.includes('sms provider') || m.includes('twilio') || m.includes('no sms')) {
    return {
      success: false,
      error: 'SMS service is not configured. Please use Email OTP instead.',
    };
  }
  if (m.includes('network') || m.includes('fetch')) {
    return { success: false, error: 'Network error. Please check your connection and try again.' };
  }

  return { success: false, error: 'Failed to send verification code. Please try again.' };
}

function parseOtpVerifyError(message: string): OtpVerifyResult {
  const m = message.toLowerCase();

  if (m.includes('expired') || m.includes('otp_expired')) {
    return {
      success: false,
      expired: true,
      error: 'Verification code has expired. Please request a new one.',
    };
  }
  if (m.includes('already used') || m.includes('already been used')) {
    return {
      success: false,
      invalid: true,
      error: 'This code has already been used. Please request a new one.',
    };
  }
  if (m.includes('invalid') || m.includes('incorrect') || m.includes('token_not_found')) {
    return {
      success: false,
      invalid: true,
      error: 'Incorrect verification code. Please check and try again.',
    };
  }
  if (m.includes('too many') || m.includes('rate limit')) {
    return {
      success: false,
      tooManyAttempts: true,
      error: 'Too many failed attempts. Please request a new code.',
    };
  }
  if (m.includes('network') || m.includes('fetch')) {
    return { success: false, error: 'Network error. Please check your connection and try again.' };
  }

  return { success: false, error: 'Verification failed. Please try again.' };
}

// ── Formatters ────────────────────────────────────────────────────────────────

/** Mask phone for display: +91 98765 43210 → +91 XXXXX 43210 */
export function maskPhone(phone: string): string {
  if (!phone) return '';
  const clean = phone.replace(/\s/g, '');
  if (clean.length < 8) return clean;
  const prefix = clean.slice(0, clean.length - 7);
  const last4 = clean.slice(-4);
  return `${prefix}XXXXX${last4}`;
}

/** Mask email for display: user@gmail.com → u***@gmail.com */
export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return email;
  const [local, domain] = email.split('@');
  const masked = local.charAt(0) + '***';
  return `${masked}@${domain}`;
}

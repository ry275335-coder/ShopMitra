// ==============================================================================
// src/lib/rateLimit.ts
// Production In-Memory Sliding Window Rate Limiter for Auth, OTP, and Sensitive Actions
// Prevents SMS Flooding, OTP Bombing, and Token Brute-Force Attacks
// ==============================================================================

interface RateLimitEntry {
  count: number;
  firstRequestTime: number;
  lastRequestTime: number;
}

interface VerificationLimitEntry {
  failedAttempts: number;
  lockedUntil: number;
}

// In-memory sliding stores with automatic sweep
const otpRequestStore = new Map<string, RateLimitEntry>();
const otpVerifyStore = new Map<string, VerificationLimitEntry>();
const ipStore = new Map<string, RateLimitEntry>();

// Configurations
const OTP_REQUEST_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const OTP_REQUEST_MAX_COUNT = 3;              // Max 3 requests per 10 minutes per target
const OTP_COOLDOWN_MS = 60 * 1000;            // 60-second cooldown between requests
const OTP_IP_WINDOW_MS = 60 * 60 * 1000;      // 1 hour
const OTP_IP_MAX_COUNT = 15;                  // Max 15 requests per hour per IP

const OTP_VERIFY_MAX_ATTEMPTS = 5;            // Max 5 failed attempts
const OTP_LOCKOUT_DURATION_MS = 15 * 60 * 1000;// 15-minute lockout on brute-force attempts

// Clean up stale entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of otpRequestStore.entries()) {
      if (now - entry.lastRequestTime > OTP_REQUEST_WINDOW_MS) {
        otpRequestStore.delete(key);
      }
    }
    for (const [key, entry] of otpVerifyStore.entries()) {
      if (now > entry.lockedUntil && entry.failedAttempts === 0) {
        otpVerifyStore.delete(key);
      }
    }
    for (const [key, entry] of ipStore.entries()) {
      if (now - entry.lastRequestTime > OTP_IP_WINDOW_MS) {
        ipStore.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

export interface RateLimitCheckResult {
  allowed: boolean;
  rateLimited?: boolean;
  retryAfterSeconds?: number;
  message?: string;
}

/**
 * Checks if an OTP send request is allowed for the given target (phone/email) and IP.
 */
export function checkOtpRateLimit(identifier: string, ip?: string): RateLimitCheckResult {
  const now = Date.now();
  const normalizedKey = identifier.toLowerCase().trim();

  // 1. Check IP rate limit
  if (ip && ip !== 'unknown') {
    const ipEntry = ipStore.get(ip);
    if (ipEntry) {
      if (now - ipEntry.firstRequestTime < OTP_IP_WINDOW_MS) {
        if (ipEntry.count >= OTP_IP_MAX_COUNT) {
          const waitSec = Math.ceil((OTP_IP_WINDOW_MS - (now - ipEntry.firstRequestTime)) / 1000);
          return {
            allowed: false,
            rateLimited: true,
            retryAfterSeconds: waitSec,
            message: `Too many requests from this network. Please try again in ${Math.ceil(waitSec / 60)} minutes.`,
          };
        }
      } else {
        // Window expired, reset
        ipStore.set(ip, { count: 0, firstRequestTime: now, lastRequestTime: now });
      }
    }
  }

  // 2. Check identifier (phone / email) rate limit
  const entry = otpRequestStore.get(normalizedKey);
  if (!entry) {
    return { allowed: true };
  }

  // Check 60-second consecutive cooldown
  const timeSinceLast = now - entry.lastRequestTime;
  if (timeSinceLast < OTP_COOLDOWN_MS) {
    const waitSec = Math.ceil((OTP_COOLDOWN_MS - timeSinceLast) / 1000);
    return {
      allowed: false,
      rateLimited: true,
      retryAfterSeconds: waitSec,
      message: `Please wait ${waitSec} seconds before requesting another OTP.`,
    };
  }

  // Check window count limit (max 3 per 10 min)
  if (now - entry.firstRequestTime < OTP_REQUEST_WINDOW_MS) {
    if (entry.count >= OTP_REQUEST_MAX_COUNT) {
      const waitSec = Math.ceil((OTP_REQUEST_WINDOW_MS - (now - entry.firstRequestTime)) / 1000);
      return {
        allowed: false,
        rateLimited: true,
        retryAfterSeconds: waitSec,
        message: `OTP limit reached. You can request another OTP in ${Math.ceil(waitSec / 60)} minutes.`,
      };
    }
  } else {
    // Window expired, reset
    otpRequestStore.delete(normalizedKey);
  }

  return { allowed: true };
}

/**
 * Records a dispatched OTP request against identifier and IP.
 */
export function recordOtpRequest(identifier: string, ip?: string): void {
  const now = Date.now();
  const normalizedKey = identifier.toLowerCase().trim();

  // Update identifier store
  const entry = otpRequestStore.get(normalizedKey);
  if (!entry || now - entry.firstRequestTime >= OTP_REQUEST_WINDOW_MS) {
    otpRequestStore.set(normalizedKey, {
      count: 1,
      firstRequestTime: now,
      lastRequestTime: now,
    });
  } else {
    entry.count += 1;
    entry.lastRequestTime = now;
  }

  // Update IP store
  if (ip && ip !== 'unknown') {
    const ipEntry = ipStore.get(ip);
    if (!ipEntry || now - ipEntry.firstRequestTime >= OTP_IP_WINDOW_MS) {
      ipStore.set(ip, { count: 1, firstRequestTime: now, lastRequestTime: now });
    } else {
      ipEntry.count += 1;
      ipEntry.lastRequestTime = now;
    }
  }
}

/**
 * Checks if OTP verification attempts have been exceeded (brute-force protection).
 */
export function checkOtpVerifyRateLimit(identifier: string): RateLimitCheckResult {
  const now = Date.now();
  const normalizedKey = identifier.toLowerCase().trim();

  const entry = otpVerifyStore.get(normalizedKey);
  if (!entry) {
    return { allowed: true };
  }

  if (now < entry.lockedUntil) {
    const waitSec = Math.ceil((entry.lockedUntil - now) / 1000);
    return {
      allowed: false,
      rateLimited: true,
      retryAfterSeconds: waitSec,
      message: `Account temporarily locked due to multiple incorrect attempts. Try again in ${Math.ceil(waitSec / 60)} minutes.`,
    };
  }

  return { allowed: true };
}

/**
 * Records a failed OTP verification attempt.
 */
export function recordOtpVerifyFailure(identifier: string): { remainingAttempts: number; locked: boolean } {
  const now = Date.now();
  const normalizedKey = identifier.toLowerCase().trim();

  let entry = otpVerifyStore.get(normalizedKey);
  if (!entry || now > entry.lockedUntil) {
    entry = { failedAttempts: 0, lockedUntil: 0 };
    otpVerifyStore.set(normalizedKey, entry);
  }

  entry.failedAttempts += 1;

  if (entry.failedAttempts >= OTP_VERIFY_MAX_ATTEMPTS) {
    entry.lockedUntil = now + OTP_LOCKOUT_DURATION_MS;
    return { remainingAttempts: 0, locked: true };
  }

  return {
    remainingAttempts: OTP_VERIFY_MAX_ATTEMPTS - entry.failedAttempts,
    locked: false,
  };
}

/**
 * Resets verification failure counter upon successful verification.
 */
export function recordOtpVerifySuccess(identifier: string): void {
  const normalizedKey = identifier.toLowerCase().trim();
  otpVerifyStore.delete(normalizedKey);
}

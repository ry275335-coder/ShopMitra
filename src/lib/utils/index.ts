// ==============================================================================
// src/lib/utils/index.ts
// Common Formatting, ClassName, and Price Freshness Utilities
// ==============================================================================

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { PriceFreshness } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Calculates 3-tier Price Freshness according to Step 35:
 * 🟢 Recently updated (< 48 hours)
 * 🟡 Needs update (48 hours - 7 days)
 * 🔴 Stale (> 7 days)
 */
export function calculatePriceFreshness(updatedAtString: string): {
  freshness: PriceFreshness;
  label: string;
  badgeClass: string;
} {
  const updatedTime = new Date(updatedAtString).getTime();
  const now = Date.now();
  const diffMinutes = Math.max(0, Math.floor((now - updatedTime) / (1000 * 60)));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 48) {
    let text = 'Updated just now';
    if (diffMinutes >= 1 && diffMinutes < 60) {
      text = `Updated ${diffMinutes}m ago`;
    } else if (diffHours >= 1) {
      text = `Updated ${diffHours}h ago`;
    }

    return {
      freshness: 'recently_updated',
      label: text,
      badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    };
  }

  if (diffDays <= 7) {
    return {
      freshness: 'needs_update',
      label: `Updated ${diffDays} days ago`,
      badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
    };
  }

  return {
    freshness: 'stale',
    label: `Unconfirmed (${diffDays} days ago)`,
    badgeClass: 'bg-rose-50 text-rose-800 border-rose-200',
  };
}

/**
 * Masks a phone number for PII protection.
 * Examples:
 *   "+919876543210" -> "+91 98••••••10"
 *   "9876543210"    -> "98••••••10"
 */
export function maskPhoneNumber(phone?: string | null): string {
  if (!phone) return '';
  const cleaned = phone.trim();
  const digits = cleaned.replace(/\D/g, '');
  if (digits.length < 10) return cleaned;

  const last2 = digits.slice(-2);
  const first2 = digits.length === 12 && digits.startsWith('91') ? digits.slice(2, 4) : digits.slice(0, 2);
  const prefix = digits.length === 12 && digits.startsWith('91') ? '+91 ' : (cleaned.startsWith('+91') ? '+91 ' : '');

  return `${prefix}${first2}••••••${last2}`;
}

/**
 * Scans a text string for phone numbers (Indian 10-digit, with or without +91 / 0 / spaces / dashes)
 * and masks them with bullet masks to prevent PII leakage in public text.
 */
export function maskPiiInText(text?: string | null): string {
  if (!text) return '';
  // Match patterns like +91 9876543210, +91-98765-43210, 09876543210, 9876543210, 98765 43210
  const phoneRegex = /(?:\+?91[\s.-]?)?(?:0)?([6-9]\d{1})[\s.-]?(\d{3})[\s.-]?(\d{3})[\s.-]?(\d{2})/g;
  return text.replace(phoneRegex, (_match, p1, _p2, _p3, p4) => {
    return `${p1}••••••${p4}`;
  });
}


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

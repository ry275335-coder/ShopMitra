// ==============================================================================
// src/lib/reviews.ts
// In-Store GPS Verification, Photo Uploads & Persistent Review Manager
// ==============================================================================

import { calculateDistance } from './geo';
import { maskPhoneNumber, maskPiiInText } from './utils';

export interface VerifiedReview {
  id: string;
  shopId: string;
  shopName: string;
  productId?: string;
  productName?: string;
  authorName: string;
  rating: number;
  reviewText: string;
  photos: string[];
  tags: string[];
  isInStoreVerified: boolean;
  distanceMetersAtReview?: number;
  hasBillProof: boolean;
  createdAt: string;
}

export const REVIEW_TAG_PRESETS = [
  'Exact Counter Rate Honored',
  'GST Bill Provided',
  'Original Sealed Box',
  'UPI / GPay Accepted',
  'Polite Merchant Staff',
  'Fast Checkout',
  'Exchange Guarantee',
];

const STORAGE_KEY = 'shopmitra_verified_reviews';

/**
 * Checks whether the shopper is physically located inside or right in front of the store (<100m)
 */
export function verifyInStoreProximity(
  userLat: number,
  userLng: number,
  shopLat: number,
  shopLng: number,
  thresholdMeters: number = 100
): { isInStore: boolean; distanceMeters: number } {
  const distKm = calculateDistance(userLat, userLng, shopLat, shopLng);
  const distanceMeters = Math.round(distKm * 1000);
  return {
    isInStore: distanceMeters <= thresholdMeters,
    distanceMeters,
  };
}

/**
 * Initial curated realistic in-store reviews with photos
 */
export const SEED_VERIFIED_REVIEWS: VerifiedReview[] = [];


function sanitizeReview(r: VerifiedReview): VerifiedReview {
  // If authorName looks like a mobile number (10+ digits), mask it
  const isPhoneAuthor = /^(?:\+?91)?[6-9]\d{9}$/.test(r.authorName.replace(/[\s.-]/g, ''));
  const safeAuthor = isPhoneAuthor ? maskPhoneNumber(r.authorName) : r.authorName;

  return {
    ...r,
    authorName: safeAuthor,
    reviewText: maskPiiInText(r.reviewText),
  };
}

/**
 * Get all reviews for a specific store (combines seed + local storage)
 */
export function getReviewsForShop(shopId: string): VerifiedReview[] {
  if (typeof window === 'undefined') {
    return SEED_VERIFIED_REVIEWS.filter(r => r.shopId === shopId).map(sanitizeReview);
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const stored: VerifiedReview[] = raw ? JSON.parse(raw) : [];
    const all = [...stored, ...SEED_VERIFIED_REVIEWS];
    // Deduplicate by ID
    const seen = new Set<string>();
    return all.filter(r => {
      if (r.shopId !== shopId) return false;
      if (seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    })
    .map(sanitizeReview)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch {
    return SEED_VERIFIED_REVIEWS.filter(r => r.shopId === shopId).map(sanitizeReview);
  }
}

/**
 * Saves a new verified review to local storage
 */
export function saveVerifiedReview(review: VerifiedReview): void {
  if (typeof window === 'undefined') return;
  try {
    const safeReview = sanitizeReview(review);
    const raw = localStorage.getItem(STORAGE_KEY);
    const current: VerifiedReview[] = raw ? JSON.parse(raw) : [];
    current.unshift(safeReview);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    window.dispatchEvent(new CustomEvent('shopmitra:review_added', { detail: safeReview }));
  } catch (err) {
    console.error('Failed to save review:', err);
  }
}

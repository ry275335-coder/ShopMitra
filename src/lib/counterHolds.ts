import { CounterHold } from '@/types';

function getKey(userId?: string): string {
  return userId ? `shopmitra_counter_holds_${userId}` : 'shopmitra_counter_holds_guest';
}

export function getStoredCounterHolds(userId?: string): CounterHold[] {
  if (typeof window === 'undefined') return [];
  try {
    const key = getKey(userId);
    let raw = localStorage.getItem(key);
    // Migration fallback for legacy un-namespaced holds if guest
    if (!raw && !userId) {
      raw = localStorage.getItem('shopmitra_counter_holds');
    }
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveCounterHold(hold: CounterHold, userId?: string): CounterHold[] {
  if (typeof window === 'undefined') return [];
  try {
    const key = getKey(userId);
    const existing = getStoredCounterHolds(userId);
    const updated = [hold, ...existing.filter(h => h.id !== hold.id)];
    localStorage.setItem(key, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('shopmitra:holds_updated'));
    return updated;
  } catch {
    return [];
  }
}

export function updateCounterHoldStatus(id: string, status: CounterHold['status'], userId?: string): CounterHold[] {
  if (typeof window === 'undefined') return [];
  try {
    const key = getKey(userId);
    const existing = getStoredCounterHolds(userId);
    const updated = existing.map(h => h.id === id ? { ...h, status } : h);
    localStorage.setItem(key, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('shopmitra:holds_updated'));
    return updated;
  } catch {
    return [];
  }
}

export function deleteCounterHold(id: string, userId?: string): CounterHold[] {
  if (typeof window === 'undefined') return [];
  try {
    const key = getKey(userId);
    const existing = getStoredCounterHolds(userId);
    const updated = existing.filter(h => h.id !== id);
    localStorage.setItem(key, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('shopmitra:holds_updated'));
    return updated;
  } catch {
    return [];
  }
}

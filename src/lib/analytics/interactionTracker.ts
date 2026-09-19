// ==============================================================================
// src/lib/analytics/interactionTracker.ts
// Real-time Persistent Interaction & Telemetry Tracker for Merchants and Shoppers
// ==============================================================================

export interface ShopTelemetry {
  views: number;
  searches: number;
  directions: number;
  calls: number;
  whatsapp: number;
  lastActive: string;
  topSearchQuery?: string;
}

const STORAGE_PREFIX = 'shopmitra_telemetry_';

export function getShopTelemetry(shopId: string): ShopTelemetry {
  if (typeof window === 'undefined') {
    return {
      views: 0,
      searches: 0,
      directions: 0,
      calls: 0,
      whatsapp: 0,
      lastActive: new Date().toISOString(),
    };
  }

  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${shopId}`);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Failed to read shop telemetry', err);
  }

  return {
    views: 0,
    searches: 0,
    directions: 0,
    calls: 0,
    whatsapp: 0,
    lastActive: new Date().toISOString(),
  };
}

export function recordShopInteraction(
  shopId: string,
  type: 'view' | 'search' | 'direction' | 'call' | 'whatsapp',
  metadata?: { query?: string }
): ShopTelemetry {
  if (typeof window === 'undefined' || !shopId) {
    return {
      views: 0,
      searches: 0,
      directions: 0,
      calls: 0,
      whatsapp: 0,
      lastActive: new Date().toISOString(),
    };
  }

  const current = getShopTelemetry(shopId);
  if (type === 'view') current.views += 1;
  else if (type === 'search') {
    current.searches += 1;
    if (metadata?.query) current.topSearchQuery = metadata.query;
  } else if (type === 'direction') current.directions += 1;
  else if (type === 'call') current.calls += 1;
  else if (type === 'whatsapp') current.whatsapp += 1;

  current.lastActive = new Date().toISOString();

  try {
    localStorage.setItem(`${STORAGE_PREFIX}${shopId}`, JSON.stringify(current));
    window.dispatchEvent(new CustomEvent('shopmitra:telemetry_updated', { detail: { shopId, telemetry: current } }));
  } catch (err) {
    console.error('Failed to save shop telemetry', err);
  }

  return current;
}

export interface CustomerStoreInteraction {
  shopId: string;
  shopName: string;
  shopCity?: string;
  shopPhone?: string;
  shopWhatsapp?: string;
  type: 'view' | 'direction' | 'call' | 'whatsapp';
  timestamp: string;
}

export function getCustomerStoreInteractions(): CustomerStoreInteraction[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('shopmitra_customer_store_interactions');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function recordCustomerStoreInteraction(entry: Omit<CustomerStoreInteraction, 'timestamp'>) {
  if (typeof window === 'undefined' || !entry.shopId) return;
  try {
    const list = getCustomerStoreInteractions();
    const filtered = list.filter(i => i.shopId !== entry.shopId);
    filtered.unshift({
      ...entry,
      timestamp: new Date().toISOString(),
    });
    localStorage.setItem('shopmitra_customer_store_interactions', JSON.stringify(filtered.slice(0, 20)));
    window.dispatchEvent(new CustomEvent('shopmitra:customer_interactions_updated'));
  } catch {}
}

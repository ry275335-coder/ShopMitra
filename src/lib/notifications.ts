// ==============================================================================
// src/lib/notifications.ts
// Push Notification & Local Price Drop Alert Trigger Engine (Option 3)
// ==============================================================================

import { PriceAlert } from '@/types';

/**
 * Requests native browser push notification permission
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch {
    return 'denied';
  }
}

/**
 * Sends a native system notification with fallback
 */
export function sendBrowserNotification(title: string, options?: NotificationOptions): boolean {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  if (Notification.permission === 'granted') {
    try {
      const notif = new Notification(title, {
        icon: '/logo.svg',
        badge: '/logo.svg',
        ...options,
      });

      notif.onclick = () => {
        window.focus();
        notif.close();
      };
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

function getAlertsKey(userId?: string): string {
  return userId ? `shopmitra_price_alerts_${userId}` : 'shopmitra_price_alerts_guest';
}

/**
 * Retrieves all stored price alerts from localStorage
 */
export function getStoredPriceAlerts(userId?: string): PriceAlert[] {
  if (typeof window === 'undefined') return [];
  try {
    const key = getAlertsKey(userId);
    let raw = localStorage.getItem(key);
    if (!raw && !userId) {
      raw = localStorage.getItem('shopmitra_price_alerts');
    }
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Saves or updates a price alert in localStorage
 */
export function savePriceAlert(alert: PriceAlert, userId?: string): PriceAlert[] {
  if (typeof window === 'undefined') return [];
  try {
    const key = getAlertsKey(userId);
    const existing = getStoredPriceAlerts(userId);
    const updated = [alert, ...existing.filter(a => a.id !== alert.id)];
    localStorage.setItem(key, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('shopmitra:alerts_updated'));
    return updated;
  } catch {
    return [];
  }
}

/**
 * Deletes a price alert from localStorage
 */
export function deletePriceAlert(alertId: string, userId?: string): PriceAlert[] {
  if (typeof window === 'undefined') return [];
  try {
    const key = getAlertsKey(userId);
    const existing = getStoredPriceAlerts(userId);
    const updated = existing.filter(a => a.id !== alertId);
    localStorage.setItem(key, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('shopmitra:alerts_updated'));
    return updated;
  } catch {
    return [];
  }
}

/**
 * Scans active alerts when a price drop occurs and triggers instant push notifications
 */
export function checkAndTriggerPriceAlerts(
  productId: string,
  newPrice: number,
  shopName: string,
  shopDistanceKm?: number,
  userId?: string
): { triggered: boolean; alert?: PriceAlert } {
  const alerts = getStoredPriceAlerts(userId);
  let matchedAlert: PriceAlert | undefined;

  const updatedAlerts = alerts.map(alert => {
    if (
      alert.productId === productId &&
      alert.status === 'active' &&
      alert.targetPrice >= newPrice
    ) {
      matchedAlert = {
        ...alert,
        status: 'triggered',
        lastTriggeredAt: new Date().toISOString(),
        triggeredShopName: shopName,
        triggeredPrice: newPrice,
      };

      // 1. Fire system push notification
      sendBrowserNotification(`🔥 Price Drop Alert: ₹${newPrice.toLocaleString('en-IN')}`, {
        body: `${alert.productName} just dropped to ₹${newPrice.toLocaleString('en-IN')} at ${shopName}! Tap to view counter rate.`,
        tag: `price-drop-${productId}`,
      });

      return matchedAlert;
    }
    return alert;
  });

  if (matchedAlert) {
    try {
      const key = getAlertsKey(userId);
      localStorage.setItem(key, JSON.stringify(updatedAlerts));
      window.dispatchEvent(new CustomEvent('shopmitra:alerts_updated'));
      window.dispatchEvent(new CustomEvent('shopmitra:price_alert_triggered', { detail: matchedAlert }));
    } catch {}
    return { triggered: true, alert: matchedAlert };
  }

  return { triggered: false };
}

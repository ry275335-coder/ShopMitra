// ==============================================================================
// src/components/customer/PriceAlertsDrawer.tsx
// Customer Price Drop & Stock Alerts Center (Option 3)
// ==============================================================================

'use client';

import React, { useState, useEffect } from 'react';
import { PriceAlert, MasterProduct } from '@/types';
import { 
  X, 
  Bell, 
  BellRing, 
  Trash2, 
  CheckCircle2, 
  TrendingDown, 
  Sparkles, 
  Store, 
  ArrowRight,
  ShieldCheck,
  Zap,
  Volume2
} from 'lucide-react';
import { 
  getStoredPriceAlerts, 
  deletePriceAlert, 
  savePriceAlert, 
  requestNotificationPermission, 
  sendBrowserNotification,
  checkAndTriggerPriceAlerts
} from '@/lib/notifications';
import { useToast } from '@/components/ui/Toast';
import { useApp } from '@/components/common/AppContext';

export function PriceAlertsDrawer({
  isOpen,
  onClose,
  onOpenProduct,
}: {
  isOpen: boolean;
  onClose: () => void;
  onOpenProduct?: (productId: string) => void;
}) {
  const { showToast } = useToast();
  const { authUser } = useApp();
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>('default');

  const loadAlerts = () => {
    setAlerts(getStoredPriceAlerts(authUser?.id));
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermissionStatus(Notification.permission);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadAlerts();
    }
  }, [isOpen, authUser?.id]);

  useEffect(() => {
    const handleUpdate = () => loadAlerts();
    window.addEventListener('shopmitra:alerts_updated', handleUpdate);
    return () => window.removeEventListener('shopmitra:alerts_updated', handleUpdate);
  }, [authUser?.id]);

  if (!isOpen) return null;

  const handleRequestPermission = async () => {
    const perm = await requestNotificationPermission();
    setPermissionStatus(perm);
    if (perm === 'granted') {
      showToast('🔔 Push notifications enabled! You will get instant alerts on price drops.', 'success');
      sendBrowserNotification('ShopMitra Alerts Active! 🔔', {
        body: 'You will now receive instant counter rate drops & restock alerts directly on your screen.',
      });
    } else {
      showToast('Notification permission blocked or dismissed.', 'warning');
    }
  };

  const handleDelete = (id: string) => {
    const updated = deletePriceAlert(id, authUser?.id);
    setAlerts(updated);
    showToast('Alert removed.', 'info');
  };

  const handleSimulateDrop = (alert: PriceAlert) => {
    const droppedPrice = Math.max(100, alert.targetPrice - 500);
    const demoShop = 'Premier Mobiles & Electronics';

    checkAndTriggerPriceAlerts(alert.productId, droppedPrice, demoShop, 1.2, authUser?.id);
    loadAlerts();

    showToast(
      `🔥 Price drop simulated! ${alert.productName} dropped to ₹${droppedPrice.toLocaleString('en-IN')} at ${demoShop}!`,
      'success'
    );
  };

  const activeAlerts = alerts.filter(a => a.status === 'active');
  const triggeredAlerts = alerts.filter(a => a.status === 'triggered');

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md h-full flex flex-col shadow-2xl border-l border-slate-200 dark:border-slate-800">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-sm">
              <BellRing className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Price & Stock Alerts</span>
                {alerts.length > 0 && (
                  <span className="text-[10px] font-black bg-amber-500 text-white px-2 py-0.5 rounded-full">
                    {alerts.length}
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-slate-500">Live monitoring across verified nearby stores</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Push Notification Permission Banner */}
        <div className="p-3.5 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40 border-b border-amber-200/80 dark:border-amber-900/60 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Bell className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="text-xs font-bold text-amber-900 dark:text-amber-200 truncate">
              {permissionStatus === 'granted'
                ? '🟢 Push Notifications Enabled'
                : 'Turn on instant screen alerts'}
            </span>
          </div>

          {permissionStatus !== 'granted' && (
            <button
              onClick={handleRequestPermission}
              className="py-1 px-2.5 bg-amber-600 hover:bg-amber-500 text-white font-black text-[11px] rounded-lg transition-colors shadow-xs shrink-0"
            >
              Enable Now
            </button>
          )}
        </div>

        {/* Content Area */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3.5 flex-1 bg-slate-50/50 dark:bg-slate-950/50">
          {alerts.length === 0 ? (
            <div className="text-center py-16 px-4 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 flex items-center justify-center mx-auto">
                <Bell className="w-7 h-7" />
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">No Price Alerts Active</h4>
              <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                Tap the <strong>Bell icon</strong> on any product comparison card to set your target rate and receive instant alerts when local counter prices drop!
              </p>
            </div>
          ) : (
            alerts.map((alert) => {
              const isTriggered = alert.status === 'triggered';

              return (
                <div
                  key={alert.id}
                  className={`bg-white dark:bg-slate-900 rounded-2xl p-4 border transition-all shadow-xs space-y-3 ${
                    isTriggered
                      ? 'border-emerald-400 dark:border-emerald-700 ring-2 ring-emerald-500/20 bg-emerald-50/20'
                      : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  {/* Alert Status Banner */}
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1 ${
                        isTriggered
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300 animate-pulse'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300'
                      }`}
                    >
                      {isTriggered ? (
                        <>
                          <TrendingDown className="w-3 h-3" />
                          <span>Rate Dropped Below Target!</span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-3 h-3" />
                          <span>Monitoring (Within {alert.radiusKm} km)</span>
                        </>
                      )}
                    </span>

                    <button
                      onClick={() => handleDelete(alert.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                      title="Delete alert"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Product Details */}
                  <div className="flex items-start gap-3">
                    {alert.productImage && (
                      <img
                        src={alert.productImage}
                        alt={alert.productName}
                        className="w-14 h-14 rounded-xl object-contain bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 p-1 shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      {alert.productBrand && (
                        <span className="text-[10px] font-black uppercase text-brand-700 dark:text-brand-400">
                          {alert.productBrand}
                        </span>
                      )}
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {alert.productName}
                      </h4>

                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-slate-500">
                          Target: <strong className="text-slate-900 dark:text-white">₹{alert.targetPrice.toLocaleString('en-IN')}</strong>
                        </span>
                        <span className="text-xs text-slate-400">•</span>
                        <span className="text-xs text-slate-500">
                          MRP: <del>₹{(alert.mrp || alert.targetPrice).toLocaleString('en-IN')}</del>
                        </span>
                      </div>

                      {/* If Triggered Details */}
                      {isTriggered && alert.triggeredShopName && (
                        <div className="mt-2 p-2 bg-emerald-100/70 dark:bg-emerald-950/60 rounded-xl border border-emerald-300 dark:border-emerald-800 text-[11px] text-emerald-900 dark:text-emerald-200">
                          <p className="font-extrabold flex items-center gap-1">
                            <span>🎉 Dropped to ₹{alert.triggeredPrice?.toLocaleString('en-IN')}!</span>
                          </p>
                          <p className="text-[10px] text-emerald-800 dark:text-emerald-300">
                            Available now at <strong>{alert.triggeredShopName}</strong>
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-1">
                    {!isTriggered ? (
                      <button
                        onClick={() => handleSimulateDrop(alert)}
                        className="flex-1 py-1.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-amber-100 dark:hover:bg-amber-950 text-slate-700 dark:text-slate-200 hover:text-amber-800 dark:hover:text-amber-300 font-bold text-[11px] transition-colors flex items-center justify-center gap-1.5 border border-slate-200 dark:border-slate-700"
                        title="Simulates a local shop price drop to test notification"
                      >
                        <Volume2 className="w-3.5 h-3.5 text-amber-600" />
                        <span>Simulate Price Drop & Test</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          onClose();
                          if (onOpenProduct) onOpenProduct(alert.productId);
                        }}
                        className="flex-1 py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-[11px] transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                      >
                        <span>View Counter Rate & Hold</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-center">
          <p className="text-[11px] text-slate-400">
            ShopMitra monitors local store rate updates 24/7 without sending spam.
          </p>
        </div>

      </div>
    </div>
  );
}

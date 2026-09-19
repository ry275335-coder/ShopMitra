// ==============================================================================
// src/components/customer/PriceAlertModal.tsx
// Set Real-Time Target Price Drop Notification (Step 48)
// ==============================================================================

'use client';

import React, { useState } from 'react';
import { MasterProduct } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useApp } from '@/components/common/AppContext';
import { useToast } from '@/components/ui/Toast';
import { Bell, ShieldCheck, MapPin, CheckCircle, Percent, Sparkles } from 'lucide-react';
import { createPriceAlertAction } from '@/server/actions/customer.actions';
import { savePriceAlert, requestNotificationPermission, sendBrowserNotification } from '@/lib/notifications';
import { PriceAlert } from '@/types';

export function PriceAlertModal({
  isOpen,
  onClose,
  product,
  currentLowestPrice,
}: {
  isOpen: boolean;
  onClose: () => void;
  product: MasterProduct | null;
  currentLowestPrice?: number;
}) {
  const { userLocation, searchRadiusKm, authUser, customerUser } = useApp();
  const { showToast } = useToast();

  const [targetPrice, setTargetPrice] = useState<string>(
    currentLowestPrice ? Math.floor(currentLowestPrice * 0.95).toString() : ''
  );
  const [radiusKm, setRadiusKm] = useState<number>(searchRadiusKm || 5);
  const [phone, setPhone] = useState<string>(customerUser?.mobile || '9876543210');
  const [email, setEmail] = useState<string>(customerUser?.email || '');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  if (!product) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numPrice = parseFloat(targetPrice);
    if (!numPrice || numPrice <= 0) {
      showToast({ title: 'Invalid Price', message: 'Please enter a valid target price.', type: 'warning' });
      return;
    }

    if (numPrice >= product.mrp) {
      showToast({ title: 'Price Alert Notice', message: 'Target price should be lower than MRP.', type: 'warning' });
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Request browser push notification permission
      const perm = await requestNotificationPermission();

      // 2. Save locally for instant client-side trigger detection
      const newAlert: PriceAlert = {
        id: `alert-${Date.now()}`,
        productId: product.id,
        productName: product.name,
        productImage: product.imageUrl,
        productBrand: product.brand,
        currentLowestPrice: currentLowestPrice || product.mrp,
        targetPrice: numPrice,
        mrp: product.mrp,
        alertType: 'price_drop',
        radiusKm,
        phone,
        email,
        createdAt: new Date().toISOString(),
        status: 'active',
      };
      savePriceAlert(newAlert, authUser?.id);

      // 3. Dispatch test confirmation notification if granted
      if (perm === 'granted') {
        sendBrowserNotification(`Price Alert Active: ${product.name}`, {
          body: `We will notify you immediately when nearby shop rates drop to ₹${numPrice.toLocaleString('en-IN')}.`,
        });
      }

      await createPriceAlertAction({
        productId: product.id,
        targetPrice: numPrice,
        radiusKm,
        phone,
        email,
        lat: userLocation.lat,
        lng: userLocation.lng,
      });

      setIsSuccess(true);
      showToast({
        title: '🔔 Price Alert Set!',
        message: `Monitoring ${product.name} across shops in ${radiusKm} km for rates below ₹${numPrice.toLocaleString('en-IN')}.`,
        type: 'success',
      });
      setTimeout(() => {
        setIsSuccess(false);
        onClose();
      }, 1600);
    } catch {
      showToast({ title: 'System Error', message: 'Could not create price alert.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md" title="Set Instant Price Drop Alert">
      {isSuccess ? (
        <div className="text-center py-8 space-y-3">
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 animate-bounce" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Price Alert Activated!</h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 max-w-sm mx-auto">
            As soon as any local shop in your {radiusKm} km radius drops their rate below ₹{parseFloat(targetPrice).toLocaleString('en-IN')}, you will get an instant alert!
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-3">
            <img 
              src={product.imageUrl || 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=400&q=80'} 
              alt={product.name} 
              className="w-12 h-12 rounded-lg object-contain bg-white dark:bg-slate-900 p-1 border border-slate-200 dark:border-slate-700" 
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-500 uppercase">{product.brand}</p>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">{product.name}</h4>
              <div className="flex items-center gap-2 text-xs mt-0.5">
                <span className="text-slate-500">MRP: ₹{product.mrp.toLocaleString('en-IN')}</span>
                {currentLowestPrice && (
                  <span className="text-emerald-600 font-bold">Current Best: ₹{currentLowestPrice.toLocaleString('en-IN')}</span>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Notify Me If Price Drops Below (₹)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
              <input
                type="number"
                required
                min="1"
                max={product.mrp}
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                placeholder="e.g. 52000"
                className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold text-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>

            {/* Quick Percentage Chips */}
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <span className="text-[10px] text-slate-400 font-bold uppercase mr-0.5">Quick Target:</span>
              {[5, 10, 15, 20].map((pct) => {
                const basePrice = currentLowestPrice || product.mrp;
                const calc = Math.round(basePrice * (1 - pct / 100));
                return (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setTargetPrice(calc.toString())}
                    className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-emerald-100 hover:text-emerald-800 dark:hover:bg-emerald-950 text-slate-700 dark:text-slate-300 text-[10px] font-bold transition-colors"
                  >
                    -{pct}% (₹{calc.toLocaleString('en-IN')})
                  </button>
                );
              })}
            </div>

            <p className="text-[11px] text-slate-500 mt-1.5">
              Enter your desired target rate. Most local deals drop 5% - 15% on weekend stock arrivals.
            </p>
          </div>

          <div>
            <div className="flex justify-between items-center text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" /> Search Radius:
              </span>
              <span className="text-emerald-600 font-extrabold">{radiusKm} Kilometers</span>
            </div>
            <input
              type="range"
              min="1"
              max="25"
              step="1"
              value={radiusKm}
              onChange={(e) => setRadiusKm(parseInt(e.target.value))}
              className="w-full accent-emerald-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>1 km (Walking)</span>
              <span>5 km (Neighborhood)</span>
              <span>15 km</span>
              <span>25 km (Citywide)</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                WhatsApp Phone
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Notification Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button variant="ghost" size="md" type="button" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              type="submit"
              isLoading={isSubmitting}
              leftIcon={<Bell className="w-4 h-4" />}
            >
              Set Price Alert
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

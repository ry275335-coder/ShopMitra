// ==============================================================================
// src/components/customer/CounterHoldsDrawer.tsx
// Customer Active Counter Holds & WhatsApp Reservations Manager (Phase 6+)
// ==============================================================================

'use client';

import React, { useState, useEffect } from 'react';
import { CounterHold } from '@/types';
import { 
  X, 
  ShoppingBag, 
  MapPin, 
  Phone, 
  MessageSquare, 
  Navigation, 
  CheckCircle2, 
  Clock, 
  Trash2,
  ExternalLink,
  Store,
  Sparkles
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { useApp } from '@/components/common/AppContext';
import { getDirectionsUrl } from '@/lib/geo';

import { getStoredCounterHolds, updateCounterHoldStatus, deleteCounterHold } from '@/lib/counterHolds';

export function CounterHoldsDrawer({
  isOpen,
  onClose,
  onOpenProduct,
}: {
  isOpen: boolean;
  onClose: () => void;
  onOpenProduct?: (productId: string) => void;
}) {
  const { showToast } = useToast();
  const { userLocation, authUser } = useApp();
  const [holds, setHolds] = useState<CounterHold[]>([]);

  const loadHolds = () => {
    setHolds(getStoredCounterHolds(authUser?.id));
  };

  useEffect(() => {
    if (isOpen) {
      loadHolds();
    }
  }, [isOpen, authUser?.id]);

  useEffect(() => {
    const handleUpdated = () => loadHolds();
    window.addEventListener('shopmitra:holds_updated', handleUpdated);
    return () => window.removeEventListener('shopmitra:holds_updated', handleUpdated);
  }, [authUser?.id]);

  if (!isOpen) return null;

  const updateStatus = (id: string, status: 'active' | 'completed' | 'cancelled') => {
    const updated = updateCounterHoldStatus(id, status, authUser?.id);
    setHolds(updated);
    showToast(
      status === 'completed' ? '🎉 Marked as picked up! Hope you had great savings.' : 'Hold cancelled.',
      'info'
    );
  };

  const deleteHold = (id: string) => {
    const updated = deleteCounterHold(id, authUser?.id);
    setHolds(updated);
    showToast('Removed from holds history', 'info');
  };

  const handleWhatsAppFollowup = (hold: CounterHold) => {
    const phone = (hold.shopWhatsapp || hold.shopPhone).replace(/\D/g, '');
    const msg = encodeURIComponent(
      `Hello ${hold.shopName}, regarding my hold for ${hold.productName} on ShopMitra: I am on my way to your counter now.`
    );
    window.open(`https://wa.me/91${phone}?text=${msg}`, '_blank');
  };

  const handleDirections = (hold: CounterHold) => {
    window.open(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hold.shopName + ' ' + (hold.shopAddress || ''))}`,
      '_blank'
    );
  };

  const activeCount = holds.filter(h => h.status === 'active').length;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md h-full flex flex-col shadow-2xl border-l border-slate-200 dark:border-slate-800">
        
        {/* Top Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
              🛍️
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <span>My Counter Holds</span>
                {activeCount > 0 && (
                  <span className="text-[10px] font-black bg-emerald-600 text-white px-2 py-0.5 rounded-full">
                    {activeCount} Active
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-slate-500">Reserved items to pick up at store counters</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3.5 flex-1 bg-slate-50/50 dark:bg-slate-950/50">
          {holds.length === 0 ? (
            <div className="text-center py-16 px-4 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center mx-auto">
                <ShoppingBag className="w-7 h-7" />
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">No Counter Holds Yet</h4>
              <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                When you find great rates, tap <strong>&quot;Hold at Counter&quot;</strong> to reserve items directly with local store merchants on WhatsApp before travelling!
              </p>
            </div>
          ) : (
            holds.map((hold) => {
              const isActive = hold.status === 'active';
              const isCompleted = hold.status === 'completed';

              return (
                <div
                  key={hold.id}
                  className={`bg-white dark:bg-slate-900 rounded-2xl p-4 border transition-all shadow-xs space-y-3 ${
                    isActive
                      ? 'border-emerald-300 dark:border-emerald-800/80 ring-1 ring-emerald-400/20'
                      : 'border-slate-200 dark:border-slate-800 opacity-75'
                  }`}
                >
                  {/* Status Banner & Shop */}
                  <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-2.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Store className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="font-extrabold text-xs text-slate-900 dark:text-white truncate">
                        {hold.shopName}
                      </span>
                    </div>

                    <span
                      className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0 ${
                        isActive
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300'
                          : isCompleted
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}
                    >
                      {isActive ? 'Arriving Soon' : isCompleted ? 'Picked Up' : 'Cancelled'}
                    </span>
                  </div>

                  {/* Product Details */}
                  <div className="flex items-start gap-3">
                    {hold.productImage && (
                      <img
                        src={hold.productImage}
                        alt={hold.productName}
                        className="w-14 h-14 rounded-xl object-contain bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 p-1 shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      {hold.productBrand && (
                        <span className="text-[10px] font-black uppercase text-emerald-700 dark:text-emerald-400">
                          {hold.productBrand}
                        </span>
                      )}
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {hold.productName}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-black text-slate-900 dark:text-white">
                          ₹{hold.price.toLocaleString('en-IN')} × {hold.quantity}
                        </span>
                        <span className="text-xs font-black text-emerald-600">
                          = ₹{hold.totalAmount.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>Expected: {hold.arrivalEstimate}</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-1 flex items-center gap-1.5 flex-wrap">
                    <button
                      onClick={() => handleWhatsAppFollowup(hold)}
                      className="flex-1 py-1.5 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] transition-colors flex items-center justify-center gap-1 shadow-xs"
                    >
                      <MessageSquare className="w-3 h-3" />
                      <span>WhatsApp</span>
                    </button>

                    <button
                      onClick={() => handleDirections(hold)}
                      className="py-1.5 px-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold text-[11px] transition-colors flex items-center gap-1"
                    >
                      <Navigation className="w-3 h-3 text-blue-600" />
                      <span>Directions</span>
                    </button>

                    {isActive && (
                      <button
                        onClick={() => updateStatus(hold.id, 'completed')}
                        className="py-1.5 px-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 font-bold text-[11px] transition-colors flex items-center gap-1"
                        title="Mark as picked up"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Picked Up</span>
                      </button>
                    )}

                    {isActive ? (
                      <button
                        onClick={() => updateStatus(hold.id, 'cancelled')}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 transition-colors"
                        title="Cancel hold"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button
                        onClick={() => deleteHold(hold.id)}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 transition-colors"
                        title="Delete record"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
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
            Counter holds are coordinated directly with local merchants via WhatsApp.
          </p>
        </div>

      </div>
    </div>
  );
}

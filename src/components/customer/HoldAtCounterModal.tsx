// ==============================================================================
// src/components/customer/HoldAtCounterModal.tsx
// 1-Click WhatsApp "Hold at Counter" Ordering & Reservation Modal (Phase 6+)
// ==============================================================================

'use client';

import React, { useState, useEffect } from 'react';
import { MasterProduct, ShopProductRate, CounterHold } from '@/types';
import { 
  X, 
  MessageSquare, 
  Clock, 
  ShieldCheck, 
  Store, 
  MapPin, 
  CheckCircle2, 
  Sparkles, 
  Send,
  Plus,
  Minus,
  Info
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { formatDistance } from '@/lib/geo';
import { useApp } from '@/components/common/AppContext';
import { saveCounterHold } from '@/lib/counterHolds';

const ARRIVAL_PRESETS = [
  { id: '15_mins', label: '⚡ 15 mins (Nearby)', text: 'in about 15 minutes' },
  { id: '30_mins', label: '🚶 30 mins (On the way)', text: 'in about 30 minutes' },
  { id: '1_hour', label: '🚗 1 hour', text: 'in about 1 hour' },
  { id: 'evening', label: '🕒 Today Evening', text: 'today evening before closing' },
];

export function HoldAtCounterModal({
  isOpen,
  onClose,
  product,
  rate,
  onHoldCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  product: MasterProduct | null;
  rate: ShopProductRate | null;
  onHoldCreated?: (hold: CounterHold) => void;
}) {
  const { showToast } = useToast();
  const { customerUser, authUser } = useApp();
  const [quantity, setQuantity] = useState(1);
  const [arrivalChoice, setArrivalChoice] = useState(ARRIVAL_PRESETS[0]);
  const [customerName, setCustomerName] = useState(customerUser?.name || '');
  const [note, setNote] = useState('');

  // Update customer name when user changes or load from namespaced storage
  useEffect(() => {
    if (customerUser?.name) {
      setCustomerName(customerUser.name);
    } else if (typeof window !== 'undefined') {
      const savedName = localStorage.getItem('shopmitra_customer_name') || '';
      if (savedName) setCustomerName(savedName);
    }
  }, [customerUser?.name]);

  if (!isOpen || !product || !rate) return null;

  const totalAmount = rate.currentPrice * quantity;
  const totalSavings = (product.mrp - rate.currentPrice) * quantity;
  const phoneNumber = (rate.shopWhatsapp || rate.shopPhone).replace(/\D/g, '');

  const buildWhatsAppMessage = () => {
    return (
      `Namaste *${rate.shopName}*! 🙏\n\n` +
      `I found your counter rate on *ShopMitra* and would like to reserve this item for pickup:\n\n` +
      `📦 *Product:* ${product.name}\n` +
      `🏷️ *Counter Rate:* ₹${rate.currentPrice.toLocaleString('en-IN')} (MRP: ₹${product.mrp.toLocaleString('en-IN')})\n` +
      `🔢 *Quantity:* ${quantity} unit${quantity > 1 ? 's' : ''}\n` +
      `💵 *Total Amount:* ₹${totalAmount.toLocaleString('en-IN')}\n` +
      `⏱️ *Expected Arrival:* ${arrivalChoice.text}\n` +
      (customerName.trim() ? `👤 *Customer:* ${customerName.trim()}\n` : '') +
      (note.trim() ? `📝 *Note:* ${note.trim()}\n\n` : '\n') +
      `Please confirm if you can hold this unit at your counter. I will pay in store. Thank you!`
    );
  };

  const handleSendWhatsApp = () => {
    if (customerName.trim()) {
      try {
        localStorage.setItem('shopmitra_customer_name', customerName.trim());
      } catch {}
    }

    const message = buildWhatsAppMessage();
    const encoded = encodeURIComponent(message);
    const waUrl = `https://wa.me/91${phoneNumber}?text=${encoded}`;

    // Save to local active holds
    const newHold: CounterHold = {
      id: `hold-${Date.now()}`,
      productId: product.id,
      productName: product.name,
      productImage: product.imageUrl,
      productBrand: product.brand,
      shopId: rate.shopId,
      shopName: rate.shopName,
      shopPhone: rate.shopPhone,
      shopWhatsapp: rate.shopWhatsapp,
      shopAddress: rate.shopAddress,
      price: rate.currentPrice,
      mrp: product.mrp,
      quantity,
      totalAmount,
      arrivalEstimate: arrivalChoice.label,
      customerName: customerName.trim() || customerUser?.name || 'Customer',
      note: note.trim() || undefined,
      createdAt: new Date().toISOString(),
      status: 'active',
    };

    try {
      saveCounterHold(newHold, authUser?.id);
    } catch {}

    if (onHoldCreated) {
      onHoldCreated(newHold);
    }

    window.open(waUrl, '_blank');
    showToast(`🛍️ Hold request opened on WhatsApp for ${rate.shopName}!`, 'success');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl max-w-lg w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shrink-0">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>Hold at Counter</span>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300">
                  WhatsApp Direct
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Reserve item at verified counter price • Pay at physical shop
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          
          {/* Item & Shop Card */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 flex items-start gap-3">
            <img
              src={product.imageUrl || 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=400&q=80'}
              alt={product.name}
              className="w-16 h-16 rounded-xl object-contain bg-white border border-slate-200 p-1 shrink-0"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=400&q=80';
              }}
            />
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-black uppercase text-emerald-700 dark:text-emerald-400">
                {product.brand}
              </span>
              <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white truncate">
                {product.name}
              </h4>
              
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                  ₹{rate.currentPrice.toLocaleString('en-IN')}
                </span>
                <del className="text-xs text-slate-400">
                  ₹{product.mrp.toLocaleString('en-IN')}
                </del>
                {product.mrp > rate.currentPrice && (
                  <span className="text-[10px] font-black text-emerald-600 bg-emerald-100 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded">
                    Save ₹{product.mrp - rate.currentPrice}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                <Store className="w-3 h-3 text-slate-400" />
                <span className="font-bold text-slate-700 dark:text-slate-300 truncate">{rate.shopName}</span>
                {rate.distanceKm !== undefined && (
                  <span>• {formatDistance(rate.distanceKm)}</span>
                )}
              </div>
            </div>
          </div>

          {/* Quantity and Total Counter */}
          <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
            <div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                Quantity to Hold
              </span>
              <span className="text-[11px] text-slate-500">
                Counter total: <strong className="text-emerald-600">₹{totalAmount.toLocaleString('en-IN')}</strong>
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
                className="w-8 h-8 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-100 disabled:opacity-40 transition-colors"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="w-8 text-center font-black text-sm text-slate-900 dark:text-white">
                {quantity}
              </span>
              <button
                onClick={() => setQuantity(Math.min(10, quantity + 1))}
                disabled={quantity >= 10}
                className="w-8 h-8 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-100 disabled:opacity-40 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Arrival Window Presets */}
          <div>
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mb-2">
              <Clock className="w-3.5 h-3.5 text-emerald-600" />
              <span>When will you reach the shop counter?</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {ARRIVAL_PRESETS.map((preset) => {
                const isSelected = arrivalChoice.id === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setArrivalChoice(preset)}
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all text-left border ${
                      isSelected
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Customer Details */}
          <div className="space-y-2.5">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Your Name (for merchant to mark on packet)
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. Rahul Sharma"
                className="w-full px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Special Note (Optional)
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Please keep printed GST bill ready"
                className="w-full px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
              />
            </div>
          </div>

          {/* WhatsApp Message Preview Bubble */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                WhatsApp Message Preview
              </span>
              <span className="text-[10px] text-emerald-600 font-bold">100% Free • No Commission</span>
            </div>
            <div className="bg-emerald-50/70 dark:bg-emerald-950/30 p-3 rounded-2xl border border-emerald-200/80 dark:border-emerald-800/80 text-[11px] font-mono text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
              {buildWhatsAppMessage()}
            </div>
          </div>

          {/* Guarantee Note */}
          <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-2xl border border-amber-200/80 dark:border-amber-800/80 flex items-start gap-2">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-900 dark:text-amber-200 leading-tight">
              You pay directly at the shop counter in cash or UPI. ShopMitra charges <strong>zero fee</strong> to customers and retailers.
            </p>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2.5">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>

          <button
            onClick={handleSendWhatsApp}
            className="flex-1 py-2.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs sm:text-sm rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4" />
            <span>Send on WhatsApp & Hold (₹{totalAmount.toLocaleString('en-IN')})</span>
          </button>
        </div>

      </div>
    </div>
  );
}

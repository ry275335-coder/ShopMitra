// ==============================================================================
// src/components/merchant/CounterBillModal.tsx
// Merchant Quick Counter Billing, Dynamic UPI QR Code, & Thermal Receipt POS
// ==============================================================================

'use client';

import React, { useState, useMemo } from 'react';
import {
  Receipt,
  X,
  Plus,
  Minus,
  Trash2,
  QrCode,
  CheckCircle2,
  Share2,
  Printer,
  Smartphone,
  CreditCard,
  Banknote,
  Search,
  Sparkles,
  ShoppingBag,
  Percent,
  Check,
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import { Shop, ShopProduct } from '@/types';
import {
  BillItem,
  CounterBill,
  buildUpiDeepLink,
  getUpiQrCodeUrl,
  getWhatsAppReceiptUrl,
  formatReceiptForWhatsApp
} from '@/lib/upi';
import { useToast } from '@/components/ui/Toast';

interface CounterBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  shop: Shop;
  inventory: ShopProduct[];
  onSaleCompleted?: (soldItems: { productId: string; quantity: number }[]) => void;
}

export function CounterBillModal({
  isOpen,
  onClose,
  shop,
  inventory,
  onSaleCompleted,
}: CounterBillModalProps) {
  const { showToast } = useToast();

  // Active bill items
  const [billItems, setBillItems] = useState<BillItem[]>([]);
  const [customerMobile, setCustomerMobile] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [gstRate, setGstRate] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState<'upi' | 'cash' | 'card'>('upi');
  const [paymentReceived, setPaymentReceived] = useState<boolean>(false);
  const [cashTendered, setCashTendered] = useState<number>(0);
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [billNumber, setBillNumber] = useState<string>(() => `SM-${Math.floor(100000 + Math.random() * 900000)}`);
  const [merchantUpiId, setMerchantUpiId] = useState<string>(shop.phone ? `${shop.phone}@okaxis` : 'shopmitra.pay@okaxis');

  // Filtered inventory items for quick addition
  const availableItems = useMemo(() => {
    if (!searchFilter.trim()) return inventory.slice(0, 8);
    const q = searchFilter.toLowerCase();
    return inventory.filter(
      (item) =>
        item.productName.toLowerCase().includes(q) ||
        (item.brand && item.brand.toLowerCase().includes(q))
    );
  }, [inventory, searchFilter]);

  // Financial Calculations
  const calculations = useMemo(() => {
    let subtotal = 0;
    let totalMrp = 0;

    billItems.forEach((item) => {
      subtotal += item.unitPrice * item.quantity;
      totalMrp += item.mrp * item.quantity;
    });

    const discountedSubtotal = Math.max(0, subtotal - discountAmount);
    const gstAmount = (discountedSubtotal * gstRate) / 100;
    const netPayable = Math.round(discountedSubtotal + gstAmount);
    const totalSavings = Math.max(0, totalMrp - netPayable);

    return {
      subtotal,
      totalMrp,
      discountedSubtotal,
      gstAmount,
      netPayable,
      totalSavings,
      savingsPercentage: totalMrp > 0 ? Math.round((totalSavings / totalMrp) * 100) : 0,
    };
  }, [billItems, discountAmount, gstRate]);

  // Dynamic UPI Deep Link & QR
  const upiDeepLink = useMemo(() => {
    return buildUpiDeepLink({
      vpa: merchantUpiId,
      payeeName: shop.name,
      amount: calculations.netPayable,
      transactionNote: `Bill ${billNumber}`,
      transactionRef: billNumber,
    });
  }, [merchantUpiId, shop.name, calculations.netPayable, billNumber]);

  const qrCodeUrl = useMemo(() => {
    if (calculations.netPayable <= 0) return '';
    return getUpiQrCodeUrl(upiDeepLink, 240);
  }, [upiDeepLink, calculations.netPayable]);

  // Add an item to the bill
  const handleAddItem = (item: ShopProduct) => {
    setBillItems((prev) => {
      const existing = prev.find((p) => p.productId === item.productId);
      if (existing) {
        return prev.map((p) =>
          p.productId === item.productId
            ? { ...p, quantity: p.quantity + 1 }
            : p
        );
      }
      return [
        ...prev,
        {
          id: `item-${Date.now()}-${item.productId}`,
          productId: item.productId,
          productName: item.productName,
          mrp: item.mrp,
          unitPrice: item.sellingPrice,
          quantity: 1,
        },
      ];
    });
  };

  const handleUpdateQuantity = (productId: string, delta: number) => {
    setBillItems((prev) =>
      prev
        .map((p) => {
          if (p.productId === productId) {
            const nextQty = p.quantity + delta;
            return nextQty > 0 ? { ...p, quantity: nextQty } : null;
          }
          return p;
        })
        .filter(Boolean) as BillItem[]
    );
  };

  const handleRemoveItem = (productId: string) => {
    setBillItems((prev) => prev.filter((p) => p.productId !== productId));
  };

  // Construct current CounterBill object
  const currentBill: CounterBill = {
    billNumber,
    shopId: shop.id,
    shopName: shop.name,
    shopAddress: shop.address,
    shopGstin: '27AAAAA0000A1Z5',
    shopUpiId: merchantUpiId,
    customerMobile,
    customerName,
    items: billItems,
    subtotal: calculations.subtotal,
    totalMrp: calculations.totalMrp,
    totalSavings: calculations.totalSavings,
    discountAmount,
    gstRate,
    gstAmount: calculations.gstAmount,
    netPayable: calculations.netPayable,
    paymentMode,
    paymentStatus: paymentReceived ? 'received' : 'pending',
    createdAt: new Date().toISOString(),
  };

  // Complete Sale & Reset
  const handleFinishSale = () => {
    if (billItems.length === 0) {
      showToast('Please add at least one item to the bill', 'error');
      return;
    }

    // Call stock deduction hook
    if (onSaleCompleted) {
      onSaleCompleted(
        billItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        }))
      );
    }

    showToast(`✅ Sale of ₹${calculations.netPayable} recorded! Inventory updated.`);

    // Reset bill state for next counter customer
    setBillItems([]);
    setDiscountAmount(0);
    setPaymentReceived(false);
    setCustomerMobile('');
    setCustomerName('');
    setCashTendered(0);
    setBillNumber(`SM-${Math.floor(100000 + Math.random() * 900000)}`);
  };

  const handleSendWhatsApp = () => {
    if (!customerMobile) {
      showToast('Enter customer mobile number first', 'error');
      return;
    }
    const url = getWhatsAppReceiptUrl(customerMobile, currentBill);
    window.open(url, '_blank');
    showToast('Opening WhatsApp receipt...');
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-merchant-600 text-white flex items-center justify-center shadow-md shadow-merchant-600/30">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  Counter Quick Billing & UPI POS
                </h3>
                <span className="text-[11px] font-mono font-bold text-slate-500 bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded-full">
                  #{billNumber}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {shop.name} • 10-Second Physical Store Checkout
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main 2-Column POS Body */}
        <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-y-auto divide-y lg:divide-y-0 lg:divide-x divide-slate-200 dark:divide-slate-800">
          {/* Left Column: Item Selector & Cart (7 cols) */}
          <div className="lg:col-span-7 p-4 sm:p-5 flex flex-col space-y-4">
            {/* Search items to add */}
            <div>
              <label className="text-[11px] font-black uppercase text-slate-400 block mb-1.5">
                Add Items from Inventory
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="Search item name, brand, charger, atta..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 outline-none focus:border-merchant-500"
                />
              </div>

              {/* Quick Item Picker Chips */}
              <div className="flex flex-wrap gap-1.5 mt-2 max-h-24 overflow-y-auto pr-1">
                {availableItems.map((item) => (
                  <button
                    key={item.productId}
                    onClick={() => handleAddItem(item)}
                    className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-merchant-50 dark:hover:bg-merchant-950/60 hover:border-merchant-400 border border-slate-200 dark:border-slate-700 text-left text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 transition-all"
                  >
                    <Plus className="w-3 h-3 text-merchant-600 shrink-0" />
                    <span className="truncate max-w-[140px]">{item.productName}</span>
                    <span className="font-extrabold text-merchant-600">₹{item.sellingPrice}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Bill Line Items Table */}
            <div className="flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  Cart Items ({billItems.length})
                </span>
                {billItems.length > 0 && (
                  <button
                    onClick={() => setBillItems([])}
                    className="text-[11px] text-rose-500 hover:text-rose-600 font-bold"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {billItems.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-center">
                  <ShoppingBag className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-2" />
                  <p className="text-xs font-bold text-slate-500">Cart is empty</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Click items above or scan barcode to add to bill
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {billItems.map((item) => (
                    <div
                      key={item.productId}
                      className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {item.productName}
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                          <span>₹{item.unitPrice} each</span>
                          <span>•</span>
                          <span className="line-through">MRP ₹{item.mrp}</span>
                        </div>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-1 bg-white dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600 p-0.5 shrink-0">
                        <button
                          onClick={() => handleUpdateQuantity(item.productId, -1)}
                          className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-6 text-center text-xs font-black text-slate-900 dark:text-white">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => handleUpdateQuantity(item.productId, 1)}
                          className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Line Total */}
                      <div className="text-right shrink-0 min-w-[60px]">
                        <div className="text-xs font-black text-slate-900 dark:text-white">
                          ₹{item.unitPrice * item.quantity}
                        </div>
                      </div>

                      {/* Delete */}
                      <button
                        onClick={() => handleRemoveItem(item.productId)}
                        className="p-1 text-slate-400 hover:text-rose-600 transition-colors shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Customer Contact Details */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                  Customer Mobile (for WhatsApp Bill)
                </label>
                <input
                  type="tel"
                  value={customerMobile}
                  onChange={(e) => setCustomerMobile(e.target.value)}
                  placeholder="e.g. 9820198201"
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                  Customer Name (Optional)
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold outline-none"
                />
              </div>
            </div>
          </div>

          {/* Right Column: Calculations & Dynamic UPI QR (5 cols) */}
          <div className="lg:col-span-5 p-4 sm:p-5 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col justify-between space-y-4">
            <div>
              {/* Payment Mode Selector */}
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 mb-4">
                <button
                  onClick={() => setPaymentMode('upi')}
                  className={`py-1.5 text-xs font-black rounded-xl flex items-center justify-center gap-1 transition-all ${
                    paymentMode === 'upi'
                      ? 'bg-merchant-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                  }`}
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>UPI QR</span>
                </button>

                <button
                  onClick={() => setPaymentMode('cash')}
                  className={`py-1.5 text-xs font-black rounded-xl flex items-center justify-center gap-1 transition-all ${
                    paymentMode === 'cash'
                      ? 'bg-merchant-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                  }`}
                >
                  <Banknote className="w-3.5 h-3.5" />
                  <span>Cash</span>
                </button>

                <button
                  onClick={() => setPaymentMode('card')}
                  className={`py-1.5 text-xs font-black rounded-xl flex items-center justify-center gap-1 transition-all ${
                    paymentMode === 'card'
                      ? 'bg-merchant-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Card / POS</span>
                </button>
              </div>

              {/* UPI QR Display Box */}
              {paymentMode === 'upi' && (
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-col items-center text-center shadow-sm">
                  <div className="flex items-center justify-between w-full mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Scan to Pay via Any UPI App
                    </span>
                    <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded">
                      GPay • PhonePe • Paytm
                    </span>
                  </div>

                  {calculations.netPayable > 0 && qrCodeUrl ? (
                    <div className="p-2 bg-white rounded-2xl border border-slate-100 shadow-inner my-1">
                      <img
                        src={qrCodeUrl}
                        alt="UPI Payment QR Code"
                        className="w-40 h-40 sm:w-44 sm:h-44 object-contain rounded-xl"
                      />
                    </div>
                  ) : (
                    <div className="w-40 h-40 rounded-2xl bg-slate-100 dark:bg-slate-700/50 flex flex-col items-center justify-center text-slate-400 my-1">
                      <QrCode className="w-12 h-12 mb-1 opacity-40" />
                      <span className="text-[11px] font-medium">Add items to view QR</span>
                    </div>
                  )}

                  <div className="text-xs font-black text-slate-900 dark:text-white mt-1">
                    UPI ID: <span className="text-merchant-600 select-all">{merchantUpiId}</span>
                  </div>

                  {/* Payment Verification Checkbox */}
                  <button
                    onClick={() => {
                      setPaymentReceived(!paymentReceived);
                      showToast(
                        !paymentReceived
                          ? '✅ Payment marked as RECEIVED!'
                          : 'Payment status marked as pending',
                        !paymentReceived ? 'success' : 'info'
                      );
                    }}
                    className={`mt-3 w-full py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition-all ${
                      paymentReceived
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/30'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{paymentReceived ? 'Payment Received (₹' + calculations.netPayable + ')' : 'Mark Payment as Received'}</span>
                  </button>
                </div>
              )}

              {/* Cash Calculator if cash mode */}
              {paymentMode === 'cash' && (
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500">Bill Total:</span>
                    <span className="text-base font-black text-slate-900 dark:text-white">
                      ₹{calculations.netPayable}
                    </span>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                      Cash Received from Customer:
                    </label>
                    <input
                      type="number"
                      value={cashTendered || ''}
                      onChange={(e) => setCashTendered(Number(e.target.value))}
                      placeholder="e.g. 2000"
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-black text-base outline-none focus:border-merchant-500"
                    />
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                      Change to Return:
                    </span>
                    <span className="text-base font-black text-emerald-700 dark:text-emerald-400">
                      ₹{Math.max(0, cashTendered - calculations.netPayable)}
                    </span>
                  </div>
                </div>
              )}

              {/* Financial Breakdown Table */}
              <div className="mt-4 p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-500">
                  <span>Gross Total (Items MRP)</span>
                  <span className="font-semibold">₹{calculations.totalMrp}</span>
                </div>

                <div className="flex items-center justify-between text-slate-500">
                  <span>Store Counter Rate</span>
                  <span className="font-semibold">₹{calculations.subtotal}</span>
                </div>

                {/* Additional Discount Input */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-700">
                  <span className="text-slate-600 dark:text-slate-300 flex items-center gap-1">
                    <Percent className="w-3.5 h-3.5 text-merchant-600" />
                    <span>Special Discount (₹)</span>
                  </span>
                  <input
                    type="number"
                    value={discountAmount || ''}
                    onChange={(e) => setDiscountAmount(Math.max(0, Number(e.target.value)))}
                    placeholder="0"
                    className="w-20 px-2 py-0.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-right font-bold outline-none"
                  />
                </div>

                {/* GST Selector */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-700">
                  <span className="text-slate-600 dark:text-slate-300">GST</span>
                  <select
                    value={gstRate}
                    onChange={(e) => setGstRate(Number(e.target.value))}
                    className="px-2 py-0.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold outline-none text-right"
                  >
                    <option value={0}>0% (Exempt)</option>
                    <option value={5}>5% (Essential)</option>
                    <option value={12}>12% (Standard)</option>
                    <option value={18}>18% (Electronics)</option>
                  </select>
                </div>

                {/* Net Payable */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-slate-900 dark:text-white">
                  <span className="text-sm font-black">Net Payable</span>
                  <span className="text-lg font-black text-merchant-600">
                    ₹{calculations.netPayable}
                  </span>
                </div>

                {/* Customer Savings Banner */}
                {calculations.totalSavings > 0 && (
                  <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-center text-[11px] font-extrabold text-emerald-800 dark:text-emerald-300 flex items-center justify-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-yellow-500" />
                    <span>Customer Saves ₹{calculations.totalSavings} ({calculations.savingsPercentage}% below MRP)</span>
                  </div>
                )}
              </div>
            </div>

            {/* Action CTAs: Finish Sale, Print, WhatsApp */}
            <div className="space-y-2 pt-2">
              <button
                onClick={handleFinishSale}
                disabled={billItems.length === 0}
                className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-merchant-600 to-emerald-600 hover:from-merchant-500 hover:to-emerald-500 disabled:opacity-50 text-white font-extrabold text-sm shadow-lg shadow-merchant-600/30 flex items-center justify-center gap-2 transition-all"
              >
                <Check className="w-4 h-4" />
                <span>Complete Sale & Deduct Inventory</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleSendWhatsApp}
                  disabled={billItems.length === 0}
                  className="py-2.5 px-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>WhatsApp Bill</span>
                </button>

                <button
                  onClick={handlePrintReceipt}
                  disabled={billItems.length === 0}
                  className="py-2.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Receipt</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

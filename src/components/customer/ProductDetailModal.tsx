// ==============================================================================
// src/components/customer/ProductDetailModal.tsx
// Detailed Product Specification & Multi-Store Live Rate Sheet (Step 35 & 48)
// ==============================================================================

'use client';

import React, { useState } from 'react';
import { MasterProduct, ShopProductRate } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatDistance, getDirectionsUrl } from '@/lib/geo';
import { useApp } from '@/components/common/AppContext';
import { 
  MapPin, 
  Phone, 
  MessageCircle, 
  Navigation, 
  Heart, 
  Bell, 
  Clock, 
  ShieldCheck, 
  Sparkles,
  ArrowUpDown,
  Store,
  CheckCircle2,
  AlertTriangle,
  Info
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

export function ProductDetailModal({
  isOpen,
  onClose,
  product,
  rates,
  onOpenShop,
  onSetAlert,
  onHoldAtCounter,
}: {
  isOpen: boolean;
  onClose: () => void;
  product: MasterProduct | null;
  rates: ShopProductRate[];
  onOpenShop: (shopId: string) => void;
  onSetAlert: (p: MasterProduct) => void;
  onHoldAtCounter?: (product: MasterProduct, rate: ShopProductRate) => void;
}) {
  const { userLocation, wishlist, toggleWishlist } = useApp();
  const { showToast } = useToast();
  const [sortBy, setSortBy] = useState<'price' | 'distance' | 'freshness'>('price');

  if (!product) return null;

  const isWishlisted = wishlist.includes(product.id);
  const lowestPrice = rates.length > 0 ? Math.min(...rates.map(r => r.currentPrice)) : product.mrp;
  const maxSavings = product.mrp - lowestPrice;

  // Sorted rates
  const sortedRates = [...rates].sort((a, b) => {
    if (sortBy === 'price') return a.currentPrice - b.currentPrice;
    if (sortBy === 'distance') return (a.distanceKm || 999) - (b.distanceKm || 999);
    if (sortBy === 'freshness') {
      const timeA = new Date(a.lastPriceUpdatedAt).getTime();
      const timeB = new Date(b.lastPriceUpdatedAt).getTime();
      return timeB - timeA;
    }
    return 0;
  });

  const handleWhatsApp = (rate: ShopProductRate) => {
    const text = encodeURIComponent(
      `Hello ${rate.shopName}, I found your rate on ShopMitra:\n` +
      `📦 Item: ${product.name}\n` +
      `💰 Listed Rate: ₹${rate.currentPrice.toLocaleString('en-IN')} (MRP: ₹${product.mrp.toLocaleString('en-IN')})\n` +
      `📍 Distance: ${formatDistance(rate.distanceKm)}\n\n` +
      `Is this in stock for counter pickup today?`
    );
    window.open(`https://wa.me/91${rate.shopWhatsapp || rate.shopPhone}?text=${text}`, '_blank');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" title="Product Details & Store Rates">
      <div className="space-y-6">
        {/* Header Hero */}
        <div className="flex flex-col sm:flex-row gap-6 bg-slate-50 dark:bg-slate-800/50 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="w-full sm:w-44 h-44 rounded-xl overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex-shrink-0 flex items-center justify-center p-2">
            <img 
              src={product.imageUrl || 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=400&q=80'} 
              alt={product.name}
              loading="lazy"
              decoding="async"
              className="max-h-full max-w-full object-contain hover:scale-105 transition-transform" 
            />
          </div>

          <div className="flex-1 min-w-0 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <Badge variant="neutral">{product.brand}</Badge>
                <Badge variant="outline">{product.category}</Badge>
                {product.barcode && (
                  <span className="text-[11px] font-mono text-slate-400">EAN: {product.barcode}</span>
                )}
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white leading-tight">
                {product.name}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-2 line-clamp-2">
                {product.description}
              </p>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700/60 flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">Best Local Rate</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                    ₹{lowestPrice.toLocaleString('en-IN')}
                  </span>
                  {maxSavings > 0 && (
                    <>
                      <span className="text-sm line-through text-slate-600 dark:text-slate-400">
                        ₹{product.mrp.toLocaleString('en-IN')}
                      </span>
                      <span className="text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-300 px-2 py-0.5 rounded-full">
                        Save ₹{maxSavings.toLocaleString('en-IN')}
                      </span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleWishlist(product.id)}
                  className={`p-2.5 rounded-xl border transition-colors ${
                    isWishlisted 
                      ? 'bg-rose-50 border-rose-200 text-rose-600 dark:bg-rose-950/50 dark:border-rose-800 dark:text-rose-300'
                      : 'bg-white border-slate-200 text-slate-600 hover:text-rose-600 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300'
                  }`}
                  title="Add to wishlist"
                >
                  <Heart className={`w-5 h-5 ${isWishlisted ? 'fill-current text-rose-500' : ''}`} />
                </button>
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<Bell className="w-4 h-4 text-emerald-600" />}
                  onClick={() => onSetAlert(product)}
                >
                  Price Alert
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Multi-Store Comparison Section */}
        <div>
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Store className="w-4 h-4 text-emerald-600" />
                Available at {rates.length} Local {rates.length === 1 ? 'Store' : 'Stores'}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Verified stock and direct retailer counter rates within your selected radius.
              </p>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs">
              <span className="text-slate-600 dark:text-slate-400 px-2 font-medium flex items-center gap-1">
                <ArrowUpDown className="w-3 h-3" /> Sort:
              </span>
              <button
                onClick={() => setSortBy('price')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  sortBy === 'price' ? 'bg-white dark:bg-slate-700 font-bold shadow-xs text-emerald-600 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Lowest Price
              </button>
              <button
                onClick={() => setSortBy('distance')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  sortBy === 'distance' ? 'bg-white dark:bg-slate-700 font-bold shadow-xs text-emerald-600 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Nearest
              </button>
              <button
                onClick={() => setSortBy('freshness')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  sortBy === 'freshness' ? 'bg-white dark:bg-slate-700 font-bold shadow-xs text-emerald-600 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Freshness
              </button>
            </div>
          </div>

          {rates.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
              <Store className="w-10 h-10 mx-auto text-slate-400 mb-2 opacity-60" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                No stores currently stock this product nearby.
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Set a Price Alert to be notified instantly when a local shop registers this item!
              </p>
              <Button
                variant="primary"
                size="sm"
                className="mt-4"
                leftIcon={<Bell className="w-4 h-4" />}
                onClick={() => onSetAlert(product)}
              >
                Notify Me When Available
              </Button>
            </div>
          ) : (
            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {sortedRates.map((rate) => {
                const isBestRate = rate.currentPrice === lowestPrice;
                return (
                  <div
                    key={rate.shopId}
                    className={`p-4 rounded-xl border transition-all ${
                      isBestRate
                        ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800 shadow-xs'
                        : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            onClick={() => {
                              onClose();
                              onOpenShop(rate.shopId);
                            }}
                            className="font-bold text-slate-900 dark:text-white hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors text-left flex items-center gap-1.5"
                          >
                            <span>{rate.shopName}</span>
                            {rate.isVerified && (
                              <span title="Verified Merchant" className="inline-flex shrink-0">
                                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                              </span>
                            )}
                          </button>
                          {isBestRate && (
                            <Badge variant="success" size="sm">
                              <Sparkles className="w-3 h-3 mr-1" /> Lowest Rate
                            </Badge>
                          )}
                          <Badge 
                            variant={rate.stockStatus === 'in_stock' ? 'success' : rate.stockStatus === 'low_stock' ? 'warning' : 'danger'}
                            size="sm"
                          >
                            {rate.stockStatus === 'in_stock' ? `In Stock (${rate.stockQuantity})` : rate.stockStatus === 'low_stock' ? `Low Stock (${rate.stockQuantity})` : 'Out of Stock'}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400 mt-1 flex-wrap">
                          <span className="flex items-center gap-1 font-medium">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            {formatDistance(rate.distanceKm)} away • {rate.shopAddress}
                          </span>
                          <span className={`flex items-center gap-1 font-medium ${
                            rate.freshnessTier === 'recent' 
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : rate.freshnessTier === 'needs_update'
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-rose-600 dark:text-rose-400'
                          }`}>
                            <Clock className="w-3.5 h-3.5" />
                            {rate.freshnessLabel}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                        <div className="text-left sm:text-right">
                          <div className="text-xl font-black text-slate-900 dark:text-white">
                            ₹{rate.currentPrice.toLocaleString('en-IN')}
                          </div>
                          {product.mrp > rate.currentPrice && (
                            <div className="text-[11px] text-emerald-600 font-bold">
                              ₹{(product.mrp - rate.currentPrice).toLocaleString('en-IN')} below MRP
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              if (onHoldAtCounter) {
                                onHoldAtCounter(product, rate);
                              } else {
                                handleWhatsApp(rate);
                              }
                            }}
                            className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-colors flex items-center gap-1 text-xs font-bold shadow-xs"
                            title="Reserve & Hold at Counter via WhatsApp"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span>Hold at Counter</span>
                          </button>
                          <a
                            href={`tel:${rate.shopPhone}`}
                            className="p-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 transition-colors"
                            title="Call Store"
                          >
                            <Phone className="w-4 h-4" />
                          </a>
                          <a
                            href={getDirectionsUrl(rate.shopLatitude || userLocation.lat, rate.shopLongitude || userLocation.lng, rate.shopName, userLocation.lat, userLocation.lng)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white dark:bg-blue-950/60 dark:text-blue-400 transition-colors"
                            title="Directions on Google Maps"
                          >
                            <Navigation className="w-4 h-4" />
                          </a>
                        </div>
                      </div>
                    </div>

                    {rate.freshnessTier === 'stale' && (
                      <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 p-2 rounded-lg border border-amber-200 dark:border-amber-800">
                        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>Price updated over 7 days ago. Call the shop before visiting to verify the latest counter rate.</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

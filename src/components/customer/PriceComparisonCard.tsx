// ==============================================================================
// src/components/customer/PriceComparisonCard.tsx
// Core Multi-Store Price Comparison Engine Component (Step 16 & 35)
// ==============================================================================

'use client';

import React from 'react';
import { useApp } from '@/components/common/AppContext';
import { MasterProduct, ShopProductRate, Shop } from '@/types';
import { formatDistance, getDirectionsUrl } from '@/lib/geo';
import { 
  CheckCircle2, 
  MapPin, 
  Phone, 
  MessageCircle, 
  Heart, 
  Bell, 
  Clock, 
  ArrowRight,
  ShieldCheck, 
  Navigation,
  Sparkles
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { recordShopInteraction } from '@/lib/analytics/interactionTracker';

export function PriceComparisonCard({
  product,
  rates,
  onSelectProduct,
  onOpenShop,
  onSetAlert,
  onHoldAtCounter,
}: {
  product: MasterProduct;
  rates: ShopProductRate[];
  onSelectProduct: (p: MasterProduct) => void;
  onOpenShop: (shopId: string) => void;
  onSetAlert: (p: MasterProduct) => void;
  onHoldAtCounter?: (product: MasterProduct, rate: ShopProductRate) => void;
}) {
  const { userLocation, wishlist, toggleWishlist } = useApp();
  const { showToast } = useToast();
  const isWishlisted = wishlist.includes(product.id);

  if (rates.length === 0) return null;

  const lowestPrice = Math.min(...rates.map(r => r.currentPrice));
  const highestSavings = product.mrp - lowestPrice;

  // 1-Click WhatsApp Order Formatter
  const handleWhatsAppOrder = (rateItem: ShopProductRate, e: React.MouseEvent) => {
    e.stopPropagation();
    recordShopInteraction(rateItem.shopId, 'whatsapp');
    const msg = encodeURIComponent(
      `Hello ${rateItem.shopName}, I found your rate on ShopMitra:\n` +
      `📦 Item: ${product.name}\n` +
      `💰 Listed Rate: ₹${rateItem.currentPrice} (MRP: ₹${product.mrp})\n` +
      `📍 Distance: ${formatDistance(rateItem.distanceKm)}\n\n` +
      `Is this ready at your counter for pickup / delivery today?`
    );
    window.open(`https://wa.me/91${rateItem.shopWhatsapp || rateItem.shopPhone}?text=${msg}`, '_blank');
  };

  const handleDirections = (rateItem: ShopProductRate, e: React.MouseEvent) => {
    e.stopPropagation();
    recordShopInteraction(rateItem.shopId, 'direction');
    const destLat = rateItem.shopLatitude || userLocation.lat;
    const destLng = rateItem.shopLongitude || userLocation.lng;
    window.open(getDirectionsUrl(destLat, destLng, rateItem.shopName, userLocation.lat, userLocation.lng), '_blank');
  };

  const handleCall = (rateItem: ShopProductRate, e: React.MouseEvent) => {
    e.stopPropagation();
    recordShopInteraction(rateItem.shopId, 'call');
    window.location.href = `tel:${rateItem.shopPhone}`;
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 hover:border-slate-300 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col justify-between">
      {/* Top Product Header */}
      <div className="p-4 sm:p-5 pb-3">
        <div className="flex items-start gap-3.5">
          {/* Thumbnail */}
          <div
            onClick={() => onSelectProduct(product)}
            className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-slate-100 overflow-hidden shrink-0 border border-slate-100 cursor-pointer relative group"
          >
            <img
              src={product.imageUrl || 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=400&q=80'}
              alt={product.name}
              width={96}
              height={96}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=400&q=80';
              }}
            />
            {highestSavings > 0 && (
              <span className="absolute bottom-1 left-1 bg-brand-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-sm">
                Save ₹{highestSavings}
              </span>
            )}
          </div>

          {/* Product Meta */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-brand-700 bg-brand-50 px-2 py-0.5 rounded-md">
                  {product.brand}
                </span>
                <h3
                  onClick={() => onSelectProduct(product)}
                  className="text-sm sm:text-base font-extrabold text-slate-900 mt-1 cursor-pointer hover:text-brand-600 transition-colors line-clamp-2 leading-snug"
                >
                  {product.name}
                </h3>
              </div>

              {/* Action Icons */}
              <div className="flex items-center space-x-1 shrink-0">
                <button
                  onClick={() => onSetAlert(product)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-amber-500 hover:bg-amber-50 transition-colors"
                  title="Set Price Drop Alert"
                >
                  <Bell className="w-4 h-4" />
                </button>
                <button
                  onClick={() => toggleWishlist(product.id)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                  title="Save to Wishlist"
                >
                  <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-rose-500 text-rose-500' : ''}`} />
                </button>
              </div>
            </div>

            <div className="flex items-center space-x-2 text-xs text-slate-500 mt-1 font-semibold">
              <span>{product.model || 'Standard'}</span>
              <span>•</span>
              <span>MRP: <del className="text-slate-400 font-normal">₹{product.mrp}</del></span>
            </div>
          </div>
        </div>
      </div>

      {/* Live Rate Comparison Table across Nearby Shops */}
      <div className="bg-slate-50/80 border-t border-slate-100 p-3 sm:p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
            Available at {rates.length} Nearby {rates.length === 1 ? 'Store' : 'Stores'}
          </span>
          <span className="text-[11px] text-slate-400 flex items-center space-x-1 font-semibold">
            <Clock className="w-3 h-3" />
            <span>Live Counter Rates</span>
          </span>
        </div>

        <div className="space-y-2">
          {rates.map((rateItem, idx) => {
            const isLowest = rateItem.currentPrice === lowestPrice;

            return (
              <div
                key={rateItem.id}
                className={`p-3 rounded-2xl border transition-all flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5 ${
                  isLowest
                    ? 'bg-emerald-50/80 border-emerald-300 ring-1 ring-emerald-400/40'
                    : 'bg-white border-slate-200/90'
                }`}
              >
                {/* Shop Name & Metadata */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={() => onOpenShop(rateItem.shopId)}
                      className="font-bold text-xs sm:text-sm text-slate-900 hover:text-brand-700 truncate text-left"
                    >
                      {rateItem.shopName}
                    </button>
                    {rateItem.isVerified && (
                      <span title="Verified Store" className="inline-flex shrink-0">
                        <ShieldCheck className="w-3.5 h-3.5 text-brand-600" />
                      </span>
                    )}
                    {isLowest && (
                      <span className="bg-brand-600 text-white text-[9px] font-black uppercase px-1.5 py-0.5 rounded tracking-wider shrink-0">
                        Best Rate Nearby
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 text-[11px] text-slate-500 mt-0.5 font-medium">
                    <span className="flex items-center space-x-0.5 text-brand-700 font-bold">
                      <MapPin className="w-3 h-3" />
                      <span>{formatDistance(rateItem.distanceKm)}</span>
                    </span>
                    <span>•</span>
                    <span className="text-slate-400">{rateItem.freshnessLabel}</span>
                    <span>•</span>
                    <span className={rateItem.stockStatus === 'in_stock' ? 'text-emerald-700 font-bold' : 'text-amber-700 font-bold'}>
                      {rateItem.stockStatus === 'in_stock' ? 'In Stock' : 'Low Stock'}
                    </span>
                  </div>
                </div>

                {/* Price & Connect Actions */}
                <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-3 shrink-0">
                  <div className="text-left sm:text-right">
                    <div className="text-base sm:text-lg font-black text-slate-900 leading-none">
                      ₹{rateItem.currentPrice}
                    </div>
                    {product.mrp > rateItem.currentPrice && (
                      <div className="text-[10px] font-extrabold text-brand-600 mt-0.5">
                        Save ₹{product.mrp - rateItem.currentPrice}
                      </div>
                    )}
                  </div>

                  {/* WhatsApp Hold at Counter, Directions, Call Buttons */}
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        if (onHoldAtCounter) {
                          onHoldAtCounter(product, rateItem);
                        } else {
                          handleWhatsAppOrder(rateItem, e);
                        }
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 rounded-xl transition-all flex items-center space-x-1 shadow-sm font-bold text-xs"
                      title="Reserve & Hold at Counter via WhatsApp"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>Hold</span>
                    </button>
                    <button
                      onClick={e => handleDirections(rateItem, e)}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 p-1.5 rounded-xl transition-colors"
                      title="Navigate on Google Maps"
                    >
                      <Navigation className="w-3.5 h-3.5 text-slate-600" />
                    </button>
                    <button
                      onClick={e => handleCall(rateItem, e)}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 p-1.5 rounded-xl transition-colors"
                      title="Call Store"
                    >
                      <Phone className="w-3.5 h-3.5 text-slate-600" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Link */}
      <div className="p-3 bg-white border-t border-slate-100 flex items-center justify-between text-xs">
        <button
          onClick={() => onSelectProduct(product)}
          className="text-brand-700 hover:text-brand-800 font-bold flex items-center space-x-1"
        >
          <span>Detailed Specs & Store Map</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
        <span className="text-slate-400 text-[11px] font-medium">Physical counter pickup available</span>
      </div>
    </div>
  );
}

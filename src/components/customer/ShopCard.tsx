// ==============================================================================
// src/components/customer/ShopCard.tsx
// Nearby Physical Shop Directory Card (Step 17)
// ==============================================================================

'use client';

import React from 'react';
import { Shop } from '@/types';
import { formatDistance, getDirectionsUrl } from '@/lib/geo';
import { useApp } from '@/components/common/AppContext';
import { 
  MapPin, 
  Phone, 
  MessageCircle, 
  Star, 
  ShieldCheck, 
  Navigation, 
  Clock, 
  ArrowRight 
} from 'lucide-react';
import { recordShopInteraction, recordCustomerStoreInteraction } from '@/lib/analytics/interactionTracker';

export function ShopCard({
  shop,
  onOpenShop,
}: {
  shop: Shop;
  onOpenShop: (shopId: string) => void;
}) {
  const { userLocation } = useApp();
  const directionsUrl = getDirectionsUrl(shop.lat, shop.lng, shop.name, userLocation.lat, userLocation.lng);

  const handleWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    recordShopInteraction(shop.id, 'whatsapp');
    recordCustomerStoreInteraction({
      shopId: shop.id,
      shopName: shop.name,
      shopCity: shop.city,
      shopPhone: shop.phone,
      shopWhatsapp: shop.whatsapp || shop.phone,
      type: 'whatsapp'
    });
    const msg = encodeURIComponent(`Hello ${shop.name}, I found your shop on ShopMitra. Are you open now?`);
    window.open(`https://wa.me/91${shop.whatsapp || shop.phone}?text=${msg}`, '_blank');
  };

  const handleCall = (e: React.MouseEvent) => {
    e.stopPropagation();
    recordShopInteraction(shop.id, 'call');
    recordCustomerStoreInteraction({
      shopId: shop.id,
      shopName: shop.name,
      shopCity: shop.city,
      shopPhone: shop.phone,
      shopWhatsapp: shop.whatsapp || shop.phone,
      type: 'call'
    });
    window.location.href = `tel:${shop.phone}`;
  };

  const handleNav = (e: React.MouseEvent) => {
    e.stopPropagation();
    recordShopInteraction(shop.id, 'direction');
    recordCustomerStoreInteraction({
      shopId: shop.id,
      shopName: shop.name,
      shopCity: shop.city,
      shopPhone: shop.phone,
      shopWhatsapp: shop.whatsapp || shop.phone,
      type: 'direction'
    });
    window.open(directionsUrl, '_blank');
  };

  const handleCardClick = () => {
    recordShopInteraction(shop.id, 'view');
    recordCustomerStoreInteraction({
      shopId: shop.id,
      shopName: shop.name,
      shopCity: shop.city,
      shopPhone: shop.phone,
      shopWhatsapp: shop.whatsapp || shop.phone,
      type: 'view'
    });
    onOpenShop(shop.id);
  };

  return (
    <div
      onClick={handleCardClick}
      className="bg-white rounded-3xl border border-slate-200/80 hover:border-brand-300 hover:shadow-md transition-all duration-200 overflow-hidden cursor-pointer flex flex-col justify-between group"
    >
      <div>
        {/* Exterior Photo Banner */}
        <div className="h-36 sm:h-40 bg-slate-100 relative overflow-hidden">
          <img
            src={(shop.photos && shop.photos[0] && !shop.photos[0].startsWith('blob:')) ? shop.photos[0] : 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=800&auto=format&fit=crop&q=80'}
            alt={shop.name}
            loading="lazy"
            decoding="async"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=800&auto=format&fit=crop&q=80';
            }}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />

          {/* Verification Badge */}
          <div className="absolute top-2.5 left-2.5">
            {shop.isVerified ? (
              <span className="bg-brand-600/90 backdrop-blur-md text-white text-[10px] font-black px-2.5 py-0.5 rounded-full flex items-center space-x-1 shadow-sm">
                <ShieldCheck className="w-3 h-3" />
                <span>{shop.verificationBadge || 'Verified'}</span>
              </span>
            ) : (
              <span className="bg-slate-900/80 backdrop-blur-md text-slate-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                Local Store
              </span>
            )}
          </div>

          {/* Open / Closed Badge */}
          <div className="absolute top-2.5 right-2.5">
            <span
              className={`text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-sm backdrop-blur-md ${
                shop.isOpen ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
              }`}
            >
              {shop.isOpen ? 'Open Now' : 'Closed'}
            </span>
          </div>

          {/* Distance & Rating on Overlay */}
          <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between text-white text-xs">
            <span className="font-black flex items-center space-x-1 bg-black/40 backdrop-blur-md px-2.5 py-0.5 rounded-lg">
              <MapPin className="w-3 h-3 text-brand-400" />
              <span>{formatDistance(shop.distanceKm || 1.0)} away</span>
            </span>
            <span className="font-bold flex items-center space-x-1 bg-black/40 backdrop-blur-md px-2 py-0.5 rounded-lg">
              <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
              <span>{shop.rating} ({shop.reviewCount})</span>
            </span>
          </div>
        </div>

        {/* Content Details */}
        <div className="p-4">
          <h3 className="font-black text-slate-900 text-base group-hover:text-brand-700 transition-colors line-clamp-1">
            {shop.name}
          </h3>
          <p className="text-xs text-slate-500 font-medium line-clamp-1 mt-0.5">
            {shop.landmark ? `${shop.landmark} • ` : ''}{shop.address}
          </p>

          <div className="flex items-center space-x-2 text-[11px] text-slate-400 mt-2 font-semibold">
            <Clock className="w-3 h-3 shrink-0 text-slate-400" />
            <span>{shop.openingHours}</span>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
        <div className="flex items-center space-x-1">
          <button
            onClick={handleWhatsApp}
            className="p-2 rounded-xl bg-brand-50 hover:bg-brand-100 text-brand-800 transition-colors"
            title="Chat on WhatsApp"
          >
            <MessageCircle className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleCall}
            className="p-2 rounded-xl bg-slate-200/70 hover:bg-slate-300 text-slate-800 transition-colors"
            title="Call Store"
          >
            <Phone className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleNav}
            className="p-2 rounded-xl bg-slate-200/70 hover:bg-slate-300 text-slate-800 transition-colors"
            title="Get Directions"
          >
            <Navigation className="w-3.5 h-3.5" />
          </button>
        </div>

        <button
          onClick={() => onOpenShop(shop.id)}
          className="text-xs font-black text-brand-700 hover:text-brand-800 flex items-center space-x-1"
        >
          <span>View Inventory</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

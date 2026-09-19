// ==============================================================================
// src/components/common/MobileBottomBar.tsx
// Mobile-First Thumb-Zone Bottom Navigation Bar (Step 38)
// ==============================================================================

'use client';

import React from 'react';
import { useApp } from './AppContext';
import { 
  Home, 
  Search, 
  Layers, 
  MapPin, 
  Heart, 
  User, 
  Store, 
  Package, 
  Zap, 
  MessageSquare, 
  Tag, 
  ShieldCheck, 
  Users, 
  AlertTriangle,
  ShoppingBag
} from 'lucide-react';

export function MobileBottomBar({
  onOpenWishlist,
  onOpenHolds,
  onOpenAuth,
  activeView,
  setActiveView,
}: {
  onOpenWishlist?: () => void;
  onOpenHolds?: () => void;
  onOpenAuth?: () => void;
  activeView: string;
  setActiveView: (view: string) => void;
}) {
  const { role, wishlist, customerUser } = useApp();

  return (
    <nav
      aria-label="Mobile Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 py-1.5 px-2 flex items-center justify-around sm:hidden shadow-lg"
    >
      {/* 1. Customer Navigation */}
      {role === 'customer' && (
        <>
          <button
            onClick={() => setActiveView('home')}
            className={`flex flex-col items-center py-1 px-2 rounded-xl text-[10px] font-bold transition-colors ${
              activeView === 'home' ? 'text-brand-600' : 'text-slate-400'
            }`}
          >
            <Home className="w-5 h-5" />
            <span>Home</span>
          </button>

          <button
            onClick={() => setActiveView('search')}
            className={`flex flex-col items-center py-1 px-2 rounded-xl text-[10px] font-bold transition-colors ${
              activeView === 'search' ? 'text-brand-600' : 'text-slate-400'
            }`}
          >
            <Search className="w-5 h-5" />
            <span>Rates</span>
          </button>

          <button
            onClick={() => setActiveView('map')}
            className={`flex flex-col items-center py-1 px-2 rounded-xl text-[10px] font-bold transition-colors ${
              activeView === 'map' ? 'text-brand-600' : 'text-slate-400'
            }`}
          >
            <MapPin className="w-5 h-5" />
            <span>Nearby</span>
          </button>

          <button
            onClick={onOpenWishlist}
            className="flex flex-col items-center py-1 px-1.5 rounded-xl text-[10px] font-bold text-slate-400 hover:text-rose-500 relative transition-colors"
          >
            <Heart className={`w-5 h-5 ${wishlist.length > 0 ? 'fill-rose-500 text-rose-500' : ''}`} />
            <span>Saved</span>
            {wishlist.length > 0 && (
              <span className="absolute top-0.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full" />
            )}
          </button>

          {onOpenHolds && (
            <button
              onClick={onOpenHolds}
              className="flex flex-col items-center py-1 px-1.5 rounded-xl text-[10px] font-bold text-slate-400 hover:text-emerald-600 relative transition-colors"
            >
              <ShoppingBag className="w-5 h-5" />
              <span>Holds</span>
            </button>
          )}

          {onOpenAuth && (
            <button
              onClick={onOpenAuth}
              className={`flex flex-col items-center py-1 px-1.5 rounded-xl text-[10px] font-bold transition-colors ${
                customerUser?.isLoggedIn ? 'text-brand-600' : 'text-slate-400 hover:text-slate-800'
              }`}
            >
              <User className="w-5 h-5" />
              <span>{customerUser?.isLoggedIn ? 'Account' : 'Sign In'}</span>
            </button>
          )}
        </>
      )}

      {/* 2. Merchant Navigation */}
      {role === 'merchant' && (
        <>
          <button
            onClick={() => setActiveView('dashboard')}
            className={`flex flex-col items-center py-1 px-2 rounded-xl text-[10px] font-bold transition-colors ${
              activeView === 'dashboard' ? 'text-merchant-600' : 'text-slate-400'
            }`}
          >
            <Store className="w-5 h-5" />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => setActiveView('quick-rates')}
            className={`flex flex-col items-center py-1 px-2 rounded-xl text-[10px] font-bold transition-colors ${
              activeView === 'quick-rates' ? 'text-merchant-600' : 'text-slate-400'
            }`}
          >
            <Zap className="w-5 h-5" />
            <span>Rates</span>
          </button>

          <button
            onClick={() => setActiveView('products')}
            className={`flex flex-col items-center py-1 px-2 rounded-xl text-[10px] font-bold transition-colors ${
              activeView === 'products' ? 'text-merchant-600' : 'text-slate-400'
            }`}
          >
            <Package className="w-5 h-5" />
            <span>Products</span>
          </button>

          <button
            onClick={() => setActiveView('enquiries')}
            className={`flex flex-col items-center py-1 px-2 rounded-xl text-[10px] font-bold transition-colors ${
              activeView === 'enquiries' ? 'text-merchant-600' : 'text-slate-400'
            }`}
          >
            <MessageSquare className="w-5 h-5" />
            <span>Enquiries</span>
          </button>

          <button
            onClick={() => setActiveView('offers')}
            className={`flex flex-col items-center py-1 px-2 rounded-xl text-[10px] font-bold transition-colors ${
              activeView === 'offers' ? 'text-merchant-600' : 'text-slate-400'
            }`}
          >
            <Tag className="w-5 h-5" />
            <span>Offers</span>
          </button>
        </>
      )}

      {/* 3. Admin Navigation */}
      {role === 'admin' && (
        <>
          <button
            onClick={() => setActiveView('admin-overview')}
            className={`flex flex-col items-center py-1 px-2 rounded-xl text-[10px] font-bold transition-colors ${
              activeView === 'admin-overview' ? 'text-admin-600' : 'text-slate-400'
            }`}
          >
            <ShieldCheck className="w-5 h-5" />
            <span>Overview</span>
          </button>

          <button
            onClick={() => setActiveView('verifications')}
            className={`flex flex-col items-center py-1 px-2 rounded-xl text-[10px] font-bold transition-colors ${
              activeView === 'verifications' ? 'text-admin-600' : 'text-slate-400'
            }`}
          >
            <Users className="w-5 h-5" />
            <span>Merchants</span>
          </button>

          <button
            onClick={() => setActiveView('anti-fraud')}
            className={`flex flex-col items-center py-1 px-2 rounded-xl text-[10px] font-bold transition-colors ${
              activeView === 'anti-fraud' ? 'text-admin-600' : 'text-slate-400'
            }`}
          >
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <span>Anti-Fraud</span>
          </button>

          <button
            onClick={() => setActiveView('categories')}
            className={`flex flex-col items-center py-1 px-2 rounded-xl text-[10px] font-bold transition-colors ${
              activeView === 'categories' ? 'text-admin-600' : 'text-slate-400'
            }`}
          >
            <Layers className="w-5 h-5" />
            <span>Taxonomy</span>
          </button>
        </>
      )}
    </nav>
  );
}

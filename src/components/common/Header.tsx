// ==============================================================================
// src/components/common/Header.tsx
// Main Header with Location Selector, Role Switcher, and Debounced Search Bar
// ==============================================================================

'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useApp } from './AppContext';
import { POPULAR_MARKET_PRESETS, reverseGeocodeCoordinates } from '@/lib/geo';
import { 
  MapPin, 
  Search, 
  Heart, 
  Store, 
  User, 
  ShieldCheck, 
  ChevronDown, 
  Navigation,
  Sparkles,
  X,
  ScanLine,
  ShoppingBag,
  Bell,
  Mic,
  Download
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { getStoredCounterHolds } from '@/lib/counterHolds';
import { getStoredPriceAlerts } from '@/lib/notifications';
import { MasterProduct } from '@/types';
import { SearchSuggestionsDropdown } from '@/components/customer/SearchSuggestionsDropdown';
import { searchDbProducts } from '@/lib/supabase/db';

export function Header({
  products = [],
  onOpenWishlist,
  onOpenOnboarding,
  onOpenBarcode,
  onOpenVoice,
  onOpenHolds,
  onOpenAlerts,
  onOpenCloudSync,
  onOpenAuth,
}: {
  onOpenWishlist?: () => void;
  onOpenOnboarding?: () => void;
  onOpenBarcode?: () => void;
  onOpenVoice?: () => void;
  onOpenHolds?: () => void;
  onOpenAlerts?: () => void;
  onOpenCloudSync?: () => void;
  onOpenAuth?: (role?: 'customer' | 'merchant') => void;
  products?: MasterProduct[];
}) {
  const { 
    role, 
    setRole, 
    switchPortal,
    hasCustomerAccount,
    hasMerchantAccount,
    userLocation, 
    setUserLocation, 
    searchQuery, 
    setSearchQuery, 
    wishlist,
    registeredShops,
    customerUser,
    authUser,
  } = useApp();
  const { showToast } = useToast();
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [marketSearch, setMarketSearch] = useState('');
  const [activeHoldsCount, setActiveHoldsCount] = useState(0);
  const [activeAlertsCount, setActiveAlertsCount] = useState(0);

  // ── Real-time Database Product Autocomplete Suggestions ──────────────
  const desktopSearchRef = useRef<HTMLDivElement>(null);
  const mobileSearchRef = useRef<HTMLDivElement>(null);
  const [dbProducts, setDbProducts] = useState<MasterProduct[]>(products || []);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isSearchingDb, setIsSearchingDb] = useState(false);

  // Sync initial products when passed or updated
  useEffect(() => {
    if (products && products.length > 0) {
      setDbProducts(prev => {
        const map = new Map<string, MasterProduct>();
        prev.forEach(p => map.set(p.id, p));
        products.forEach(p => map.set(p.id, p));
        return Array.from(map.values());
      });
    }
  }, [products]);



  // Debounced search directly in Supabase to fetch any matching products
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q || q.length < 2 || role !== 'customer') return;

    const timer = setTimeout(async () => {
      try {
        setIsSearchingDb(true);
        const remoteResults = await searchDbProducts(q, 8);
        if (remoteResults && remoteResults.length > 0) {
          setDbProducts(prev => {
            const map = new Map<string, MasterProduct>();
            prev.forEach(p => map.set(p.id, p));
            remoteResults.forEach(p => map.set(p.id, p));
            return Array.from(map.values());
          });
        }
      } catch {
        // silent fallback to local cache
      } finally {
        setIsSearchingDb(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, role]);

  // Close suggestions on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        desktopSearchRef.current &&
        !desktopSearchRef.current.contains(target) &&
        mobileSearchRef.current &&
        !mobileSearchRef.current.contains(target)
      ) {
        setShowSuggestions(false);
        setSelectedIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Compute suggestions sorted by match relevance from database products
  const searchSuggestions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q || role !== 'customer') return [];

    const matches = dbProducts.filter(p => {
      const name = (p.name || '').toLowerCase();
      const brand = (p.brand || '').toLowerCase();
      const model = (p.model || '').toLowerCase();
      const desc = (p.description || '').toLowerCase();
      const cat = (p.category || p.categoryName || '').toLowerCase();
      return name.includes(q) || brand.includes(q) || model.includes(q) || desc.includes(q) || cat.includes(q);
    });

    return matches.sort((a, b) => {
      const aName = (a.name || '').toLowerCase();
      const bName = (b.name || '').toLowerCase();
      const aStarts = aName.startsWith(q);
      const bStarts = bName.startsWith(q);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;

      const aBrandStarts = (a.brand || '').toLowerCase().startsWith(q);
      const bBrandStarts = (b.brand || '').toLowerCase().startsWith(q);
      if (aBrandStarts && !bBrandStarts) return -1;
      if (!aBrandStarts && bBrandStarts) return 1;

      return aName.localeCompare(bName);
    }).slice(0, 8);
  }, [searchQuery, dbProducts, role]);

  const scrollToRatesSection = () => {
    setTimeout(() => {
      const el = document.getElementById('customer-rates-section');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 80);
  };

  const handleSelectSuggestion = (product: MasterProduct) => {
    setSearchQuery(product.name);
    setShowSuggestions(false);
    setSelectedIndex(-1);
    if (role !== 'customer') {
      switchPortal('customer');
    }
    scrollToRatesSection();
  };

  const handleSearchAll = () => {
    setShowSuggestions(false);
    setSelectedIndex(-1);
    if (role !== 'customer') {
      switchPortal('customer');
    }
    scrollToRatesSection();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || searchSuggestions.length === 0) {
      if (e.key === 'Enter') {
        setShowSuggestions(false);
        setSelectedIndex(-1);
        scrollToRatesSection();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < searchSuggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : searchSuggestions.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < searchSuggestions.length) {
        handleSelectSuggestion(searchSuggestions[selectedIndex]);
      } else {
        handleSearchAll();
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setSelectedIndex(-1);
    }
  };

  React.useEffect(() => {
    const updateCounts = () => {
      try {
        const holds = getStoredCounterHolds(authUser?.id);
        setActiveHoldsCount(holds.filter((h: any) => h.status === 'active').length);
      } catch {
        setActiveHoldsCount(0);
      }

      try {
        const alerts = getStoredPriceAlerts(authUser?.id);
        setActiveAlertsCount(alerts.length);
      } catch {
        setActiveAlertsCount(0);
      }
    };
    updateCounts();
    window.addEventListener('storage', updateCounts);
    window.addEventListener('shopmitra:alerts_updated', updateCounts);
    window.addEventListener('shopmitra:holds_updated', updateCounts);
    return () => {
      window.removeEventListener('storage', updateCounts);
      window.removeEventListener('shopmitra:alerts_updated', updateCounts);
      window.removeEventListener('shopmitra:holds_updated', updateCounts);
    };
  }, [authUser?.id]);

  const [isLocating, setIsLocating] = useState(false);

  const filteredPresets = React.useMemo(() => {
    if (!marketSearch.trim()) return POPULAR_MARKET_PRESETS;
    const q = marketSearch.toLowerCase();
    return POPULAR_MARKET_PRESETS.filter(p => 
      p.name.toLowerCase().includes(q) || (p.city && p.city.toLowerCase().includes(q))
    );
  }, [marketSearch]);

  const fallbackIpLocation = async () => {
    // 1. Try ipwho.is (HTTPS)
    try {
      const res = await fetch('https://ipwho.is/');
      if (res.ok) {
        const data = await res.json();
        if (data && data.success && data.latitude && data.longitude) {
          const locName = `${data.city || ''}, ${data.region_code || data.region || ''}`.replace(/^,\s*|,\s*$/g, '') || 'Detected City';
          setUserLocation(prev => ({
            ...prev,
            lat: data.latitude,
            lng: data.longitude,
            name: locName
          }));
          setShowLocationDropdown(false);
          showToast(`🌐 Located via network: ${locName}`);
          return true;
        }
      }
    } catch {}

    // 2. Try freeipapi (HTTPS)
    try {
      const res = await fetch('https://freeipapi.com/api/json');
      if (res.ok) {
        const data = await res.json();
        if (data && data.latitude && data.longitude) {
          const locName = `${data.cityName || ''}, ${data.regionName || ''}`.replace(/^,\s*|,\s*$/g, '') || 'Detected City';
          setUserLocation(prev => ({
            ...prev,
            lat: data.latitude,
            lng: data.longitude,
            name: locName
          }));
          setShowLocationDropdown(false);
          showToast(`🌐 Located via network: ${locName}`);
          return true;
        }
      }
    } catch {}

    // 3. Try ipapi.co (HTTPS)
    try {
      const res = await fetch('https://ipapi.co/json/');
      if (res.ok) {
        const data = await res.json();
        if (data && data.latitude && data.longitude) {
          const locName = `${data.city || ''}, ${data.region || ''}`.replace(/^,\s*|,\s*$/g, '') || 'Detected City';
          setUserLocation(prev => ({
            ...prev,
            lat: data.latitude,
            lng: data.longitude,
            name: locName
          }));
          setShowLocationDropdown(false);
          showToast(`🌐 Located via network: ${locName}`);
          return true;
        }
      }
    } catch {}

    return false;
  };

  const handleGpsDetect = async () => {
    setIsLocating(true);
    showToast('📡 Detecting your physical location...', 'info');

    const isInsecureRemote = typeof window !== 'undefined' && 
      !window.isSecureContext && 
      window.location.hostname !== 'localhost' && 
      window.location.hostname !== '127.0.0.1';

    if (isInsecureRemote) {
      showToast('⚠️ Mobile HTTP blocks direct GPS. Detecting via network IP...', 'info');
      const ipSuccess = await fallbackIpLocation();
      setIsLocating(false);
      if (!ipSuccess) {
        showToast('Please select your city or area from the list below.', 'info');
      }
      return;
    }

    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const geo = await reverseGeocodeCoordinates(lat, lng);
          const name = geo.name;
          setUserLocation(prev => ({
            ...prev,
            lat,
            lng,
            name
          }));
          setIsLocating(false);
          setShowLocationDropdown(false);
          showToast(`📍 Exact location detected: ${name}!`);
        },
        async (err) => {
          console.warn('Browser geolocation failed or was denied, trying IP fallback:', err);
          const ipSuccess = await fallbackIpLocation();
          setIsLocating(false);
          if (!ipSuccess) {
            showToast('⚠️ Could not detect location. Please select your city below.', 'info');
          }
        },
        { enableHighAccuracy: true, timeout: 6000, maximumAge: 30000 }
      );
    } else {
      const ipSuccess = await fallbackIpLocation();
      setIsLocating(false);
      if (!ipSuccess) {
        showToast('⚠️ Geolocation not supported. Please select an area below.', 'info');
      }
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
      {/* Main Navbar Bar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2 sm:py-3">
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          {/* Brand Logo */}
          <div
            onClick={() => setRole('customer')}
            className="flex items-center space-x-1.5 sm:space-x-2.5 cursor-pointer select-none shrink-0"
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-brand-700 to-brand-500 flex items-center justify-center text-white font-black text-base sm:text-xl shadow-md shadow-brand-600/25">
              ₹
            </div>
            <div>
              <div className="flex items-center space-x-1">
                <span className="text-base sm:text-xl font-extrabold tracking-tight text-slate-900">
                  Shop<span className="text-brand-600">Mitra</span>
                </span>
                <span className="text-[9px] font-black uppercase tracking-wider px-1 py-0.2 rounded bg-brand-100 text-brand-800 hidden xs:inline">
                  Local
                </span>
              </div>
            </div>
          </div>

          {/* Location & Radius Dropdown */}
          <div className="relative shrink min-w-0 flex-1 max-w-[170px] xs:max-w-[210px] sm:max-w-[240px]">
            <button
              onClick={() => setShowLocationDropdown(!showLocationDropdown)}
              className="flex items-center space-x-1.5 bg-slate-100 hover:bg-slate-200/80 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl text-left border border-slate-200 transition-colors w-full shadow-2xs"
            >
              <MapPin className="w-3.5 h-3.5 text-brand-600 shrink-0" />
              <div className="min-w-0 flex-1 truncate">
                <div className="text-[9px] font-bold uppercase text-slate-400 leading-none truncate hidden xs:block">
                  Your Area
                </div>
                <div className="text-[11px] sm:text-xs font-black text-slate-800 truncate">
                  {userLocation.name || 'Detecting Area...'}
                </div>
              </div>
              <span className="text-[9px] sm:text-[10px] bg-brand-600 text-white font-black px-1.5 py-0.5 rounded-full shrink-0">
                {userLocation.radiusKm}km
              </span>
              <ChevronDown className="w-3 h-3 text-slate-400 shrink-0 hidden xs:block" />
            </button>

            {/* Dropdown Menu & Mobile Backdrop */}
            {showLocationDropdown && (
              <>
                {/* Backdrop on mobile */}
                <div 
                  className="fixed inset-0 bg-slate-950/50 z-40 backdrop-blur-[2px] sm:hidden"
                  onClick={() => setShowLocationDropdown(false)}
                />
                <div className="fixed inset-x-3 top-20 sm:absolute sm:inset-x-auto sm:left-0 sm:top-full mt-2 w-auto sm:w-96 max-w-[96vw] bg-white rounded-3xl shadow-2xl border border-slate-200 p-4 sm:p-5 z-50 animate-in fade-in zoom-in-95 duration-150 max-h-[82vh] flex flex-col">
                  {/* Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <span className="text-xs font-black text-slate-900">Choose Area & Radius</span>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={handleGpsDetect}
                        disabled={isLocating}
                        className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center space-x-1 bg-brand-50 hover:bg-brand-100 px-2.5 py-1 rounded-xl transition-colors disabled:opacity-50"
                      >
                        <Navigation className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin text-brand-500' : ''}`} />
                        <span>{isLocating ? 'Locating...' : 'Auto GPS'}</span>
                      </button>
                      <button
                        onClick={() => setShowLocationDropdown(false)}
                        className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors sm:hidden"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Radius Buttons */}
                  <div className="mt-3">
                    <span className="text-[11px] font-bold text-slate-500 block mb-1.5">
                      Search Radius:
                    </span>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[1, 3, 5, 10].map(km => (
                        <button
                          key={km}
                          onClick={() => {
                            setUserLocation(prev => ({ ...prev, radiusKm: km }));
                            setShowLocationDropdown(false);
                            showToast(`Search radius updated to ${km} km`);
                          }}
                          className={`py-1.5 text-xs font-black rounded-xl border transition-all ${
                            userLocation.radiusKm === km
                              ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {km} km
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Direct Map View Button */}
                  <button
                    onClick={() => {
                      setShowLocationDropdown(false);
                      if (typeof window !== 'undefined') {
                        window.dispatchEvent(new CustomEvent('shopmitra:switch_view', { detail: { view: 'map' } }));
                      }
                      setTimeout(() => {
                        const el = document.getElementById('customer-map-section');
                        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }, 80);
                    }}
                    className="w-full mt-2.5 py-2 px-3 bg-brand-50 hover:bg-brand-100 text-brand-700 rounded-xl text-xs font-black flex items-center justify-center space-x-1.5 border border-brand-200/80 transition-colors"
                  >
                    <MapPin className="w-3.5 h-3.5 text-brand-600" />
                    <span>🗺️ Open Interactive Store Map</span>
                  </button>

                  {/* Market & City Search Bar */}
                  <div className="relative mt-3">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={marketSearch}
                      onChange={e => setMarketSearch(e.target.value)}
                      placeholder="Search city or market (e.g. Lucknow, Kanpur, Delhi)..."
                      className="w-full text-xs font-bold pl-8 pr-3 py-2 rounded-xl bg-slate-100 border border-slate-200 focus:bg-white focus:border-brand-500 outline-none"
                    />
                  </div>

                  {/* User's Registered Stores (if any) */}
                  {registeredShops && registeredShops.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-slate-100">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 block mb-1">
                        ⭐ Your Registered Stores
                      </span>
                      <div className="space-y-1">
                        {registeredShops.map(s => (
                          <button
                            key={s.id}
                            onClick={() => {
                              setUserLocation({
                                name: `${s.name}, ${s.city}`,
                                lat: s.lat,
                                lng: s.lng,
                                radiusKm: userLocation.radiusKm,
                              });
                              setShowLocationDropdown(false);
                              showToast(`📍 Centered at your store: ${s.name}`);
                            }}
                            className="w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-800 bg-emerald-50/80 hover:bg-emerald-100/80 border border-emerald-200/60 flex items-center justify-between transition-colors"
                          >
                            <span className="truncate mr-2 font-black text-emerald-900">⭐ {s.name} ({s.city})</span>
                            <span className="text-[9px] bg-emerald-600 text-white px-1.5 py-0.5 rounded font-mono shrink-0">
                              Your Shop
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Market Presets */}
                  <div className="mt-3 pt-2 border-t border-slate-100 flex-1 overflow-hidden flex flex-col">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Retail Hubs & Cities
                      </span>
                      <span className="text-[10px] text-brand-600 font-bold">{filteredPresets.length} Markets</span>
                    </div>
                    <div className="space-y-1 overflow-y-auto pr-1 max-h-48 sm:max-h-56">
                      {filteredPresets.map(preset => (
                        <button
                          key={preset.name}
                          onClick={() => {
                            setUserLocation({
                              name: preset.name,
                              lat: preset.lat,
                              lng: preset.lng,
                              radiusKm: userLocation.radiusKm,
                            });
                            setShowLocationDropdown(false);
                            showToast(`📍 Location set to ${preset.name}`);
                          }}
                          className="w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 flex items-center justify-between transition-colors"
                        >
                          <span className="truncate mr-2">{preset.name}</span>
                          {'city' in preset && (
                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono shrink-0 ${
                              preset.city === 'Lucknow'
                                ? 'bg-amber-100 text-amber-800 font-bold'
                                : 'bg-slate-100 text-slate-600'
                            }`}>
                              {preset.city}
                            </span>
                          )}
                        </button>
                      ))}
                      {filteredPresets.length === 0 && (
                        <div className="text-center py-4 text-xs text-slate-400">
                          No markets found for "{marketSearch}"
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Desktop Search Bar */}
          <div ref={desktopSearchRef} className="flex-1 max-w-xl hidden md:block relative">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value);
                  setShowSuggestions(true);
                  setSelectedIndex(-1);
                }}
                onFocus={() => {
                  if (searchQuery.trim()) setShowSuggestions(true);
                }}
                onKeyDown={handleKeyDown}
                placeholder="Search by store name, product name, or brand..."
                className="w-full pl-10 pr-16 py-2.5 bg-slate-100 focus:bg-white text-xs sm:text-sm font-semibold rounded-2xl border border-transparent focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none transition-all"
              />
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center space-x-1">
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setShowSuggestions(false);
                      setSelectedIndex(-1);
                    }}
                    className="p-1 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                {onOpenVoice && (
                  <button
                    onClick={onOpenVoice}
                    className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                    title="Voice Search (Hindi / English)"
                  >
                    <Mic className="w-4 h-4 text-emerald-600" />
                  </button>
                )}
                {onOpenBarcode && (
                  <button
                    onClick={onOpenBarcode}
                    className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                    title="Scan Barcode with Camera"
                  >
                    <ScanLine className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Desktop Autocomplete Suggestions Dropdown */}
            {role === 'customer' && (
              <SearchSuggestionsDropdown
                query={searchQuery}
                suggestions={searchSuggestions}
                isOpen={showSuggestions && Boolean(searchQuery.trim())}
                selectedIndex={selectedIndex}
                isLoading={isSearchingDb}
                onSelect={handleSelectSuggestion}
                onSearchAll={handleSearchAll}
              />
            )}
          </div>

          {/* Right Action Icons */}
          <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
            {/* Install App Button - Hidden on mobile screens to give breathing room for location/map chip */}
            <button
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(new CustomEvent('shopmitra:trigger_install'));
                }
              }}
              className="hidden md:flex items-center space-x-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white px-2 py-1.5 sm:px-2.5 sm:py-2 rounded-xl sm:rounded-2xl text-[11px] sm:text-xs font-black shadow-xs transition-transform active:scale-95 shrink-0"
              title="Install ShopMitra App on your phone"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Install</span>
            </button>

            {/* Wishlist Button - Hidden on mobile screen (already on bottom bar), visible on tablet/desktop */}
            <button
              onClick={onOpenWishlist}
              className="hidden sm:flex relative p-2.5 rounded-2xl text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors shrink-0"
              title="Saved Items"
            >
              <Heart
                className={`w-4 h-4 ${wishlist.length > 0 ? 'fill-rose-500 text-rose-500' : ''}`}
              />
              {wishlist.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-black h-4 w-4 rounded-full flex items-center justify-center">
                  {wishlist.length}
                </span>
              )}
            </button>

            {/* Counter Holds Button - Hidden on mobile (available in bottom bar), visible on desktop */}
            {role === 'customer' && onOpenHolds && (
              <button
                onClick={onOpenHolds}
                className="hidden sm:flex relative p-2.5 rounded-2xl text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 border border-slate-200 hover:border-emerald-300 transition-colors shrink-0"
                title="My Counter Holds"
              >
                <ShoppingBag className="w-4 h-4 text-emerald-600" />
                {activeHoldsCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-emerald-600 text-white text-[10px] font-black h-4 w-4 rounded-full flex items-center justify-center">
                    {activeHoldsCount}
                  </span>
                )}
              </button>
            )}

            {/* Price & Stock Alerts Button - Hidden on mobile, visible on desktop */}
            {role === 'customer' && onOpenAlerts && (
              <button
                onClick={onOpenAlerts}
                className="hidden sm:flex relative p-2.5 rounded-2xl text-slate-700 hover:bg-amber-50 hover:text-amber-700 border border-slate-200 hover:border-amber-300 transition-colors shrink-0"
                title="My Price & Stock Alerts"
              >
                <Bell className="w-4 h-4 text-amber-600" />
                {activeAlertsCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-[10px] font-black h-4 w-4 rounded-full flex items-center justify-center">
                    {activeAlertsCount}
                  </span>
                )}
              </button>
            )}

            {/* Login / Profile Button (Available on both Customer and Merchant modes) */}
            {onOpenAuth && (
              customerUser?.isLoggedIn ? (
                <button
                  onClick={() => onOpenAuth(role === 'merchant' ? 'merchant' : 'customer')}
                  className="flex items-center space-x-1.5 bg-slate-100 hover:bg-slate-200/80 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl sm:rounded-2xl border border-slate-200 transition-colors text-xs font-black text-slate-800 shrink-0"
                  title="View My Profile & Account"
                >
                  {(() => {
                    const displayName = (customerUser.name && customerUser.name !== 'Shopper')
                      ? customerUser.name
                      : (customerUser.mobile || (customerUser.email ? customerUser.email.split('@')[0] : 'Account'));
                    return (
                      <>
                        <div className={`w-5 h-5 rounded-full ${role === 'merchant' ? 'bg-emerald-600' : 'bg-brand-600'} text-white flex items-center justify-center text-[10px] font-black`}>
                          {displayName.charAt(0).toUpperCase()}
                        </div>
                        <span className="hidden xs:inline max-w-[80px] sm:max-w-[100px] truncate">{displayName}</span>
                      </>
                    );
                  })()}
                </button>
              ) : role === 'merchant' ? (
                <button
                  onClick={() => onOpenAuth('merchant')}
                  className="flex items-center space-x-1 bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl sm:rounded-2xl text-xs font-black transition-all shadow-sm shrink-0"
                >
                  <User className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Merchant </span>
                  <span>Sign In</span>
                </button>
              ) : (
                <button
                  onClick={() => onOpenAuth('customer')}
                  className="flex items-center space-x-1 bg-brand-600 hover:bg-brand-700 text-white px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl sm:rounded-2xl text-xs font-black transition-all shadow-sm shrink-0"
                >
                  <User className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Customer </span>
                  <span>Sign In</span>
                </button>
              )
            )}

            {/* Merchant Quick Access CTA in Customer Mode (Visible on both phone & desktop) */}
            {role === 'customer' && (
              (hasMerchantAccount || (registeredShops && registeredShops.length > 0)) ? (
                <button
                  onClick={() => switchPortal('merchant')}
                  className="flex items-center space-x-1 sm:space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl sm:rounded-2xl text-[11px] sm:text-xs font-black transition-colors shrink-0 shadow-sm"
                  title="Switch to Merchant Operations Dashboard"
                >
                  <Store className="w-3.5 h-3.5" />
                  <span>Merchant</span>
                  <span className="hidden sm:inline"> Dashboard</span>
                </button>
              ) : onOpenOnboarding ? (
                <button
                  onClick={onOpenOnboarding}
                  className="flex items-center space-x-1 sm:space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-1.5 sm:px-3 sm:py-2 rounded-xl sm:rounded-2xl text-[11px] sm:text-xs font-black transition-colors shrink-0 shadow-sm"
                  title="List your shop on ShopMitra"
                >
                  <Store className="w-3.5 h-3.5" />
                  <span className="hidden xs:inline">Become a </span>
                  <span>Merchant</span>
                </button>
              ) : null
            )}

            {/* Switch to Customer Storefront in Merchant Mode */}
            {role === 'merchant' && (
              <button
                onClick={() => switchPortal('customer')}
                className="flex items-center space-x-1 sm:space-x-1.5 bg-brand-50 text-brand-700 hover:bg-brand-100 px-2 py-1.5 sm:px-3 sm:py-2 rounded-xl sm:rounded-2xl text-[11px] sm:text-xs font-black border border-brand-200 transition-colors shrink-0 shadow-sm"
                title="View Customer Storefront"
              >
                <span>🛍️ Storefront</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Search Bar */}
        <div ref={mobileSearchRef} className="mt-2.5 md:hidden relative">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                setShowSuggestions(true);
                setSelectedIndex(-1);
              }}
              onFocus={() => {
                if (searchQuery.trim()) setShowSuggestions(true);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Search by store name, product, or brand..."
              className="w-full pl-10 pr-16 py-2 bg-slate-100 focus:bg-white text-xs font-semibold rounded-2xl border border-transparent focus:border-brand-500 outline-none"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-1">
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setShowSuggestions(false);
                    setSelectedIndex(-1);
                  }}
                  className="p-1 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              {onOpenVoice && (
                <button
                  onClick={onOpenVoice}
                  className="p-1 text-slate-500 hover:text-emerald-600"
                  title="Voice Search (Hindi / English)"
                >
                  <Mic className="w-4 h-4 text-emerald-600" />
                </button>
              )}
              {onOpenBarcode && (
                <button
                  onClick={onOpenBarcode}
                  className="p-1 text-slate-500 hover:text-emerald-600"
                  title="Scan In-Store Barcode"
                >
                  <ScanLine className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Mobile Autocomplete Suggestions Dropdown */}
          {role === 'customer' && (
            <SearchSuggestionsDropdown
              query={searchQuery}
              suggestions={searchSuggestions}
              isOpen={showSuggestions && Boolean(searchQuery.trim())}
              selectedIndex={selectedIndex}
              isLoading={isSearchingDb}
              onSelect={handleSelectSuggestion}
              onSearchAll={handleSearchAll}
            />
          )}
        </div>
      </div>
    </header>
  );
}

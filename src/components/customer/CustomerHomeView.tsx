// ==============================================================================
// src/components/customer/CustomerHomeView.tsx
// Complete Customer Discovery, Price Comparison & Nearby Store Portal (Phases 3 & 4)
// ==============================================================================

'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useApp } from '@/components/common/AppContext';
import { MasterProduct, Shop, ShopProductRate, Category } from '@/types';
import { PriceComparisonCard } from '@/components/customer/PriceComparisonCard';
import { ShopCard } from '@/components/customer/ShopCard';
import { MapView } from '@/components/customer/MapView';
import { ProductDetailModal } from '@/components/customer/ProductDetailModal';
import { ShopProfileModal } from '@/components/customer/ShopProfileModal';
import { PriceAlertModal } from '@/components/customer/PriceAlertModal';
import { WishlistDrawer } from '@/components/customer/WishlistDrawer';
import { HoldAtCounterModal } from '@/components/customer/HoldAtCounterModal';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { 
  Search, 
  MapPin, 
  SlidersHorizontal, 
  Map as MapIcon, 
  List, 
  Store, 
  Tag, 
  Sparkles, 
  AlertCircle,
  Clock,
  Compass,
  CheckCircle2,
  RefreshCw,
  ShoppingBag,
  Mic,
  Download,
  Phone, 
  MessageCircle, 
  Navigation, 
  ShieldCheck,
  ArrowRight,
  User
} from 'lucide-react';
import { parseSmartSearchQuery } from '@/lib/search/smartSearch';
import { calculateDistance, getDirectionsUrl } from '@/lib/geo';
import { calculatePriceFreshness } from '@/lib/utils';
import { fetchDbProducts, fetchDbShopProducts } from '@/lib/supabase/db';
import { recordShopInteraction, recordCustomerStoreInteraction } from '@/lib/analytics/interactionTracker';

export function CustomerHomeView({
  categories,
  initialProducts,
  initialShops,
  initialRates,
  onOpenHolds,
  onOpenVoice,
  onOpenOnboarding,
  onOpenAuth,
  activeMobileView,
  onViewChange,
}: {
  categories: Category[];
  initialProducts: MasterProduct[];
  initialShops: Shop[];
  initialRates: Record<string, ShopProductRate[]>;
  onOpenHolds?: () => void;
  onOpenVoice?: () => void;
  onOpenOnboarding?: () => void;
  onOpenAuth?: (role?: 'customer' | 'merchant') => void;
  activeMobileView?: string;
  onViewChange?: (view: string) => void;
}) {
  const { 
    searchQuery, 
    setSearchQuery, 
    userLocation, 
    searchRadiusKm, 
    setSearchRadiusKm,
    allShops,
    customerUser,
    authUser,
    setRole,
    switchPortal,
    hasCustomerAccount,
    hasMerchantAccount,
  } = useApp();

  // Dynamic live catalog state: updates whenever merchants add/update products
  const [products, setProducts] = useState<MasterProduct[]>(initialProducts);
  const [liveRates, setLiveRates] = useState<Record<string, ShopProductRate[]>>(initialRates);

  // Local UI State
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [inStockOnly, setInStockOnly] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<'price' | 'distance' | 'freshness'>('price');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

  // Modal States
  const [activeProduct, setActiveProduct] = useState<MasterProduct | null>(null);
  const [activeShopId, setActiveShopId] = useState<string | null>(null);
  const [alertProduct, setAlertProduct] = useState<MasterProduct | null>(null);
  const [isWishlistOpen, setIsWishlistOpen] = useState<boolean>(false);
  const [holdModalData, setHoldModalData] = useState<{ product: MasterProduct; rate: ShopProductRate } | null>(null);

  // Sync server-provided props into client state
  useEffect(() => {
    if (initialProducts?.length > 0) setProducts(initialProducts);
  }, [initialProducts]);

  useEffect(() => {
    if (initialRates && Object.keys(initialRates).length > 0) setLiveRates(initialRates);
  }, [initialRates]);

  // Load live catalog: only called on demand when merchant inventory updates
  const loadLiveCatalog = useCallback(async () => {
    try {
      const [dbProds, allDbInv] = await Promise.all([
        fetchDbProducts(),
        fetchDbShopProducts()
      ]);

      const prodMap = new Map<string, MasterProduct>();
      initialProducts.forEach(p => prodMap.set(p.id, p));
      dbProds.forEach(p => prodMap.set(p.id, p));

      const candidateShops = (allShops && allShops.length > 0) ? allShops : initialShops;
      const ratesMap: Record<string, ShopProductRate[]> = { ...initialRates };

      const dbInvByShop = new Map<string, any[]>();
      allDbInv.forEach(item => {
        const sId = item.shop_id || item.shopId;
        if (sId) {
          if (!dbInvByShop.has(sId)) dbInvByShop.set(sId, []);
          dbInvByShop.get(sId)!.push(item);
        }
      });

      for (const shop of candidateShops) {
        // DB shop products for this shop from the batched query
        const dbInv = dbInvByShop.get(shop.id) || [];

        // Read local storage cache for newly registered shop inventory
        let localInv: any[] = [];
        try {
          const raw = localStorage.getItem('shopmitra_shop_inventory_' + shop.id);
          if (raw) localInv = JSON.parse(raw);
        } catch {}

        const combinedInv = [...dbInv];
        localInv.forEach(item => {
          if (!combinedInv.some(c => (c.product_id || c.productId) === (item.product_id || item.productId))) {
            combinedInv.push(item);
          }
        });

        const distKm = calculateDistance(userLocation.lat, userLocation.lng, shop.lat, shop.lng);

        for (const inv of combinedInv) {
          const prodId = inv.product_id || inv.productId;
          if (!prodId) continue;

          let prod = prodMap.get(prodId);
          if (!prod) {
            // New custom product created by merchant
            prod = {
              id: prodId,
              name: inv.product_name || inv.name || 'Product',
              brand: inv.brand || 'General',
              categoryId: inv.category_id || 'c1000000-0000-0000-0000-000000000001',
              categoryName: inv.category_name || 'General',
              category: inv.category_name || 'General',
              mrp: Number(inv.mrp) || Number(inv.selling_price || inv.price) * 1.15,
              imageUrl: inv.image_url || inv.imageUrl || '',
              galleryUrls: [],
              specifications: {},
              slug: (inv.product_name || inv.name || 'product').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            };
            prodMap.set(prodId, prod);
          }

          const price = Number(inv.selling_price || inv.price || 0);
          const prevPrice = Number(inv.previous_price || inv.previousPrice || price);
          const updatedAt = inv.last_price_update || inv.created_at || new Date().toISOString();
          const freshness = calculatePriceFreshness(updatedAt);

          const rateEntry: ShopProductRate = {
            id: inv.id || `rate-${shop.id}-${prodId}`,
            shopId: shop.id,
            shopName: shop.name,
            shopSlug: shop.slug || shop.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            shopPhone: shop.phone,
            shopWhatsapp: shop.whatsapp || shop.phone,
            shopAddress: shop.address,
            shopLandmark: shop.landmark,
            shopLatitude: shop.lat,
            shopLongitude: shop.lng,
            isVerified: shop.isVerified,
            verificationBadge: shop.verificationBadge,
            rating: shop.rating,
            reviewCount: shop.reviewCount,
            distanceKm: distKm,
            distanceMeters: Math.round(distKm * 1000),
            productId: prodId,
            productName: prod.name,
            productBrand: prod.brand,
            productImage: prod.imageUrl,
            currentPrice: price,
            previousPrice: prevPrice,
            mrp: prod.mrp,
            savings: Math.max(0, prod.mrp - price),
            stockStatus: (inv.stock_status || inv.stock || 'in_stock') as any,
            stockQuantity: Number(inv.stock_quantity || inv.count || 10),
            lastPriceUpdatedAt: updatedAt,
            lastStockUpdatedAt: updatedAt,
            freshness: freshness.freshness,
            freshnessLabel: freshness.label,
            isAnomalyFlagged: false,
          };

          if (!ratesMap[prodId]) ratesMap[prodId] = [];
          if (!ratesMap[prodId].some(r => r.shopId === shop.id)) {
            ratesMap[prodId].push(rateEntry);
          }
        }
      }

      // Ensure all catalog products have local counter availability from an active store
      if (candidateShops.length > 0) {
        const primaryShop = candidateShops[0];
        const distKm = calculateDistance(userLocation.lat, userLocation.lng, primaryShop.lat, primaryShop.lng);
        prodMap.forEach((prod, prodId) => {
          if (!ratesMap[prodId] || ratesMap[prodId].length === 0) {
            ratesMap[prodId] = [{
              id: `rate-default-${primaryShop.id}-${prodId}`,
              shopId: primaryShop.id,
              shopName: primaryShop.name,
              shopSlug: primaryShop.slug,
              shopPhone: primaryShop.phone,
              shopWhatsapp: primaryShop.whatsapp || primaryShop.phone,
              shopAddress: primaryShop.address,
              shopLandmark: primaryShop.landmark,
              shopLatitude: primaryShop.lat,
              shopLongitude: primaryShop.lng,
              isVerified: primaryShop.isVerified,
              verificationBadge: primaryShop.verificationBadge,
              rating: primaryShop.rating,
              reviewCount: primaryShop.reviewCount,
              distanceKm: distKm,
              distanceMeters: Math.round(distKm * 1000),
              productId: prodId,
              productName: prod.name,
              productBrand: prod.brand,
              productImage: prod.imageUrl,
              currentPrice: prod.mrp,
              previousPrice: prod.mrp,
              mrp: prod.mrp,
              savings: 0,
              stockStatus: 'in_stock',
              stockQuantity: 10,
              lastPriceUpdatedAt: new Date().toISOString(),
              lastStockUpdatedAt: new Date().toISOString(),
              freshness: 'recently_updated',
              freshnessLabel: 'Counter Rate (MRP)',
              isAnomalyFlagged: false,
            }];
          }
        });
      }

      setProducts(Array.from(prodMap.values()));
      setLiveRates(ratesMap);
    } catch (err) {
      console.warn('loadLiveCatalog error:', err);
    }
  }, [allShops, initialShops, initialProducts, userLocation]);

  // Listen to local merchant inventory update events (or load if initialProducts was empty)
  useEffect(() => {
    if (!initialProducts || initialProducts.length === 0) {
      loadLiveCatalog();
    }
    const handleInvUpdate = () => loadLiveCatalog();
    window.addEventListener('shopmitra:inventory_updated', handleInvUpdate);
    return () => {
      window.removeEventListener('shopmitra:inventory_updated', handleInvUpdate);
    };
  }, [loadLiveCatalog, initialProducts]);

  // React to mobile bottom bar navigation actions
  useEffect(() => {
    if (!activeMobileView) return;
    if (activeMobileView === 'map') {
      setViewMode('map');
      setTimeout(() => {
        const mapEl = document.getElementById('customer-map-section');
        if (mapEl) mapEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
    } else if (activeMobileView === 'search' || activeMobileView === 'rates') {
      setViewMode('list');
      setTimeout(() => {
        const ratesEl = document.getElementById('customer-rates-section');
        if (ratesEl) ratesEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
    } else if (activeMobileView === 'home') {
      setViewMode('list');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [activeMobileView]);

  // Listen for global switch_view events (e.g. from header location modal)
  useEffect(() => {
    const handleSwitchView = (e: any) => {
      const targetView = e.detail?.view;
      if (targetView === 'map') {
        setViewMode('map');
        setTimeout(() => {
          const mapEl = document.getElementById('customer-map-section');
          if (mapEl) mapEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 60);
      } else if (targetView === 'list' || targetView === 'rates') {
        setViewMode('list');
      }
    };
    window.addEventListener('shopmitra:switch_view', handleSwitchView);
    return () => window.removeEventListener('shopmitra:switch_view', handleSwitchView);
  }, []);

  // Smart Search parser extraction
  const parsedSearch = useMemo(() => {
    return parseSmartSearchQuery(searchQuery);
  }, [searchQuery]);

  const cleanKeyword = (parsedSearch.cleanedText || searchQuery).toLowerCase().trim();

  // Find physical stores matching the search query by name, city, address or landmark
  const matchingShopEntries = useMemo(() => {
    if (!cleanKeyword) return [];
    const candidateList = (allShops && allShops.length > 0) ? allShops : initialShops;
    return candidateList.filter(s =>
      s.name.toLowerCase().includes(cleanKeyword) ||
      (s.city && s.city.toLowerCase().includes(cleanKeyword)) ||
      (s.address && s.address.toLowerCase().includes(cleanKeyword)) ||
      (s.landmark && s.landmark.toLowerCase().includes(cleanKeyword))
    );
  }, [cleanKeyword, allShops, initialShops]);

  const matchingShopIds = useMemo(() => {
    return new Set(matchingShopEntries.map(s => s.id));
  }, [matchingShopEntries]);

  // Dynamically calculate accurate nearby shops relative to active userLocation
  const nearbyShops = useMemo(() => {
    const candidateList = (allShops && allShops.length > 0) ? allShops : initialShops;
    const list = candidateList.map(shop => ({
      ...shop,
      distanceKm: calculateDistance(userLocation.lat, userLocation.lng, shop.lat, shop.lng)
    }));

    // Filter within radius
    let withinRadius = list
      .filter(shop => (shop.distanceKm || 0) <= searchRadiusKm);

    if (withinRadius.length === 0) {
      withinRadius = list.slice(0, 4);
    }

    // If a search query is active, filter/prioritize matching shops
    if (cleanKeyword) {
      const matching = withinRadius.filter(s =>
        s.name.toLowerCase().includes(cleanKeyword) ||
        (s.city && s.city.toLowerCase().includes(cleanKeyword)) ||
        (s.address && s.address.toLowerCase().includes(cleanKeyword)) ||
        (s.landmark && s.landmark.toLowerCase().includes(cleanKeyword))
      );
      if (matching.length > 0) {
        return matching.sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0));
      }
    }

    return withinRadius.sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0));
  }, [allShops, initialShops, userLocation, searchRadiusKm, cleanKeyword]);

  // Dynamically calculate accurate distance for each shop rate relative to active userLocation
  const currentRates = useMemo(() => {
    const map: Record<string, ShopProductRate[]> = {};
    const candidateShops = (allShops && allShops.length > 0) ? allShops : initialShops;

    for (const [prodId, ratesList] of Object.entries(liveRates)) {
      map[prodId] = ratesList.map(rate => {
        const matchingShop = candidateShops.find(s => s.id === rate.shopId);
        const sLat = rate.shopLatitude || matchingShop?.lat || userLocation.lat;
        const sLng = rate.shopLongitude || matchingShop?.lng || userLocation.lng;
        const dist = calculateDistance(userLocation.lat, userLocation.lng, sLat, sLng);
        return {
          ...rate,
          shopLatitude: sLat,
          shopLongitude: sLng,
          distanceKm: dist,
          distanceMeters: Math.round(dist * 1000),
        };
      });
    }
    return map;
  }, [liveRates, allShops, initialShops, userLocation]);

  // Filter & Sort products: Dual-Mode Search (Product Name + Shop Name) & Active Filters
  const filteredProducts = useMemo(() => {
    // Check if any product rate is within searchRadiusKm
    const hasAnyNearbyRate = Object.values(currentRates).some(rateList =>
      rateList.some(r => (r.distanceKm || 0) <= searchRadiusKm)
    );

    const list = products.filter((product) => {
      const rates = currentRates[product.id] || [];

      // 1. Category filter
      if (selectedCategory !== 'All') {
        const prodCat = (product.category || product.categoryName || '').toLowerCase();
        const selCat = selectedCategory.toLowerCase();
        const catObj = categories.find(c => c.name.toLowerCase() === selCat);
        const matchesCat = prodCat === selCat || (catObj && product.categoryId === catObj.id);
        if (!matchesCat) return false;
      }

      // 2. Dual-Mode Keyword Search: Matches Product OR matches any Shop stocking this product!
      if (cleanKeyword) {
        const matchName = product.name.toLowerCase().includes(cleanKeyword);
        const matchBrand = product.brand.toLowerCase().includes(cleanKeyword);
        const matchDesc = (product.description || '').toLowerCase().includes(cleanKeyword);
        const matchCat = (product.category || product.categoryName || '').toLowerCase().includes(cleanKeyword);
        const matchShop = rates.some(r => 
          matchingShopIds.has(r.shopId) ||
          r.shopName.toLowerCase().includes(cleanKeyword)
        );

        if (!matchName && !matchBrand && !matchDesc && !matchCat && !matchShop) {
          return false;
        }
      }

      // 3. Rates availability: Catalog products are preserved so customers can discover items even while counter rates are updating

      // 4. Price limit filter from smart search NLP (e.g. "under 5000")
      if (parsedSearch.maxPrice && rates.length > 0) {
        const lowest = Math.min(...rates.map(r => r.currentPrice));
        if (lowest > parsedSearch.maxPrice) return false;
      }

      // 5. In-stock filter
      if (inStockOnly && rates.length > 0) {
        const hasStock = rates.some(r => r.stockStatus === 'in_stock' || r.stockStatus === 'low_stock');
        if (!hasStock) return false;
      }

      // 6. Distance radius filter:
      // If there are stores within the chosen radius, enforce it.
      // If all registered stores are beyond radius (e.g. user location in a new city or remote),
      // allow products to show so customer discovery is never blanked out!
      if (hasAnyNearbyRate && !cleanKeyword && rates.length > 0) {
        const hasNearbyStore = rates.some(r => (r.distanceKm || 0) <= searchRadiusKm);
        if (!hasNearbyStore) return false;
      }

      return true;
    });

    // Sort products based on user's active sortBy selection
    return list.sort((a, b) => {
      const ratesA = currentRates[a.id] || [];
      const ratesB = currentRates[b.id] || [];
      if (sortBy === 'price') {
        const minA = ratesA.length ? Math.min(...ratesA.map(r => r.currentPrice)) : a.mrp;
        const minB = ratesB.length ? Math.min(...ratesB.map(r => r.currentPrice)) : b.mrp;
        return minA - minB;
      }
      if (sortBy === 'distance') {
        const distA = ratesA.length ? Math.min(...ratesA.map(r => r.distanceKm || 999)) : 999;
        const distB = ratesB.length ? Math.min(...ratesB.map(r => r.distanceKm || 999)) : 999;
        return distA - distB;
      }
      if (sortBy === 'freshness') {
        const timeA = ratesA.length ? new Date(ratesA[0].lastPriceUpdatedAt).getTime() : 0;
        const timeB = ratesB.length ? new Date(ratesB[0].lastPriceUpdatedAt).getTime() : 0;
        return timeB - timeA;
      }
      return 0;
    });
  }, [products, selectedCategory, cleanKeyword, currentRates, inStockOnly, searchRadiusKm, sortBy, parsedSearch.maxPrice, matchingShopIds, categories]);

  // Track real-time search queries for matching shops
  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length >= 3 && filteredProducts.length > 0) {
      const topShopIds = new Set<string>();
      filteredProducts.slice(0, 3).forEach(p => {
        (currentRates[p.id] || []).forEach(r => topShopIds.add(r.shopId));
      });
      topShopIds.forEach(sId => {
        recordShopInteraction(sId, 'search', { query: q });
      });
    }
  }, [searchQuery, filteredProducts, currentRates]);

  // Extract products specifically stocked by the currently open shop modal
  const activeShopProducts = useMemo(() => {
    if (!activeShopId) return [];
    const list: ShopProductRate[] = [];
    Object.values(currentRates).forEach(ratesList => {
      ratesList.forEach(r => {
        if (r.shopId === activeShopId) list.push(r);
      });
    });
    return list;
  }, [activeShopId, currentRates]);

  // Quick discovery chips for customer search
  const quickSearches = [
    'Grocery',
    'Electronics',
    'Mobile',
    'Atta',
    'Milk',
  ];

  return (
    <div className="space-y-6 sm:space-y-8 pb-16 w-full overflow-x-hidden">
      {/* Hero Discovery Banner */}
      <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-emerald-800 via-emerald-900 to-teal-950 text-white p-4 sm:p-8 shadow-xl">
        <div className="absolute -right-8 -top-8 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -left-8 -bottom-8 w-48 h-48 bg-emerald-500/20 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/15 backdrop-blur-md text-emerald-100 text-[10px] sm:text-xs font-semibold mb-2.5 border border-white/15">
            <Sparkles className="w-3 h-3 text-yellow-300" />
            <span>Counter Rates • Zero Delivery Markup</span>
          </div>

          <h1 className="text-xl sm:text-3xl lg:text-4xl font-black tracking-tight leading-snug">
            Compare Live Counter Prices Across Shops Near You
          </h1>
          <p className="text-xs sm:text-sm text-emerald-100 mt-2 max-w-2xl leading-relaxed">
            Find which neighborhood electronics, grocery, or hardware store currently has your item at the lowest price. Call or WhatsApp the merchant directly.
          </p>

          {/* Action CTAs */}
          <div className="mt-4 flex items-center gap-2 flex-wrap">
            {onOpenVoice && (
              <button
                onClick={onOpenVoice}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/90 hover:bg-emerald-400 text-white text-xs font-black shadow-md shadow-emerald-950/30 transition-all active:scale-95 border border-emerald-300/40 shrink-0"
              >
                <Mic className="w-3.5 h-3.5 animate-pulse" />
                <span>बोलकर सर्च करें / Speak</span>
              </button>
            )}

            {onOpenOnboarding && (
              <button
                onClick={onOpenOnboarding}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black shadow-lg shadow-amber-950/30 transition-all active:scale-95 border border-amber-300 shrink-0"
              >
                <Store className="w-3.5 h-3.5" />
                <span>🏪 अपनी दुकान लिस्ट करें / List Your Shop</span>
              </button>
            )}

            <button
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(new CustomEvent('shopmitra:trigger_install'));
                }
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-700/80 hover:bg-emerald-600 text-white text-xs font-black shadow-md shadow-emerald-950/30 transition-all active:scale-95 border border-emerald-400/40 shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>📱 Install App</span>
            </button>
            <span className="text-[11px] font-semibold text-emerald-200">Try:</span>
            {quickSearches.map((chip) => (
              <button
                key={chip}
                onClick={() => setSearchQuery(chip)}
                className="text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full bg-white/15 hover:bg-white/25 border border-white/20 text-white transition-colors"
              >
                {chip}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Primary Account-Type Selection: CUSTOMER vs MERCHANT ── */}
      {/* Only show when user is NOT yet logged in as a customer */}
      {!customerUser?.isLoggedIn && (
      <section className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {/* Option 1: CUSTOMER */}
          <div
            onClick={() => {
              if (!hasCustomerAccount && onOpenAuth) {
                onOpenAuth('customer');
              } else {
                // Scroll down to live store rates
                const el = document.getElementById('customer-rates-section');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }
            }}
            className="group relative bg-white dark:bg-slate-900 border-2 border-brand-200 dark:border-brand-900/50 hover:border-brand-500 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-2xl bg-brand-500 text-white flex items-center justify-center font-black text-xl shadow-md shadow-brand-500/20 group-hover:scale-105 transition-transform">
                    🛍️
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-black tracking-wider text-brand-600 uppercase bg-brand-50 dark:bg-brand-950/50 px-2.5 py-0.5 rounded-full border border-brand-100 dark:border-brand-900/40">
                        Option 1
                      </span>
                      <span className="text-xs font-bold text-slate-400">• Customer Mode</span>
                    </div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
                      CUSTOMER
                    </h3>
                  </div>
                </div>
                {hasCustomerAccount ? (
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1 rounded-xl flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Customer Active</span>
                  </span>
                ) : (
                  <span className="text-[11px] font-black text-brand-700 dark:text-brand-300 bg-brand-100/80 dark:bg-brand-950 px-2.5 py-1 rounded-xl">
                    Sign In / Register
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 font-medium mt-3 leading-relaxed">
                Browse nearby verified stores, compare live counter prices, hold items for walk-in counter discounts, or call local merchants directly.
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                {hasCustomerAccount 
                  ? `Active Customer: ${customerUser?.name && customerUser.name !== 'Shopper' ? customerUser.name : (customerUser?.mobile || 'Verified')}` 
                  : 'Phone / Email OTP Verification'}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (!hasCustomerAccount && onOpenAuth) {
                    onOpenAuth('customer');
                  } else {
                    const el = document.getElementById('customer-rates-section');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
                className="inline-flex items-center space-x-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-black px-4 py-2 rounded-xl shadow-sm group-hover:shadow transition-all"
              >
                <span>{hasCustomerAccount ? 'Explore Live Rates' : 'Continue as Customer'}</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>

          {/* Option 2: MERCHANT */}
          <div
            onClick={() => {
              if (hasMerchantAccount) {
                switchPortal('merchant');
              } else if (authUser) {
                if (onOpenOnboarding) onOpenOnboarding();
              } else {
                if (onOpenAuth) onOpenAuth('merchant');
              }
            }}
            className="group relative bg-white dark:bg-slate-900 border-2 border-emerald-200 dark:border-emerald-900/50 hover:border-emerald-500 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black text-xl shadow-md shadow-emerald-600/20 group-hover:scale-105 transition-transform">
                    🏪
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-black tracking-wider text-emerald-700 uppercase bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-0.5 rounded-full border border-emerald-100 dark:border-emerald-900/40">
                        Option 2
                      </span>
                      <span className="text-xs font-bold text-slate-400">• Business Flow</span>
                    </div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
                      MERCHANT
                    </h3>
                  </div>
                </div>
                {hasMerchantAccount ? (
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1 rounded-xl flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Store Connected</span>
                  </span>
                ) : (
                  <span className="text-[11px] font-black text-emerald-800 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-950 px-2.5 py-1 rounded-xl">
                    Sell on ShopMitra
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 font-medium mt-3 leading-relaxed">
                List your physical store, update live counter rates, reach nearby neighborhood customers, manage customer holds & pay zero platform commission.
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                {hasMerchantAccount ? 'Merchant Account Active' : 'Phone / Email OTP • Instant Setup'}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (hasMerchantAccount) {
                    switchPortal('merchant');
                  } else if (authUser) {
                    if (onOpenOnboarding) onOpenOnboarding();
                  } else {
                    if (onOpenAuth) onOpenAuth('merchant');
                  }
                }}
                className="inline-flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black px-4 py-2 rounded-xl shadow-sm group-hover:shadow transition-all"
              >
                <span>{hasMerchantAccount ? 'Open Merchant Dashboard' : 'Continue as Merchant'}</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </section>
      )}

      {/* Category Horizontal Filter Bar */}
      <section id="customer-rates-section" className="scroll-mt-24 flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 scrollbar-none -mx-3 px-3 sm:mx-0 sm:px-0">
        <button
          onClick={() => setSelectedCategory('All')}
          className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all flex items-center gap-1 shrink-0 ${
            selectedCategory === 'All'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
          }`}
        >
          <Tag className="w-3.5 h-3.5" />
          <span>All</span>
        </button>

        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.name)}
            className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all flex items-center gap-1 shrink-0 ${
              selectedCategory.toLowerCase() === cat.name.toLowerCase()
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
            }`}
          >
            <span>{cat.icon || '🏷️'}</span>
            <span>{cat.name}</span>
          </button>
        ))}
      </section>

      {/* Control & Filter Toolbar */}
      <section className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-xs">
        {/* Left: Active Radius & In-Stock toggle */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-500">Radius:</span>
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-xs font-semibold">
              {[1, 3, 5, 10, 25].map((km) => (
                <button
                  key={km}
                  onClick={() => setSearchRadiusKm(km)}
                  className={`px-2 py-1 rounded-md transition-colors ${
                    searchRadiusKm === km
                      ? 'bg-emerald-600 text-white font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  {km}k
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300 select-none">
            <input
              type="checkbox"
              checked={inStockOnly}
              onChange={(e) => setInStockOnly(e.target.checked)}
              className="w-3.5 h-3.5 rounded text-emerald-600 focus:ring-emerald-500 accent-emerald-600"
            />
            <span>In-Stock Only</span>
          </label>

          {/* Sort By selector */}
          <div className="flex items-center gap-1">
            <span className="text-xs font-bold text-slate-500">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 rounded-lg px-2 py-1 border border-slate-200 dark:border-slate-700 outline-none cursor-pointer"
            >
              <option value="price">Lowest Price</option>
              <option value="distance">Nearest Store</option>
              <option value="freshness">Recent Rates</option>
            </select>
          </div>
        </div>

        {/* Right: View Mode (List / Map) and Item Count */}
        <div className="flex items-center justify-between sm:justify-end gap-2 pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-100">
          <span className="text-xs text-slate-500 font-medium">
            <strong className="text-slate-900 dark:text-white">{filteredProducts.length}</strong> items in <strong className="text-slate-900 dark:text-white">{nearbyShops.length}</strong> shops
          </span>

          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>List</span>
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                viewMode === 'map'
                  ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <MapIcon className="w-3.5 h-3.5" />
              <span>Map</span>
            </button>
          </div>
        </div>
      </section>

      {/* Main Content Area: Map View or List View */}
      {viewMode === 'map' ? (
        <section id="customer-map-section" className="space-y-4">
          <div className="bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md">
            <MapView
              shops={nearbyShops}
              userLocation={userLocation}
              radiusKm={searchRadiusKm}
              onSelectShop={(shopId) => {
                recordShopInteraction(shopId, 'view');
                setActiveShopId(shopId);
              }}
            />
          </div>
        </section>
      ) : (
        <>
          {/* Prominent Matching Store Banner (Triggered when searching for a physical shop name) */}
          {cleanKeyword && matchingShopEntries.length > 0 && (
            <section className="bg-gradient-to-r from-slate-900 via-merchant-950 to-slate-900 text-white p-4 sm:p-5 rounded-3xl border border-merchant-500/40 shadow-xl space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="w-12 h-12 rounded-2xl bg-merchant-500/20 border border-merchant-500/40 flex items-center justify-center text-merchant-400 shrink-0">
                    <Store className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center space-x-2 flex-wrap">
                      <span className="text-[10px] font-black uppercase bg-merchant-500/25 text-merchant-300 px-2 py-0.5 rounded-full border border-merchant-500/30">
                        🏪 Physical Store Match
                      </span>
                      {matchingShopEntries[0].isVerified && (
                        <span className="text-[10px] font-bold text-emerald-400 flex items-center space-x-0.5">
                          <ShieldCheck className="w-3 h-3" />
                          <span>Verified Store</span>
                        </span>
                      )}
                    </div>
                    <h3 className="text-base sm:text-lg font-black mt-0.5 truncate">{matchingShopEntries[0].name}</h3>
                    <p className="text-xs text-slate-400 truncate">
                      📍 {matchingShopEntries[0].address} • <strong className="text-slate-200">{matchingShopEntries[0].city}</strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => {
                      recordShopInteraction(matchingShopEntries[0].id, 'view');
                      recordCustomerStoreInteraction({
                        shopId: matchingShopEntries[0].id,
                        shopName: matchingShopEntries[0].name,
                        shopCity: matchingShopEntries[0].city,
                        shopPhone: matchingShopEntries[0].phone,
                        shopWhatsapp: matchingShopEntries[0].whatsapp,
                        type: 'view',
                      });
                      setActiveShopId(matchingShopEntries[0].id);
                    }}
                    className="px-3.5 py-1.5 bg-merchant-600 hover:bg-merchant-500 text-white rounded-xl text-xs font-black transition-all shadow-sm"
                  >
                    View Store & Catalog
                  </button>

                  {matchingShopEntries[0].phone && (
                    <a
                      href={`tel:${matchingShopEntries[0].phone}`}
                      onClick={() => {
                        recordShopInteraction(matchingShopEntries[0].id, 'call');
                        recordCustomerStoreInteraction({
                          shopId: matchingShopEntries[0].id,
                          shopName: matchingShopEntries[0].name,
                          shopCity: matchingShopEntries[0].city,
                          shopPhone: matchingShopEntries[0].phone,
                          type: 'call',
                        });
                      }}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold border border-slate-700 flex items-center gap-1 transition-colors"
                    >
                      <Phone className="w-3.5 h-3.5 text-merchant-400" />
                      <span>Call</span>
                    </a>
                  )}

                  {(matchingShopEntries[0].whatsapp || matchingShopEntries[0].phone) && (
                    <a
                      href={`https://wa.me/91${matchingShopEntries[0].whatsapp || matchingShopEntries[0].phone}?text=${encodeURIComponent(`Hello ${matchingShopEntries[0].name}, I found your shop on ShopMitra.`)}`}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => {
                        recordShopInteraction(matchingShopEntries[0].id, 'whatsapp');
                        recordCustomerStoreInteraction({
                          shopId: matchingShopEntries[0].id,
                          shopName: matchingShopEntries[0].name,
                          shopCity: matchingShopEntries[0].city,
                          shopWhatsapp: matchingShopEntries[0].whatsapp || matchingShopEntries[0].phone,
                          type: 'whatsapp',
                        });
                      }}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold border border-slate-700 flex items-center gap-1 transition-colors"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                      <span>WhatsApp</span>
                    </a>
                  )}

                  <a
                    href={getDirectionsUrl(matchingShopEntries[0].lat, matchingShopEntries[0].lng, matchingShopEntries[0].name, userLocation.lat, userLocation.lng)}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => {
                      recordShopInteraction(matchingShopEntries[0].id, 'direction');
                      recordCustomerStoreInteraction({
                        shopId: matchingShopEntries[0].id,
                        shopName: matchingShopEntries[0].name,
                        shopCity: matchingShopEntries[0].city,
                        type: 'direction',
                      });
                    }}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold border border-slate-700 flex items-center gap-1 transition-colors"
                  >
                    <Navigation className="w-3.5 h-3.5 text-brand-400" />
                    <span>Map</span>
                  </a>
                </div>
              </div>
            </section>
          )}

          {/* Price Comparison Cards Section */}
          <section id="customer-rates-section" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Multi-Store Rate Comparisons</span>
                <Badge variant="primary" size="sm">{filteredProducts.length} Items</Badge>
              </h2>
            </div>

            {filteredProducts.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 p-10 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 text-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 mx-auto flex items-center justify-center">
                  <AlertCircle className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  No products found within {searchRadiusKm} km
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                  Try broadening your search keywords, searching by shop name or item name, or expanding your radius.
                </p>
                <div className="pt-2 flex justify-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategory('All');
                      setInStockOnly(false);
                    }}
                  >
                    Reset Filters
                  </Button>
                  {searchRadiusKm < 25 && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setSearchRadiusKm(25)}
                    >
                      Expand to 25 km
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredProducts.map((product) => {
                  const productRates = (currentRates[product.id] || [])
                    .filter(r => (r.distanceKm || 0) <= searchRadiusKm)
                    .sort((a, b) => {
                      if (sortBy === 'price') return a.currentPrice - b.currentPrice;
                      if (sortBy === 'distance') return (a.distanceKm || 0) - (b.distanceKm || 0);
                      return new Date(b.lastPriceUpdatedAt).getTime() - new Date(a.lastPriceUpdatedAt).getTime();
                    });
                  const displayRates = productRates.length > 0 ? productRates : (currentRates[product.id] || []);
                  return (
                    <PriceComparisonCard
                      key={product.id}
                      product={product}
                      rates={displayRates}
                      onSelectProduct={(p) => setActiveProduct(p)}
                      onOpenShop={(shopId) => {
                        recordShopInteraction(shopId, 'view');
                        setActiveShopId(shopId);
                      }}
                      onSetAlert={(p) => setAlertProduct(p)}
                      onHoldAtCounter={(p, r) => setHoldModalData({ product: p, rate: r })}
                    />
                  );
                })}
              </div>
            )}
          </section>

          {/* Nearby Stores Directory Section */}
          <section className="space-y-4 pt-6 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Store className="w-5 h-5 text-emerald-600" />
                  <span>Physical Retailers Nearby</span>
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Walk in, inspect items before paying, or order direct over WhatsApp.
                </p>
              </div>
              <Badge variant="neutral" size="sm">{nearbyShops.length} Stores in {searchRadiusKm} km</Badge>
            </div>

            {nearbyShops.length === 0 ? (
              <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800">
                <Store className="w-10 h-10 text-slate-400 mx-auto mb-2 opacity-50" />
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">No stores registered in this radius yet.</p>
                <p className="text-xs text-slate-500 mt-1">Try expanding radius to 15km or 25km.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {nearbyShops.map((shop) => (
                  <ShopCard
                    key={shop.id}
                    shop={shop}
                    onOpenShop={(shopId) => {
                      recordShopInteraction(shopId, 'view');
                      setActiveShopId(shopId);
                    }}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {/* Modals */}
      <ProductDetailModal
        isOpen={Boolean(activeProduct)}
        onClose={() => setActiveProduct(null)}
        product={activeProduct}
        rates={activeProduct ? (currentRates[activeProduct.id] || []) : []}
        onOpenShop={(shopId) => {
          recordShopInteraction(shopId, 'view');
          setActiveProduct(null);
          setActiveShopId(shopId);
        }}
        onSetAlert={(p) => {
          setActiveProduct(null);
          setAlertProduct(p);
        }}
        onHoldAtCounter={(p, r) => setHoldModalData({ product: p, rate: r })}
      />

      <ShopProfileModal
        isOpen={Boolean(activeShopId)}
        onClose={() => setActiveShopId(null)}
        shopId={activeShopId}
        products={activeShopProducts}
        onHoldAtCounter={(p, r) => setHoldModalData({ product: p, rate: r })}
      />

      <HoldAtCounterModal
        isOpen={Boolean(holdModalData)}
        onClose={() => setHoldModalData(null)}
        product={holdModalData?.product || null}
        rate={holdModalData?.rate || null}
        onHoldCreated={() => {
          if (onOpenHolds) onOpenHolds();
        }}
      />

      <PriceAlertModal
        isOpen={Boolean(alertProduct)}
        onClose={() => setAlertProduct(null)}
        product={alertProduct}
        currentLowestPrice={
          alertProduct && currentRates[alertProduct.id]
            ? Math.min(...currentRates[alertProduct.id].map(r => r.currentPrice))
            : undefined
        }
      />

      <WishlistDrawer
        isOpen={isWishlistOpen}
        onClose={() => setIsWishlistOpen(false)}
        products={products}
        onSelectProduct={(p) => {
          setIsWishlistOpen(false);
          setActiveProduct(p);
        }}
      />
    </div>
  );
}

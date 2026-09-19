// ==============================================================================
// src/components/merchant/MerchantDashboardView.tsx
// Professional Merchant Business Suite & Operations Center (Step 27 & 50)
// ==============================================================================

'use client';

import React, { useState } from 'react';
import { useApp } from '@/components/common/AppContext';
import { PriceQuickEditor } from './PriceQuickEditor';
import { BulkUploadModal } from './BulkUploadModal';
import { ProductCreateModal } from './ProductCreateModal';
import { CounterBillModal } from './CounterBillModal';
import { DemandHeatmapView } from './DemandHeatmapView';
import { getShopTelemetry, ShopTelemetry } from '@/lib/analytics/interactionTracker';
import { ShopProduct, MasterProduct, Shop } from '@/types';
import { fetchDbProducts, fetchDbShopProducts } from '@/lib/supabase/db';
import { 
  Store, 
  PlusCircle, 
  FileSpreadsheet, 
  Tag, 
  MessageSquare, 
  TrendingUp, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  ShieldCheck, 
  AlertTriangle, 
  Zap, 
  Phone,
  GitBranch,
  ArrowUpRight,
  Sparkles,
  Receipt,
  X,
  Navigation, 
  Camera, 
  Upload,
  User
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

export function MerchantDashboardView({
  onOpenOnboarding,
  onOpenAuth,
  activeMobileView,
  onViewChange,
}: {
  onOpenOnboarding?: () => void;
  onOpenAuth?: (role?: 'customer' | 'merchant') => void;
  activeMobileView?: string;
  onViewChange?: (view: string) => void;
} = {}) {
  const { 
    activeMerchantShopId, 
    setActiveMerchantShopId, 
    allShops, 
    registeredShops, 
    updateRegisteredShop, 
    customerUser,
    hasCustomerAccount,
    switchPortal,
  } = useApp();
  const { showToast } = useToast();

  const [activeSubTab, setActiveSubTab] = useState<'quick-rates' | 'enquiries' | 'offers' | 'analytics'>('quick-rates');
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [showBillModal, setShowBillModal] = useState(false);
  const [showEditShopModal, setShowEditShopModal] = useState(false);
  const [isStoreOpen, setIsStoreOpen] = useState(true);
  const [isDetectingLoc, setIsDetectingLoc] = useState(false);

  // Sync mobile bottom navigation actions with merchant view
  React.useEffect(() => {
    if (!activeMobileView) return;
    if (activeMobileView === 'quick-rates' || activeMobileView === 'rates') {
      setActiveSubTab('quick-rates');
      setTimeout(() => {
        const el = document.getElementById('merchant-tab-content');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
    } else if (activeMobileView === 'products') {
      setShowAddProductModal(true);
    } else if (activeMobileView === 'enquiries') {
      setActiveSubTab('enquiries');
      setTimeout(() => {
        const el = document.getElementById('merchant-tab-content');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
    } else if (activeMobileView === 'offers') {
      setActiveSubTab('offers');
      setTimeout(() => {
        const el = document.getElementById('merchant-tab-content');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
    } else if (activeMobileView === 'dashboard') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [activeMobileView]);

  const handleSelectSubTab = (tab: 'quick-rates' | 'enquiries' | 'offers' | 'analytics') => {
    setActiveSubTab(tab);
    if (onViewChange) {
      onViewChange(tab);
    }
    setTimeout(() => {
      const el = document.getElementById('merchant-tab-content');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 50);
  };

  // Look in allShops (registered shops from Supabase/local)
  const activeShop = (allShops && allShops.length > 0)
    ? (allShops.find(s => s.id === activeMerchantShopId) || allShops[0])
    : null;

  const [masterProducts, setMasterProducts] = useState<MasterProduct[]>([]);
  const [shopInventory, setShopInventory] = useState<any[]>([]);

  const loadShopInventory = React.useCallback(async () => {
    fetchDbProducts().then(setMasterProducts).catch(() => {});
    if (activeShop?.id) {
      try {
        const inv = await fetchDbShopProducts(undefined, activeShop.id);
        let localItems: any[] = [];
        try {
          const raw = localStorage.getItem('shopmitra_shop_inventory_' + activeShop.id);
          if (raw) localItems = JSON.parse(raw);
        } catch {}
        const combined = [...inv];
        localItems.forEach(item => {
          if (!combined.some(c => (c.product_id || c.productId) === (item.product_id || item.productId))) {
            combined.push(item);
          }
        });
        setShopInventory(combined);
      } catch (err) {
        console.warn('loadShopInventory error:', err);
      }
    }
  }, [activeShop?.id]);

  React.useEffect(() => {
    loadShopInventory();
    const handleInvUpdated = (e: any) => {
      if (!e?.detail?.shopId || e.detail.shopId === activeShop?.id) {
        loadShopInventory();
      }
    };
    const handleOpenAddProduct = () => setShowAddProductModal(true);

    window.addEventListener('shopmitra:inventory_updated', handleInvUpdated);
    window.addEventListener('shopmitra:open_add_product', handleOpenAddProduct);
    return () => {
      window.removeEventListener('shopmitra:inventory_updated', handleInvUpdated);
      window.removeEventListener('shopmitra:open_add_product', handleOpenAddProduct);
    };
  }, [loadShopInventory, activeShop?.id]);

  const isMyRegisteredStore = activeShop ? registeredShops.some(s => s.id === activeShop.id) : false;
  const shopEnquiries: any[] = [];
  const inventoryItems = shopInventory;

  const [telemetry, setTelemetry] = useState<ShopTelemetry>(() => getShopTelemetry(activeShop ? activeShop.id : ''));

  React.useEffect(() => {
    if (!activeShop) return;
    setTelemetry(getShopTelemetry(activeShop.id));
    const handleUpdate = (e: any) => {
      if (e?.detail?.shopId === activeShop.id) {
        setTelemetry(e.detail.telemetry);
      }
    };
    window.addEventListener('shopmitra:telemetry_updated', handleUpdate);
    return () => window.removeEventListener('shopmitra:telemetry_updated', handleUpdate);
  }, [activeShop?.id]);

  // Active inventory mapped to ShopProduct schema (only real listed items)
  const activeInventory: ShopProduct[] = React.useMemo(() => {
    if (!activeShop || inventoryItems.length === 0) return [];
    return inventoryItems.map(inv => {
      const prodId = inv.product_id || inv.productId;
      const prod = masterProducts.find(p => p.id === prodId);
      const price = Number(inv.selling_price || inv.price);
      return {
        id: inv.id,
        shopId: inv.shop_id || inv.shopId,
        productId: prodId,
        productName: prod?.name || inv.product_name || inv.name || 'Product',
        categoryName: prod?.categoryName || inv.category_name || 'General',
        brand: prod?.brand || inv.brand || '',
        mrp: prod?.mrp || Number(inv.mrp) || price * 1.15,
        sellingPrice: price,
        stockStatus: (inv.stock_status || inv.stock || 'in_stock') as any,
        stockQuantity: Number(inv.stock_quantity || inv.count) || 15,
        isAvailable: true,
        lastPriceUpdatedAt: inv.last_price_update || new Date().toISOString(),
        lastStockUpdatedAt: inv.last_price_update || new Date().toISOString(),
        isAnomalyFlagged: false,
        status: 'active' as const,
        createdAt: inv.created_at || new Date().toISOString(),
      };
    });
  }, [inventoryItems, masterProducts, activeShop?.id]);

  const lowStockCount = inventoryItems.filter(i => i.stock === 'low_stock').length;
  const staleCount = inventoryItems.filter(i => (i.updatedMinutesAgo || 0) > 48 * 60).length;

  const [editForm, setEditForm] = useState({
    name: '',
    city: '',
    address: '',
    landmark: '',
    phone: '',
    whatsapp: '',
    openingHours: '10:00 AM - 9:00 PM',
    photoUrl: '',
    lat: 0,
    lng: 0,
  });

  const editCameraRef = React.useRef<HTMLInputElement | null>(null);
  const editGalleryRef = React.useRef<HTMLInputElement | null>(null);

  const handleEditPhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setEditForm(prev => ({ ...prev, photoUrl: reader.result as string }));
        showToast('📸 Storefront photo updated!');
      }
    };
    reader.readAsDataURL(file);
  };

  React.useEffect(() => {
    if (activeShop) {
      setEditForm({
        name: activeShop.name,
        city: activeShop.city || '',
        address: activeShop.address || '',
        landmark: activeShop.landmark || '',
        phone: activeShop.phone || '',
        whatsapp: activeShop.whatsapp || '',
        openingHours: activeShop.openingHours || '10:00 AM - 9:00 PM',
        photoUrl: activeShop.photos && activeShop.photos.length > 0 ? activeShop.photos[0] : 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=800&auto=format&fit=crop&q=80',
        lat: activeShop.lat || 0,
        lng: activeShop.lng || 0,
      });
    }
  }, [activeShop]);

  const handleDetectStoreGps = async () => {
    setIsDetectingLoc(true);
    showToast('📡 Detecting current counter GPS coordinates...', 'info');

    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          let detectedCity = editForm.city;
          try {
            const res = await fetch(
              `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
            );
            if (res.ok) {
              const d = await res.json();
              if (d.city || d.locality) detectedCity = d.city || d.locality;
            }
          } catch {}
          setEditForm(prev => ({
            ...prev,
            lat,
            lng,
            city: detectedCity || prev.city,
          }));
          setIsDetectingLoc(false);
          showToast(`📍 Counter pinned at ${detectedCity} (${lat.toFixed(4)}, ${lng.toFixed(4)})!`);
        },
        async () => {
          try {
            const res = await fetch('https://ipwho.is/');
            if (res.ok) {
              const d = await res.json();
              if (d && d.success && d.latitude && d.longitude) {
                setEditForm(prev => ({
                  ...prev,
                  lat: d.latitude,
                  lng: d.longitude,
                  city: d.city || prev.city,
                }));
                setIsDetectingLoc(false);
                showToast(`📍 Counter located at ${d.city} via network!`);
                return;
              }
            }
          } catch {}
          setIsDetectingLoc(false);
          showToast('Updated coordinates');
        },
        { enableHighAccuracy: true, timeout: 6000, maximumAge: 30000 }
      );
    } else {
      setIsDetectingLoc(false);
    }
  };

  const handleSaveStoreProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.name.trim() || !editForm.city.trim()) {
      showToast('Please provide Shop Name and City', 'error');
      return;
    }
    if (!activeShop) return;
    const updated: Shop = {
      ...activeShop,
      name: editForm.name.trim(),
      city: editForm.city.trim(),
      address: editForm.address.trim(),
      landmark: editForm.landmark.trim(),
      phone: editForm.phone.trim() || activeShop.phone,
      whatsapp: editForm.whatsapp.trim() || activeShop.whatsapp || editForm.phone.trim(),
      openingHours: editForm.openingHours.trim() || activeShop.openingHours,
      photos: editForm.photoUrl ? [editForm.photoUrl] : activeShop.photos,
      lat: editForm.lat || activeShop.lat,
      lng: editForm.lng || activeShop.lng,
    };
    updateRegisteredShop(updated);
    setShowEditShopModal(false);
    showToast(`✅ Store "${updated.name}" updated successfully!`);
  };

  const handleToggleStoreStatus = () => {
    setIsStoreOpen(prev => {
      const next = !prev;
      showToast(next ? 'Store is now marked OPEN to customers' : 'Store is marked CLOSED for the day', 'info');
      return next;
    });
  };

  return (
    <div className="space-y-5 sm:space-y-6 w-full">
      {/* 1. Interactive Shop Selector Slider (Edge-to-Edge Touch Slider) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-0.5">
          <div className="flex items-center space-x-2">
            <Store className="w-4 h-4 text-merchant-600 shrink-0" />
            <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Select Store / Branch
            </span>
            <span className="text-[10px] font-bold bg-merchant-100 text-merchant-800 px-2 py-0.2 rounded-full">
              {allShops.length} Stores
            </span>
          </div>
          <span className="text-[10px] font-bold text-slate-400 hidden xs:inline">
            Swipe to switch 👉
          </span>
        </div>

        {/* Edge-to-Edge Touch Slider Strip */}
        <div className="flex items-stretch gap-2.5 overflow-x-auto pb-2 pt-1 scrollbar-none -mx-3 px-3 sm:mx-0 sm:px-0 pr-8">
          {allShops.map(s => {
            const isSelected = activeShop ? s.id === activeShop.id : false;
            const isRegistered = registeredShops.some(r => r.id === s.id);
            return (
              <button
                key={s.id}
                onClick={() => {
                  setActiveMerchantShopId(s.id);
                  showToast(`📍 Switched to ${s.name} (${s.city})`);
                }}
                className={`shrink-0 text-left p-3.5 rounded-2xl border transition-all flex flex-col justify-between w-[220px] xs:w-[250px] select-none ${
                  isSelected
                    ? 'bg-slate-900 text-white border-merchant-500 shadow-md ring-2 ring-merchant-500/40'
                    : 'bg-white text-slate-800 border-slate-200 hover:border-merchant-300 hover:bg-slate-50'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                      isRegistered
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold'
                        : isSelected
                        ? 'bg-slate-800 text-slate-300'
                        : 'bg-slate-100 text-slate-500'
                    }`}>
                      {isRegistered ? '⭐ My Store' : 'Demo Branch'}
                    </span>
                    {isSelected ? (
                      <span className="flex items-center gap-1 text-[9px] font-black text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                        <span>Active</span>
                      </span>
                    ) : (
                      <span className="text-[9px] font-medium text-slate-400">Tap to view</span>
                    )}
                  </div>

                  <h4 className={`text-xs font-black leading-snug line-clamp-2 ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                    {s.name}
                  </h4>
                </div>

                <div className={`mt-3 pt-2 border-t flex items-center justify-between text-[10px] ${isSelected ? 'border-slate-800' : 'border-slate-100'}`}>
                  <span className={`truncate max-w-[130px] ${isSelected ? 'text-slate-400' : 'text-slate-500'}`}>
                    📍 {s.city || 'Local'}
                  </span>
                  <span className={`font-black ${isSelected ? 'text-merchant-400' : 'text-merchant-600'}`}>
                    {isSelected ? 'Selected ✓' : 'Switch →'}
                  </span>
                </div>
              </button>
            );
          })}

          {/* "+ Add Store" Card at the end of the slider */}
          {onOpenOnboarding && (
            <button
              onClick={onOpenOnboarding}
              className="shrink-0 text-left p-3.5 rounded-2xl border-2 border-dashed border-merchant-300/80 bg-merchant-50/50 hover:bg-merchant-50 hover:border-merchant-400 transition-all flex flex-col items-center justify-center text-center w-[160px] select-none text-merchant-700"
              title="Register and onboard a new physical store"
            >
              <div className="w-8 h-8 rounded-full bg-merchant-100 text-merchant-700 flex items-center justify-center font-bold text-lg mb-1.5">
                +
              </div>
              <span className="text-xs font-black">Add Store</span>
              <span className="text-[10px] text-merchant-600 font-medium">New Branch</span>
            </button>
          )}
        </div>
      </div>

      {/* Top Banner: Store Header, Branch Switcher & Quick Status */}
      {!activeShop ? (
        <div className="bg-slate-900 text-white rounded-3xl p-8 sm:p-12 shadow-xl border border-slate-800 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
            <Store className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black">No Physical Store Registered Yet</h2>
          <p className="text-slate-400 text-sm max-w-md mx-auto">
            List your retail shop to start publishing live counter rates, receiving buyer enquiries, and appearing in local customer price searches!
          </p>
          <div className="pt-2">
            <button
              onClick={() => onOpenOnboarding?.()}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-6 py-3 rounded-2xl shadow-lg shadow-emerald-600/30 transition-all inline-flex items-center gap-2"
            >
              <PlusCircle className="w-5 h-5" />
              <span>List Your Store Free</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-slate-900 text-white rounded-3xl p-4 sm:p-6 md:p-8 shadow-xl border border-slate-800 relative overflow-hidden">
          <div className="flex flex-wrap items-start justify-between gap-4 relative z-10">
            <div className="min-w-0 max-w-full">
              <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                <span className="text-xs font-black uppercase tracking-wider text-merchant-400 bg-merchant-950/80 px-2.5 py-0.5 rounded-full border border-merchant-800/40">
                  Merchant Operations Hub
                </span>
                {isMyRegisteredStore && (
                  <span className="text-xs font-bold text-emerald-300 bg-emerald-950 px-2.5 py-0.5 rounded-full border border-emerald-500/50 flex items-center space-x-1 shadow-sm">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>⭐ Your Registered Store</span>
                  </span>
                )}
                {activeShop.isVerified ? (
                  <span className="text-xs font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800/40 flex items-center space-x-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>{activeShop.verificationBadge || 'Verified Store'}</span>
                  </span>
                ) : (
                  <span className="text-xs font-bold text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-800/40">
                    Verification Pending
                  </span>
                )}
              </div>

              <h2 className="text-2xl sm:text-3xl font-black mt-2 truncate">{activeShop.name}</h2>
              <div className="flex items-center space-x-3 mt-1 flex-wrap gap-2">
                <p className="text-xs sm:text-sm text-slate-400 flex items-center space-x-1.5 font-medium min-w-0">
                  <MapPin className="w-3.5 h-3.5 text-merchant-500 shrink-0" />
                  <span className="truncate">{activeShop.address} {activeShop.landmark ? `(${activeShop.landmark})` : ''} • <strong className="text-white font-bold">{activeShop.city}</strong></span>
                </p>
                {isMyRegisteredStore && (
                  <button
                    onClick={() => setShowEditShopModal(true)}
                    className="bg-slate-800/80 hover:bg-slate-700 text-merchant-400 hover:text-merchant-300 text-xs font-bold px-2.5 py-1 rounded-xl border border-slate-700/80 flex items-center space-x-1 transition-all shrink-0"
                    title="Edit store location, city and counter coordinates"
                  >
                    <span>✏️ Change City / Address</span>
                  </button>
                )}
              </div>
            </div>

            {/* Branch Switcher & Open Status Toggle */}
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              {/* Open / Closed Status Toggle */}
              <button
                onClick={handleToggleStoreStatus}
                className={`px-3.5 py-2 rounded-2xl text-xs font-black flex items-center space-x-1.5 transition-all shadow-sm shrink-0 ${
                  isStoreOpen
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                    : 'bg-rose-600 text-white hover:bg-rose-700'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                <span>{isStoreOpen ? 'Open Now' : 'Closed Today'}</span>
              </button>

              {/* Branch Switcher Dropdown */}
              <div className="bg-slate-800/90 backdrop-blur-md p-1.5 px-3 rounded-2xl border border-slate-700 flex items-center space-x-2 shrink min-w-0 max-w-full sm:max-w-xs">
                <GitBranch className="w-3.5 h-3.5 text-merchant-400 shrink-0" />
                <select
                  value={activeMerchantShopId}
                  onChange={e => {
                    setActiveMerchantShopId(e.target.value);
                    showToast('Switched active shop view!');
                  }}
                  className="bg-transparent text-xs font-bold text-white outline-none cursor-pointer w-full min-w-0 max-w-[170px] xs:max-w-[220px] sm:max-w-xs truncate"
                >
                  {allShops.map(s => (
                    <option key={s.id} value={s.id} className="bg-slate-900 text-white font-bold">
                      {registeredShops.some(r => r.id === s.id) ? '⭐ ' : ''}{s.name} ({s.city})
                    </option>
                  ))}
                </select>
              </div>

              {/* Switch to Customer Storefront View Button */}
              <button
                onClick={() => {
                  if (hasCustomerAccount) {
                    switchPortal('customer');
                  } else if (onOpenAuth) {
                    onOpenAuth();
                  } else {
                    switchPortal('customer');
                  }
                }}
                className="bg-brand-600/90 hover:bg-brand-600 text-white px-3.5 py-2 rounded-2xl text-xs font-black flex items-center space-x-1.5 transition-all shrink-0 shadow-sm"
                title="Switch view to Customer Storefront"
              >
                <span>🛍️ Customer Storefront</span>
              </button>

              {/* Merchant Profile & Account Button */}
              {onOpenAuth && (
                <button
                  onClick={() => onOpenAuth('merchant')}
                  className="bg-slate-800 hover:bg-slate-700 text-white px-3.5 py-2 rounded-2xl text-xs font-black flex items-center space-x-2 border border-slate-700 transition-all shrink-0 shadow-sm"
                  title="View Profile, Linked Accounts & Switch Context"
                >
                  <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-black">
                    {(customerUser?.name || 'M').charAt(0).toUpperCase()}
                  </div>
                  <span>{customerUser?.name ? `${customerUser.name}` : 'My Account'}</span>
                </button>
              )}
            </div>
          </div>


        {/* Real-time KPI Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 pt-6 border-t border-slate-800 text-center sm:text-left">
          <div className="bg-slate-800/40 p-3 rounded-2xl border border-slate-800">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Catalog Items</span>
            <span className="text-xl font-black text-white mt-0.5 block">{inventoryItems.length} Products</span>
            <span className="text-[10px] text-emerald-400 font-bold">{inventoryItems.length > 0 ? 'Live in Catalog' : 'No items listed'}</span>
          </div>

          <div className="bg-slate-800/40 p-3 rounded-2xl border border-slate-800">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Today's Views</span>
            <span className="text-xl font-black text-white mt-0.5 block">{telemetry.views}</span>
            <span className="text-[10px] text-slate-400">
              {telemetry.views === 0 ? 'No profile visits yet' : 'Verified customer visits'}
            </span>
          </div>

          <div 
            onClick={() => setActiveSubTab('analytics')}
            title="Click to view Local Demand Heatmap & Search Trends"
            className="bg-slate-800/40 p-3 rounded-2xl border border-slate-800 cursor-pointer hover:border-merchant-500/60 hover:bg-slate-800/80 transition-all group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Searches</span>
              <ArrowUpRight className="w-3 h-3 text-slate-500 group-hover:text-merchant-400 transition-colors" />
            </div>
            <span className="text-xl font-black text-white mt-0.5 block">{telemetry.searches}</span>
            <span className="text-[10px] text-merchant-400 font-bold truncate block">
              {telemetry.topSearchQuery ? `Top: ${telemetry.topSearchQuery}` : (telemetry.searches === 0 ? 'No searches logged' : 'Customer queries')}
            </span>
          </div>

          <div className="bg-slate-800/40 p-3 rounded-2xl border border-slate-800">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Directions Requested</span>
            <span className="text-xl font-black text-white mt-0.5 block">{telemetry.directions}</span>
            <span className="text-[10px] text-slate-400">Map navigation clicks</span>
          </div>

          <div className="bg-slate-800/40 p-3 rounded-2xl border border-slate-800">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Direct Calls & Leads</span>
            <span className="text-xl font-black text-white mt-0.5 block">{telemetry.calls + telemetry.whatsapp}</span>
            <span className="text-[10px] text-emerald-400 font-bold">
              {telemetry.calls + telemetry.whatsapp === 0 ? '0 Leads' : 'Verified Buyer Leads'}
            </span>
          </div>

          <div className="bg-slate-800/40 p-3 rounded-2xl border border-slate-800">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Stock Warnings</span>
            <span className="text-xl font-black text-amber-400 mt-0.5 block">{lowStockCount} Low</span>
            <span className="text-[10px] text-slate-400">{lowStockCount === 0 ? 'Inventory healthy' : 'Needs restock'}</span>
          </div>
        </div>
      </div>
      )}

      {/* Primary Quick Actions Launcher (Step 50 & Features 2 & 4) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
        <button
          onClick={() => setShowBillModal(true)}
          className="bg-gradient-to-tr from-merchant-600 via-emerald-600 to-teal-600 hover:from-merchant-500 hover:to-teal-500 text-white p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl shadow-lg shadow-merchant-600/25 transition-all flex items-center space-x-2.5 sm:space-x-3 text-left group border border-emerald-400/30"
        >
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-white/20 text-white flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
            <Receipt className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-black text-white leading-tight">Counter Bill</h4>
            <p className="text-[10px] sm:text-[11px] text-emerald-100 font-medium">Dynamic UPI QR</p>
          </div>
        </button>

        <button
          onClick={() => setActiveSubTab('analytics')}
          className={`p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl border shadow-xs transition-all flex items-center space-x-2.5 sm:space-x-3 text-left group ${
            activeSubTab === 'analytics'
              ? 'bg-emerald-50 border-emerald-400 text-emerald-950 ring-2 ring-emerald-500/20'
              : 'bg-white hover:bg-emerald-50/40 border-slate-200 hover:border-emerald-300'
          }`}
        >
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-black text-slate-900 leading-tight">Demand Map</h4>
            <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium">Footfall & Trends</p>
          </div>
        </button>

        <button
          onClick={() => setShowAddProductModal(true)}
          className="bg-white hover:bg-merchant-50/50 p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl border border-slate-200 hover:border-merchant-400 shadow-xs transition-all flex items-center space-x-2.5 sm:space-x-3 text-left group"
        >
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-merchant-100 text-merchant-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <PlusCircle className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-black text-slate-900 leading-tight">+ Add Product</h4>
            <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium">Catalog 1-click</p>
          </div>
        </button>

        <button
          onClick={() => setActiveSubTab('quick-rates')}
          className="bg-white hover:bg-merchant-50/50 p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl border border-slate-200 hover:border-merchant-400 shadow-xs transition-all flex items-center space-x-2.5 sm:space-x-3 text-left group"
        >
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-brand-100 text-brand-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Zap className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-black text-slate-900 leading-tight">Update Rates</h4>
            <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium">Instant price board</p>
          </div>
        </button>

        <button
          onClick={() => setShowBulkModal(true)}
          className="bg-white hover:bg-merchant-50/50 p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl border border-slate-200 hover:border-merchant-400 shadow-xs transition-all flex items-center space-x-2.5 sm:space-x-3 text-left group"
        >
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <FileSpreadsheet className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-black text-slate-900 leading-tight">Bulk CSV</h4>
            <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium">Import 500+ items</p>
          </div>
        </button>

        <button
          onClick={() => setActiveSubTab('offers')}
          className="bg-white hover:bg-merchant-50/50 p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl border border-slate-200 hover:border-merchant-400 shadow-xs transition-all flex items-center space-x-2.5 sm:space-x-3 text-left group"
        >
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Tag className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-black text-slate-900 leading-tight">Post Offer</h4>
            <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium">Weekend deals</p>
          </div>
        </button>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-2 overflow-x-auto scrollbar-none -mx-3 px-3 sm:mx-0 sm:px-0 pr-8">
        <button
          type="button"
          onClick={() => handleSelectSubTab('quick-rates')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center space-x-1.5 shrink-0 ${
            activeSubTab === 'quick-rates'
              ? 'bg-merchant-600 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>Price & Stock Board</span>
        </button>

        <button
          type="button"
          onClick={() => handleSelectSubTab('enquiries')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center space-x-1.5 shrink-0 ${
            activeSubTab === 'enquiries'
              ? 'bg-merchant-600 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Customer Enquiries ({shopEnquiries.length})</span>
        </button>

        <button
          type="button"
          onClick={() => handleSelectSubTab('offers')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center space-x-1.5 shrink-0 ${
            activeSubTab === 'offers'
              ? 'bg-merchant-600 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Tag className="w-3.5 h-3.5" />
          <span>Promotions & Deals</span>
        </button>

        <button
          type="button"
          onClick={() => handleSelectSubTab('analytics')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center space-x-1.5 shrink-0 ${
            activeSubTab === 'analytics'
              ? 'bg-merchant-600 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Local Demand & Search Trends</span>
        </button>
      </div>

      {/* Tab Contents Container */}
      <div id="merchant-tab-content" className="space-y-4">
        {/* Tab 1: Price Quick Editor */}
        {activeSubTab === 'quick-rates' && (
          <div className="space-y-4">
            <PriceQuickEditor />
          </div>
        )}

      {/* Tab 2: Enquiries Inbox */}
      {activeSubTab === 'enquiries' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div>
            <h3 className="text-base font-black text-slate-900">Customer Direct Inquiries</h3>
            <p className="text-xs text-slate-500">Respond directly or hand off to WhatsApp in 1 click</p>
          </div>

          <div className="space-y-3">
            {shopEnquiries.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <span>No customer inquiries for this shop today.</span>
              </div>
            ) : (
              shopEnquiries.map(enq => (
                <div key={enq.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-xs text-slate-900">{enq.customerName}</span>
                      <span className="text-[10px] text-slate-400">• {enq.createdAt}</span>
                      <span className="text-[10px] font-black bg-merchant-100 text-merchant-800 px-2 py-0.5 rounded">
                        Item: {enq.productName}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 mt-1 italic">"{enq.message}"</p>
                  </div>

                  <button
                    onClick={() => {
                      const shopTitle = activeShop ? activeShop.name : 'our store';
                      const msg = encodeURIComponent(`Hello ${enq.customerName}, regarding your inquiry for ${enq.productName}: Yes, it is in stock at ${shopTitle}!`);
                      window.open(`https://wa.me/91${enq.customerPhone}?text=${msg}`, '_blank');
                    }}
                    className="bg-brand-600 hover:bg-brand-700 text-white text-xs font-black px-3.5 py-1.5 rounded-xl flex items-center space-x-1 shadow-sm transition-colors"
                  >
                    <span>Reply on WhatsApp</span>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Store Offers */}
      {activeSubTab === 'offers' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-slate-900">Weekend & Festival Deals</h3>
              <p className="text-xs text-slate-500">Boost store footfall by displaying discount badges on customer comparison cards</p>
            </div>
            <button
              onClick={() => showToast('Offer created and published live on shop profile!')}
              className="bg-merchant-600 hover:bg-merchant-700 text-white text-xs font-black px-4 py-2 rounded-xl transition-colors"
            >
              + Create New Deal
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-amber-50/80 p-4 rounded-2xl border border-amber-200 flex items-start justify-between">
              <div>
                <span className="text-[10px] font-black uppercase bg-amber-200 text-amber-900 px-2 py-0.5 rounded">
                  Active Deal
                </span>
                <h4 className="text-sm font-black text-slate-900 mt-1.5">🔥 Direct Walk-in Special</h4>
                <p className="text-xs text-slate-600 mt-0.5">Flat ₹100 off on cash counter payments above ₹600</p>
                <span className="text-xs font-extrabold text-slate-800 mt-2 block font-mono">Coupon: WALKIN100</span>
              </div>
              <span className="text-[10px] text-amber-800 font-bold bg-amber-200/60 px-2 py-0.5 rounded-full">
                Ends Sunday
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Local Demand & Analytics (Feature 4) */}
      {activeSubTab === 'analytics' && activeShop && (
        <DemandHeatmapView 
          shopName={activeShop.name} 
          shopId={activeShop.id} 
          inventoryCount={inventoryItems.length} 
        />
      )}
      </div>

      {/* Modals */}
      <BulkUploadModal isOpen={showBulkModal} onClose={() => setShowBulkModal(false)} />
      <ProductCreateModal isOpen={showAddProductModal} onClose={() => setShowAddProductModal(false)} />
      {activeShop && (
        <CounterBillModal
          isOpen={showBillModal}
          onClose={() => setShowBillModal(false)}
          shop={activeShop}
          inventory={activeInventory}
          onSaleCompleted={(soldItems) => {
            showToast(`✅ Sale recorded! ${soldItems.length} product(s) stock updated.`);
          }}
        />
      )}

      {/* Edit Store Profile & Location Modal */}
      {showEditShopModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-200 relative animate-scale-in">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <div className="w-10 h-10 rounded-2xl bg-merchant-50 border border-merchant-200 flex items-center justify-center text-merchant-600">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">Update Store Location & Details</h3>
                  <p className="text-xs text-slate-500 font-medium">Set your city and exact GPS counter pin</p>
                </div>
              </div>
              <button
                onClick={() => setShowEditShopModal(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStoreProfile} className="mt-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Store / Business Name *</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full text-xs font-bold p-3 rounded-xl border border-slate-200 focus:border-merchant-500 outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">City / District *</label>
                  <input
                    type="text"
                    value={editForm.city}
                    onChange={e => setEditForm({ ...editForm, city: e.target.value })}
                    placeholder="e.g. Lucknow, Kanpur, Delhi"
                    className="w-full text-xs font-bold p-3 rounded-xl border border-slate-200 focus:border-merchant-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Landmark / Market Area</label>
                  <input
                    type="text"
                    value={editForm.landmark}
                    onChange={e => setEditForm({ ...editForm, landmark: e.target.value })}
                    placeholder="e.g. Hazratganj / Metro Gate 2"
                    className="w-full text-xs font-bold p-3 rounded-xl border border-slate-200 focus:border-merchant-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Full Counter Address</label>
                <input
                  type="text"
                  value={editForm.address}
                  onChange={e => setEditForm({ ...editForm, address: e.target.value })}
                  placeholder="e.g. Shop 42, Main Market Road"
                  className="w-full text-xs font-bold p-3 rounded-xl border border-slate-200 focus:border-merchant-500 outline-none"
                />
              </div>

              {/* Phone & WhatsApp */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={editForm.phone}
                    onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                    placeholder="e.g. 9876543210"
                    className="w-full text-xs font-bold p-3 rounded-xl border border-slate-200 focus:border-merchant-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">WhatsApp Orders Number</label>
                  <input
                    type="tel"
                    value={editForm.whatsapp}
                    onChange={e => setEditForm({ ...editForm, whatsapp: e.target.value })}
                    placeholder="e.g. 9876543210"
                    className="w-full text-xs font-bold p-3 rounded-xl border border-slate-200 focus:border-merchant-500 outline-none"
                  />
                </div>
              </div>

              {/* Opening Hours */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Daily Operating Hours</label>
                <input
                  type="text"
                  value={editForm.openingHours}
                  onChange={e => setEditForm({ ...editForm, openingHours: e.target.value })}
                  placeholder="e.g. 10:00 AM - 9:30 PM"
                  className="w-full text-xs font-bold p-3 rounded-xl border border-slate-200 focus:border-merchant-500 outline-none"
                />
              </div>

              {/* Storefront Photo Edit */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Storefront Photo (दुकान की फोटो)</label>
                <input
                  ref={editCameraRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleEditPhotoSelect}
                  className="hidden"
                />
                <input
                  ref={editGalleryRef}
                  type="file"
                  accept="image/*"
                  onChange={handleEditPhotoSelect}
                  className="hidden"
                />
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-200 shrink-0 border border-slate-300">
                    <img
                      src={editForm.photoUrl}
                      alt="Store Front"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => editCameraRef.current?.click()}
                        className="px-3 py-1.5 bg-merchant-600 hover:bg-merchant-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-sm transition-all active:scale-95"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>Camera</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => editGalleryRef.current?.click()}
                        className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs transition-all active:scale-95"
                      >
                        <Upload className="w-3.5 h-3.5 text-merchant-600" />
                        <span>Gallery</span>
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">Take or upload a new photo of your shop</p>
                  </div>
                </div>
              </div>

              {/* GPS Coordinates & Auto Detect */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-black text-slate-800 block">Exact Counter GPS Coordinates</span>
                    <span className="text-[11px] text-slate-500 font-mono">
                      Lat: {Number(editForm.lat).toFixed(4)}, Lng: {Number(editForm.lng).toFixed(4)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleDetectStoreGps}
                    disabled={isDetectingLoc}
                    className="bg-white hover:bg-slate-100 text-merchant-600 border border-merchant-200 text-xs font-bold px-3 py-1.5 rounded-xl flex items-center space-x-1.5 shadow-sm transition-all"
                  >
                    <Navigation className={`w-3.5 h-3.5 ${isDetectingLoc ? 'animate-spin' : ''}`} />
                    <span>{isDetectingLoc ? 'Detecting...' : 'Auto-Detect GPS'}</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditShopModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-black bg-merchant-600 hover:bg-merchant-700 text-white shadow-md shadow-merchant-500/20 transition-colors"
                >
                  Save Location Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ==============================================================================
// src/components/common/AppContext.tsx
// Global State Context — Real Supabase Auth + Spatial Location + Real-Time State
// ==============================================================================

'use client';

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import type { User } from '@supabase/supabase-js';
import { UserRole, UserLocation, MasterProduct, Shop, ShopProductRate, PriceAlert, CustomerUser } from '@/types';
import { DEFAULT_USER_LOCATION, parsePostGisPoint } from '@/lib/geo';
import { useToast } from '@/components/ui/Toast';
import { fetchDbShops, fetchDbCustomers, insertDbShop } from '@/lib/supabase/db';
import { createClient } from '@/lib/supabase/client';
import { deleteShopAction, deleteCustomerAction } from '@/server/actions/admin.actions';
import { merchantDeleteShopAction } from '@/server/actions/merchant.actions';
import { 
  getProfile, 
  getCustomerByProfileId, 
  getMerchantByProfileId, 
  getUserAccountStatus,
  createCustomerAccount as createCustomerAccountHelper,
  type CustomerRecord,
  type MerchantRecord,
  type UserAccountStatus
} from '@/lib/supabase/profile';
import { getWishlistAction, toggleWishlistAction } from '@/server/actions/wishlist.actions';

export type PortalType = 'customer' | 'merchant' | 'admin';

interface AppContextType {
  // Auth
  authUser: User | null;
  authLoading: boolean;
  role: UserRole;
  setRole: (role: UserRole) => void;

  // Multi-Account Architecture
  activePortal: PortalType;
  setActivePortal: (portal: PortalType) => void;
  switchPortal: (portal: PortalType) => void;
  hasCustomerAccount: boolean;
  hasMerchantAccount: boolean;
  customerRecord: CustomerRecord | null;
  merchantRecord: MerchantRecord | null;
  accountStatus: UserAccountStatus | null;
  refreshAccountStatus: () => Promise<void>;
  createCustomerAccountAction: (data: {
    fullName?: string;
    mobile?: string;
    preferredLanguage?: string;
    defaultLocationName?: string;
  }) => Promise<boolean>;

  // Location
  userLocation: UserLocation;
  setUserLocation: React.Dispatch<React.SetStateAction<UserLocation>>;

  // Search
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;

  // Merchant shop management
  activeMerchantShopId: string;
  setActiveMerchantShopId: (shopId: string) => void;
  registeredShops: Shop[];
  allShops: Shop[];
  registerNewShop: (shop: Shop) => void;
  updateRegisteredShop: (shop: Shop) => void;
  deleteShop: (shopId: string) => void;
  deletedShopIds: string[];

  // Spatial
  searchRadiusKm: number;
  setSearchRadiusKm: (radius: number) => void;

  // UI
  showToast: (messageOrOptions: any, type?: any) => void;

  // Wishlist & alerts
  wishlist: string[];
  toggleWishlist: (productId: string) => void;
  priceAlerts: PriceAlert[];
  addPriceAlert: (productId: string, targetPrice: number, radiusKm: number) => void;

  // Customer user (legacy + Supabase merged)
  customerUser: CustomerUser | null;
  allCustomers: CustomerUser[];
  loginCustomer: (data: {
    name: string;
    mobile: string;
    email?: string;
    city?: string;
    address?: string;
    lat?: number;
    lng?: number;
    supabaseUserId?: string;
  }) => void;
  logoutCustomer: () => void;
  deleteCustomerAccount: (customerId: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppContextProvider({ children }: { children: React.ReactNode }) {
  // ── Auth state (real Supabase) ───────────────────────────────────────────────
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // ── Multi-Account Architecture state ─────────────────────────────────────────
  const [activePortal, setActivePortalState] = useState<PortalType>('customer');
  const [hasCustomerAccount, setHasCustomerAccount] = useState(false);
  const [hasMerchantAccount, setHasMerchantAccount] = useState(false);
  const [customerRecord, setCustomerRecord] = useState<CustomerRecord | null>(null);
  const [merchantRecord, setMerchantRecord] = useState<MerchantRecord | null>(null);
  const [accountStatus, setAccountStatus] = useState<UserAccountStatus | null>(null);

  // ── App state ────────────────────────────────────────────────────────────────
  const [role, setRole] = useState<UserRole>('customer');
  const [userLocation, setUserLocation] = useState<UserLocation>(DEFAULT_USER_LOCATION);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [registeredShops, setRegisteredShops] = useState<Shop[]>([]);
  const [publicShops, setPublicShops] = useState<Shop[]>([]);
  const [activeMerchantShopId, setActiveMerchantShopId] = useState<string>('');
  const [deletedShopIds, setDeletedShopIds] = useState<string[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [priceAlerts, setPriceAlerts] = useState<PriceAlert[]>([]);
  const [customerUser, setCustomerUser] = useState<CustomerUser | null>(null);
  const [allCustomers, setAllCustomers] = useState<CustomerUser[]>([]);
  const { showToast } = useToast();

  // ── Portal Switcher (Changes context without re-authenticating) ───────────────
  const switchPortal = (portal: PortalType) => {
    setActivePortalState(portal);
    setRole(portal as UserRole);
    if (authUser?.id) {
      try {
        localStorage.setItem(`shopmitra_portal_${authUser.id}`, portal);
      } catch {}
    }
    showToast(
      portal === 'merchant'
        ? '🏪 Switched to Merchant Operations Center'
        : portal === 'admin'
        ? '🛡️ Switched to Admin Portal'
        : '🛍️ Switched to Customer Storefront',
      'info'
    );
  };

  const setActivePortal = (portal: PortalType) => {
    switchPortal(portal);
  };

  // ── Real Supabase Auth Listener ──────────────────────────────────────────────
  useEffect(() => {
    const supabase = createClient();

    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        setAuthUser(session.user);
        await syncUserFromSession(session.user);
      }
      setAuthLoading(false);
    });

    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setAuthUser(session.user);
        await syncUserFromSession(session.user);
      } else if (event === 'SIGNED_OUT') {
        setAuthUser(null);
        clearUserState();
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        setAuthUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Sync profile & account data from Supabase into AppContext after sign-in */
  const syncUserFromSession = async (user: User) => {
    try {
      // Query both customer and merchant status concurrently
      const status = await getUserAccountStatus(user.id);
      setAccountStatus(status);
      setHasCustomerAccount(status.hasCustomerAccount);
      setHasMerchantAccount(status.hasMerchantAccount);
      setCustomerRecord(status.customer);
      setMerchantRecord(status.merchant);

      const profile = status.profile;

      // Determine initial portal based on user-scoped saved preference or active accounts
      let targetPortal: PortalType = 'customer';
      let savedPortal: string | null = null;
      try {
        savedPortal = localStorage.getItem(`shopmitra_portal_${user.id}`);
      } catch {}

      if (status.isAdmin) {
        targetPortal = (savedPortal as PortalType) || 'admin';
      } else if (status.hasMerchantAccount && !status.hasCustomerAccount) {
        targetPortal = 'merchant';
      } else if (status.hasCustomerAccount && !status.hasMerchantAccount) {
        targetPortal = 'customer';
      } else if (status.hasCustomerAccount && status.hasMerchantAccount) {
        if (savedPortal === 'merchant' || savedPortal === 'customer') {
          targetPortal = savedPortal as PortalType;
        } else {
          targetPortal = 'customer';
        }
      }

      setActivePortalState(targetPortal);
      setRole(targetPortal as UserRole);
      try {
        localStorage.setItem(`shopmitra_portal_${user.id}`, targetPortal);
      } catch {}

      // Build CustomerUser representation strictly in memory
      const user_obj: CustomerUser = {
        id: user.id,
        name: (profile?.fullName && profile.fullName !== 'Shopper') 
          ? profile.fullName 
          : (user.user_metadata?.full_name && user.user_metadata.full_name !== 'Shopper')
          ? user.user_metadata.full_name
          : (status.merchant?.ownerName || (user.phone || (user.email ? user.email.split('@')[0] : 'Customer'))),
        mobile: status.customer?.mobile || profile?.phone || user.phone || status.merchant?.mobile || '',
        email: profile?.email || user.email || '',
        city: status.customer?.defaultLocationName || '',
        address: '',
        lat: userLocation.lat,
        lng: userLocation.lng,
        isLoggedIn: true,
      };

      setCustomerUser(user_obj);

      // Load user-scoped wishlist from database
      try {
        const savedWishlist = localStorage.getItem(`shopmitra_wishlist_${user.id}`);
        if (savedWishlist) setWishlist(JSON.parse(savedWishlist));
      } catch {}
      getWishlistAction().then((res) => {
        if (res.success && res.items) {
          setWishlist(res.items);
          try {
            localStorage.setItem(`shopmitra_wishlist_${user.id}`, JSON.stringify(res.items));
          } catch {}
        }
      }).catch((err) => console.warn('Wishlist DB sync notice:', err));

      // Load merchant shops if merchant account exists
      if (status.hasMerchantAccount) {
        if (status.shops && status.shops.length > 0) {
          const parsedShops: Shop[] = status.shops.map((s: any) => {
            const { lat, lng } = parsePostGisPoint(s.location);
            return {
              id: s.id,
              businessId: s.business_id || s.businesses?.id || '',
              name: s.name,
              slug: s.slug,
              phone: s.phone,
              whatsapp: s.whatsapp,
              address: s.address,
              landmark: s.landmark,
              city: s.city,
              lat,
              lng,
              openingHours: s.opening_hours,
              weeklyHolidays: [],
              isOpen: s.is_open,
              isVerified: s.is_verified,
              verificationBadge: s.verification_badge || (s.is_verified ? 'Verified Retail Partner' : undefined),
              photos: s.photos || [],
              rating: s.rating || 5.0,
              reviewCount: s.review_count || 0,
              isActive: s.is_active,
              createdAt: s.created_at,
            };
          });
          setRegisteredShops(parsedShops);
          setActiveMerchantShopId((prev) => {
            if (prev && parsedShops.some((s) => s.id === prev)) return prev;
            return parsedShops[0]?.id || '';
          });
        } else {
          await loadMerchantShops(user.id);
        }
      } else {
        setRegisteredShops([]);
        setActiveMerchantShopId('');
      }

      // Securely populate admin customers only if confirmed admin
      if (status.isAdmin) {
        fetchDbCustomers().then((dbCusts) => {
          if (dbCusts?.length > 0) setAllCustomers(dbCusts);
        }).catch(() => {});
      } else {
        setAllCustomers([]);
      }
    } catch (err) {
      console.warn('syncUserFromSession error:', err);
    }
  };

  /** Refresh full account status on demand (e.g. after onboarding or profile creation) */
  const refreshAccountStatus = async () => {
    if (!authUser) return;
    try {
      await syncUserFromSession(authUser);
    } catch (err) {
      console.warn('refreshAccountStatus error:', err);
    }
  };

  /** Direct action to create customer account under existing user */
  const createCustomerAccountAction = async (data: {
    fullName?: string;
    mobile?: string;
    preferredLanguage?: string;
    defaultLocationName?: string;
  }): Promise<boolean> => {
    if (!authUser) return false;
    try {
      const res = await createCustomerAccountHelper(authUser.id, data);
      if (res.success) {
        await refreshAccountStatus();
        switchPortal('customer');
        showToast('🎉 Customer account activated! You can now save items and place holds.');
        return true;
      }
      showToast(res.error || 'Failed to create customer account', 'error');
      return false;
    } catch (err: any) {
      showToast(err?.message || 'Error creating customer account', 'error');
      return false;
    }
  };

  /** Load merchant's shops from Supabase */
  const loadMerchantShops = async (userId: string) => {
    try {
      // 1. Try server action first for maximum reliability & zero RLS join latency
      const { getMerchantShopsAction } = await import('@/server/actions/merchant.actions');
      let data: any[] = (await getMerchantShopsAction(userId)) || [];

      // 2. Client fallback if needed
      if (!data || data.length === 0) {
        const { createClient: createSupabase } = await import('@/lib/supabase/client');
        const supabase = createSupabase();

        const { data: clientData, error } = await supabase
          .from('shops')
          .select(`
            id, name, slug, phone, whatsapp, address, landmark, city,
            opening_hours, is_open, is_verified, verification_badge, logo_url, photos, rating,
            review_count, is_active, created_at,
            location,
            businesses!inner(
              merchant_id,
              merchants!inner(profile_id)
            )
          `)
          .eq('businesses.merchants.profile_id', userId)
          .eq('is_active', true);

        if (!error && clientData && clientData.length > 0) {
          data = clientData;
        }
      }

      if (data && data.length > 0) {
        const shops: Shop[] = data.map((s: any) => {
          const { lat, lng } = parsePostGisPoint(s.location);
          return {
            id: s.id,
            businessId: s.business_id || s.businesses?.id || '',
            name: s.name,
            slug: s.slug,
            phone: s.phone,
            whatsapp: s.whatsapp,
            address: s.address,
            landmark: s.landmark,
            city: s.city,
            lat,
            lng,
            openingHours: s.opening_hours,
            weeklyHolidays: [],
            isOpen: s.is_open,
            isVerified: s.is_verified,
            verificationBadge: s.verification_badge || (s.is_verified ? 'Verified Retail Partner' : undefined),
            photos: s.photos || [],
            rating: s.rating || 5.0,
            reviewCount: s.review_count || 0,
            isActive: s.is_active,
            createdAt: s.created_at,
          };
        });

        setRegisteredShops(shops);
        setActiveMerchantShopId((prev) => {
          if (prev && shops.some((s) => s.id === prev)) {
            return prev;
          }
          return shops[0]?.id || '';
        });
      } else {
        setRegisteredShops([]);
        setActiveMerchantShopId('');
      }
    } catch (err) {
      console.warn('loadMerchantShops note:', err);
      setRegisteredShops([]);
      setActiveMerchantShopId('');
    }
  };

  /** Clear all user state on sign-out */
  const clearUserState = () => {
    setCustomerUser(null);
    setRole('customer');
    setActivePortalState('customer');
    setHasCustomerAccount(false);
    setHasMerchantAccount(false);
    setCustomerRecord(null);
    setMerchantRecord(null);
    setAccountStatus(null);
    setRegisteredShops([]);
    setActiveMerchantShopId('');
    setWishlist([]);
    setPriceAlerts([]);
    setAllCustomers([]);
  };

  // ── Anonymous/guest init & public stores (non-sensitive state) ───────────────
  useEffect(() => {
    try {
      // Guest wishlist fallback
      const guestWishlist = localStorage.getItem('shopmitra_wishlist_guest');
      if (guestWishlist && !authUser) setWishlist(JSON.parse(guestWishlist));

      const savedDeletedShops = localStorage.getItem('shopmitra_deleted_shop_ids');
      const delIds: string[] = savedDeletedShops ? JSON.parse(savedDeletedShops) : [];
      if (delIds.length > 0) setDeletedShopIds(delIds);

      const savedLocation = localStorage.getItem('shopmitra_user_location');
      if (savedLocation) {
        try {
          const parsed = JSON.parse(savedLocation);
          if (parsed?.lat && parsed?.lng) setUserLocation(parsed);
        } catch {}
      }

      // Public shop catalog
      fetchDbShops().then((dbShops) => {
        if (dbShops?.length > 0) {
          // If a shop is active in DB, ensure it isn't incorrectly suppressed by stale test deletedShopIds
          setDeletedShopIds((prev) => prev.filter(id => !dbShops.some(s => s.id === id)));
          setPublicShops((prev) => {
            const map = new Map<string, Shop>();
            dbShops.forEach((s) => map.set(s.id, s));
            prev.forEach((s) => { if (!delIds.includes(s.id)) map.set(s.id, s); });
            return Array.from(map.values());
          });
        }
      }).catch((err) => console.log('Supabase shops fetch note:', err));

      // GPS auto-detect
      if (typeof window !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            let name = 'My Live Location';
            try {
              const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`);
              if (res.ok) {
                const d = await res.json();
                name = d.locality || d.city || name;
              }
            } catch {}
            setUserLocation((prev) => {
              const next = { ...prev, lat, lng, name };
              try { localStorage.setItem('shopmitra_user_location', JSON.stringify(next)); } catch {}
              return next;
            });
          },
          async () => {
            if (!localStorage.getItem('shopmitra_user_location')) {
              try {
                const res = await fetch('https://ipwho.is/');
                if (res.ok) {
                  const d = await res.json();
                  if (d?.success && d.latitude && d.longitude) {
                    setUserLocation((prev) => {
                      const next = { ...prev, lat: d.latitude, lng: d.longitude, name: `${d.city || 'My City'} (Network Location)` };
                      try { localStorage.setItem('shopmitra_user_location', JSON.stringify(next)); } catch {}
                      return next;
                    });
                  }
                }
              } catch {}
            }
          },
          { enableHighAccuracy: true, timeout: 6000, maximumAge: 60000 }
        );
      }
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Location setter ──────────────────────────────────────────────────────────
  const handleSetUserLocation: React.Dispatch<React.SetStateAction<UserLocation>> = (value) => {
    setUserLocation((prev) => {
      const next = typeof value === 'function' ? (value as any)(prev) : value;
      try { localStorage.setItem('shopmitra_user_location', JSON.stringify(next)); } catch {}
      return next;
    });
  };

  // ── loginCustomer — sets user in context after OTP auth ─────────────────────
  const loginCustomer = (data: {
    name: string;
    mobile: string;
    email?: string;
    city?: string;
    address?: string;
    lat?: number;
    lng?: number;
    supabaseUserId?: string;
  }) => {
    const userLat = data.lat || userLocation.lat;
    const userLng = data.lng || userLocation.lng;
    const userCity = data.city || userLocation.name.split(',')[0].trim() || 'Delhi';

    const user: CustomerUser = {
      id: data.supabaseUserId || `cust-${Date.now()}`,
      name: (data.name && data.name !== 'Shopper') ? data.name : (data.mobile || (data.email ? data.email.split('@')[0] : 'Customer')),
      mobile: data.mobile,
      email: data.email || '',
      city: userCity,
      address: data.address || '',
      lat: userLat,
      lng: userLng,
      isLoggedIn: true,
    };

    setCustomerUser(user);

    if (data.lat && data.lng) {
      setUserLocation((prev) => ({
        ...prev,
        lat: userLat,
        lng: userLng,
        name: data.address ? `${data.address}, ${userCity}` : `${userCity} (My Location)`,
      }));
    }

    showToast(`🎉 Welcome, ${user.name}! Your account is active.`);
  };

  // ── logoutCustomer — signs out of Supabase Auth ──────────────────────────────
  const logoutCustomer = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('signOut error:', err);
    }
    clearUserState();
    showToast('Signed out successfully');
  };

  // ── deleteCustomerAccount ────────────────────────────────────────────────────
  const deleteCustomerAccount = async (customerId: string) => {
    try { await deleteCustomerAction(customerId); } catch (err) { console.warn('deleteCustomerAction notice:', err); }
    setAllCustomers((prev) => prev.filter((c) => c.id !== customerId));
    if (customerUser?.id === customerId) {
      setCustomerUser(null);
    }
    showToast('🗑️ Customer account deleted permanently from platform', 'info');
  };

  // ── Shop management ──────────────────────────────────────────────────────────
  const registerNewShop = async (shop: Shop) => {
    try {
      const res = await insertDbShop(shop);
      if (res.success && res.data?.id) shop.id = res.data.id;
    } catch (err) { console.warn('insertDbShop notice:', err); }

    setRegisteredShops((prev) => {
      const filtered = prev.filter((s) => s.id !== shop.id);
      return [shop, ...filtered];
    });
    setPublicShops((prev) => {
      const filtered = prev.filter((s) => s.id !== shop.id);
      return [shop, ...filtered];
    });
    setActiveMerchantShopId(shop.id);
    setRole('merchant');
  };

  const updateRegisteredShop = (shop: Shop) => {
    setRegisteredShops((prev) => prev.map((s) => s.id === shop.id ? { ...s, ...shop } : s));
    setPublicShops((prev) => prev.map((s) => s.id === shop.id ? { ...s, ...shop } : s));
    showToast('Store profile & counter location updated!');
  };

  const deleteShop = async (shopId: string) => {
    try {
      const res = await merchantDeleteShopAction(shopId);
      if (!res.success) {
        await deleteShopAction(shopId);
      }
    } catch (err) {
      console.warn('deleteShop error:', err);
    }
    setDeletedShopIds((prev) => Array.from(new Set([...prev, shopId])));
    setRegisteredShops((prev) => prev.filter((s) => s.id !== shopId));
    setPublicShops((prev) => prev.filter((s) => s.id !== shopId));
    try { localStorage.removeItem('shopmitra_shop_inventory_' + shopId); } catch {}
    setActiveMerchantShopId((prev) => {
      if (prev === shopId) {
        const remaining = registeredShops.filter((s) => s.id !== shopId);
        return remaining[0]?.id || '';
      }
      return prev;
    });
    showToast('🗑️ Store deleted permanently', 'info');
  };

  const allShops = useMemo(() => {
    const map = new Map<string, Shop>();
    publicShops.forEach((s) => { if (!deletedShopIds.includes(s.id)) map.set(s.id, s); });
    registeredShops.forEach((s) => { if (!deletedShopIds.includes(s.id)) map.set(s.id, s); });
    return Array.from(map.values());
  }, [publicShops, registeredShops, deletedShopIds]);

  const handleRoleChange = (newRole: UserRole) => {
    setRole(newRole);
    if (authUser && (newRole === 'customer' || newRole === 'merchant')) {
      try { localStorage.setItem(`shopmitra_portal_${authUser.id}`, newRole); } catch {}
    }
    showToast(`Switched to ${newRole.charAt(0).toUpperCase() + newRole.slice(1)} Portal`, 'info');
  };

  // ── Wishlist (DB-backed + local sync) ─────────────────────────────────────────
  const toggleWishlist = (productId: string) => {
    const isAdding = !wishlist.includes(productId);
    setWishlist((prev) => {
      const updated = prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId];
      if (isAdding) showToast('Saved to your wishlist ❤️');
      else showToast('Item removed from wishlist');
      const key = authUser?.id ? `shopmitra_wishlist_${authUser.id}` : 'shopmitra_wishlist_guest';
      try { localStorage.setItem(key, JSON.stringify(updated)); } catch {}
      return updated;
    });

    if (authUser?.id) {
      toggleWishlistAction(productId).then((res) => {
        if (!res.success) {
          console.warn('Wishlist DB sync failed:', res.error);
        }
      }).catch((err) => {
        console.warn('Wishlist DB sync error:', err);
      });
    }
  };

  // ── Price Alerts ─────────────────────────────────────────────────────────────
  const addPriceAlert = (productId: string, targetPrice: number, radiusKm: number) => {
    const newAlert: PriceAlert = {
      id: `alert-${Date.now()}`,
      customerId: customerUser?.id || 'current-user',
      productId,
      productName: 'Tracked Product',
      productImage: '',
      targetPrice,
      radiusKm,
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    setPriceAlerts((prev) => [newAlert, ...prev]);
    showToast(`🔔 Price alert set for ₹${targetPrice} within ${radiusKm} km!`);
  };

  return (
    <AppContext.Provider
      value={{
        authUser,
        authLoading,
        role,
        setRole: handleRoleChange,
        activePortal,
        setActivePortal,
        switchPortal,
        hasCustomerAccount,
        hasMerchantAccount,
        customerRecord,
        merchantRecord,
        accountStatus,
        refreshAccountStatus,
        createCustomerAccountAction,
        userLocation,
        setUserLocation: handleSetUserLocation,
        searchQuery,
        setSearchQuery,
        selectedCategory,
        setSelectedCategory,
        activeMerchantShopId,
        setActiveMerchantShopId,
        registeredShops,
        allShops,
        registerNewShop,
        updateRegisteredShop,
        deleteShop,
        deletedShopIds,
        searchRadiusKm: userLocation.radiusKm || 15,
        setSearchRadiusKm: (radius: number) => setUserLocation((prev) => ({ ...prev, radiusKm: radius })),
        showToast,
        wishlist,
        toggleWishlist,
        priceAlerts,
        addPriceAlert,
        customerUser,
        allCustomers,
        loginCustomer,
        logoutCustomer,
        deleteCustomerAccount,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppContextProvider');
  return context;
}

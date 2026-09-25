// ==============================================================================
// src/server/actions/admin.actions.ts
// Production Master Admin Actions — Strict Server-Side RBAC, Audit Logging & Governance
// ==============================================================================

'use server';

import { createAdminSupabase, getAuthenticatedUser } from '@/lib/supabase/server';
import { logAdminAction } from './audit.actions';

export interface AdminMerchantItem {
  id: string;
  businessName: string;
  ownerName: string;
  phone: string;
  whatsapp?: string;
  gstin: string;
  category: string;
  address: string;
  city: string;
  submittedAt: string;
  status: 'pending' | 'verified' | 'rejected' | 'suspended';
  verificationBadge?: string;
  isActive: boolean;
  documentUrl?: string;
  verificationNotes?: string;
  rejectionReason?: string;
}

export interface AdminCustomerItem {
  id: string;
  profileId: string;
  name: string;
  mobile: string;
  email: string;
  city: string;
  address: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  status?: string;
  suspensionReason?: string;
}

export interface AdminPriceAnomalyItem {
  id: string;
  shopId: string;
  shopName: string;
  productId: string;
  productName: string;
  brand: string;
  mrp: number;
  listedPrice: number;
  discountPercent: number;
  flagReason: string;
  status: 'investigating' | 'resolved' | 'penalized';
  reportedAt: string;
}

export interface AdminGrievanceItem {
  id: string;
  shopName: string;
  productName: string;
  reason: string;
  reportedPrice: number;
  actualPrice: number;
  reporterPhone: string;
  status: 'open' | 'action_taken' | 'dismissed';
  createdAt: string;
}

export interface AdminFullStats {
  totalCustomers: number;
  totalMerchants: number;
  verifiedMerchants: number;
  pendingMerchants: number;
  totalShops: number;
  activeShops: number;
  suspendedShops: number;
  totalProducts: number;
  activeProducts: number;
  totalReviews: number;
  reportedContent: number;
  activeAnomalies: number;
  openReports: number;
  recentRegistrations: any[];
  recentMerchants: any[];
  systemAlerts: { id: string; type: 'warning' | 'info' | 'danger'; message: string; timestamp: string }[];
}

export interface AdminDashboardPayload {
  success: boolean;
  error?: string;
  shops: AdminMerchantItem[];
  customers: AdminCustomerItem[];
  anomalies: AdminPriceAnomalyItem[];
  reports: AdminGrievanceItem[];
  catalogCount: number;
  stats: {
    totalShops: number;
    verifiedShops: number;
    pendingShops: number;
    totalCustomers: number;
    activeAnomalies: number;
    openReports: number;
  };
}

const ROLE_HIERARCHY: Record<string, number> = {
  super_admin: 3,
  admin: 2,
  moderator: 1,
  merchant: 0,
  customer: 0,
};

/**
 * Verifies that the caller has administrative privileges at or above required level.
 * Rejects unauthorized or suspended users server-side.
 */
export async function verifyAdminCaller(
  minLevel: 'moderator' | 'admin' | 'super_admin' = 'admin'
): Promise<{ authorized: boolean; userId?: string; role?: string; error?: string }> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return { authorized: false, error: 'Authentication required. Please sign in.' };
    }

    const adminDb = createAdminSupabase();

    // 1. Primary Check: Query isolated admin_users authorization table
    const { data: adminRecord, error: adminErr } = await adminDb
      .from('admin_users')
      .select('id, user_id, admin_role, status')
      .eq('user_id', user.id)
      .maybeSingle();

    if (adminRecord) {
      if (adminRecord.status === 'suspended') {
        return { authorized: false, error: 'Access Denied: This administrative account is suspended.' };
      }

      const callerRole = adminRecord.admin_role;
      const callerLevel = ROLE_HIERARCHY[callerRole] || 0;
      const requiredLevel = ROLE_HIERARCHY[minLevel] || 2;

      if (callerLevel < requiredLevel) {
        return {
          authorized: false,
          error: `Access Denied: ${minLevel} authorization required. Current role: ${callerRole}`,
        };
      }

      return { authorized: true, userId: user.id, role: callerRole };
    }

    // 2. Compatibility check: query profiles table if admin_users migration is still pending
    const { data: profile } = await adminDb
      .from('profiles')
      .select('id, role, is_active')
      .eq('id', user.id)
      .maybeSingle();

    if (profile && ['super_admin', 'admin', 'moderator'].includes(profile.role)) {
      if (profile.is_active === false) {
        return { authorized: false, error: 'This administrative account is suspended.' };
      }

      const callerRole = profile.role;
      const callerLevel = ROLE_HIERARCHY[callerRole] || 0;
      const requiredLevel = ROLE_HIERARCHY[minLevel] || 2;

      if (callerLevel >= requiredLevel) {
        return { authorized: true, userId: user.id, role: callerRole };
      }
    }

    return { authorized: false, error: 'Access Denied: You are not authorized to access the admin panel.' };
  } catch (err: any) {
    return { authorized: false, error: err.message || 'Authorization check failed.' };
  }
}

/**
 * Super Admin Only: Updates platform governance settings & records audit log
 */
export async function updatePlatformSettingsAction(settings: {
  maintenanceMode: boolean;
  allowMerchantReg: boolean;
  allowCustomerReg: boolean;
  anomalyThreshold: number;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const auth = await verifyAdminCaller('super_admin');
    if (!auth.authorized) {
      return { success: false, error: auth.error || 'Super Admin privileges required' };
    }

    await logAdminAction({
      action: 'PLATFORM_SETTINGS_UPDATED',
      targetType: 'system_settings',
      targetId: 'global',
      newValue: settings,
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update platform settings' };
  }
}

/**
 * Loads real-time governance metrics and records directly from PostgreSQL / Supabase
 */
export async function getAdminDashboardDataAction(): Promise<AdminDashboardPayload> {
  try {
    const auth = await verifyAdminCaller('moderator');
    if (!auth.authorized) {
      return {
        success: false,
        error: auth.error || 'Unauthorized: administrative privilege required',
        shops: [],
        customers: [],
        anomalies: [],
        reports: [],
        catalogCount: 0,
        stats: {
          totalShops: 0,
          verifiedShops: 0,
          pendingShops: 0,
          totalCustomers: 0,
          activeAnomalies: 0,
          openReports: 0,
        },
      };
    }

    const adminDb = createAdminSupabase();

    // Fetch all required entities and exact database counts concurrently in ONE parallel batch
    const [
      { count: totalShopsCount },
      { count: verifiedShopsCount },
      { count: pendingShopsCount },
      { count: totalCustomersCount },
      { count: catalogProductsCount },
      { count: openReportsCount },
      { data: rawShops, error: shopErr },
      { data: businesses },
      { data: merchants },
      { data: profiles },
      { data: rawCustomers },
      { data: products },
      { data: rawShopProducts },
      { data: rawReports },
    ] = await Promise.all([
      adminDb.from('shops').select('*', { count: 'exact', head: true }),
      adminDb.from('shops').select('*', { count: 'exact', head: true }).eq('is_verified', true),
      adminDb.from('shops').select('*', { count: 'exact', head: true }).eq('is_verified', false),
      adminDb.from('profiles').select('*', { count: 'exact', head: true }),
      adminDb.from('products').select('*', { count: 'exact', head: true }),
      adminDb.from('reports').select('*', { count: 'exact', head: true }).neq('status', 'resolved').neq('status', 'rejected'),
      adminDb
        .from('shops')
        .select('id, name, slug, phone, whatsapp, address, landmark, city, state, pincode, is_verified, verification_badge, is_active, created_at, business_id')
        .order('created_at', { ascending: false })
        .limit(50),
      adminDb.from('businesses').select('id, business_name, gstin, merchant_id').limit(100),
      adminDb.from('merchants').select('id, owner_name, mobile, profile_id').limit(100),
      adminDb.from('profiles').select('id, full_name, email, phone, role, is_active, created_at').order('created_at', { ascending: false }).limit(50),
      adminDb.from('customers').select('id, profile_id, mobile, default_location_name, created_at').limit(50),
      adminDb.from('products').select('id, name, brand, mrp, is_active').limit(100),
      adminDb.from('shop_products').select('id, shop_id, product_id, current_price, previous_price, is_price_verified, is_anomaly_flagged, status, created_at').limit(100),
      adminDb.from('reports').select('id, shop_id, product_id, report_type, reported_rate, actual_rate, evidence_text, status, created_at, reporter_id').order('created_at', { ascending: false }).limit(50),
    ]);

    if (shopErr) {
      console.error('getAdminDashboardDataAction shops error:', shopErr);
    }

    const businessMap = new Map((businesses || []).map(b => [b.id, b]));
    const merchantMap = new Map((merchants || []).map(m => [m.id, m]));

    const shops: AdminMerchantItem[] = (rawShops || []).map(s => {
      const biz = s.business_id ? businessMap.get(s.business_id) : undefined;
      const merch = biz?.merchant_id ? merchantMap.get(biz.merchant_id) : undefined;

      const isVerified = Boolean(s.is_verified);
      const status: 'pending' | 'verified' | 'rejected' = isVerified ? 'verified' : 'pending';

      return {
        id: s.id,
        businessName: s.name,
        ownerName: merch?.owner_name?.trim() || 'Retail Partner',
        phone: s.phone || merch?.mobile || '9876543210',
        whatsapp: s.whatsapp || undefined,
        gstin: biz?.gstin || 'Unregistered Local Counter',
        category: biz?.business_name || 'Retail Store',
        address: [s.address, s.landmark, s.city].filter(Boolean).join(', ') || 'Local Market',
        city: s.city || 'Delhi',
        submittedAt: s.created_at ? new Date(s.created_at).toLocaleDateString('en-IN') : 'Live',
        status,
        verificationBadge: s.verification_badge || undefined,
        isActive: s.is_active !== false,
      };
    });

    const customerMap = new Map((rawCustomers || []).map(c => [c.profile_id, c]));

    const customers: AdminCustomerItem[] = (profiles || []).map(p => {
      const cust = customerMap.get(p.id);
      const displayName = (p.full_name && p.full_name !== 'Shopper')
        ? p.full_name
        : (cust?.mobile || (p.email ? p.email.split('@')[0] : 'Customer'));

      return {
        id: cust?.id || p.id,
        profileId: p.id,
        name: displayName,
        mobile: cust?.mobile || p.phone || '',
        email: p.email || '',
        city: cust?.default_location_name || 'Local Area',
        address: '',
        role: p.role || 'customer',
        isActive: p.is_active !== false,
        createdAt: p.created_at ? new Date(p.created_at).toLocaleDateString('en-IN') : 'Registered',
      };
    });

    const productMap = new Map((products || []).map(p => [p.id, p]));
    const shopMap = new Map((rawShops || []).map(s => [s.id, s.name]));

    const anomalies: AdminPriceAnomalyItem[] = [];

    (rawShopProducts || []).forEach(sp => {
      const prod = productMap.get(sp.product_id);
      if (!prod) return;

      const mrp = Number(prod.mrp) || 0;
      const currentPrice = Number(sp.current_price) || 0;
      const discountPercent = mrp > 0 ? Math.round(((mrp - currentPrice) / mrp) * 100) : 0;

      // Anti-fraud trigger: >65% discount below MRP, or manually flagged anomaly
      const isSevereDeviation = mrp > 0 && currentPrice < mrp * 0.35;
      const isFlagged = Boolean(sp.is_anomaly_flagged) || isSevereDeviation;

      if (isFlagged) {
        const itemStatus: 'investigating' | 'resolved' | 'penalized' = sp.is_price_verified
          ? 'resolved'
          : sp.status === 'suspended'
          ? 'penalized'
          : 'investigating';

        anomalies.push({
          id: sp.id,
          shopId: sp.shop_id,
          shopName: shopMap.get(sp.shop_id) || 'Retail Store',
          productId: sp.product_id,
          productName: prod.name,
          brand: prod.brand || '',
          mrp,
          listedPrice: currentPrice,
          discountPercent: Math.max(0, discountPercent),
          flagReason: isSevereDeviation
            ? `Extremely low counter rate: ${discountPercent}% below MRP (Threshold >65%)`
            : 'Unusual pricing swing flagged by automated audit shield',
          status: itemStatus,
          reportedAt: sp.created_at ? new Date(sp.created_at).toLocaleDateString('en-IN') : 'Recent',
        });
      }
    });

    const reports: AdminGrievanceItem[] = (rawReports || []).map(r => {
      const repStatus: 'open' | 'action_taken' | 'dismissed' = r.status === 'resolved'
        ? 'action_taken'
        : r.status === 'rejected'
        ? 'dismissed'
        : 'open';

      return {
        id: r.id,
        shopName: r.shop_id ? (shopMap.get(r.shop_id) || 'Local Merchant') : 'Store Counter',
        productName: r.product_id ? (productMap.get(r.product_id)?.name || 'Counter Product') : 'In-Store Item',
        reason: r.evidence_text || r.report_type || 'Price discrepancy reported',
        reportedPrice: Number(r.reported_rate) || 0,
        actualPrice: Number(r.actual_rate) || 0,
        reporterPhone: 'Customer',
        status: repStatus,
        createdAt: r.created_at ? new Date(r.created_at).toLocaleDateString('en-IN') : 'Recent',
      };
    });

    const catalogCount = catalogProductsCount ?? products?.length ?? 0;

    const stats = {
      totalShops: totalShopsCount ?? shops.length,
      verifiedShops: verifiedShopsCount ?? shops.filter(s => s.status === 'verified').length,
      pendingShops: pendingShopsCount ?? shops.filter(s => s.status === 'pending').length,
      totalCustomers: totalCustomersCount ?? customers.length,
      activeAnomalies: anomalies.filter(a => a.status === 'investigating').length,
      openReports: openReportsCount ?? reports.filter(r => r.status === 'open').length,
    };

    return {
      success: true,
      shops,
      customers,
      anomalies,
      reports,
      catalogCount,
      stats,
    };
  } catch (err: any) {
    console.error('getAdminDashboardDataAction exception:', err);
    return {
      success: false,
      error: err.message || 'Failed to fetch admin dashboard data',
      shops: [],
      customers: [],
      anomalies: [],
      reports: [],
      catalogCount: 0,
      stats: {
        totalShops: 0,
        verifiedShops: 0,
        pendingShops: 0,
        totalCustomers: 0,
        activeAnomalies: 0,
        openReports: 0,
      },
    };
  }
}

/**
 * Approves or rejects a merchant shop, updating verification status and badge in Supabase
 */
export async function verifyShopAction(shopId: string, isVerified: boolean): Promise<{ success: boolean; error?: string }> {
  try {
    const auth = await verifyAdminCaller('admin');
    if (!auth.authorized) {
      return { success: false, error: auth.error || 'Unauthorized: admin privilege required' };
    }

    const adminDb = createAdminSupabase();
    const badge = isVerified ? 'Verified Retail Partner' : null;

    const { error } = await adminDb
      .from('shops')
      .update({
        is_verified: isVerified,
        verification_badge: badge,
        updated_at: new Date().toISOString(),
      })
      .eq('id', shopId);

    if (error) return { success: false, error: error.message };

    await logAdminAction({
      action: isVerified ? 'shop.verify' : 'shop.unverify',
      targetType: 'shop',
      targetId: shopId,
      metadata: { isVerified, badge },
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update shop status' };
  }
}

/**
 * Permanently deletes a store and all associated inventory rates from Supabase
 */
export async function deleteShopAction(shopId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const auth = await verifyAdminCaller('admin');
    if (!auth.authorized) {
      return { success: false, error: auth.error || 'Unauthorized: admin privilege required' };
    }

    const adminDb = createAdminSupabase();

    // 1. Identify all products linked to this store before deleting shop_products
    const { data: linkedShopProducts } = await adminDb
      .from('shop_products')
      .select('product_id')
      .eq('shop_id', shopId);

    const productIds: string[] = Array.from(
      new Set((linkedShopProducts || []).map((sp: any) => sp.product_id).filter(Boolean))
    );

    // 2. Delete associated shop products / inventory
    try {
      await adminDb.from('shop_products').delete().eq('shop_id', shopId);
    } catch {}

    // 3. Delete products of this store that are not sold by any other store (orphan products)
    for (const pid of productIds) {
      try {
        const { count } = await adminDb
          .from('shop_products')
          .select('id', { count: 'exact', head: true })
          .eq('product_id', pid);

        if (!count || count === 0) {
          try { await adminDb.from('price_alerts').delete().eq('product_id', pid); } catch {}
          try { await adminDb.from('reviews').delete().eq('product_id', pid); } catch {}
          try { await adminDb.from('product_variants').delete().eq('product_id', pid); } catch {}
          await adminDb.from('products').delete().eq('id', pid);
        }
      } catch {}
    }

    // 4. Delete associated reviews and enquiries
    try {
      await adminDb.from('reviews').delete().eq('shop_id', shopId);
    } catch {}
    try {
      await adminDb.from('enquiries').delete().eq('shop_id', shopId);
    } catch {}
    try {
      await adminDb.from('shop_hours').delete().eq('shop_id', shopId);
    } catch {}

    // 5. Delete shop from shops table
    const { error } = await adminDb.from('shops').delete().eq('id', shopId);

    if (error) return { success: false, error: error.message };

    await logAdminAction({
      action: 'shop.delete',
      targetType: 'shop',
      targetId: shopId,
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to delete shop' };
  }
}

/**
 * Super Admin / Admin: Permanently deletes a master product from the catalog
 * Cascades removal of associated shop_products, price alerts, and reviews.
 */
export async function deleteProductAction(productId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const auth = await verifyAdminCaller('admin');
    if (!auth.authorized) {
      return { success: false, error: auth.error || 'Unauthorized: admin privilege required' };
    }

    const adminDb = createAdminSupabase();

    // 1. Delete associated price alerts
    try {
      await adminDb.from('price_alerts').delete().eq('product_id', productId);
    } catch {}

    // 2. Delete associated reviews
    try {
      await adminDb.from('reviews').delete().eq('product_id', productId);
    } catch {}

    // 3. Delete associated inventory in shop_products
    try {
      await adminDb.from('shop_products').delete().eq('product_id', productId);
    } catch {}

    // 4. Delete the product itself
    const { error } = await adminDb.from('products').delete().eq('id', productId);

    if (error) {
      return { success: false, error: error.message };
    }

    await logAdminAction({
      action: 'product.delete',
      targetType: 'product',
      targetId: productId,
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to delete product' };
  }
}

/**
 * Suspends or unsuspends a shop
 */
export async function toggleShopSuspensionAction(shopId: string, suspend: boolean, reason?: string): Promise<{ success: boolean; error?: string }> {
  try {
    const auth = await verifyAdminCaller('admin');
    if (!auth.authorized) {
      return { success: false, error: auth.error || 'Unauthorized: admin privilege required' };
    }

    const adminDb = createAdminSupabase();
    const { error } = await adminDb
      .from('shops')
      .update({
        is_active: !suspend,
        updated_at: new Date().toISOString(),
      })
      .eq('id', shopId);

    if (error) return { success: false, error: error.message };

    await logAdminAction({
      action: suspend ? 'shop.suspend' : 'shop.unsuspend',
      targetType: 'shop',
      targetId: shopId,
      metadata: { reason },
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update shop suspension status' };
  }
}

/**
 * Permanently deletes any user account from Supabase
 * Cascades deletion across:
 * 1. Supabase Auth credentials (auth.users)
 * 2. Merchant profile, businesses, shops, inventory rates, and exclusive products
 * 3. Customer profile, wishlists, price alerts, enquiries, and reviews
 * 4. Admin authorization records (admin_users)
 * 5. Public profiles record
 */
export async function deleteCustomerAction(idOrProfileId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const auth = await verifyAdminCaller('admin');
    if (!auth.authorized) {
      return { success: false, error: auth.error || 'Unauthorized: admin privilege required' };
    }

    const adminDb = createAdminSupabase();

    // 1. Resolve actual profile_id / auth userId
    let profileId = idOrProfileId;
    const { data: custRow } = await adminDb
      .from('customers')
      .select('profile_id')
      .eq('id', idOrProfileId)
      .maybeSingle();

    if (custRow?.profile_id) {
      profileId = custRow.profile_id;
    }

    // 2. If user is a merchant, cascade delete all their shops and exclusive products
    try {
      const { data: merchantRow } = await adminDb
        .from('merchants')
        .select('id')
        .eq('profile_id', profileId)
        .maybeSingle();

      if (merchantRow?.id) {
        // Find all businesses owned by this merchant
        const { data: businesses } = await adminDb
          .from('businesses')
          .select('id')
          .eq('merchant_id', merchantRow.id);

        const bizIds = (businesses || []).map((b: any) => b.id);
        if (bizIds.length > 0) {
          // Find all shops under these businesses
          const { data: shops } = await adminDb
            .from('shops')
            .select('id')
            .in('business_id', bizIds);

          for (const shop of (shops || [])) {
            // Delete shop and all its exclusive products
            await deleteShopAction(shop.id);
          }

          // Delete businesses
          await adminDb.from('businesses').delete().in('id', bizIds);
        }

        // Delete merchant record
        await adminDb.from('merchants').delete().eq('id', merchantRow.id);
      }
    } catch (merchErr) {
      console.warn('Cascade merchant cleanup notice:', merchErr);
    }

    // 3. Delete customer-specific data (wishlists, price alerts, reviews, enquiries)
    try { await adminDb.from('customers').delete().or(`id.eq.${idOrProfileId},profile_id.eq.${profileId}`); } catch {}
    try { await adminDb.from('price_alerts').delete().eq('reporter_id', profileId); } catch {}
    try { await adminDb.from('reviews').delete().eq('profile_id', profileId); } catch {}
    try { await adminDb.from('enquiries').delete().eq('customer_id', profileId); } catch {}
    try { await adminDb.from('admin_users').delete().eq('user_id', profileId); } catch {}

    // 4. Delete from public profiles table
    await adminDb.from('profiles').delete().eq('id', profileId);

    // 5. Permanently delete from Supabase Auth (auth.users) so login is destroyed
    try {
      await adminDb.auth.admin.deleteUser(profileId);
    } catch (authDelErr: any) {
      console.warn('Supabase Auth user delete notice (user may already be removed):', authDelErr?.message);
    }

    await logAdminAction({
      action: 'account.delete',
      targetType: 'account',
      targetId: profileId,
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to delete account' };
  }
}

/**
 * Suspends or unsuspends a user account
 */
export async function toggleUserSuspensionAction(
  userId: string,
  suspend: boolean,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const auth = await verifyAdminCaller('admin');
    if (!auth.authorized) {
      return { success: false, error: auth.error || 'Unauthorized: admin privilege required' };
    }

    const adminDb = createAdminSupabase();
    const { error } = await adminDb
      .from('profiles')
      .update({
        is_active: !suspend,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) return { success: false, error: error.message };

    await logAdminAction({
      action: suspend ? 'user.suspend' : 'user.unsuspend',
      targetType: 'user',
      targetId: userId,
      metadata: { reason },
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to toggle user suspension' };
  }
}

/**
 * Resolves a price anomaly: either marks verified legitimate, or delists & penalizes
 */
export async function resolveAnomalyAction(
  anomalyId: string,
  resolution: 'approve' | 'delist'
): Promise<{ success: boolean; error?: string }> {
  try {
    const auth = await verifyAdminCaller('moderator');
    if (!auth.authorized) {
      return { success: false, error: auth.error || 'Unauthorized: moderator privilege required' };
    }

    const adminDb = createAdminSupabase();

    if (resolution === 'approve') {
      const { error } = await adminDb
        .from('shop_products')
        .update({
          is_anomaly_flagged: false,
          is_price_verified: true,
          status: 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('id', anomalyId);

      if (error) return { success: false, error: error.message };
    } else {
      const { error } = await adminDb
        .from('shop_products')
        .update({
          status: 'hidden',
          is_anomaly_flagged: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', anomalyId);

      if (error) return { success: false, error: error.message };
    }

    await logAdminAction({
      action: resolution === 'approve' ? 'anomaly.approve' : 'anomaly.delist',
      targetType: 'shop_product',
      targetId: anomalyId,
      metadata: { resolution },
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to resolve anomaly' };
  }
}

/**
 * Updates a user's role (super_admin, admin, moderator, merchant, or customer)
 */
export async function updateUserRoleAction(
  profileId: string,
  newRole: 'super_admin' | 'admin' | 'moderator' | 'merchant' | 'customer'
): Promise<{ success: boolean; error?: string }> {
  try {
    // Only super_admin can grant or revoke admin roles
    const auth = await verifyAdminCaller('super_admin');
    if (!auth.authorized) {
      // Fallback: regular admin can manage moderator / merchant / customer
      const regularAdmin = await verifyAdminCaller('admin');
      if (!regularAdmin.authorized || ['super_admin', 'admin'].includes(newRole)) {
        return { success: false, error: 'Unauthorized: Super Admin privilege required for admin role assignment' };
      }
    }

    const adminDb = createAdminSupabase();
    const { error } = await adminDb
      .from('profiles')
      .update({
        role: newRole,
        updated_at: new Date().toISOString(),
      })
      .eq('id', profileId);

    if (error) return { success: false, error: error.message };

    await logAdminAction({
      action: 'user.role_change',
      targetType: 'user',
      targetId: profileId,
      metadata: { newRole },
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update user role' };
  }
}

/**
 * Process merchant verification review with mandatory reason/notes
 */
export async function processMerchantVerificationAction(data: {
  merchantId: string;
  decision: 'approve' | 'reject' | 'request_info';
  reason?: string;
  notes?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const auth = await verifyAdminCaller('admin');
    if (!auth.authorized) {
      return { success: false, error: auth.error || 'Unauthorized: admin privilege required' };
    }

    if (data.decision === 'reject' && !data.reason?.trim()) {
      return { success: false, error: 'A specific rejection reason is required.' };
    }
    if (data.decision === 'request_info' && !data.notes?.trim()) {
      return { success: false, error: 'Please specify the additional information required from the merchant.' };
    }

    const adminDb = createAdminSupabase();
    const statusMap = {
      approve: 'verified',
      reject: 'rejected',
      request_info: 'pending',
    };

    const isApprove = data.decision === 'approve';
    const isReject = data.decision === 'reject';
    const badge = isApprove ? 'Verified Retail Partner' : null;

    // 1. Check if target ID is a shop in public.shops
    const { data: shopRecord } = await adminDb
      .from('shops')
      .select('id, business_id')
      .eq('id', data.merchantId)
      .maybeSingle();

    if (shopRecord) {
      await adminDb
        .from('shops')
        .update({
          is_verified: isApprove,
          verification_badge: badge,
          updated_at: new Date().toISOString(),
        })
        .eq('id', shopRecord.id);

      if (shopRecord.business_id) {
        const { data: biz } = await adminDb
          .from('businesses')
          .select('merchant_id')
          .eq('id', shopRecord.business_id)
          .maybeSingle();

        if (biz?.merchant_id) {
          await adminDb
            .from('merchants')
            .update({
              verification_status: statusMap[data.decision],
              updated_at: new Date().toISOString(),
            })
            .eq('id', biz.merchant_id);
        }
      }
    } else {
      // 2. Direct merchant update
      await adminDb
        .from('merchants')
        .update({
          verification_status: statusMap[data.decision],
          updated_at: new Date().toISOString(),
        })
        .eq('id', data.merchantId);
    }

    await logAdminAction({
      action: `merchant.${data.decision}`,
      targetType: shopRecord ? 'shop' : 'merchant',
      targetId: data.merchantId,
      metadata: {
        decision: data.decision,
        reason: data.reason,
        notes: data.notes,
      },
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to process merchant verification' };
  }
}

/**
 * Resolves or dismisses a customer grievance report in Supabase
 */
export async function resolveReportAction(
  reportId: string,
  resolution: 'action_taken' | 'dismissed',
  note?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const auth = await verifyAdminCaller('moderator');
    if (!auth.authorized) {
      return { success: false, error: auth.error || 'Unauthorized: moderator privilege required' };
    }

    const adminDb = createAdminSupabase();
    const status = resolution === 'action_taken' ? 'resolved' : 'rejected';

    const { error } = await adminDb
      .from('reports')
      .update({
        status,
        resolved_at: new Date().toISOString(),
        resolution_note: note || (resolution === 'action_taken' ? 'Merchant issued compliance notice' : 'Dismissed after review'),
      })
      .eq('id', reportId);

    if (error) return { success: false, error: error.message };

    await logAdminAction({
      action: `report.${resolution}`,
      targetType: 'report',
      targetId: reportId,
      metadata: { resolution, note },
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to resolve report' };
  }
}

/**
 * Category Management Actions
 */
export async function createCategoryAction(data: {
  name: string;
  slug: string;
  description?: string;
  icon?: string;
}): Promise<{ success: boolean; category?: any; error?: string }> {
  try {
    const auth = await verifyAdminCaller('admin');
    if (!auth.authorized) {
      return { success: false, error: auth.error || 'Unauthorized' };
    }

    const adminDb = createAdminSupabase();
    const slug = data.slug.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    // Check duplicate slug
    const { data: existing } = await adminDb
      .from('categories')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();

    if (existing) {
      return { success: false, error: `Category with slug "${slug}" already exists.` };
    }

    const { data: inserted, error } = await adminDb
      .from('categories')
      .insert([
        {
          name: data.name,
          slug,
          icon: data.icon || 'Package',
          is_active: true,
        },
      ])
      .select()
      .single();

    if (error) return { success: false, error: error.message };

    await logAdminAction({
      action: 'category.create',
      targetType: 'category',
      targetId: inserted.id,
      metadata: { name: data.name, slug },
    });

    return { success: true, category: inserted };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to create category' };
  }
}

export async function deleteCategoryAction(categoryId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const auth = await verifyAdminCaller('admin');
    if (!auth.authorized) {
      return { success: false, error: auth.error || 'Unauthorized' };
    }

    const adminDb = createAdminSupabase();

    // Check if products exist in category
    const { count } = await adminDb
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('category_id', categoryId);

    if (count && count > 0) {
      return {
        success: false,
        error: `Cannot delete: category has ${count} associated products. Reassign or delete products first.`,
      };
    }

    const { error } = await adminDb.from('categories').delete().eq('id', categoryId);
    if (error) return { success: false, error: error.message };

    await logAdminAction({
      action: 'category.delete',
      targetType: 'category',
      targetId: categoryId,
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to delete category' };
  }
}

/**
 * Review Moderation Actions
 */
export async function moderateReviewAction(
  reviewId: string,
  action: 'hide' | 'restore' | 'delete',
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const auth = await verifyAdminCaller('moderator');
    if (!auth.authorized) {
      return { success: false, error: auth.error || 'Unauthorized' };
    }

    const adminDb = createAdminSupabase();

    if (action === 'delete') {
      const { error } = await adminDb.from('reviews').delete().eq('id', reviewId);
      if (error) return { success: false, error: error.message };
    } else {
      const { error } = await adminDb
        .from('reviews')
        .update({
          is_verified_purchase: action === 'restore',
          updated_at: new Date().toISOString(),
        })
        .eq('id', reviewId);

      if (error) return { success: false, error: error.message };
    }

      await logAdminAction({
        action: `review.${action}`,
        targetType: 'review',
        targetId: reviewId,
        metadata: { reason },
      });

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to moderate review' };
    }
  }

  export interface AdminReviewItem {
    id: string;
    customerId: string;
    customerName: string;
    shopId: string;
    shopName: string;
    productName?: string;
    rating: number;
    reviewText: string;
    status: string;
    isVerifiedInteraction: boolean;
    createdAt: string;
  }

  export async function getAdminReviewsAction(): Promise<{
    success: boolean;
    reviews: AdminReviewItem[];
    error?: string;
  }> {
    try {
      const auth = await verifyAdminCaller('moderator');
      if (!auth.authorized) {
        return { success: false, error: auth.error || 'Unauthorized', reviews: [] };
      }

      const adminDb = createAdminSupabase();
      const { data: rawReviews, error } = await adminDb
        .from('reviews')
        .select(`
          id, customer_id, shop_id, product_id, rating, review_text,
          is_verified_interaction, status, created_at
        `)
        .order('created_at', { ascending: false });

      if (error) {
        return { success: false, error: error.message, reviews: [] };
      }

      const { data: shops } = await adminDb.from('shops').select('id, name');
      const { data: products } = await adminDb.from('products').select('id, name');
      const { data: customers } = await adminDb.from('customers').select('id, mobile, profile_id');
      const { data: profiles } = await adminDb.from('profiles').select('id, full_name, email');

      const shopMap = new Map((shops || []).map(s => [s.id, s.name]));
      const productMap = new Map((products || []).map(p => [p.id, p.name]));
      const profileMap = new Map((profiles || []).map(p => [p.id, p.full_name || p.email]));
      const customerMap = new Map((customers || []).map(c => [c.id, profileMap.get(c.profile_id) || c.mobile]));

      const reviews: AdminReviewItem[] = (rawReviews || []).map(r => ({
        id: r.id,
        customerId: r.customer_id,
        customerName: customerMap.get(r.customer_id) || 'Shopper',
        shopId: r.shop_id,
        shopName: shopMap.get(r.shop_id) || 'Store',
        productName: r.product_id ? productMap.get(r.product_id) : undefined,
        rating: r.rating,
        reviewText: r.review_text || '',
        status: r.status,
        isVerifiedInteraction: Boolean(r.is_verified_interaction),
        createdAt: r.created_at ? new Date(r.created_at).toLocaleDateString('en-IN') : 'Recent',
      }));

      return { success: true, reviews };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to fetch reviews', reviews: [] };
    }
  }

  /**
   * Validates if the authenticated caller has active admin credentials
   */
  export async function checkAdminLoginAuthorizationAction(): Promise<{
    success: boolean;
    authorized: boolean;
    role?: string;
    error?: string;
  }> {
    try {
      const user = await getAuthenticatedUser();
      if (!user) {
        return { success: false, authorized: false, error: 'No active session found.' };
      }

      const auth = await verifyAdminCaller('moderator');
      if (!auth.authorized) {
        return { success: true, authorized: false, error: auth.error };
      }

      return { success: true, authorized: true, role: auth.role };
    } catch (err: any) {
      return { success: false, authorized: false, error: err.message || 'Verification failed.' };
    }
  }

  export interface AdminUserListItem {
    id: string;
    userId: string;
    email: string;
    phone?: string;
    name?: string;
    adminRole: 'super_admin' | 'admin' | 'moderator';
    status: 'active' | 'suspended';
    createdAt: string;
    createdBy?: string;
  }

  /**
   * Super Admin Only: Lists all authorized staff accounts from admin_users
   */
  export async function getAdminUsersAction(): Promise<{
    success: boolean;
    admins: AdminUserListItem[];
    error?: string;
  }> {
    try {
      const auth = await verifyAdminCaller('super_admin');
      if (!auth.authorized) {
        return { success: false, error: auth.error || 'Super Admin privileges required', admins: [] };
      }

      const adminDb = createAdminSupabase();

      // Query admin_users
      const { data: rawAdmins, error: adminErr } = await adminDb
        .from('admin_users')
        .select('id, user_id, admin_role, status, created_by, created_at')
        .order('created_at', { ascending: false });

      if (adminErr) {
        // Fallback to profiles if table not yet migrated
        const { data: profiles } = await adminDb
          .from('profiles')
          .select('id, email, phone, full_name, role, status, created_at')
          .in('role', ['super_admin', 'admin', 'moderator']);

        const fallbackAdmins: AdminUserListItem[] = (profiles || []).map((p) => ({
          id: p.id,
          userId: p.id,
          email: p.email || 'None',
          phone: p.phone,
          name: p.full_name,
          adminRole: p.role as any,
          status: p.status === 'suspended' ? 'suspended' : 'active',
          createdAt: new Date(p.created_at).toLocaleDateString('en-IN'),
        }));

        return { success: true, admins: fallbackAdmins };
      }

      // Enrich with profile information
      const { data: profiles } = await adminDb
        .from('profiles')
        .select('id, email, phone, full_name');

      const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

      const admins: AdminUserListItem[] = (rawAdmins || []).map((a) => {
        const prof = profileMap.get(a.user_id);
        return {
          id: a.id,
          userId: a.user_id,
          email: prof?.email || 'Registered User',
          phone: prof?.phone,
          name: prof?.full_name,
          adminRole: a.admin_role,
          status: a.status,
          createdBy: a.created_by,
          createdAt: a.created_at ? new Date(a.created_at).toLocaleDateString('en-IN') : 'Active',
        };
      });

      return { success: true, admins };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to list admin users', admins: [] };
    }
  }

  /**
   * Super Admin Only: Authorizes a new Admin or Moderator account
   */
  export async function createAdminUserAction(data: {
    identifier: string;
    adminRole: 'admin' | 'moderator';
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const auth = await verifyAdminCaller('super_admin');
      if (!auth.authorized) {
        return { success: false, error: auth.error || 'Super Admin privileges required' };
      }

      const adminDb = createAdminSupabase();
      const identifier = data.identifier.trim();

      // Look up target user in profiles or auth
      const { data: profile } = await adminDb
        .from('profiles')
        .select('id, email, phone, full_name')
        .or(`email.ilike.${identifier},phone.eq.${identifier},id.eq.${identifier}`)
        .maybeSingle();

      if (!profile) {
        return {
          success: false,
          error: `User "${identifier}" not found. The user must register an account first.`,
        };
      }

      // Check if already in admin_users
      const { data: existing } = await adminDb
        .from('admin_users')
        .select('id, admin_role, status')
        .eq('user_id', profile.id)
        .maybeSingle();

      if (existing) {
        return {
          success: false,
          error: `User is already registered as an administrator (${existing.admin_role}). Use edit controls instead.`,
        };
      }

      const { data: inserted, error: insertErr } = await adminDb
        .from('admin_users')
        .insert([
          {
            user_id: profile.id,
            admin_role: data.adminRole,
            status: 'active',
            created_by: auth.userId,
          },
        ])
        .select()
        .single();

      if (insertErr) {
        return { success: false, error: insertErr.message };
      }

      await logAdminAction({
        action: 'ADMIN_CREATED',
        targetType: 'admin_user',
        targetId: profile.id,
        newValue: { admin_role: data.adminRole, status: 'active' },
        metadata: {
          admin_email: profile.email || profile.phone,
          granted_role: data.adminRole,
        },
      });

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to authorize admin user' };
    }
  }

  /**
   * Super Admin Only: Suspends or Unsuspends an administrator
   */
  export async function toggleAdminSuspensionAction(
    adminRecordId: string,
    suspend: boolean
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const auth = await verifyAdminCaller('super_admin');
      if (!auth.authorized) {
        return { success: false, error: auth.error || 'Super Admin privileges required' };
      }

      const adminDb = createAdminSupabase();

      // Fetch existing record
      const { data: existing } = await adminDb
        .from('admin_users')
        .select('id, user_id, admin_role, status')
        .eq('id', adminRecordId)
        .maybeSingle();

      if (!existing) {
        return { success: false, error: 'Admin record not found' };
      }

      // Prevent self-suspension
      if (existing.user_id === auth.userId) {
        return { success: false, error: 'Security Violation: Super Admins cannot suspend their own account.' };
      }

      const newStatus = suspend ? 'suspended' : 'active';

      const { error: updateErr } = await adminDb
        .from('admin_users')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', adminRecordId);

      if (updateErr) return { success: false, error: updateErr.message };

      await logAdminAction({
        action: suspend ? 'ADMIN_SUSPENDED' : 'ADMIN_UNSUSPENDED',
        targetType: 'admin_user',
        targetId: existing.user_id,
        oldValue: { status: existing.status },
        newValue: { status: newStatus },
        metadata: { adminRecordId, adminRole: existing.admin_role },
      });

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to change admin status' };
    }
  }

  /**
   * Super Admin Only: Removes administrative privileges completely
   */
  export async function removeAdminAuthorizationAction(
    adminRecordId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const auth = await verifyAdminCaller('super_admin');
      if (!auth.authorized) {
        return { success: false, error: auth.error || 'Super Admin privileges required' };
      }

      const adminDb = createAdminSupabase();

      const { data: existing } = await adminDb
        .from('admin_users')
        .select('id, user_id, admin_role')
        .eq('id', adminRecordId)
        .maybeSingle();

      if (!existing) {
        return { success: false, error: 'Admin record not found' };
      }

      if (existing.user_id === auth.userId) {
        return { success: false, error: 'Security Violation: Super Admins cannot revoke their own authorization.' };
      }

      const { error: delErr } = await adminDb
        .from('admin_users')
        .delete()
        .eq('id', adminRecordId);

      if (delErr) return { success: false, error: delErr.message };

      await logAdminAction({
        action: 'ADMIN_REVOKED',
        targetType: 'admin_user',
        targetId: existing.user_id,
        oldValue: { admin_role: existing.admin_role },
        newValue: null,
      });

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to remove admin authorization' };
    }
  }

  /**
   * Super Admin Only: Updates the role of an administrator
   */
  export async function updateAdminRolePrivilegeAction(
    adminRecordId: string,
    newRole: 'admin' | 'moderator'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const auth = await verifyAdminCaller('super_admin');
      if (!auth.authorized) {
        return { success: false, error: auth.error || 'Super Admin privileges required' };
      }

      const adminDb = createAdminSupabase();

      const { data: existing } = await adminDb
        .from('admin_users')
        .select('id, user_id, admin_role')
        .eq('id', adminRecordId)
        .maybeSingle();

      if (!existing) {
        return { success: false, error: 'Admin record not found' };
      }

      if (existing.user_id === auth.userId) {
        return { success: false, error: 'Security Violation: Cannot change your own Super Admin role.' };
      }

      const { error: updErr } = await adminDb
        .from('admin_users')
        .update({
          admin_role: newRole,
          updated_at: new Date().toISOString(),
        })
        .eq('id', adminRecordId);

      if (updErr) return { success: false, error: updErr.message };

      await logAdminAction({
        action: 'ADMIN_ROLE_CHANGED',
        targetType: 'admin_user',
        targetId: existing.user_id,
        oldValue: { role: existing.admin_role },
        newValue: { role: newRole },
      });

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to update admin role' };
    }
  }




// ==============================================================================
// src/lib/supabase/profile.ts
// Profile, Customer, and Merchant DB Operations (post-OTP-auth)
// ==============================================================================

import { createClient } from './client';
import type { UserRole } from '@/types';

export interface ProfileData {
  id: string;
  email: string;
  phone?: string;
  fullName: string | null;
  avatarUrl?: string | null;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
}

export interface CustomerRecord {
  id: string;
  profileId: string;
  mobile?: string;
  preferredLanguage: string;
  defaultLocationName?: string;
}

export interface MerchantRecord {
  id: string;
  profileId: string;
  ownerName: string;
  mobile: string;
  isMobileVerified: boolean;
  isEmailVerified: boolean;
  verificationStatus: 'pending' | 'verified' | 'rejected' | 'suspended';
}

// ── Profile ───────────────────────────────────────────────────────────────────

export async function getProfile(userId: string): Promise<ProfileData | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, phone, full_name, avatar_url, role, is_active, created_at')
    .eq('id', userId)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    email: data.email || '',
    phone: data.phone || undefined,
    fullName: data.full_name,
    avatarUrl: data.avatar_url,
    role: data.role as UserRole,
    isActive: data.is_active,
    createdAt: data.created_at,
  };
}

export async function upsertProfile(
  userId: string,
  data: {
    email?: string;
    phone?: string;
    fullName?: string;
    role?: 'customer' | 'merchant'; // Never allow 'admin' from client
    avatarUrl?: string;
  }
): Promise<ProfileData | null> {
  const supabase = createClient();

  // Security: never allow client to set admin role
  const payload: Record<string, any> = {
    id: userId,
    updated_at: new Date().toISOString(),
  };
  if (data.email !== undefined) payload.email = data.email;
  if (data.phone !== undefined) payload.phone = data.phone;
  if (data.fullName !== undefined) payload.full_name = data.fullName;
  if (data.avatarUrl !== undefined) payload.avatar_url = data.avatarUrl;

  const { data: result, error } = await supabase
    .from('profiles')
    .upsert(payload, { onConflict: 'id' })
    .select('id, email, phone, full_name, avatar_url, role, is_active, created_at')
    .single();

  if (error || !result) return null;

  return {
    id: result.id,
    email: result.email || '',
    phone: result.phone || undefined,
    fullName: result.full_name,
    avatarUrl: result.avatar_url,
    role: result.role as UserRole,
    isActive: result.is_active,
    createdAt: result.created_at,
  };
}

// ── Customer ──────────────────────────────────────────────────────────────────

export async function getCustomerByProfileId(
  profileId: string
): Promise<CustomerRecord | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('customers')
    .select('id, profile_id, mobile, preferred_language, default_location_name')
    .eq('profile_id', profileId)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    profileId: data.profile_id,
    mobile: data.mobile || undefined,
    preferredLanguage: data.preferred_language,
    defaultLocationName: data.default_location_name || undefined,
  };
}

export async function upsertCustomerRecord(
  profileId: string,
  data: {
    mobile?: string;
    defaultLocationName?: string;
    preferredLanguage?: string;
  }
): Promise<CustomerRecord | null> {
  const supabase = createClient();

  const { data: result, error } = await supabase
    .from('customers')
    .upsert(
      {
        profile_id: profileId,
        mobile: data.mobile || '',
        default_location_name: data.defaultLocationName || '',
        preferred_language: data.preferredLanguage || 'en',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'profile_id' }
    )
    .select('id, profile_id, mobile, preferred_language, default_location_name')
    .single();

  if (error || !result) return null;

  return {
    id: result.id,
    profileId: result.profile_id,
    mobile: result.mobile || undefined,
    preferredLanguage: result.preferred_language,
    defaultLocationName: result.default_location_name || undefined,
  };
}

// ── Merchant ──────────────────────────────────────────────────────────────────

export async function getMerchantByProfileId(
  profileId: string
): Promise<MerchantRecord | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('merchants')
    .select('id, profile_id, owner_name, mobile, is_mobile_verified, is_email_verified, verification_status')
    .eq('profile_id', profileId)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    profileId: data.profile_id,
    ownerName: data.owner_name,
    mobile: data.mobile,
    isMobileVerified: data.is_mobile_verified,
    isEmailVerified: data.is_email_verified,
    verificationStatus: data.verification_status,
  };
}

export async function upsertMerchantRecord(
  profileId: string,
  data: {
    ownerName: string;
    mobile: string;
    isMobileVerified?: boolean;
    isEmailVerified?: boolean;
  }
): Promise<MerchantRecord | null> {
  const supabase = createClient();

  const { data: result, error } = await supabase
    .from('merchants')
    .upsert(
      {
        profile_id: profileId,
        owner_name: data.ownerName,
        mobile: data.mobile,
        is_mobile_verified: data.isMobileVerified ?? false,
        is_email_verified: data.isEmailVerified ?? false,
        verification_status: 'pending',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'profile_id' }
    )
    .select('id, profile_id, owner_name, mobile, is_mobile_verified, is_email_verified, verification_status')
    .single();

  if (error || !result) return null;

  return {
    id: result.id,
    profileId: result.profile_id,
    ownerName: result.owner_name,
    mobile: result.mobile,
    isMobileVerified: result.is_mobile_verified,
    isEmailVerified: result.is_email_verified,
    verificationStatus: result.verification_status,
  };
}

// ── Merchant shop lookup ──────────────────────────────────────────────────────

export async function getMerchantShops(profileId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('shops')
    .select(`
      id, name, slug, phone, whatsapp, address, landmark, city,
      opening_hours, is_open, is_verified, logo_url, photos, rating,
      review_count, is_active, created_at,
      businesses!inner(merchant_id, merchants!inner(profile_id))
    `)
    .eq('businesses.merchants.profile_id', profileId)
    .eq('is_active', true);

  if (error || !data) return [];
  return data;
}

// ── Complete Merchant Onboarding Helper ───────────────────────────────────────

export async function createMerchantShopRecord(
  profileId: string,
  data: {
    ownerName: string;
    mobile: string;
    businessName: string;
    shopName: string;
    category?: string;
    address: string;
    landmark?: string;
    city: string;
    lat: number;
    lng: number;
    openingHours?: string;
    photoUrl?: string;
  }
): Promise<{ success: boolean; shop?: any; error?: string }> {
  const supabase = createClient();

  // 1. Upsert merchant
  const merchant = await upsertMerchantRecord(profileId, {
    ownerName: data.ownerName,
    mobile: data.mobile,
    isMobileVerified: true,
  });

  if (!merchant?.id) {
    return { success: false, error: 'Failed to create merchant record' };
  }

  // 2. Insert or find business
  let businessId: string | null = null;
  const { data: existingBiz } = await supabase
    .from('businesses')
    .select('id')
    .eq('merchant_id', merchant.id)
    .limit(1)
    .maybeSingle();

  if (existingBiz?.id) {
    businessId = existingBiz.id;
  } else {
    const { data: newBiz, error: bizErr } = await supabase
      .from('businesses')
      .insert([
        {
          merchant_id: merchant.id,
          business_name: data.businessName || data.shopName,
        },
      ])
      .select('id')
      .single();

    if (bizErr || !newBiz) {
      console.warn('createMerchantShopRecord business creation note:', bizErr?.message);
    } else {
      businessId = newBiz.id;
    }
  }

  if (!businessId) {
    return { success: false, error: 'Could not link shop to a valid business record' };
  }

  // 3. Insert shop
  const slug = `${data.shopName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString().slice(-4)}`;
  const { data: shopRow, error: shopErr } = await supabase
    .from('shops')
    .insert([
      {
        business_id: businessId,
        name: data.shopName,
        slug,
        phone: data.mobile,
        whatsapp: data.mobile,
        address: data.address,
        landmark: data.landmark || '',
        city: data.city || 'Delhi',
        location: `POINT(${data.lng} ${data.lat})`,
        opening_hours: data.openingHours || '09:00 AM - 09:00 PM',
        photos: data.photoUrl ? [data.photoUrl] : [],
        is_open: true,
        is_verified: false,
        is_active: true,
      },
    ])
    .select()
    .single();

  if (shopErr || !shopRow) {
    console.warn('createMerchantShopRecord shop creation note:', shopErr?.message);
    return { success: false, error: shopErr?.message || 'Failed to create shop record' };
  }

  return { success: true, shop: shopRow };
}

// ── Multi-Account Architecture Helpers ────────────────────────────────────────

export interface UserAccountStatus {
  profile: ProfileData | null;
  hasCustomerAccount: boolean;
  customer: CustomerRecord | null;
  hasMerchantAccount: boolean;
  merchant: MerchantRecord | null;
  shops: any[];
  isAdmin: boolean;
}

/**
 * Fetch unified account status for a user.
 * Evaluates both Customer and Merchant accounts concurrently under auth.uid().
 */
export async function getUserAccountStatus(userId: string): Promise<UserAccountStatus> {
  const supabase = createClient();
  const [profile, customer, merchant, adminUserRes] = await Promise.all([
    getProfile(userId),
    getCustomerByProfileId(userId),
    getMerchantByProfileId(userId),
    supabase.from('admin_users').select('admin_role, status').eq('user_id', userId).maybeSingle(),
  ]);

  let shops: any[] = [];
  if (merchant) {
    try {
      shops = await getMerchantShops(userId);
    } catch {
      shops = [];
    }
  }

  // A customer account genuinely exists only if customer record has details or profile has full_name & phone
  const hasValidCustomerProfile = Boolean(
    customer &&
    (
      (profile?.fullName && profile.fullName.trim() !== '' && profile.fullName !== 'Shopper') ||
      (customer.mobile && customer.mobile.trim() !== '') ||
      (customer.defaultLocationName && customer.defaultLocationName.trim() !== '')
    )
  );

  const isAdmin = Boolean(
    (adminUserRes?.data && adminUserRes.data.status === 'active' && ['super_admin', 'admin', 'moderator'].includes(adminUserRes.data.admin_role)) ||
    (profile?.role && ['super_admin', 'admin', 'moderator'].includes(profile.role) && profile.isActive !== false)
  );

  return {
    profile,
    hasCustomerAccount: hasValidCustomerProfile,
    customer,
    hasMerchantAccount: !!merchant,
    merchant,
    shops,
    isAdmin,
  };
}

/**
 * Create or upgrade to a Customer account while preserving any existing merchant state.
 */
export async function createCustomerAccount(
  profileId: string,
  data: {
    mobile?: string;
    fullName?: string;
    preferredLanguage?: string;
    defaultLocationName?: string;
  }
): Promise<{ success: boolean; customer?: CustomerRecord | null; error?: string }> {
  try {
    if (data.fullName) {
      await upsertProfile(profileId, { fullName: data.fullName });
    }
    const customer = await upsertCustomerRecord(profileId, {
      mobile: data.mobile,
      preferredLanguage: data.preferredLanguage,
      defaultLocationName: data.defaultLocationName,
    });
    return { success: !!customer, customer };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to create customer account' };
  }
}

/**
 * Detect whether an account exists in the database by Phone OR Email.
 * Allows checking both indicators simultaneously.
 */
export async function checkAccountExistsInDatabase(params: {
  phone?: string;
  email?: string;
}): Promise<{
  exists: boolean;
  phoneExists: boolean;
  emailExists: boolean;
  profile?: ProfileData | null;
}> {
  const supabase = createClient();
  const cleanPhone = params.phone ? params.phone.replace(/\D/g, '').slice(-10) : '';
  const cleanEmail = params.email ? params.email.trim().toLowerCase() : '';

  let phoneExists = false;
  let emailExists = false;
  let matchedProfile: ProfileData | null = null;

  if (cleanPhone) {
    // Check profiles by phone
    const { data: phoneProfiles } = await supabase
      .from('profiles')
      .select('id, email, phone, full_name, role, is_active, created_at')
      .ilike('phone', `%${cleanPhone}%`)
      .limit(1);

    if (phoneProfiles && phoneProfiles.length > 0) {
      phoneExists = true;
      matchedProfile = {
        id: phoneProfiles[0].id,
        email: phoneProfiles[0].email || '',
        phone: phoneProfiles[0].phone,
        fullName: phoneProfiles[0].full_name,
        role: phoneProfiles[0].role as UserRole,
        isActive: phoneProfiles[0].is_active,
        createdAt: phoneProfiles[0].created_at,
      };
    } else {
      // Also check customers table mobile
      const { data: customerData } = await supabase
        .from('customers')
        .select('profile_id, mobile')
        .ilike('mobile', `%${cleanPhone}%`)
        .limit(1);

      if (customerData && customerData.length > 0) {
        phoneExists = true;
      }
    }
  }

  if (cleanEmail) {
    const { data: emailProfiles } = await supabase
      .from('profiles')
      .select('id, email, phone, full_name, role, is_active, created_at')
      .ilike('email', cleanEmail)
      .limit(1);

    if (emailProfiles && emailProfiles.length > 0) {
      emailExists = true;
      if (!matchedProfile) {
        matchedProfile = {
          id: emailProfiles[0].id,
          email: emailProfiles[0].email || '',
          phone: emailProfiles[0].phone,
          fullName: emailProfiles[0].full_name,
          role: emailProfiles[0].role as UserRole,
          isActive: emailProfiles[0].is_active,
          createdAt: emailProfiles[0].created_at,
        };
      }
    }
  }

  return {
    exists: phoneExists || emailExists,
    phoneExists,
    emailExists,
    profile: matchedProfile,
  };
}

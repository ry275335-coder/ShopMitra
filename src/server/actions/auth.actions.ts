// ==============================================================================
// src/server/actions/auth.actions.ts
// Server-side Auth Actions — Profile creation, role verification
// Uses service-role Supabase for trusted operations
// ==============================================================================

'use server';

import { createServerSupabase, createAdminSupabase } from '@/lib/supabase/server';

export interface CreateProfileInput {
  userId: string;
  fullName: string;
  phone?: string;
  email?: string;
  role: 'customer' | 'merchant'; // admin can only be set via Supabase dashboard
  defaultLocationName?: string;
}

/**
 * Server-side profile creation/update after OTP verification.
 * Trusts the authenticated session via the server Supabase client.
 */
export async function createOrUpdateProfileAction(
  input: CreateProfileInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createServerSupabase();

    // Verify the session — only allow the authenticated user to modify their own profile
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || user.id !== input.userId) {
      return { success: false, error: 'Unauthorized: session mismatch' };
    }

    // Security: never allow 'admin' role from client
    const safeRole = input.role === 'merchant' ? 'merchant' : 'customer';

    const { error } = await supabase
      .from('profiles')
      .upsert(
        {
          id: user.id,
          email: input.email || user.email || '',
          phone: input.phone || user.phone || '',
          full_name: input.fullName,
          role: safeRole,
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to create profile' };
  }
}

/**
 * Check if a Supabase Auth user has a merchant profile.
 * Returns true if a merchants record exists for this user's profile.
 */
export async function checkMerchantProfileAction(
  userId: string
): Promise<{ exists: boolean; verificationStatus?: string }> {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { exists: false };

    // Strictly limit inquiries about other users to administrators
    if (user.id !== userId) {
      const { verifyAdminCaller } = await import('./admin.actions');
      const adminAuth = await verifyAdminCaller('moderator');
      if (!adminAuth.authorized) return { exists: false };
    }

    const { data, error } = await supabase
      .from('merchants')
      .select('id, verification_status')
      .eq('profile_id', userId)
      .single();

    if (error || !data) return { exists: false };

    return {
      exists: true,
      verificationStatus: data.verification_status,
    };
  } catch {
    return { exists: false };
  }
}

/**
 * Get the authenticated user's profile role from the DB.
 * Used to verify role server-side (never trust client-sent role).
 */
export async function getAuthUserRoleAction(): Promise<{
  role: 'customer' | 'merchant' | 'admin' | null;
  userId: string | null;
}> {
  try {
    const supabase = await createServerSupabase();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { role: null, userId: null };

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    return {
      role: (profile?.role as 'customer' | 'merchant' | 'admin') || 'customer',
      userId: user.id,
    };
  } catch {
    return { role: null, userId: null };
  }
}

/**
 * Robust server action to retrieve unified account status bypassing client RLS constraints.
 * Uses service role to reliably detect customer, merchant, and shop records.
 * Securely enforces session authentication: callers may only retrieve their own account
 * or must possess verified administrative credentials.
 */
export async function getUserAccountStatusAction(userId: string) {
  try {
    const { getAuthenticatedUser, createAdminSupabase } = await import('@/lib/supabase/server');
    const user = await getAuthenticatedUser();
    if (!user) {
      return null;
    }

    // Only allow caller to fetch their own account status, unless they are an admin
    if (user.id !== userId) {
      const { verifyAdminCaller } = await import('./admin.actions');
      const adminAuth = await verifyAdminCaller('moderator');
      if (!adminAuth.authorized) {
        return null;
      }
    }

    const admin = createAdminSupabase();

    const [profRes, custRes, merchRes, adminRes] = await Promise.all([
      admin.from('profiles').select('*').eq('id', userId).maybeSingle(),
      admin.from('customers').select('*').eq('profile_id', userId).maybeSingle(),
      admin.from('merchants').select('*').eq('profile_id', userId).maybeSingle(),
      admin.from('admin_users').select('admin_role, status').eq('user_id', userId).maybeSingle(),
    ]);

    const profileData = profRes.data;
    const customerData = custRes.data;
    const merchantData = merchRes.data;

    let shops: any[] = [];
    if (merchantData?.id) {
      const { data: businesses } = await admin
        .from('businesses')
        .select('id')
        .eq('merchant_id', merchantData.id);

      const bizIds = (businesses || []).map((b: any) => b.id);
      if (bizIds.length > 0) {
        const { data: shopRows } = await admin
          .from('shops')
          .select(`
            id, name, slug, phone, whatsapp, address, landmark, city,
            opening_hours, is_open, is_verified, verification_badge, logo_url, photos, rating,
            review_count, is_active, created_at, location, business_id
          `)
          .in('business_id', bizIds)
          .eq('is_active', true);

        shops = shopRows || [];
      }

      // If shops empty by business, also fallback to matching by merchant phone
      if (shops.length === 0 && merchantData.mobile) {
        const rawPhone = merchantData.mobile.replace(/\D/g, '').slice(-10);
        const { data: phoneShops } = await admin
          .from('shops')
          .select(`
            id, name, slug, phone, whatsapp, address, landmark, city,
            opening_hours, is_open, is_verified, verification_badge, logo_url, photos, rating,
            review_count, is_active, created_at, location, business_id
          `)
          .ilike('phone', `%${rawPhone}%`)
          .eq('is_active', true);

        if (phoneShops && phoneShops.length > 0) {
          shops = phoneShops;
        }
      }
    }

    const hasCustomerAccount = Boolean(
      customerData &&
      (
        (profileData?.full_name && profileData.full_name.trim() !== '' && profileData.full_name !== 'Shopper') ||
        (customerData.mobile && customerData.mobile.trim() !== '') ||
        (customerData.default_location_name && customerData.default_location_name.trim() !== '')
      )
    );

    const hasMerchantAccount = Boolean(merchantData);
    const isAdmin = Boolean(
      (adminRes?.data && adminRes.data.status === 'active' && ['super_admin', 'admin', 'moderator'].includes(adminRes.data.admin_role)) ||
      (profileData?.role && ['super_admin', 'admin', 'moderator'].includes(profileData.role) && profileData.is_active !== false)
    );

    const profile = profileData ? {
      id: profileData.id,
      email: profileData.email || '',
      phone: profileData.phone || undefined,
      fullName: profileData.full_name,
      avatarUrl: profileData.avatar_url,
      role: profileData.role,
      isActive: profileData.is_active,
      createdAt: profileData.created_at,
    } : null;

    const customer = customerData ? {
      id: customerData.id,
      profileId: customerData.profile_id,
      mobile: customerData.mobile || undefined,
      preferredLanguage: customerData.preferred_language,
      defaultLocationName: customerData.default_location_name || undefined,
    } : null;

    const merchant = merchantData ? {
      id: merchantData.id,
      profileId: merchantData.profile_id,
      ownerName: merchantData.owner_name,
      mobile: merchantData.mobile,
      isMobileVerified: merchantData.is_mobile_verified,
      isEmailVerified: merchantData.is_email_verified,
      verificationStatus: merchantData.verification_status,
    } : null;

    return {
      profile,
      hasCustomerAccount,
      customer,
      hasMerchantAccount,
      merchant,
      shops,
      isAdmin,
    };
  } catch (err) {
    console.error('getUserAccountStatusAction error:', err);
    return null;
  }
}

/**
 * Public existence detection for customer auth onboarding.
 * Uses service role to reliably check if a phone number or email is already registered.
 * Strictly returns boolean flags and safe metadata to prevent PII harvesting.
 */
export async function checkAccountExistsAction(params: {
  phone?: string;
  email?: string;
}): Promise<{
  exists: boolean;
  phoneExists: boolean;
  emailExists: boolean;
  role?: 'customer' | 'merchant' | 'admin' | null;
  nameHint?: string;
}> {
  try {
    const admin = createAdminSupabase();
    const cleanPhone = params.phone ? params.phone.replace(/\D/g, '').slice(-10) : '';
    const cleanEmail = params.email ? params.email.trim().toLowerCase() : '';

    if (!cleanPhone && !cleanEmail) {
      return { exists: false, phoneExists: false, emailExists: false };
    }

    let phoneExists = false;
    let emailExists = false;
    let detectedRole: 'customer' | 'merchant' | 'admin' | null = null;
    let detectedName = '';

    if (cleanPhone && cleanPhone.length >= 10) {
      const [profRes, custRes, merchRes] = await Promise.all([
        admin.from('profiles').select('id, role, full_name').ilike('phone', `%${cleanPhone}%`).limit(1),
        admin.from('customers').select('id, profile_id').ilike('mobile', `%${cleanPhone}%`).limit(1),
        admin.from('merchants').select('id, profile_id, owner_name').ilike('mobile', `%${cleanPhone}%`).limit(1),
      ]);

      if (
        (profRes.data && profRes.data.length > 0) ||
        (custRes.data && custRes.data.length > 0) ||
        (merchRes.data && merchRes.data.length > 0)
      ) {
        phoneExists = true;
        if (profRes.data && profRes.data.length > 0) {
          detectedRole = profRes.data[0].role as any;
          if (profRes.data[0].full_name && profRes.data[0].full_name !== 'Shopper') {
            detectedName = profRes.data[0].full_name;
          }
        } else if (custRes.data && custRes.data.length > 0) {
          detectedRole = 'customer';
        } else if (merchRes.data && merchRes.data.length > 0) {
          detectedRole = 'merchant';
          if (merchRes.data[0].owner_name) {
            detectedName = merchRes.data[0].owner_name;
          }
        }
      }
    }

    if (cleanEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      const { data: emailProfiles } = await admin
        .from('profiles')
        .select('id, role, full_name')
        .ilike('email', cleanEmail)
        .limit(1);

      if (emailProfiles && emailProfiles.length > 0) {
        emailExists = true;
        if (!detectedRole) {
          detectedRole = emailProfiles[0].role as any;
        }
        if (!detectedName && emailProfiles[0].full_name && emailProfiles[0].full_name !== 'Shopper') {
          detectedName = emailProfiles[0].full_name;
        }
      }
    }

    const nameHint = detectedName ? detectedName.trim().split(' ')[0] : undefined;

    return {
      exists: phoneExists || emailExists,
      phoneExists,
      emailExists,
      role: detectedRole,
      nameHint,
    };
  } catch (err) {
    console.error('checkAccountExistsAction error:', err);
    return { exists: false, phoneExists: false, emailExists: false };
  }
}

/**
 * Merchant POS lookup: detect existing customer by phone number to auto-fill counter billing.
 */
export async function lookupCustomerByPhoneAction(
  rawPhone: string
): Promise<{ found: boolean; customerName?: string; customerMobile?: string }> {
  try {
    const cleanPhone = rawPhone.replace(/\D/g, '').slice(-10);
    if (!cleanPhone || cleanPhone.length < 10) {
      return { found: false };
    }

    const admin = createAdminSupabase();

    // 1. Check customers table and join profile
    const { data: customerData } = await admin
      .from('customers')
      .select('profile_id, mobile')
      .ilike('mobile', `%${cleanPhone}%`)
      .limit(1);

    if (customerData && customerData.length > 0 && customerData[0].profile_id) {
      const { data: profile } = await admin
        .from('profiles')
        .select('full_name')
        .eq('id', customerData[0].profile_id)
        .maybeSingle();

      const name = profile?.full_name && profile.full_name !== 'Shopper' ? profile.full_name : '';
      return {
        found: true,
        customerName: name,
        customerMobile: customerData[0].mobile || cleanPhone,
      };
    }

    // 2. Check profiles table directly by phone
    const { data: profileData } = await admin
      .from('profiles')
      .select('full_name, phone')
      .ilike('phone', `%${cleanPhone}%`)
      .limit(1);

    if (profileData && profileData.length > 0) {
      const name = profileData[0].full_name && profileData[0].full_name !== 'Shopper' ? profileData[0].full_name : '';
      return {
        found: true,
        customerName: name,
        customerMobile: profileData[0].phone || cleanPhone,
      };
    }

    return { found: false };
  } catch (err) {
    console.error('lookupCustomerByPhoneAction error:', err);
    return { found: false };
  }
}



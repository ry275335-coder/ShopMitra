// ==============================================================================
// src/server/actions/auth.actions.ts
// Server-side Auth Actions — Profile creation, role verification
// Uses service-role Supabase for trusted operations
// ==============================================================================

'use server';

import { createServerSupabase } from '@/lib/supabase/server';

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
    const supabase = createServerSupabase();

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
    const supabase = createServerSupabase();

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
    const supabase = createServerSupabase();

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

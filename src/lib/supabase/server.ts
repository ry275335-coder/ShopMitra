// ==============================================================================
// src/lib/supabase/server.ts
// Server-side Supabase Client for Server Actions and Route Handlers
// ==============================================================================

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const DEFAULT_SUPABASE_URL = 'https://vhbhupmiwbwsaqeuziin.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_Er_14nAR94dcs5ZEn47l2g_z4u7QpfI';
const DEFAULT_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZoYmh1cG1pd2J3c2FxZXV6aWluIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTc1NTA5MiwiZXhwIjoyMTA1MzMxMDkyfQ.NESHP7JGXDTEtgn5qXsIk5-Hb1lxtWaKess2jfM_3tg';

export function createServerSupabase() {
  const cookieStore = cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')
    ? process.env.NEXT_PUBLIC_SUPABASE_URL
    : DEFAULT_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.includes('placeholder')
    ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    : DEFAULT_SUPABASE_ANON_KEY;

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Ignored if called from Server Component
        }
      },
    },
  });
}

/**
 * Derives and validates the authenticated user from the current request's cookies.
 * Guaranteed to be isolated per request — NEVER cached in global variables.
 */
export async function getAuthenticatedUser() {
  try {
    const supabase = createServerSupabase();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;
    return user;
  } catch {
    return null;
  }
}

// Elevated service role client strictly for secure backend admin tasks
export function createAdminSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')
    ? process.env.NEXT_PUBLIC_SUPABASE_URL
    : DEFAULT_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.SUPABASE_SERVICE_ROLE_KEY.includes('placeholder')
    ? process.env.SUPABASE_SERVICE_ROLE_KEY
    : DEFAULT_SERVICE_ROLE_KEY;

  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

// ==============================================================================
// src/lib/supabase/client.ts
// Client-side Supabase Browser Client
// ==============================================================================

import { createBrowserClient } from '@supabase/ssr';

const DEFAULT_SUPABASE_URL = 'https://vhbhupmiwbwsaqeuziin.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_Er_14nAR94dcs5ZEn47l2g_z4u7QpfI';

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;
  return Boolean(
    url &&
    key &&
    !url.includes('placeholder') &&
    !key.includes('placeholder') &&
    url.startsWith('https://')
  );
}

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')
    ? process.env.NEXT_PUBLIC_SUPABASE_URL
    : DEFAULT_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.includes('placeholder')
    ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    : DEFAULT_SUPABASE_ANON_KEY;

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}


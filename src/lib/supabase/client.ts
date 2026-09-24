import { createBrowserClient } from '@supabase/ssr';

const DEFAULT_SUPABASE_URL = 'https://vhbhupmiwbwsaqeuziin.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_Er_14nAR94dcs5ZEn47l2g_z4u7QpfI';

function cleanEnvString(val?: string): string {
  if (!val) return '';
  return val.trim().replace(/^["']|["']$/g, '').trim();
}

export function isSupabaseConfigured(): boolean {
  const url = cleanEnvString(process.env.NEXT_PUBLIC_SUPABASE_URL) || DEFAULT_SUPABASE_URL;
  const key = cleanEnvString(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) || DEFAULT_SUPABASE_ANON_KEY;
  return Boolean(
    url &&
    key &&
    !url.includes('placeholder') &&
    !key.includes('placeholder') &&
    url.startsWith('https://')
  );
}

export function createClient() {
  const envUrl = cleanEnvString(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const envKey = cleanEnvString(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  const supabaseUrl = envUrl && !envUrl.includes('placeholder') && envUrl.startsWith('https://')
    ? envUrl
    : DEFAULT_SUPABASE_URL;
  const supabaseAnonKey = envKey && !envKey.includes('placeholder') && envKey.length > 20
    ? envKey
    : DEFAULT_SUPABASE_ANON_KEY;

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}


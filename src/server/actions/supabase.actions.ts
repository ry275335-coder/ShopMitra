// ==============================================================================
// src/server/actions/supabase.actions.ts
// Server Actions to Test and Configure Live Supabase Credentials (Option 4)
// ==============================================================================

'use server';

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

export async function testSupabaseConnectionAction(url: string, anonKey: string): Promise<{ success: boolean; message: string; schemaReady?: boolean }> {
  if (!url || !anonKey) {
    return { success: false, message: 'URL and Anon Key are required.' };
  }
  if (!url.startsWith('https://')) {
    return { success: false, message: 'Supabase URL must start with https://' };
  }

  try {
    const client = createClient(url, anonKey, {
      auth: { persistSession: false },
    });

    const { error } = await client.from('categories').select('*', { count: 'exact', head: true });
    
    // Code 42P01 means Postgres table doesn't exist yet, which still confirms valid authentication!
    if (error && error.code !== '42P01') {
      return { success: false, message: error.message };
    }

    return { 
      success: true, 
      schemaReady: !error,
      message: error ? 'Connected to Supabase! (Database tables need migration)' : 'Connected to Supabase! Tables verified.' 
    };
  } catch (err: any) {
    return { success: false, message: err.message || 'Connection test failed' };
  }
}

export async function saveSupabaseCredentialsAction(url: string, anonKey: string) {
  // Production requirement: NEVER allow filesystem configuration mutation in production
  if (process.env.NODE_ENV === 'production') {
    return { success: false, error: 'Security Violation: Configuration mutation is disabled in production.' };
  }

  // Strictly require local development environment
  if (process.env.NODE_ENV !== 'development') {
    return { success: false, error: 'Unauthorized: Action only available in local development.' };
  }

  if (!url || !anonKey) {
    return { success: false, error: 'URL and Anon Key are required.' };
  }
  if (!url.startsWith('https://')) {
    return { success: false, error: 'Supabase URL must start with https://' };
  }

  try {
    const envPath = path.join(process.cwd(), '.env.local');
    let content = '';
    if (fs.existsSync(envPath)) {
      content = fs.readFileSync(envPath, 'utf8');
    }

    if (content.includes('NEXT_PUBLIC_SUPABASE_URL=')) {
      content = content.replace(/NEXT_PUBLIC_SUPABASE_URL=.*/g, `NEXT_PUBLIC_SUPABASE_URL=${url}`);
    } else {
      content += `\nNEXT_PUBLIC_SUPABASE_URL=${url}`;
    }

    if (content.includes('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) {
      content = content.replace(/NEXT_PUBLIC_SUPABASE_ANON_KEY=.*/g, `NEXT_PUBLIC_SUPABASE_ANON_KEY=${anonKey}`);
    } else {
      content += `\nNEXT_PUBLIC_SUPABASE_ANON_KEY=${anonKey}`;
    }

    fs.writeFileSync(envPath, content.trim() + '\n', 'utf8');
    return { success: true, message: 'Saved credentials to .env.local! Restart server to apply.' };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to write to .env.local' };
  }
}

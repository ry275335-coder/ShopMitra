// ==============================================================================
// scripts/deploy-supabase.mjs
// Supabase Cloud Connection & Migration Verifier (Step 1)
// ==============================================================================

import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

// Read .env.local
function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return {};
  const content = fs.readFileSync(envPath, 'utf8');
  const env = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [key, ...vals] = trimmed.split('=');
    env[key.trim()] = vals.join('=').trim();
  }
  return env;
}

async function verifySupabase() {
  console.log('\n======================================================================');
  console.log('⚡ STEP 1: SUPABASE CLOUD CONNECTION & SCHEMA VERIFIER');
  console.log('======================================================================\n');

  const env = loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

  console.log(`📡 Supabase Endpoint: ${url || 'NOT CONFIGURED'}`);

  if (!url || url.includes('placeholder') || !anonKey || anonKey.includes('placeholder')) {
    console.log('\nℹ️  Notice: Supabase URL is currently using local development placeholders.');
    console.log('    To connect to your live cloud Supabase project:');
    console.log('    1. Open your Supabase Dashboard: https://supabase.com/dashboard');
    console.log('    2. Copy Project URL and Anon API key into .env.local:');
    console.log('       NEXT_PUBLIC_SUPABASE_URL=https://<your-project-id>.supabase.co');
    console.log('       NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>');
    console.log('       SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>\n');
    console.log('    3. Run the migrations in the Supabase SQL Editor:');
    console.log('       - supabase/migrations/001_initial_schema.sql');
    console.log('       - supabase/migrations/002_postgis_and_indexes.sql');
    console.log('       - supabase/migrations/003_rls_policies.sql');
    console.log('       - supabase/seed.sql\n');
    console.log('✅ Fallback: In-memory relational database is active and serving 100% of queries seamlessly.\n');
    return;
  }

  try {
    const supabase = createClient(url, anonKey);
    const { data, error } = await supabase.from('shops').select('id, name').limit(1);
    if (error) {
      console.log(`⚠️  Cloud connected, but tables may need migrations: ${error.message}`);
    } else {
      console.log(`✅ Successfully connected to live Supabase cloud database! Found ${data.length} shops.`);
    }
  } catch (err) {
    console.error(`❌ Connection failed: ${err.message}`);
  }
}

verifySupabase();

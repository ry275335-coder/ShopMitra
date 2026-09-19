// ==============================================================================
// scripts/bootstrap-super-admin.ts
// Secure Server-Side Initial Super Admin Provisioning Tool
// ==============================================================================

import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

function loadEnv(): Record<string, string> {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return {};
  const content = fs.readFileSync(envPath, 'utf8');
  const env: Record<string, string> = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [key, ...vals] = trimmed.split('=');
    env[key.trim()] = vals.join('=').trim();
  }
  return env;
}

async function main() {
  const identifier = process.argv[2]?.trim();

  console.log('\n======================================================================');
  console.log('🛡️  SHOPMITRA — SUPER ADMIN PROVISIONING DESK');
  console.log('======================================================================\n');

  if (!identifier) {
    console.error('❌ Error: Missing user identifier.\n');
    console.log('Usage:');
    console.log('  npm run admin:bootstrap <email | phone | user-id>\n');
    console.log('Example:');
    console.log('  npm run admin:bootstrap admin@example.com');
    console.log('  npm run admin:bootstrap +919876543210\n');
    process.exit(1);
  }

  const env = loadEnv();
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL not found in .env.local');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  console.log(`🔍 Searching for account matching: "${identifier}"...`);

  // 1. Look up user in auth.users via admin API
  const { data: usersData, error: listErr } = await supabase.auth.admin.listUsers();
  if (listErr) {
    console.error('❌ Failed to access auth.users directory:', listErr.message);
    process.exit(1);
  }

  const targetUser = usersData.users.find(
    (u) =>
      u.id === identifier ||
      (u.email && u.email.toLowerCase() === identifier.toLowerCase()) ||
      (u.phone && (u.phone === identifier || u.phone.endsWith(identifier.replace(/\D/g, ''))))
  );

  if (!targetUser) {
    console.error(`\n❌ User "${identifier}" was not found in Supabase auth.users.`);
    console.log('   Steps to resolve:');
    console.log('   1. Sign in once via /admin/login or the website to establish your account.');
    console.log('   2. Re-run this bootstrap script with your registered email or phone.\n');
    process.exit(1);
  }

  console.log(`✅ Found authenticated user:`);
  console.log(`   - ID:    ${targetUser.id}`);
  console.log(`   - Email: ${targetUser.email || 'None'}`);
  console.log(`   - Phone: ${targetUser.phone || 'None'}\n`);

  // 2. Insert or update admin_users table
  console.log('⚡ Authorizing Super Admin privileges in admin_users table...');

  const { data: existingAdmin } = await supabase
    .from('admin_users')
    .select('id, admin_role, status')
    .eq('user_id', targetUser.id)
    .maybeSingle();

  const oldRole = existingAdmin?.admin_role || null;
  const oldStatus = existingAdmin?.status || null;

  const { error: upsertErr } = await supabase
    .from('admin_users')
    .upsert(
      {
        user_id: targetUser.id,
        admin_role: 'super_admin',
        status: 'active',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

  if (upsertErr) {
    console.error('❌ Failed to update admin_users table:', upsertErr.message);
    console.log('ℹ️  Ensure migration 007_admin_users_system.sql has been executed in Supabase SQL editor.');
    process.exit(1);
  }

  // 3. Record in audit_logs
  try {
    await supabase.from('audit_logs').insert([
      {
        action: 'ADMIN_CREATED',
        target_type: 'admin_user',
        target_id: targetUser.id,
        old_value: existingAdmin ? { role: oldRole, status: oldStatus } : null,
        new_value: { role: 'super_admin', status: 'active', bootstrapped: true },
        metadata: {
          admin_email: targetUser.email || targetUser.phone || 'Super Admin',
          method: 'CLI_BOOTSTRAP',
          timestamp: new Date().toISOString(),
        },
      },
    ]);
  } catch (auditErr) {
    console.warn('⚠️  Notice: Audit log entry skipped (table may be pending migration)');
  }

  console.log('======================================================================');
  console.log('🎉 SUPER ADMIN SUCCESSFULLY PROVISIONED!');
  console.log('======================================================================');
  console.log(`User ID:     ${targetUser.id}`);
  console.log(`Account:     ${targetUser.email || targetUser.phone}`);
  console.log(`Role:        super_admin`);
  console.log(`Status:      active`);
  console.log(`Next Step:   Visit http://localhost:3000/admin/login and sign in with this account.`);
  console.log('======================================================================\n');
}

main().catch((err) => {
  console.error('Fatal error during provisioning:', err);
  process.exit(1);
});

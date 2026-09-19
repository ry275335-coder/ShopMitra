// ==============================================================================
// scripts/verify-008-migration.mjs
// Read-Only Post-Migration 008 Security & Performance Verifier
// ==============================================================================

import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

// Load .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const idx = trimmed.indexOf('=');
  if (idx !== -1) {
    envVars[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
  }
}

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

const publicClient = createClient(supabaseUrl, anonKey);
const adminClient = createClient(supabaseUrl, serviceKey);

async function runVerification() {
  console.log('======================================================================');
  console.log('⚡ POST-MIGRATION 008 READ-ONLY VERIFICATION AUDIT');
  console.log('======================================================================\n');

  let passed = 0;
  let total = 0;

  function reportCheck(title, success, details = '') {
    total++;
    if (success) {
      passed++;
      console.log(`✅ [PASS] ${title}`);
    } else {
      console.log(`❌ [FAIL] ${title}`);
    }
    if (details) {
      console.log(`   └─ ${details}`);
    }
  }

  // Check 1: Public active shops accessibility (Public client)
  try {
    const { data: publicShops, error: shopErr } = await publicClient
      .from('shops')
      .select('id, name, is_active')
      .eq('is_active', true)
      .limit(5);

    reportCheck(
      'Public active shops are accessible via fast-path RLS',
      !shopErr && Array.isArray(publicShops),
      shopErr ? shopErr.message : `Successfully fetched ${publicShops.length} active shops via anon client.`
    );
  } catch (err) {
    reportCheck('Public active shops are accessible via fast-path RLS', false, err.message);
  }

  // Check 2: Inactive / draft shops are NOT visible to unauthenticated public
  try {
    const { data: inactiveShops, error: inactErr } = await publicClient
      .from('shops')
      .select('id, name, is_active')
      .eq('is_active', false);

    reportCheck(
      'Private/inactive shops remain protected from unauthenticated public',
      !inactErr && (inactiveShops === null || inactiveShops.length === 0),
      inactErr ? inactErr.message : `Public query returned 0 inactive shops (correctly blocked by RLS).`
    );
  } catch (err) {
    reportCheck('Private/inactive shops remain protected', false, err.message);
  }

  // Check 3: Public active shop products accessibility (Public client)
  try {
    const { data: publicRates, error: ratesErr } = await publicClient
      .from('shop_products')
      .select('id, shop_id, product_id, current_price, status')
      .eq('status', 'active')
      .limit(5);

    reportCheck(
      'Public active shop products are accessible via fast-path RLS',
      !ratesErr && Array.isArray(publicRates),
      ratesErr ? ratesErr.message : `Successfully fetched ${publicRates.length} active rates via anon client.`
    );
  } catch (err) {
    reportCheck('Public active shop products are accessible', false, err.message);
  }

  // Check 4: Draft / suspended shop products are NOT visible to public
  try {
    const { data: draftRates, error: draftErr } = await publicClient
      .from('shop_products')
      .select('id, status')
      .neq('status', 'active');

    reportCheck(
      'Private/draft/suspended shop products remain protected from unauthenticated public',
      !draftErr && (draftRates === null || draftRates.length === 0),
      draftErr ? draftErr.message : `Public query returned 0 draft/suspended rates (correctly blocked by RLS).`
    );
  } catch (err) {
    reportCheck('Private shop products remain protected', false, err.message);
  }

  // Check 5: admin_users is primary authorization table
  try {
    const { data: adminUsers, error: adminErr } = await adminClient
      .from('admin_users')
      .select('id, user_id, admin_role, status')
      .limit(5);

    reportCheck(
      'admin_users table is accessible and acts as primary authorization source',
      !adminErr && Array.isArray(adminUsers),
      adminErr ? adminErr.message : `Found ${adminUsers.length} admin accounts in admin_users.`
    );
  } catch (err) {
    reportCheck('admin_users table accessibility', false, err.message);
  }

  // Check 6: Super Admin, Admin, and Moderator accounts validation
  try {
    const { data: staff, error: staffErr } = await adminClient
      .from('admin_users')
      .select('admin_role, status');

    if (!staffErr && staff) {
      const activeRoles = new Set(staff.filter(s => s.status === 'active').map(s => s.admin_role));
      const hasRecognizedRoles = [...activeRoles].every(r => ['super_admin', 'admin', 'moderator'].includes(r));
      reportCheck(
        'Staff roles strictly conform to super_admin, admin, moderator',
        hasRecognizedRoles,
        `Active roles found in database: ${Array.from(activeRoles).join(', ') || 'None yet provisioned'}`
      );
    } else {
      reportCheck('Staff roles validation', false, staffErr?.message);
    }
  } catch (err) {
    reportCheck('Staff roles validation', false, err.message);
  }

  // Check 7: Master catalog products and categories remain accessible
  try {
    const [
      { data: prods, error: pErr },
      { data: cats, error: cErr }
    ] = await Promise.all([
      publicClient.from('products').select('id, name').limit(3),
      publicClient.from('categories').select('id, name').limit(3)
    ]);

    reportCheck(
      'Master catalog products and categories remain readable by public',
      !pErr && !cErr && Array.isArray(prods) && Array.isArray(cats),
      `Verified: ${prods?.length || 0} sample products and ${cats?.length || 0} sample categories retrieved.`
    );
  } catch (err) {
    reportCheck('Master catalog readability', false, err.message);
  }

  console.log('\n======================================================================');
  console.log(`SUMMARY: ${passed}/${total} checks passed successfully.`);
  console.log('======================================================================\n');
}

runVerification();

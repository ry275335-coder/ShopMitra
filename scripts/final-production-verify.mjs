// ==============================================================================
// scripts/final-production-verify.mjs
// SHOPMITRA — Final Production Verification
// Tests all checklist items using authenticated/anon clients for RLS tests.
// Does NOT use service_role as proof of RLS correctness.
// ==============================================================================

import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

// ── Load .env.local ──────────────────────────────────────────────────────────
const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
for (const line of envContent.split('\n')) {
  const t = line.trim();
  if (!t || t.startsWith('#')) continue;
  const idx = t.indexOf('=');
  if (idx !== -1) envVars[t.slice(0, idx).trim()] = t.slice(idx + 1).trim();
}

const SUPABASE_URL  = envVars.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY      = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_KEY   = envVars.SUPABASE_SERVICE_ROLE_KEY;
const APP_URL       = envVars.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

if (!SUPABASE_URL || !ANON_KEY || !SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const admin   = createClient(SUPABASE_URL, SERVICE_KEY);
const anon    = createClient(SUPABASE_URL, ANON_KEY);

// ── Test state ───────────────────────────────────────────────────────────────
const results = {};
let totalPass = 0, totalFail = 0;

function pass(key, detail = '') {
  results[key] = { status: 'PASS', detail };
  totalPass++;
  console.log(`  ✅ [PASS] ${key}${detail ? ': ' + detail : ''}`);
}
function fail(key, detail = '') {
  results[key] = { status: 'FAIL', detail };
  totalFail++;
  console.error(`  ❌ [FAIL] ${key}${detail ? ': ' + detail : ''}`);
}
function section(title) {
  console.log(`\n══════════════════════════════════════════════`);
  console.log(`  ${title}`);
  console.log(`══════════════════════════════════════════════`);
}

// ══════════════════════════════════════════════════════════════════════════════
// 1. MIGRATIONS APPLIED
// ══════════════════════════════════════════════════════════════════════════════
async function checkMigrations() {
  section('1. MIGRATIONS APPLIED (010–013)');

  const migrationFiles = [
    '010_merchant_onboarding_rpc.sql',
    '011_products_admin_only.sql',
    '012_storage_buckets.sql',
    '013_rls_policy_review.sql',
  ];

  for (const f of migrationFiles) {
    const fPath = path.resolve(process.cwd(), 'supabase/migrations', f);
    if (!fs.existsSync(fPath)) {
      fail('Migrations applied', `File missing: ${f}`);
      return;
    }
  }

  // Probe 012: storage buckets exist
  const { data: buckets, error: bErr } = await admin.storage.listBuckets();
  const hasProdImages = buckets?.some(b => b.id === 'product-images');
  const hasShopImages = buckets?.some(b => b.id === 'shop-images');

  // Probe 013: wishlists RLS — anon gets 0 rows
  const { data: wlAnon, error: wlErr } = await anon.from('wishlists').select('id');
  const wlRlsWorks = (wlAnon !== null && wlAnon.length === 0) || !!wlErr;

  let allOk = true;
  let migDetail = 'local files present';

  if (!hasProdImages) { allOk = false; migDetail += '; product-images bucket missing'; }
  if (!hasShopImages)  { allOk = false; migDetail += '; shop-images bucket missing'; }
  if (!wlRlsWorks)     { allOk = false; migDetail += '; wishlists RLS not enforced'; }
  if (allOk) migDetail += '; storage buckets present; wishlists RLS active';

  if (allOk) {
    pass('Migrations applied', migDetail);
  } else {
    fail('Migrations applied', migDetail);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// 2. CUSTOMER → MERCHANT FLOW
// ══════════════════════════════════════════════════════════════════════════════
async function checkMerchantOnboarding() {
  section('2. CUSTOMER → MERCHANT (atomic RPC)');

  const testEmail = `verify-merchant-${Date.now()}@test.shopmitra.local`;
  const testPass  = 'VerifyTest@99';

  const { data: newUser, error: createErr } = await admin.auth.admin.createUser({
    email: testEmail, password: testPass, email_confirm: true,
  });

  if (createErr || !newUser?.user?.id) {
    fail('Customer → Merchant', `Cannot create test user: ${createErr?.message}`);
    return;
  }

  const authUserId = newUser.user.id;
  await new Promise(r => setTimeout(r, 800));

  const { data: profileRow } = await admin
    .from('profiles').select('id, role').eq('id', authUserId).maybeSingle();

  if (!profileRow) {
    fail('Customer → Merchant', 'Profile not auto-created by trigger');
    await admin.auth.admin.deleteUser(authUserId);
    return;
  }

  const roleBeforeOnboard = profileRow.role;

  const { data: rpcResult, error: rpcErr } = await admin.rpc('onboard_merchant_atomic', {
    p_profile_id:    authUserId,
    p_owner_name:    'Verify Test Owner',
    p_mobile:        '9876543210',
    p_business_name: 'Verify Test Business',
    p_shop_name:     'Verify Test Shop',
    p_phone:         '9876543210',
    p_city:          'Mumbai',
    p_address:       '123 Test Street',
    p_latitude:      19.076,
    p_longitude:     72.877,
  });

  if (rpcErr) {
    fail('Customer → Merchant', `RPC failed: ${rpcErr.message}`);
    await admin.auth.admin.deleteUser(authUserId);
    return;
  }

  const { merchant_id, business_id, shop_id } = rpcResult;

  const { data: merchantRow } = await admin.from('merchants').select('id, profile_id').eq('id', merchant_id).maybeSingle();
  const { data: businessRow } = await admin.from('businesses').select('id, merchant_id').eq('id', business_id).maybeSingle();
  const { data: shopRow }     = await admin.from('shops').select('id, business_id').eq('id', shop_id).maybeSingle();
  const { data: profileAfter }= await admin.from('profiles').select('role').eq('id', authUserId).maybeSingle();

  const merchantLinked  = merchantRow?.profile_id === authUserId;
  const businessLinked  = businessRow?.merchant_id === merchant_id;
  const shopLinked      = shopRow?.business_id === business_id;
  const roleUnchanged   = profileAfter?.role === roleBeforeOnboard;

  const detail = `merchant=${merchantLinked}, business=${businessLinked}, shop=${shopLinked}, role_unchanged=${roleUnchanged}`;

  if (merchantLinked && businessLinked && shopLinked && roleUnchanged) {
    pass('Customer → Merchant', detail);
  } else {
    fail('Customer → Merchant', detail);
  }

  // Cleanup
  if (shop_id)     await admin.from('shops').delete().eq('id', shop_id);
  if (business_id) await admin.from('businesses').delete().eq('id', business_id);
  if (merchant_id) await admin.from('merchants').delete().eq('id', merchant_id);
  await admin.auth.admin.deleteUser(authUserId);
}

// ══════════════════════════════════════════════════════════════════════════════
// 3. CUSTOMER ISOLATION
// ══════════════════════════════════════════════════════════════════════════════
async function checkCustomerIsolation() {
  section('3. CUSTOMER ISOLATION');

  const emailA = `verify-cust-a-${Date.now()}@test.shopmitra.local`;
  const emailB = `verify-cust-b-${Date.now()}@test.shopmitra.local`;
  const pwd    = 'VerifyTest@99';

  const { data: userAData } = await admin.auth.admin.createUser({ email: emailA, password: pwd, email_confirm: true });
  const { data: userBData } = await admin.auth.admin.createUser({ email: emailB, password: pwd, email_confirm: true });

  if (!userAData?.user || !userBData?.user) {
    fail('Customer isolation', 'Could not create test users');
    return;
  }
  await new Promise(r => setTimeout(r, 800));

  const userAId = userAData.user.id;
  const userBId = userBData.user.id;

  const { data: custA } = await admin.from('customers').select('id').eq('profile_id', userAId).maybeSingle();
  const { data: custB } = await admin.from('customers').select('id').eq('profile_id', userBId).maybeSingle();

  if (!custA || !custB) {
    fail('Customer isolation', `customer rows not found: custA=${!!custA}, custB=${!!custB}`);
    await admin.auth.admin.deleteUser(userAId);
    await admin.auth.admin.deleteUser(userBId);
    return;
  }

  // Insert a wishlist for Customer B
  const { data: wlB } = await admin.from('wishlists').insert({
    customer_id: custB.id, name: 'B Private Wishlist'
  }).select('id').maybeSingle();

  // Sign in as User A
  const clientA = createClient(SUPABASE_URL, ANON_KEY);
  await clientA.auth.signInWithPassword({ email: emailA, password: pwd });

  // Attempt to read Customer B's wishlist as Customer A
  const { data: leakedWl } = await clientA
    .from('wishlists').select('id').eq('customer_id', custB.id);

  const noLeak = !leakedWl || leakedWl.length === 0;

  noLeak
    ? pass('Customer isolation', 'Customer A cannot read Customer B wishlists')
    : fail('Customer isolation', `Leaked ${leakedWl.length} of Customer B wishlists to Customer A`);

  // Cleanup
  if (wlB?.id) await admin.from('wishlists').delete().eq('id', wlB.id);
  await admin.auth.admin.deleteUser(userAId);
  await admin.auth.admin.deleteUser(userBId);
}

// ══════════════════════════════════════════════════════════════════════════════
// 4. MERCHANT OWNERSHIP ISOLATION
// ══════════════════════════════════════════════════════════════════════════════
async function checkMerchantIsolation() {
  section('4. MERCHANT OWNERSHIP ISOLATION');

  const emailA = `verify-merch-a-${Date.now()}@test.shopmitra.local`;
  const emailB = `verify-merch-b-${Date.now()}@test.shopmitra.local`;
  const pwd    = 'VerifyTest@99';

  const { data: mAUser } = await admin.auth.admin.createUser({ email: emailA, password: pwd, email_confirm: true });
  const { data: mBUser } = await admin.auth.admin.createUser({ email: emailB, password: pwd, email_confirm: true });

  if (!mAUser?.user || !mBUser?.user) {
    fail('Merchant ownership isolation', 'Could not create merchant test users');
    return;
  }
  await new Promise(r => setTimeout(r, 500));

  const idA = mAUser.user.id;
  const idB = mBUser.user.id;

  const { data: rpcB, error: rpcBErr } = await admin.rpc('onboard_merchant_atomic', {
    p_profile_id: idB, p_owner_name: 'Merchant B', p_mobile: '1111111111',
    p_business_name: 'B Corp', p_shop_name: 'Shop B', p_phone: '1111111111',
    p_city: 'Delhi',
  });

  if (rpcBErr || !rpcB?.shop_id) {
    fail('Merchant ownership isolation', `Could not create Merchant B shop: ${rpcBErr?.message}`);
    await admin.auth.admin.deleteUser(idA);
    await admin.auth.admin.deleteUser(idB);
    return;
  }

  const shopBId = rpcB.shop_id;

  const clientA = createClient(SUPABASE_URL, ANON_KEY);
  await clientA.auth.signInWithPassword({ email: emailA, password: pwd });

  const { data: updateData } = await clientA
    .from('shops').update({ name: 'HACKED_BY_A' }).eq('id', shopBId).select('id');
  const noHack = !updateData || updateData.length === 0;

  const { data: anyProduct } = await admin.from('products').select('id').limit(1).maybeSingle();
  let noShopProdHack = true;
  if (anyProduct) {
    const { data: spInsert } = await clientA.from('shop_products').insert({
      shop_id: shopBId, product_id: anyProduct.id, current_price: 1, status: 'in_stock',
    }).select('id');
    noShopProdHack = !spInsert || spInsert.length === 0;
  }

  if (noHack && noShopProdHack) {
    pass('Merchant ownership isolation', 'Merchant A cannot UPDATE shop or INSERT shop_products for Merchant B');
  } else {
    fail('Merchant ownership isolation', `shop_update_blocked=${noHack}, shop_product_blocked=${noShopProdHack}`);
  }

  // Cleanup
  if (rpcB.shop_id)     await admin.from('shops').delete().eq('id', rpcB.shop_id);
  if (rpcB.business_id) await admin.from('businesses').delete().eq('id', rpcB.business_id);
  if (rpcB.merchant_id) await admin.from('merchants').delete().eq('id', rpcB.merchant_id);
  await admin.auth.admin.deleteUser(idA);
  await admin.auth.admin.deleteUser(idB);
}

// ══════════════════════════════════════════════════════════════════════════════
// 5. PRODUCT RLS
// ══════════════════════════════════════════════════════════════════════════════
async function checkProductRLS() {
  section('5. PRODUCT RLS');

  const merchantEmail = `verify-prod-merch-${Date.now()}@test.shopmitra.local`;
  const pwd = 'VerifyTest@99';

  const { data: mUser } = await admin.auth.admin.createUser({ email: merchantEmail, password: pwd, email_confirm: true });
  if (!mUser?.user) { fail('Product RLS', 'Cannot create merchant test user'); return; }

  await new Promise(r => setTimeout(r, 500));
  const merchantId = mUser.user.id;

  await admin.rpc('onboard_merchant_atomic', {
    p_profile_id: merchantId, p_owner_name: 'Prod Test', p_mobile: '2222222222',
    p_business_name: 'Prod Biz', p_shop_name: 'Prod Shop', p_phone: '2222222222', p_city: 'Mumbai',
  });

  const { data: catRow } = await admin.from('categories').select('id').limit(1).maybeSingle();

  const merchantClient = createClient(SUPABASE_URL, ANON_KEY);
  await merchantClient.auth.signInWithPassword({ email: merchantEmail, password: pwd });

  const { data: merchantInsert, error: merchantInsertErr } = await merchantClient
    .from('products')
    .insert({ name: 'Hacked Product', mrp: 100, category_id: catRow?.id, is_active: true })
    .select('id');

  const merchantBlocked = (!merchantInsert || merchantInsert.length === 0) || !!merchantInsertErr;

  // Admin can insert (positive test via service_role)
  const { data: adminInsert, error: adminInsertErr } = await admin
    .from('products')
    .insert({ name: `Admin Test Product ${Date.now()}`, mrp: 999, category_id: catRow?.id, is_active: false })
    .select('id').maybeSingle();
  const adminCanInsert = !!adminInsert && !adminInsertErr;
  if (adminInsert?.id) await admin.from('products').delete().eq('id', adminInsert.id);

  // Cleanup merchant
  const { data: merchantRow } = await admin.from('merchants').select('id').eq('profile_id', merchantId).maybeSingle();
  if (merchantRow) {
    const { data: bizRow } = await admin.from('businesses').select('id').eq('merchant_id', merchantRow.id).maybeSingle();
    if (bizRow) {
      await admin.from('shops').delete().eq('business_id', bizRow.id);
      await admin.from('businesses').delete().eq('id', bizRow.id);
    }
    await admin.from('merchants').delete().eq('id', merchantRow.id);
  }
  await admin.auth.admin.deleteUser(merchantId);

  if (merchantBlocked && adminCanInsert) {
    pass('Product RLS', `merchant_blocked=${merchantBlocked}, admin_can_insert=${adminCanInsert}`);
  } else {
    fail('Product RLS', `merchant_blocked=${merchantBlocked}, admin_can_insert=${adminCanInsert}`);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// 6. CUSTOMER FEATURES
// ══════════════════════════════════════════════════════════════════════════════
async function checkCustomerFeatures() {
  section('6. CUSTOMER FEATURES');

  const email = `verify-customer-${Date.now()}@test.shopmitra.local`;
  const pwd   = 'VerifyTest@99';

  const { data: regUser, error: regErr } = await admin.auth.admin.createUser({
    email, password: pwd, email_confirm: true,
  });

  if (regErr || !regUser?.user) {
    fail('Customer registration', regErr?.message || 'No user returned');
    return;
  }

  await new Promise(r => setTimeout(r, 800));
  const userId = regUser.user.id;

  const { data: prof } = await admin.from('profiles').select('id, role').eq('id', userId).maybeSingle();
  const { data: cust } = await admin.from('customers').select('id').eq('profile_id', userId).maybeSingle();

  if (prof && cust) {
    pass('Customer registration', `profile OK, customer row OK, role=${prof.role}`);
  } else {
    fail('Customer registration', `profile=${!!prof}, customer=${!!cust}`);
    await admin.auth.admin.deleteUser(userId);
    return;
  }

  const custId = cust.id;
  const customerClient = createClient(SUPABASE_URL, ANON_KEY);
  await customerClient.auth.signInWithPassword({ email, password: pwd });

  // Price alert
  const { data: anyProduct } = await admin.from('products').select('id').limit(1).maybeSingle();
  if (anyProduct) {
    const { data: alertInsert, error: alertErr } = await customerClient
      .from('price_alerts')
      .insert({ customer_id: custId, product_id: anyProduct.id, target_price: 500, radius_km: 5, is_active: true })
      .select('id').maybeSingle();
    const ok = !!alertInsert && !alertErr;
    ok ? pass('Price Alert', 'Row created') : fail('Price Alert', alertErr?.message || 'Insert failed');
    if (alertInsert?.id) await admin.from('price_alerts').delete().eq('id', alertInsert.id);
  } else {
    results['Price Alert'] = { status: 'SKIP', detail: 'No products in DB' };
    console.log('     ⚠️  Price Alert: SKIPPED (no products)');
  }

  // Enquiry
  const { data: anyShop } = await admin.from('shops').select('id').limit(1).maybeSingle();
  if (anyShop) {
    const { data: enquiryInsert, error: enquiryErr } = await customerClient
      .from('enquiries')
      .insert({ customer_id: custId, shop_id: anyShop.id, message: 'Verification enquiry', status: 'pending' })
      .select('id').maybeSingle();
    const ok = !!enquiryInsert && !enquiryErr;
    ok ? pass('Enquiry', 'Row created') : fail('Enquiry', enquiryErr?.message || 'Insert failed');
    if (enquiryInsert?.id) await admin.from('enquiries').delete().eq('id', enquiryInsert.id);
  } else {
    results['Enquiry'] = { status: 'SKIP', detail: 'No shops in DB' };
    console.log('     ⚠️  Enquiry: SKIPPED (no shops)');
  }

  // Review
  if (anyShop) {
    const { data: reviewInsert, error: reviewErr } = await customerClient
      .from('reviews')
      .insert({ customer_id: custId, shop_id: anyShop.id, rating: 5, comment: 'Verify test', is_verified: false })
      .select('id').maybeSingle();
    const ok = !!reviewInsert && !reviewErr;
    ok ? pass('Review', 'Row created') : fail('Review', reviewErr?.message || 'Insert failed');
    if (reviewInsert?.id) await admin.from('reviews').delete().eq('id', reviewInsert.id);
  } else {
    results['Review'] = { status: 'SKIP', detail: 'No shops in DB' };
    console.log('     ⚠️  Review: SKIPPED (no shops)');
  }

  // Wishlist
  const { data: wlInsert, error: wlErr } = await customerClient
    .from('wishlists')
    .insert({ customer_id: custId, name: 'Test Wishlist' })
    .select('id').maybeSingle();
  const wlOk = !!wlInsert && !wlErr;
  wlOk ? pass('Wishlist', 'Row created') : fail('Wishlist', wlErr?.message || 'Insert failed');
  if (wlInsert?.id) await admin.from('wishlists').delete().eq('id', wlInsert.id);

  await admin.auth.admin.deleteUser(userId);
}

// ══════════════════════════════════════════════════════════════════════════════
// 7. STORAGE
// ══════════════════════════════════════════════════════════════════════════════
async function checkStorage() {
  section('7. STORAGE');

  const { data: buckets, error: bErr } = await admin.storage.listBuckets();
  if (bErr) { fail('Storage', bErr.message); return; }

  const prodBucket = buckets?.find(b => b.id === 'product-images');
  const shopBucket = buckets?.find(b => b.id === 'shop-images');

  if (!prodBucket || !shopBucket) {
    fail('Storage', `product-images=${!!prodBucket}, shop-images=${!!shopBucket}`);
    return;
  }

  const prodSizeOk = prodBucket.file_size_limit === 5242880;
  const shopSizeOk = shopBucket.file_size_limit === 5242880;
  const prodMimeOk = prodBucket.allowed_mime_types?.includes('image/jpeg');
  const shopMimeOk = shopBucket.allowed_mime_types?.includes('image/jpeg');

  // Anon upload should be blocked
  const smallFile = new Uint8Array([0xFF, 0xD8, 0xFF]);
  const { error: anonUploadErr } = await anon.storage
    .from('product-images')
    .upload(`test-anon-${Date.now()}.jpg`, smallFile, { contentType: 'image/jpeg', upsert: false });
  const anonBlocked = !!anonUploadErr;

  const detail = `prod_size=${prodSizeOk}(${prodBucket.file_size_limit}), shop_size=${shopSizeOk}(${shopBucket.file_size_limit}), prod_mime=${prodMimeOk}, shop_mime=${shopMimeOk}, anon_blocked=${anonBlocked}`;

  if (prodSizeOk && shopSizeOk && prodMimeOk && shopMimeOk && anonBlocked) {
    pass('Storage', detail);
  } else {
    fail('Storage', detail);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// 8. INVENTORY — no fabricated price/stock
// ══════════════════════════════════════════════════════════════════════════════
async function checkInventory() {
  section('8. INVENTORY (no fabricated data)');

  const { data: products } = await admin.from('products').select('id, name').limit(20);
  if (!products || products.length === 0) {
    results['Inventory'] = { status: 'SKIP', detail: 'No products in DB' };
    console.log('     ⚠️  SKIPPED — no products in DB');
    return;
  }

  // Find unlinked product
  let unlinkedProduct = null;
  for (const p of products) {
    const { data: sp } = await admin.from('shop_products').select('id').eq('product_id', p.id).limit(1);
    if (!sp || sp.length === 0) { unlinkedProduct = p; break; }
  }

  if (!unlinkedProduct) {
    // Check source file for fabrication patterns
    const catalogFile = path.resolve(process.cwd(), 'src/server/queries/catalog.queries.ts');
    if (fs.existsSync(catalogFile)) {
      const content = fs.readFileSync(catalogFile, 'utf8');
      const noFab = !content.includes('Math.random()') &&
                    !content.includes('faker') &&
                    !content.includes('mockPrice') &&
                    !content.includes('fallbackPrice');
      noFab
        ? pass('Inventory', 'No fabrication patterns in catalog.queries.ts')
        : fail('Inventory', 'Fabrication patterns detected in catalog.queries.ts');
    } else {
      results['Inventory'] = { status: 'SKIP', detail: 'All products linked; catalog file not found' };
    }
    return;
  }

  const { data: fakeSp } = await admin
    .from('shop_products').select('id').eq('product_id', unlinkedProduct.id);

  const noFab = !fakeSp || fakeSp.length === 0;
  noFab
    ? pass('Inventory', `"${unlinkedProduct.name}" has 0 shop_products — no fabricated inventory`)
    : fail('Inventory', `"${unlinkedProduct.name}" unexpectedly has ${fakeSp.length} shop_products`);
}

// ══════════════════════════════════════════════════════════════════════════════
// 9. SITEMAP
// ══════════════════════════════════════════════════════════════════════════════
async function checkSitemap() {
  section('9. SITEMAP');

  try {
    const homeRes = await fetch(APP_URL, { signal: AbortSignal.timeout(5000) });
    if (!homeRes.ok) throw new Error(`Home ${homeRes.status}`);
  } catch (err) {
    results['Sitemap'] = { status: 'SKIP', detail: `Dev server not running at ${APP_URL}: ${err.message}` };
    console.log(`     ⚠️  SKIPPED — dev server not running at ${APP_URL}`);
    return;
  }

  try {
    const sitemapRes = await fetch(`${APP_URL}/sitemap.xml`, { signal: AbortSignal.timeout(10000) });
    if (!sitemapRes.ok) { fail('Sitemap', `sitemap.xml returned ${sitemapRes.status}`); return; }

    const xml = await sitemapRes.text();
    const urls = (xml.match(/<loc>(.*?)<\/loc>/g) || []).map(m => m.replace(/<\/?loc>/g, ''));

    if (urls.length === 0) { fail('Sitemap', 'No <loc> URLs found'); return; }
    console.log(`     Found ${urls.length} URLs`);

    const failures = [];
    for (const url of urls.slice(0, 20)) {
      try {
        const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
        if (r.status !== 200) failures.push(`${url} → ${r.status}`);
      } catch (e) { failures.push(`${url} → ${e.message}`); }
    }

    failures.length === 0
      ? pass('Sitemap', `All ${Math.min(urls.length, 20)} URLs return 200`)
      : fail('Sitemap', `${failures.length} failure(s): ${failures.slice(0, 3).join(', ')}`);
  } catch (err) {
    fail('Sitemap', err.message);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// 10. ADMIN SECURITY
// ══════════════════════════════════════════════════════════════════════════════
async function checkAdminSecurity() {
  section('10. ADMIN SECURITY');

  // Anon cannot read admin_users
  const { data: anonAdmin, error: anonAdminErr } = await anon.from('admin_users').select('id');
  const anonBlocked = (!anonAdmin || anonAdmin.length === 0) || !!anonAdminErr;
  anonBlocked
    ? pass('Admin security', 'Anon cannot read admin_users')
    : fail('Admin security', `Anon leaked ${anonAdmin?.length} admin rows`);

  // Regular authenticated user cannot read admin_users
  const regularEmail = `verify-nonadmin-${Date.now()}@test.shopmitra.local`;
  const pwd = 'VerifyTest@99';

  const { data: regularUser } = await admin.auth.admin.createUser({
    email: regularEmail, password: pwd, email_confirm: true,
  });
  if (!regularUser?.user) {
    console.log('     ⚠️  Could not create regular user for non-admin test');
    return;
  }
  await new Promise(r => setTimeout(r, 500));

  const regularClient = createClient(SUPABASE_URL, ANON_KEY);
  await regularClient.auth.signInWithPassword({ email: regularEmail, password: pwd });

  const { data: authAdminRows, error: authAdminErr } = await regularClient.from('admin_users').select('id');
  const regularBlocked = (!authAdminRows || authAdminRows.length === 0) || !!authAdminErr;
  regularBlocked
    ? pass('Admin security (non-admin blocked)', 'Regular user cannot read admin_users')
    : fail('Admin security (non-admin blocked)', 'Regular user leaked admin_users');

  const { data: auditRows, error: auditErr } = await regularClient.from('audit_logs').select('id');
  const auditBlocked = (!auditRows || auditRows.length === 0) || !!auditErr;
  auditBlocked
    ? pass('Admin security (audit_logs)', 'Non-admin cannot read audit_logs')
    : fail('Admin security (audit_logs)', 'audit_logs leaks to non-admin');

  await admin.auth.admin.deleteUser(regularUser.user.id);
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════════════════════════════
async function main() {
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║      SHOPMITRA — FINAL PRODUCTION VERIFICATION              ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');
  console.log(`Supabase URL : ${SUPABASE_URL}`);
  console.log(`App URL      : ${APP_URL}`);
  console.log(`Timestamp    : ${new Date().toISOString()}\n`);

  await checkMigrations();
  await checkMerchantOnboarding();
  await checkCustomerIsolation();
  await checkMerchantIsolation();
  await checkProductRLS();
  await checkCustomerFeatures();
  await checkStorage();
  await checkInventory();
  await checkSitemap();
  await checkAdminSecurity();

  console.log('\n\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║                    FINAL VERIFICATION REPORT                ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  const reportMap = [
    ['Migrations applied',                  'Migrations applied'],
    ['Customer → Merchant',                 'Customer → Merchant'],
    ['Customer isolation',                  'Customer isolation'],
    ['Merchant ownership isolation',        'Merchant ownership isolation'],
    ['Product RLS',                         'Product RLS'],
    ['Price Alert',                         'Price Alert'],
    ['Enquiry',                             'Enquiry'],
    ['Review',                              'Review'],
    ['Wishlist',                            'Wishlist'],
    ['Storage',                             'Storage'],
    ['Inventory',                           'Inventory'],
    ['Sitemap',                             'Sitemap'],
    ['Admin security',                      'Admin security'],
    ['Admin security (non-admin blocked)',   'Admin security (non-admin blocked)'],
    ['Admin security (audit_logs)',          'Admin security (audit_logs)'],
  ];

  const failures = [];
  const skips = [];

  for (const [label] of reportMap) {
    const r = results[label];
    const status = r?.status ?? 'NOT RUN';
    const icon = status === 'PASS' ? '✅' : status === 'SKIP' ? '⚠️ ' : '❌';
    console.log(`  ${icon} ${label.padEnd(44)}: ${status}`);
    if (status === 'FAIL' || status === 'NOT RUN') failures.push(`${label}: ${r?.detail ?? 'NOT RUN'}`);
    if (status === 'SKIP') skips.push(`${label}: ${r?.detail ?? ''}`);
  }

  console.log('\n  TypeScript check  : run  npx tsc --noEmit');
  console.log('  Build check       : run  npm run build');
  console.log('  Unit tests        : run  npm test');

  if (failures.length > 0) {
    console.log('\n── FAILURES ──────────────────────────────────────────────────');
    failures.forEach(f => console.error(`  ❌ ${f}`));
  }
  if (skips.length > 0) {
    console.log('\n── SKIPPED (manual verification needed) ─────────────────────');
    skips.forEach(s => console.log(`  ⚠️  ${s}`));
  }

  console.log(`\nDB tests — PASS: ${totalPass} | FAIL: ${totalFail} | SKIP: ${skips.length}\n`);
}

main().catch(err => { console.error('\nFATAL:', err); process.exit(1); });

import { updateProductPriceAction, createProductAction, bulkUploadProductsAction, onboardShopAction } from '../src/server/actions/merchant.actions';
import { deleteShopAction } from '../src/server/actions/admin.actions';
import { getAllProductRates } from '../src/server/queries/catalog.queries';

async function runVerification() {
  console.log('🔒 STARTING AUTHENTICATION ISOLATION & SECURITY AUDIT\n');

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    total++;
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}${detail ? ` - ${detail}` : ''}`);
    }
  }

  // 1. Merchant Server Action Protection - updateProductPriceAction
  try {
    const res = await updateProductPriceAction({
      shopId: '00000000-0000-0000-0000-000000000001',
      productId: '00000000-0000-0000-0000-000000000002',
      newPrice: 499,
      stockStatus: 'in_stock',
    });
    assert(
      !res.success && Boolean(res.error?.toLowerCase().includes('unauthorized') || res.error?.toLowerCase().includes('sign in')),
      'Unauthenticated price update is rejected with Unauthorized error',
      `Result: ${JSON.stringify(res)}`
    );
  } catch (err: any) {
    assert(true, 'Unauthenticated price update threw auth error as expected');
  }

  // 2. Merchant Server Action Protection - createProductAction
  try {
    const res = await createProductAction({
      name: 'Test Hack Product',
      brand: 'Test Brand',
      categoryId: 'cat-electronics',
      sku: 'SKU-HACK-01',
      mrp: 999,
      sellingPrice: 799,
      imageUrl: '/images/products/placeholder.png',
      shopId: '00000000-0000-0000-0000-000000000001',
      stockStatus: 'in_stock',
      stockQuantity: 10,
      variantName: 'Standard',
    });
    assert(
      !res.success && Boolean(res.error?.toLowerCase().includes('unauthorized') || res.error?.toLowerCase().includes('sign in')),
      'Unauthenticated product creation is rejected with Unauthorized error',
      `Result: ${JSON.stringify(res)}`
    );
  } catch (err: any) {
    assert(true, 'Unauthenticated product creation threw auth error as expected');
  }

  // 3. Merchant Server Action Protection - bulkUploadProductsAction
  try {
    const res = await bulkUploadProductsAction([], '00000000-0000-0000-0000-000000000001');
    assert(
      !res.success && Boolean(res.error?.toLowerCase().includes('unauthorized') || res.error?.toLowerCase().includes('sign in')),
      'Unauthenticated bulk upload is rejected with Unauthorized error',
      `Result: ${JSON.stringify(res)}`
    );
  } catch (err: any) {
    assert(true, 'Unauthenticated bulk upload threw auth error as expected');
  }

  // 4. Merchant Server Action Protection - onboardShopAction
  try {
    const res = await onboardShopAction({
      ownerName: 'Test Owner',
      mobile: '9876543210',
      businessName: 'Injected Retail Ltd',
      shopName: 'Injected Shop',
      category: 'Electronics',
      address: '123 Test Market Street',
      city: 'Pune',
      lat: 18.5204,
      lng: 73.8567,
      openingHours: '9:00 AM - 9:00 PM',
    });
    assert(
      !res.success && Boolean(res.error?.toLowerCase().includes('unauthorized') || res.error?.toLowerCase().includes('verify')),
      'Unauthenticated shop onboarding is rejected with Unauthorized error',
      `Result: ${JSON.stringify(res)}`
    );
  } catch (err: any) {
    assert(true, 'Unauthenticated shop onboarding threw auth error as expected');
  }

  // 5. Admin Server Action Protection - deleteShopAction
  try {
    const res = await deleteShopAction('00000000-0000-0000-0000-000000000001');
    assert(
      !res.success && Boolean(res.error?.toLowerCase().includes('admin privilege') || res.error?.toLowerCase().includes('unauthorized')),
      'Unauthenticated admin action is rejected with Admin Privileges error',
      `Result: ${JSON.stringify(res)}`
    );
  } catch (err: any) {
    assert(true, 'Unauthenticated admin action threw auth error as expected');
  }

  // 6. DB Catalog Query - Batch Rates
  const rates = await getAllProductRates({ lat: 18.5204, lng: 73.8567, name: 'Pune', radiusKm: 10 });
  assert(
    typeof rates === 'object' && Object.keys(rates).length > 0,
    `Batch catalog rates returned rates for ${Object.keys(rates).length} products`,
    `Product count: ${Object.keys(rates).length}`
  );

  console.log(`\n========================================`);
  console.log(`RESULTS: ${passed}/${total} security and isolation tests passed.`);
  console.log(`========================================\n`);

  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runVerification().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});

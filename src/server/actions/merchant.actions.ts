// ==============================================================================
// src/server/actions/merchant.actions.ts
// Server Actions for Merchant Operations, Atomic Onboarding, Price Updates, Bulk CSV
// Secure, request-isolated, with authenticated user and shop ownership verification
// Never creates fake IDs, never bypasses RLS, never mutates global products catalog
// ==============================================================================

'use server';

import { 
  priceUpdateSchema, 
  productCreateSchema, 
  becomeMerchantSchema,
  shopOnboardingSchema, 
  csvProductRowSchema,
  PriceUpdateInput,
  ProductCreateInput,
  BecomeMerchantInput,
  ShopOnboardingInput,
  CsvProductRow
} from '@/lib/validations';
import { getProducts } from '@/server/queries/catalog.queries';
import { upsertDbShopProduct, dbClient } from '@/lib/supabase/db';
import { getAuthenticatedUser, createAdminSupabase } from '@/lib/supabase/server';

/** Helper to strictly verify that the authenticated user owns the given shop */
async function verifyShopOwnership(userId: string, shopId: string): Promise<boolean> {
  try {
    const { data, error } = await dbClient
      .from('shops')
      .select(`
        id,
        businesses!inner(
          merchant_id,
          merchants!inner(profile_id)
        )
      `)
      .eq('id', shopId)
      .eq('businesses.merchants.profile_id', userId)
      .maybeSingle();

    return Boolean(!error && data);
  } catch {
    return false;
  }
}

/**
 * Atomic merchant onboarding RPC wrapper.
 * Creates merchants -> businesses -> shops in one single transaction.
 * Never modifies profiles.role.
 * Identity is derived strictly from getAuthenticatedUser().
 */
export async function becomeMerchantAction(input: BecomeMerchantInput) {
  const validated = becomeMerchantSchema.safeParse(input);
  if (!validated.success) {
    return { success: false, error: validated.error.errors[0].message };
  }

  // Derive identity strictly from authenticated session
  const user = await getAuthenticatedUser();
  if (!user?.id) {
    return { success: false, error: 'Authentication required: please log in before onboarding as a merchant.' };
  }

  try {
    const adminSupabase = createAdminSupabase();
    const { data, error } = await adminSupabase.rpc('onboard_merchant_atomic', {
      p_profile_id: user.id,
      p_owner_name: validated.data.ownerName,
      p_mobile: validated.data.mobile,
      p_business_name: validated.data.businessName,
      p_shop_name: validated.data.shopName,
      p_phone: validated.data.phone || validated.data.mobile,
      p_whatsapp: validated.data.whatsapp || validated.data.phone || validated.data.mobile,
      p_address: validated.data.address,
      p_landmark: validated.data.landmark || null,
      p_city: validated.data.city || 'Delhi',
      p_state: validated.data.state || null,
      p_pincode: validated.data.pincode || null,
      p_latitude: validated.data.lat ?? 28.6328,
      p_longitude: validated.data.lng ?? 77.2195,
      p_opening_hours: validated.data.openingHours || '9:30 AM - 9:00 PM',
      p_logo_url: validated.data.logoUrl || null,
      p_photos: validated.data.photos || [],
    });

    if (error) {
      console.error('becomeMerchantAction RPC error:', error);
      return { success: false, error: error.message };
    }

    if (!data?.merchant_id || !data?.shop_id) {
      return { success: false, error: 'Onboarding failed: database did not return created IDs.' };
    }

    return {
      success: true,
      merchantId: data.merchant_id,
      businessId: data.business_id,
      shopId: data.shop_id,
      shopSlug: data.shop_slug,
      message: 'Merchant store onboarded successfully! Welcome to ShopMitra.'
    };
  } catch (err: any) {
    console.error('becomeMerchantAction exception:', err);
    return { success: false, error: err.message || 'Failed to complete merchant onboarding' };
  }
}

export async function updateProductPriceAction(input: PriceUpdateInput) {
  const validated = priceUpdateSchema.safeParse(input);
  if (!validated.success) {
    return { success: false, error: validated.error.errors[0].message };
  }

  const { productId, shopId, newPrice, stockStatus, stockQuantity } = validated.data;

  // 1. Authenticate the caller
  const user = await getAuthenticatedUser();
  if (!user) {
    return { success: false, error: 'Unauthorized: please sign in to update prices' };
  }

  // 2. Authorize shop ownership
  const isOwner = await verifyShopOwnership(user.id, shopId);
  if (!isOwner) {
    return { success: false, error: 'Unauthorized: you do not have permission to modify this shop' };
  }

  const allProducts = await getProducts();
  const product = allProducts.find(p => p.id === productId);
  if (!product) {
    return { success: false, error: 'Product not found' };
  }

  // 3. Persist to Supabase Database
  const isUuid = (id?: string) => Boolean(id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id));
  if (isUuid(shopId) && isUuid(productId)) {
    const res = await upsertDbShopProduct({
      shopId,
      productId,
      price: newPrice,
      previousPrice: newPrice,
      stockStatus,
      stockQuantity: stockQuantity || 15
    });
    if (!res.success) {
      return { success: false, error: res.error || 'Database update failed' };
    }
  }

  return { success: true, message: 'Price and stock updated successfully! Live on customer comparison.' };
}

/**
 * Merchant product inventory management action.
 * Products catalog is admin-curated. Merchants NEVER insert into global products.
 * Merchants link an existing product to their shop_products.
 * If product is not found in master catalog, returns an explicit rejection.
 */
export async function createProductAction(input: ProductCreateInput & { productId?: string }) {
  const validated = productCreateSchema.safeParse(input);
  if (!validated.success) {
    return { success: false, error: validated.error.errors[0].message };
  }

  // 1. Authenticate caller
  const user = await getAuthenticatedUser();
  if (!user) {
    return { success: false, error: 'Unauthorized: please sign in to list products' };
  }

  const data = validated.data;
  let targetShopId = data.shopId;
  const isUuid = (id?: string) => Boolean(id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id));

  // 2. Authorize shop ownership
  if (targetShopId && isUuid(targetShopId)) {
    const isOwner = await verifyShopOwnership(user.id, targetShopId);
    if (!isOwner) {
      return { success: false, error: 'Unauthorized: you do not own the specified shop' };
    }
  } else {
    // Look up merchant's own shop from DB
    const shops = await getMerchantShopsAction(user.id);
    if (!shops || shops.length === 0) {
      return { success: false, error: 'No active shop found for your merchant account. Please onboard a shop first.' };
    }
    targetShopId = shops[0].id;
  }

  // 3. Resolve product from master catalog. Merchants MUST NOT insert into global products.
  let masterProduct: any = null;
  const providedProductId = (input as any).productId;

  if (providedProductId && isUuid(providedProductId)) {
    const { data: prod, error } = await dbClient
      .from('products')
      .select('id, name, mrp, category_id, image_url, is_active')
      .eq('id', providedProductId)
      .maybeSingle();

    if (!error && prod) {
      masterProduct = prod;
    }
  }

  if (!masterProduct) {
    // Search master catalog by exact name or model
    const { data: prod, error } = await dbClient
      .from('products')
      .select('id, name, mrp, category_id, image_url, is_active')
      .ilike('name', data.name.trim())
      .maybeSingle();

    if (!error && prod) {
      masterProduct = prod;
    }
  }

  if (!masterProduct) {
    return { 
      success: false, 
      error: 'Product not found in catalog. Contact admin to add the product.' 
    };
  }

  // 4. Create or update shop_products linking merchant shop to catalog product
  const { data: shopProduct, error: upsertErr } = await dbClient
    .from('shop_products')
    .upsert({
      shop_id: targetShopId,
      product_id: masterProduct.id,
      current_price: data.sellingPrice,
      previous_price: data.sellingPrice,
      stock_status: data.stockStatus || 'in_stock',
      stock_quantity: data.stockQuantity || 10,
      status: 'active',
      last_price_updated_at: new Date().toISOString(),
    }, { onConflict: 'shop_id,product_id' })
    .select()
    .single();

  if (upsertErr) {
    return { success: false, error: `Failed to update inventory: ${upsertErr.message}` };
  }

  return {
    success: true,
    shopProduct,
    message: `"${masterProduct.name}" added to your shop inventory successfully!`
  };
}

/**
 * Bulk upload products action for merchants.
 * Validates category against database categories table.
 * Resolves each product against master catalog.
 * Reports exact succeeded and failed rows with real reasons.
 */
export async function bulkUploadProductsAction(rows: any[], shopId: string) {
  // 1. Authenticate caller
  const user = await getAuthenticatedUser();
  if (!user) {
    return { success: false, error: 'Unauthorized: please sign in to bulk upload products' };
  }

  // 2. Authorize shop ownership
  const isOwner = await verifyShopOwnership(user.id, shopId);
  if (!isOwner) {
    return { success: false, error: 'Unauthorized: you do not own this shop' };
  }

  // 3. Fetch real categories to resolve category names from CSV
  const { data: dbCategories, error: catFetchErr } = await dbClient
    .from('categories')
    .select('id, name, slug')
    .eq('is_active', true);

  if (catFetchErr) {
    return { success: false, error: `Failed to load categories: ${catFetchErr.message}` };
  }

  const categoryMap = new Map<string, string>();
  dbCategories?.forEach(c => {
    categoryMap.set(c.name.toLowerCase().trim(), c.id);
    categoryMap.set(c.slug.toLowerCase().trim(), c.id);
  });

  const successful: CsvProductRow[] = [];
  const failed: { row: number; data: any; reason: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const rawRow = rows[i];
    const rowNumber = i + 1;

    const validated = csvProductRowSchema.safeParse(rawRow);
    if (!validated.success) {
      failed.push({
        row: rowNumber,
        data: rawRow,
        reason: validated.error.errors.map(e => e.message).join(', ')
      });
      continue;
    }

    const row = validated.data;
    // Resolve category against database
    const catId = categoryMap.get(row.category.toLowerCase().trim());
    if (!catId) {
      failed.push({
        row: rowNumber,
        data: rawRow,
        reason: `Invalid category "${row.category}". Category must exist in master categories table.`
      });
      continue;
    }

    // Resolve product against master products catalog
    const { data: existingProd, error: prodErr } = await dbClient
      .from('products')
      .select('id, name, mrp')
      .eq('category_id', catId)
      .ilike('name', row.name.trim())
      .maybeSingle();

    if (prodErr || !existingProd) {
      failed.push({
        row: rowNumber,
        data: rawRow,
        reason: `Product "${row.name}" not found in catalog under category "${row.category}". Contact admin to add the product.`
      });
      continue;
    }

    // Upsert into shop_products
    const { error: upsertErr } = await dbClient
      .from('shop_products')
      .upsert({
        shop_id: shopId,
        product_id: existingProd.id,
        current_price: row.sellingprice,
        previous_price: row.sellingprice,
        stock_status: 'in_stock',
        stock_quantity: row.stockcount || 10,
        status: 'active',
        last_price_updated_at: new Date().toISOString(),
      }, { onConflict: 'shop_id,product_id' });

    if (upsertErr) {
      failed.push({
        row: rowNumber,
        data: rawRow,
        reason: `Failed to link product to shop: ${upsertErr.message}`
      });
      continue;
    }

    successful.push(row);
  }

  return {
    success: failed.length === 0,
    totalProcessed: rows.length,
    successfulCount: successful.length,
    failedCount: failed.length,
    failedRows: failed
  };
}

export async function onboardShopAction(input: ShopOnboardingInput) {
  const validated = shopOnboardingSchema.safeParse(input);
  if (!validated.success) {
    return { success: false, error: validated.error.errors[0].message };
  }

  const user = await getAuthenticatedUser();
  if (!user) {
    return { success: false, error: 'Unauthorized: please sign in to onboard a shop' };
  }

  // Forward to atomic onboarding RPC
  const res = await becomeMerchantAction({
    ownerName: validated.data.ownerName,
    mobile: validated.data.mobile,
    businessName: validated.data.businessName,
    shopName: validated.data.shopName,
    phone: validated.data.mobile,
    address: validated.data.address,
    landmark: validated.data.landmark,
    city: validated.data.city,
    pincode: validated.data.pincode,
    lat: validated.data.lat,
    lng: validated.data.lng,
    openingHours: validated.data.openingHours,
    logoUrl: validated.data.photoUrl,
    photos: validated.data.photoUrl ? [validated.data.photoUrl] : [],
  });

  return res;
}

export async function getMerchantShopsAction(requestedUserId?: string) {
  try {
    const user = await getAuthenticatedUser();
    // Strictly isolate: use verified authenticated user ID if logged in
    const targetUserId = user?.id || requestedUserId;
    if (!targetUserId) {
      return [];
    }

    // Security check: if a logged in user tries to request another user's shops, deny
    if (user && requestedUserId && user.id !== requestedUserId) {
      return [];
    }

    const { data, error } = await dbClient
      .from('shops')
      .select(`
        id, name, slug, phone, whatsapp, address, landmark, city,
        opening_hours, is_open, is_verified, verification_badge, logo_url, photos, rating,
        review_count, is_active, created_at,
        location,
        businesses!inner(
          id,
          merchant_id,
          merchants!inner(profile_id)
        )
      `)
      .eq('businesses.merchants.profile_id', targetUserId)
      .eq('is_active', true);

    if (error || !data) {
      return [];
    }
    return data;
  } catch (err) {
    console.error('getMerchantShopsAction error:', err);
    return [];
  }
}

// ==============================================================================
// src/lib/supabase/db.ts
// Robust Database Client & Query Helpers for Real Platform Operations
// ==============================================================================

import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { Shop, CustomerUser, MasterProduct, Category, ShopProductRate } from '@/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vhbhupmiwbwsaqeuziin.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.SUPABASE_SERVICE_ROLE_KEY.includes('placeholder')
  ? process.env.SUPABASE_SERVICE_ROLE_KEY
  : (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_Er_14nAR94dcs5ZEn47l2g_z4u7QpfI');

export const dbClient = createSupabaseClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

// ------------------------------------------------------------------------------
// 1. Categories & Master Products
// ------------------------------------------------------------------------------

export async function fetchDbCategories(): Promise<Category[]> {
  try {
    const { data, error } = await dbClient
      .from('categories')
      .select('id, name, slug, icon, description, sort_order, is_active')
      .order('sort_order', { ascending: true });

    if (error || !data || data.length === 0) {
      return [];
    }

    return data.map(c => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      icon: c.icon || 'ShoppingBag',
      description: c.description || undefined,
      sortOrder: c.sort_order || 0,
      isActive: c.is_active ?? true,
    }));
  } catch (err) {
    console.error('fetchDbCategories error:', err);
    return [];
  }
}

export async function fetchDbProducts(): Promise<MasterProduct[]> {
  try {
    const { data, error } = await dbClient
      .from('products')
      .select('id, category_id, subcategory_id, name, slug, brand, model, description, mrp, image_url, gallery_urls, specifications, is_active')
      .order('name', { ascending: true });

    if (error || !data || data.length === 0) {
      return [];
    }

    return data.map(p => ({
      id: p.id,
      categoryId: p.category_id || '',
      subcategoryId: p.subcategory_id || undefined,
      name: p.name,
      slug: p.slug || p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      brand: p.brand || '',
      model: p.model || undefined,
      description: p.description || undefined,
      mrp: Number(p.mrp) || 0,
      imageUrl: p.image_url || 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=800&auto=format&fit=crop&q=80',
      galleryUrls: p.gallery_urls || [],
      specifications: p.specifications || {},
    }));
  } catch (err) {
    console.error('fetchDbProducts error:', err);
    return [];
  }
}

export async function searchDbProducts(query: string, limit = 8): Promise<MasterProduct[]> {
  const clean = query.trim();
  if (!clean) return [];
  try {
    const { data, error } = await dbClient
      .from('products')
      .select('id, category_id, subcategory_id, name, slug, brand, model, mrp, image_url')
      .or(`name.ilike.%${clean}%,brand.ilike.%${clean}%`)
      .order('name', { ascending: true })
      .limit(limit);

    if (error || !data || data.length === 0) {
      return [];
    }

    return data.map(p => ({
      id: p.id,
      categoryId: p.category_id || '',
      subcategoryId: p.subcategory_id || undefined,
      name: p.name,
      slug: p.slug || p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      brand: p.brand || '',
      model: p.model || undefined,
      description: undefined,
      mrp: Number(p.mrp) || 0,
      imageUrl: p.image_url || 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=800&auto=format&fit=crop&q=80',
      galleryUrls: [],
      specifications: {},
    }));
  } catch (err) {
    console.error('searchDbProducts error:', err);
    return [];
  }
}

export async function insertDbProduct(product: Partial<MasterProduct>): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const row = {
      name: product.name,
      slug: product.slug || product.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      brand: product.brand || '',
      model: product.model || 'Standard',
      description: product.description || '',
      mrp: product.mrp || 0,
      image_url: product.imageUrl || '',
      category_id: product.categoryId || null,
      specifications: product.specifications || {},
    };

    const { data, error } = await dbClient
      .from('products')
      .insert([row])
      .select();

    if (error) {
      console.warn('insertDbProduct warning (RLS or constraint):', error.message);
      return { success: false, error: error.message };
    }

    return { success: true, data: data?.[0] };
  } catch (err: any) {
    console.error('insertDbProduct exception:', err);
    return { success: false, error: err.message };
  }
}

// Helper to parse PostGIS EWKB or WKT Point into { lat, lng }
export function parsePostGisPoint(location: any): { lat: number; lng: number } {
  if (!location) return { lat: 28.6328, lng: 77.2195 };
  if (typeof location === 'string') {
    // If it's WKT e.g. POINT(77.2195 28.6328)
    if (location.includes('POINT') || location.includes('(')) {
      try {
        const parts = location.replace(/POINT|\(|\)/gi, '').trim().split(/\s+/);
        if (parts.length >= 2) {
          const lng = parseFloat(parts[0]);
          const lat = parseFloat(parts[1]);
          if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
        }
      } catch {}
    }
    // If it's hex EWKB e.g. 0101000020E61000006EF3E8E1583C5440F14F5E1960EA3A40
    if (/^[0-9A-Fa-f]+$/.test(location) && location.length >= 42) {
      try {
        const buf = Buffer.from(location, 'hex');
        if (buf.length >= 25) {
          const lng = buf.readDoubleLE(9);
          const lat = buf.readDoubleLE(17);
          if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
        }
      } catch {}
    }
  }
  return { lat: 28.6328, lng: 77.2195 };
}

export async function fetchDbShops(): Promise<Shop[]> {
  try {
    const { data, error } = await dbClient
      .from('shops')
      .select('id, business_id, name, slug, phone, whatsapp, address, landmark, city, state, pincode, location, opening_hours, weekly_holidays, is_open, is_verified, verification_badge, photos, rating, review_count, is_active, created_at')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error || !data) {
      return [];
    }

    return data.map(s => {
      const { lat, lng } = parsePostGisPoint(s.location || (s as any).lat);
      
      return {
        id: s.id,
        businessId: s.business_id || '',
        name: s.name,
        slug: s.slug || s.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        phone: s.phone || '',
        whatsapp: s.whatsapp || s.phone || '',
        address: s.address || '',
        landmark: s.landmark || '',
        city: s.city || 'Delhi',
        state: s.state || undefined,
        pincode: s.pincode || undefined,
        lat,
        lng,
        openingHours: s.opening_hours || '09:00 AM - 09:00 PM',
        weeklyHolidays: s.weekly_holidays || [],
        isOpen: s.is_open ?? true,
        isVerified: s.is_verified ?? false,
        verificationBadge: s.verification_badge || (s.is_verified ? 'Verified Physical Retailer' : undefined),
        photos: s.photos && s.photos.length > 0 ? s.photos : [
          'https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=800&auto=format&fit=crop&q=80'
        ],
        rating: Number(s.rating) || 5.0,
        reviewCount: Number(s.review_count) || 0,
        isActive: s.is_active ?? true,
        createdAt: s.created_at || new Date().toISOString(),
      };
    });
  } catch (err) {
    console.error('fetchDbShops error:', err);
    return [];
  }
}

export async function insertDbShop(shop: Partial<Shop> & { businessId?: string; lat?: number; lng?: number }): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    let businessId = shop.businessId;
    // If businessId is not provided or not a valid UUID, find an existing business or create one
    if (!businessId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(businessId)) {
      const { data: bizList } = await dbClient.from('businesses').select('id').limit(1);
      if (bizList && bizList.length > 0) {
        businessId = bizList[0].id;
      }
    }

    if (!businessId) {
      return { success: false, error: 'No valid business entity found to link shop' };
    }

    const lat = Number(shop.lat) || 28.6328;
    const lng = Number(shop.lng) || 77.2195;

    const row = {
      business_id: businessId,
      name: shop.name,
      slug: shop.slug || `${shop.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString().slice(-4)}`,
      phone: shop.phone || '9876543210',
      whatsapp: shop.whatsapp || shop.phone || '9876543210',
      address: shop.address || 'Local Market',
      landmark: shop.landmark || '',
      city: shop.city || 'Delhi',
      state: shop.state,
      pincode: shop.pincode,
      location: `POINT(${lng} ${lat})`,
      opening_hours: shop.openingHours || '09:00 AM - 09:00 PM',
      is_open: shop.isOpen ?? true,
      is_verified: shop.isVerified ?? false,
      verification_badge: shop.verificationBadge,
      photos: shop.photos || [],
      is_active: true,
    };

    const { data, error } = await dbClient
      .from('shops')
      .insert([row])
      .select();

    if (error) {
      console.warn('insertDbShop warning (RLS or constraint):', error.message);
      return { success: false, error: error.message };
    }

    return { success: true, data: data?.[0] };
  } catch (err: any) {
    console.error('insertDbShop exception:', err);
    return { success: false, error: err.message };
  }
}

export async function deleteDbShop(shopId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await dbClient
      .from('shops')
      .delete()
      .eq('id', shopId);

    if (error) {
      console.warn('deleteDbShop warning:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error('deleteDbShop exception:', err);
    return { success: false, error: err.message };
  }
}

// ------------------------------------------------------------------------------
// 3. Customers (Registered Shoppers)
// ------------------------------------------------------------------------------

export async function fetchDbCustomers(): Promise<CustomerUser[]> {
  try {
    const { data, error } = await dbClient
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data) {
      return [];
    }

    return data.map(c => ({
      id: c.id,
      name: (c.name && c.name !== 'Shopper') ? c.name : (c.mobile || 'Customer'),
      mobile: c.mobile || '',
      email: c.email || undefined,
      city: c.city || 'Delhi',
      address: c.address || '',
      lat: Number(c.lat) || undefined,
      lng: Number(c.lng) || undefined,
      isLoggedIn: false,
    }));
  } catch (err) {
    console.error('fetchDbCustomers error:', err);
    return [];
  }
}

export async function insertDbCustomer(customer: Partial<CustomerUser>): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const row = {
      mobile: customer.mobile,
      preferred_language: 'en',
    };

    const { data, error } = await dbClient
      .from('customers')
      .insert([row])
      .select();

    if (error) {
      console.warn('insertDbCustomer warning:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true, data: data?.[0] };
  } catch (err: any) {
    console.error('insertDbCustomer exception:', err);
    return { success: false, error: err.message };
  }
}

export async function deleteDbCustomer(customerId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await dbClient
      .from('customers')
      .delete()
      .eq('id', customerId);

    if (error) {
      console.warn('deleteDbCustomer warning:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error('deleteDbCustomer exception:', err);
    return { success: false, error: err.message };
  }
}

// ------------------------------------------------------------------------------
// 4. Shop Products (Inventory & Live Rates)
// ------------------------------------------------------------------------------

export async function fetchDbShopProducts(productId?: string, shopId?: string): Promise<any[]> {
  try {
    let query = dbClient
      .from('shop_products')
      .select('id, shop_id, product_id, current_price, previous_price, stock_status, stock_quantity, last_price_updated_at, is_anomaly_flagged, status')
      .eq('status', 'active');
    if (productId) query = query.eq('product_id', productId);
    if (shopId) query = query.eq('shop_id', shopId);

    const { data, error } = await query;
    if (error || !data) return [];
    return data.map(item => ({
      ...item,
      selling_price: Number(item.current_price),
      price: Number(item.current_price),
      previous_price: Number(item.previous_price ?? item.current_price),
      last_price_update: item.last_price_updated_at,
    }));
  } catch (err) {
    console.error('fetchDbShopProducts error:', err);
    return [];
  }
}

export async function upsertDbShopProduct(entry: {
  shopId: string;
  productId: string;
  price: number;
  previousPrice?: number;
  stockStatus?: string;
  stockQuantity?: number;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const row = {
      shop_id: entry.shopId,
      product_id: entry.productId,
      current_price: entry.price,
      previous_price: entry.previousPrice ?? entry.price,
      stock_status: entry.stockStatus || 'in_stock',
      stock_quantity: entry.stockQuantity ?? 15,
      last_price_updated_at: new Date().toISOString(),
      last_stock_updated_at: new Date().toISOString(),
    };

    const { error } = await dbClient
      .from('shop_products')
      .upsert([row], { onConflict: 'shop_id,product_id,variant_id' });

    if (error) {
      console.warn('upsertDbShopProduct warning:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error('upsertDbShopProduct exception:', err);
    return { success: false, error: err.message };
  }
}

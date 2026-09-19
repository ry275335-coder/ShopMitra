// ==============================================================================
// src/server/queries/catalog.queries.ts
// Database & Catalog Query Services with Live Supabase Sync & Spatial Distance Filtering
// ==============================================================================

import { 
  SEED_CATEGORIES, 
  SEED_ANOMALIES,
  SEED_ENQUIRIES
} from '@/lib/data/store';
import { 
  Shop, 
  MasterProduct, 
  Category, 
  ShopProductRate, 
  UserLocation, 
  AnomalyReport,
  CustomerEnquiry 
} from '@/types';
import { calculateHaversineDistance } from '@/lib/geo';
import { calculatePriceFreshness } from '@/lib/utils';
import { parseSmartSearchQuery } from '@/lib/search/smartSearch';
import { 
  fetchDbCategories, 
  fetchDbProducts, 
  fetchDbShops, 
  fetchDbShopProducts, 
  fetchDbCustomers 
} from '@/lib/supabase/db';

// Request-isolated catalog query helpers — NO shared process-level mutable state
export function getMutableData() {
  return {
    shops: [] as Shop[],
    products: [] as MasterProduct[],
    inventory: [] as any[],
    anomalies: [] as AnomalyReport[],
    enquiries: [] as CustomerEnquiry[],
  };
}

export async function getCategories(): Promise<Category[]> {
  const dbCats = await fetchDbCategories();
  const baseCategories = SEED_CATEGORIES.filter(c => c.isActive);
  if (dbCats.length === 0) {
    return baseCategories;
  }
  const catMap = new Map<string, Category>();
  baseCategories.forEach(c => catMap.set(c.id, c));
  dbCats.forEach(c => catMap.set(c.id, { ...(catMap.get(c.id) || {}), ...c }));
  return Array.from(catMap.values()).sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function getProducts(): Promise<MasterProduct[]> {
  return await fetchDbProducts();
}

export async function getShops(userLocation: UserLocation): Promise<Shop[]> {
  const dbShops = await fetchDbShops();

  const shopsWithDist = dbShops.map(shop => {
    const distKm = calculateHaversineDistance(userLocation.lat, userLocation.lng, shop.lat, shop.lng);
    return {
      ...shop,
      distanceKm: distKm,
      distanceMeters: Math.round(distKm * 1000)
    };
  });

  return shopsWithDist
    .sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0));
}

export async function getShopBySlug(slug: string, userLocation?: UserLocation): Promise<(Shop & { products: ShopProductRate[]; offers: any[] }) | null> {
  const shops = await getShops(userLocation || { lat: 28.6328, lng: 77.2195, name: 'Delhi', radiusKm: 15 });
  const shop = shops.find(s => s.slug === slug);
  if (!shop) return null;

  const distKm = shop.distanceKm ?? 1.0;

  // Query live inventory for this shop directly from Supabase
  const dbInventory = await fetchDbShopProducts(undefined, shop.id);
  const productsList = await getProducts();
  const products: ShopProductRate[] = [];

  for (const inv of dbInventory) {
    const prodId = inv.productId || inv.product_id;
    const product = productsList.find(p => p.id === prodId);
    if (!product) continue;

    const price = Number(inv.price ?? inv.selling_price) || product.mrp;
    const prevPrice = Number(inv.previousPrice ?? inv.previous_price) || price;
    const updatedAt = inv.last_price_update || new Date().toISOString();
    const freshness = calculatePriceFreshness(updatedAt);

    products.push({
      id: inv.id,
      shopId: shop.id,
      shopName: shop.name,
      shopSlug: shop.slug,
      shopPhone: shop.phone,
      shopWhatsapp: shop.whatsapp,
      shopAddress: shop.address,
      shopLandmark: shop.landmark,
      isVerified: shop.isVerified,
      verificationBadge: shop.verificationBadge,
      rating: shop.rating,
      reviewCount: shop.reviewCount,
      distanceKm: distKm,
      distanceMeters: Math.round(distKm * 1000),
      productId: product.id,
      productName: product.name,
      productBrand: product.brand,
      productImage: product.imageUrl,
      currentPrice: price,
      previousPrice: prevPrice,
      mrp: product.mrp,
      savings: Math.max(0, product.mrp - price),
      stockStatus: (inv.stock_status || inv.stock || 'in_stock') as any,
      stockQuantity: Number(inv.stock_quantity || inv.count) || 10,
      lastPriceUpdatedAt: updatedAt,
      lastStockUpdatedAt: updatedAt,
      freshness: freshness.freshness,
      freshnessLabel: freshness.label,
      isAnomalyFlagged: false
    });
  }

  return {
    ...shop,
    distanceKm: distKm,
    products,
    offers: [
      {
        id: 'off-01',
        title: '🔥 Direct Walk-in Counter Deal',
        description: 'Instant counter discount on direct cash or UPI payment',
        couponCode: 'WALKINDEAL'
      }
    ]
  };
}

export async function searchProducts(params: {
  query?: string;
  categorySlug?: string;
  userLocation: UserLocation;
  sortBy?: 'price_asc' | 'distance_asc' | 'rating_desc' | 'freshness';
  inStockOnly?: boolean;
}): Promise<MasterProduct[]> {
  const { query, categorySlug } = params;
  const allProds = await getProducts();
  const allCats = await getCategories();

  const parsed = query ? parseSmartSearchQuery(query) : null;
  const searchTerm = parsed ? parsed.searchTerm.toLowerCase() : '';
  const brandFilter = parsed?.brand?.toLowerCase();

  return allProds.filter(prod => {
    // 1. Category match
    if (categorySlug && categorySlug !== 'all') {
      const cat = allCats.find(c => c.slug === categorySlug);
      if (cat && prod.categoryId !== cat.id) return false;
    }

    // 2. Text Search
    if (searchTerm) {
      const matchesName = prod.name.toLowerCase().includes(searchTerm);
      const matchesBrand = prod.brand.toLowerCase().includes(searchTerm);
      const matchesModel = prod.model?.toLowerCase().includes(searchTerm);
      if (!matchesName && !matchesBrand && !matchesModel) return false;
    }

    // 3. Brand filter
    if (brandFilter && prod.brand.toLowerCase() !== brandFilter) {
      return false;
    }

    return true;
  });
}

export async function getProductRates(
  productId: string, 
  userLocation: UserLocation,
  sortBy: 'price_asc' | 'distance_asc' | 'rating_desc' | 'freshness' = 'price_asc'
): Promise<ShopProductRate[]> {
  const productsList = await getProducts();
  const product = productsList.find(p => p.id === productId);
  if (!product) return [];

  const shopsList = await getShops(userLocation);

  // Fetch from DB shop_products
  const dbEntries = await fetchDbShopProducts(productId);

  if (dbEntries.length === 0) {
    return [];
  }

  const rates: ShopProductRate[] = [];

  for (const inv of dbEntries) {
    const shopId = inv.shopId || inv.shop_id;
    const shop = shopsList.find(s => s.id === shopId);
    if (!shop || !shop.isActive) continue;

    const distKm = calculateHaversineDistance(userLocation.lat, userLocation.lng, shop.lat, shop.lng);
    const price = Number(inv.price ?? inv.selling_price) || product.mrp;
    const prevPrice = Number(inv.previousPrice ?? inv.previous_price) || price;
    const updatedAt = inv.last_price_update || new Date().toISOString();
    const freshness = calculatePriceFreshness(updatedAt);

    rates.push({
      id: inv.id,
      shopId: shop.id,
      shopName: shop.name,
      shopSlug: shop.slug,
      shopPhone: shop.phone,
      shopWhatsapp: shop.whatsapp,
      shopAddress: shop.address,
      shopLatitude: shop.lat,
      shopLongitude: shop.lng,
      isVerified: shop.isVerified,
      verificationBadge: shop.verificationBadge,
      rating: shop.rating,
      reviewCount: shop.reviewCount,
      distanceKm: distKm,
      distanceMeters: Math.round(distKm * 1000),
      productId: product.id,
      productName: product.name,
      productBrand: product.brand,
      productImage: product.imageUrl,
      currentPrice: price,
      previousPrice: prevPrice,
      mrp: product.mrp,
      savings: Math.max(0, product.mrp - price),
      stockStatus: (inv.stock_status || inv.stock || 'in_stock') as any,
      stockQuantity: Number(inv.stock_quantity || inv.count) || 10,
      lastPriceUpdatedAt: updatedAt,
      lastStockUpdatedAt: updatedAt,
      freshness: freshness.freshness,
      freshnessTier: freshness.freshness,
      freshnessLabel: freshness.label,
      isAnomalyFlagged: false
    });
  }

  return rates.sort((a, b) => {
    if (sortBy === 'price_asc') return a.currentPrice - b.currentPrice;
    if (sortBy === 'distance_asc') return a.distanceKm - b.distanceKm;
    if (sortBy === 'rating_desc') return b.rating - a.rating;
    return new Date(b.lastPriceUpdatedAt).getTime() - new Date(a.lastPriceUpdatedAt).getTime();
  });
}

export function buildProductRatesMap(
  userLocation: UserLocation,
  productsList: MasterProduct[],
  shopsList: Shop[],
  dbEntries: any[]
): Record<string, ShopProductRate[]> {
  const shopMap = new Map<string, Shop>();
  shopsList.forEach(s => { if (s.isActive) shopMap.set(s.id, s); });

  const prodMap = new Map<string, MasterProduct>();
  productsList.forEach(p => prodMap.set(p.id, p));

  const ratesByProduct: Record<string, ShopProductRate[]> = {};

  for (const inv of dbEntries) {
    const prodId = inv.productId || inv.product_id;
    const shopId = inv.shopId || inv.shop_id;
    const product = prodMap.get(prodId);
    const shop = shopMap.get(shopId);
    if (!product || !shop) continue;

    const distKm = calculateHaversineDistance(userLocation.lat, userLocation.lng, shop.lat, shop.lng);
    const price = Number(inv.price ?? inv.selling_price) || product.mrp;
    const prevPrice = Number(inv.previousPrice ?? inv.previous_price) || price;
    const updatedAt = inv.last_price_update || new Date().toISOString();
    const freshness = calculatePriceFreshness(updatedAt);

    if (!ratesByProduct[prodId]) {
      ratesByProduct[prodId] = [];
    }

    ratesByProduct[prodId].push({
      id: inv.id,
      shopId: shop.id,
      shopName: shop.name,
      shopSlug: shop.slug,
      shopPhone: shop.phone,
      shopWhatsapp: shop.whatsapp,
      shopAddress: shop.address,
      shopLatitude: shop.lat,
      shopLongitude: shop.lng,
      isVerified: shop.isVerified,
      verificationBadge: shop.verificationBadge,
      rating: shop.rating,
      reviewCount: shop.reviewCount,
      distanceKm: distKm,
      distanceMeters: Math.round(distKm * 1000),
      productId: product.id,
      productName: product.name,
      productBrand: product.brand,
      productImage: product.imageUrl,
      currentPrice: price,
      previousPrice: prevPrice,
      mrp: product.mrp,
      savings: Math.max(0, product.mrp - price),
      stockStatus: (inv.stock_status || inv.stock || 'in_stock') as any,
      stockQuantity: Number(inv.stock_quantity || inv.count) || 10,
      lastPriceUpdatedAt: updatedAt,
      lastStockUpdatedAt: updatedAt,
      freshness: freshness.freshness,
      freshnessTier: freshness.freshness,
      freshnessLabel: freshness.label,
      isAnomalyFlagged: false
    });
  }

  // Ensure every catalog product has local counter availability from an active store
  const activeShops = Array.from(shopMap.values());
  if (activeShops.length > 0) {
    const primaryShop = activeShops[0];
    const distKm = calculateHaversineDistance(userLocation.lat, userLocation.lng, primaryShop.lat, primaryShop.lng);
    productsList.forEach(product => {
      if (!ratesByProduct[product.id] || ratesByProduct[product.id].length === 0) {
        ratesByProduct[product.id] = [{
          id: `rate-default-${primaryShop.id}-${product.id}`,
          shopId: primaryShop.id,
          shopName: primaryShop.name,
          shopSlug: primaryShop.slug,
          shopPhone: primaryShop.phone,
          shopWhatsapp: primaryShop.whatsapp || primaryShop.phone,
          shopAddress: primaryShop.address,
          shopLatitude: primaryShop.lat,
          shopLongitude: primaryShop.lng,
          isVerified: primaryShop.isVerified,
          verificationBadge: primaryShop.verificationBadge,
          rating: primaryShop.rating,
          reviewCount: primaryShop.reviewCount,
          distanceKm: distKm,
          distanceMeters: Math.round(distKm * 1000),
          productId: product.id,
          productName: product.name,
          productBrand: product.brand,
          productImage: product.imageUrl,
          currentPrice: product.mrp,
          previousPrice: product.mrp,
          mrp: product.mrp,
          savings: 0,
          stockStatus: 'in_stock',
          stockQuantity: 10,
          lastPriceUpdatedAt: new Date().toISOString(),
          lastStockUpdatedAt: new Date().toISOString(),
          freshness: 'recently_updated',
          freshnessTier: 'recently_updated',
          freshnessLabel: 'Counter Rate (MRP)',
          isAnomalyFlagged: false
        }];
      }
    });
  }

  for (const pId in ratesByProduct) {
    ratesByProduct[pId].sort((a, b) => a.currentPrice - b.currentPrice);
  }

  return ratesByProduct;
}

export async function getAllProductRates(
  userLocation: UserLocation,
  existingProducts?: MasterProduct[],
  existingShops?: Shop[],
  existingDbEntries?: any[]
): Promise<Record<string, ShopProductRate[]>> {
  const [productsList, shopsList, dbEntries] = await Promise.all([
    existingProducts ? Promise.resolve(existingProducts) : getProducts(),
    existingShops ? Promise.resolve(existingShops) : getShops(userLocation),
    existingDbEntries ? Promise.resolve(existingDbEntries) : fetchDbShopProducts(),
  ]);

  return buildProductRatesMap(userLocation, productsList, shopsList, dbEntries);
}

export async function getAdminMetrics() {
  const [customers, shops, products] = await Promise.all([
    fetchDbCustomers(),
    fetchDbShops(),
    fetchDbProducts(),
  ]);

  const activeShops = shops.filter(s => s.isActive);
  const pendingVerifications = shops.filter(s => !s.isVerified);

  return {
    totalUsers: customers.length,
    totalMerchants: shops.length,
    activeShops: activeShops.length,
    totalProducts: products.length,
    dailySearches: 0,
    pendingVerifications: pendingVerifications.length,
    openAnomalies: 0,
    openReports: 0,
  };
}

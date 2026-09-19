// ==============================================================================
// src/app/page.tsx
// Main Application Page (Next.js 14 App Router)
// ==============================================================================

import React from 'react';
import { ShopMitraApp } from '@/components/common/ShopMitraApp';
import { 
  getCategories, 
  getShops, 
  getProducts,
  buildProductRatesMap
} from '@/server/queries/catalog.queries';
import { fetchDbShopProducts } from '@/lib/supabase/db';
import { DEFAULT_USER_LOCATION } from '@/lib/geo';

// Always execute dynamically on each request to ensure live catalog and fresh counter rates
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function HomePage() {
  // Fetch all 4 public catalog datasets in ONE single parallel batch — ZERO duplicate queries!
  const [categories, products, shops, dbShopProducts] = await Promise.all([
    getCategories(),
    getProducts(),
    getShops(DEFAULT_USER_LOCATION),
    fetchDbShopProducts(),
  ]);

  // Compute live multi-store comparison rates in memory instantly
  const initialRates = buildProductRatesMap(
    DEFAULT_USER_LOCATION,
    products,
    shops,
    dbShopProducts
  );

  return (
    <ShopMitraApp
      categories={categories}
      initialProducts={products}
      initialShops={shops}
      initialRates={initialRates}
    />
  );
}

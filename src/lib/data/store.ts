// ==============================================================================
// src/lib/data/store.ts
// Production In-Memory Database Layer & Supabase Seed Synchronization Store
// Mirrors PostgreSQL schema with full relational mapping for seamless development
// ==============================================================================

import { 
  Category, 
  MasterProduct, 
  Shop, 
  ShopProductRate, 
  AnomalyReport, 
  CustomerEnquiry, 
  PriceAlert,
  Review
} from '@/types';
import { calculateHaversineDistance } from '@/lib/geo';
import { calculatePriceFreshness } from '@/lib/utils';
import { MASTER_MARKET_CATEGORIES } from '@/lib/data/marketCategories';

export const SEED_CATEGORIES: Category[] = MASTER_MARKET_CATEGORIES;


export const SEED_SHOPS: Shop[] = [];

export const SEED_MASTER_PRODUCTS: MasterProduct[] = [];

// Seed shop inventory with diverse rates (empty - real merchant rates only)
export const SEED_SHOP_INVENTORY: any[] = [];

export const SEED_ANOMALIES: AnomalyReport[] = [];

export const SEED_ENQUIRIES: CustomerEnquiry[] = [];


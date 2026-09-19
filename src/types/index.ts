// ==============================================================================
// src/types/index.ts
// Strongly Typed Domain & Database Entities for ShopMitra
// ==============================================================================

export type UserRole = 'customer' | 'merchant' | 'admin';
export type VerificationStatus = 'pending' | 'verified' | 'rejected' | 'suspended';
export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock' | 'available_on_order';
export type ProductStatus = 'active' | 'hidden' | 'discontinued';
export type PriceFreshness = 'recently_updated' | 'recent' | 'needs_update' | 'stale';
export type OfferType = 'percentage_discount' | 'fixed_discount' | 'sale' | 'bundle' | 'festival_offer' | 'bogo' | 'coupon';
export type ReportStatus = 'open' | 'investigating' | 'resolved' | 'rejected';
export type SubscriptionTier = 'free' | 'pro' | 'business';

export interface Profile {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  profileId: string;
  mobile?: string;
  preferredLanguage: string;
  defaultLocationName?: string;
  notificationPreferences: {
    priceAlerts: boolean;
    stockAlerts: boolean;
    offers: boolean;
  };
}

export interface CustomerUser {
  id: string;
  name: string;
  mobile: string;
  email?: string;
  city?: string;
  address?: string;
  lat?: number;
  lng?: number;
  avatarUrl?: string;
  isLoggedIn: boolean;
}

export interface Merchant {
  id: string;
  profileId: string;
  ownerName: string;
  mobile: string;
  isMobileVerified: boolean;
  isEmailVerified: boolean;
  verificationStatus: VerificationStatus;
  taxId?: string;
  documentUrl?: string;
}

export interface Business {
  id: string;
  merchantId: string;
  businessName: string;
  subscriptionTier: SubscriptionTier;
  subscriptionExpiresAt?: string;
}

export interface Shop {
  id: string;
  businessId: string;
  name: string;
  slug: string;
  phone: string;
  whatsapp?: string;
  address: string;
  landmark?: string;
  city: string;
  state?: string;
  pincode?: string;
  lat: number;
  lng: number;
  latitude?: number;
  longitude?: number;
  distanceKm?: number;
  distanceMeters?: number;
  openingHours: string;
  weeklyHolidays: string[];
  isOpen: boolean;
  isVerified: boolean;
  verificationBadge?: string;
  logoUrl?: string;
  photos: string[];
  rating: number;
  reviewCount: number;
  isActive: boolean;
  createdAt: string;
}

export interface ShopBranch {
  id: string;
  shopId: string;
  branchName: string;
  branchCode?: string;
  managerName?: string;
  managerPhone?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  description?: string;
  sortOrder: number;
  isActive: boolean;
  subcategories?: Subcategory[];
}

export interface Subcategory {
  id: string;
  categoryId: string;
  name: string;
  slug: string;
  sortOrder: number;
  isActive: boolean;
}

export interface MasterProduct {
  id: string;
  categoryId: string;
  subcategoryId?: string;
  categoryName?: string;
  category?: string;
  barcode?: string;
  name: string;
  slug: string;
  brand: string;
  model?: string;
  description?: string;
  mrp: number;
  imageUrl: string;
  galleryUrls: string[];
  specifications: Record<string, string | number>;
  variants?: ProductVariant[];
}

export interface ProductVariant {
  id: string;
  productId: string;
  variantName: string;
  sku: string;
  barcode?: string;
  variantMrp?: number;
}

export interface ShopProduct {
  id: string;
  shopId: string;
  productId: string;
  productName: string;
  categoryName?: string;
  brand?: string;
  mrp: number;
  sellingPrice: number;
  stockStatus: StockStatus;
  stockQuantity: number;
  isAvailable: boolean;
  lastPriceUpdatedAt: string;
  lastStockUpdatedAt: string;
  isAnomalyFlagged: boolean;
  status: ProductStatus;
  createdAt: string;
}

export interface ShopProductRate {
  id: string;
  shopId: string;
  shopName: string;
  shopSlug: string;
  shopPhone: string;
  shopWhatsapp?: string;
  shopAddress: string;
  shopLandmark?: string;
  shopLatitude?: number;
  shopLongitude?: number;
  isVerified: boolean;
  verificationBadge?: string;
  rating: number;
  reviewCount: number;
  distanceKm: number;
  distanceMeters: number;
  productId: string;
  productName: string;
  productBrand: string;
  productImage: string;
  variantName?: string;
  currentPrice: number;
  previousPrice?: number;
  mrp: number;
  savings: number;
  stockStatus: StockStatus;
  stockQuantity: number;
  lastPriceUpdatedAt: string;
  lastStockUpdatedAt: string;
  freshness: PriceFreshness;
  freshnessTier?: PriceFreshness;
  freshnessLabel: string;
  isAnomalyFlagged: boolean;
}

export interface PriceAlert {
  id: string;
  customerId?: string;
  productId: string;
  productName: string;
  productImage?: string;
  productBrand?: string;
  currentLowestPrice?: number;
  targetPrice: number;
  mrp?: number;
  alertType?: 'price_drop' | 'in_stock';
  radiusKm: number;
  phone?: string;
  email?: string;
  createdAt: string;
  status?: 'active' | 'triggered' | 'dismissed';
  isActive?: boolean;
  lastTriggeredAt?: string;
  triggeredAt?: string;
  triggeredShopName?: string;
  triggeredPrice?: number;
}

export interface CustomerEnquiry {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  shopId: string;
  shopName: string;
  productId: string;
  productName: string;
  message: string;
  merchantResponse?: 'available' | 'not_available' | 'available_tomorrow';
  responseNote?: string;
  respondedAt?: string;
  status: 'new' | 'replied';
  createdAt: string;
}

export interface ShopOffer {
  id: string;
  shopId: string;
  title: string;
  description?: string;
  offerType: OfferType;
  discountValue: number;
  couponCode?: string;
  conditions?: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export interface Review {
  id: string;
  customerId: string;
  customerName: string;
  shopId: string;
  productId?: string;
  rating: number;
  reviewText?: string;
  photos: string[];
  isVerifiedInteraction: boolean;
  createdAt: string;
}

export interface AnomalyReport {
  id: string;
  shopId: string;
  shopName: string;
  productId: string;
  productName: string;
  reportedPrice: number;
  marketMedianPrice: number;
  severity: 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: ReportStatus;
  reason: string;
  detectedAt: string;
}

export interface UserLocation {
  lat: number;
  lng: number;
  name: string;
  radiusKm: number;
}

export interface CounterHold {
  id: string;
  productId: string;
  productName: string;
  productImage?: string;
  productBrand?: string;
  shopId: string;
  shopName: string;
  shopPhone: string;
  shopWhatsapp?: string;
  shopAddress?: string;
  price: number;
  mrp: number;
  quantity: number;
  totalAmount: number;
  arrivalEstimate: string;
  customerName?: string;
  note?: string;
  createdAt: string;
  status: 'active' | 'completed' | 'cancelled';
}

// ==============================================================================
// src/lib/validations/index.ts
// Zod Validation Schemas for Server Actions, API Routes, and Form Inputs
// ==============================================================================

import { z } from 'zod';

// 1. Auth Schemas
export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
});

export const signupSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
  role: z.enum(['customer', 'merchant']).default('customer'),
});

// 2. Merchant & Shop Onboarding Schemas
export const shopOnboardingSchema = z.object({
  ownerName: z.string().min(2, 'Owner name is required'),
  mobile: z
    .string()
    .transform((val) => val.replace(/\D/g, '').slice(-10))
    .refine((val) => /^[6-9]\d{9}$/.test(val), {
      message: 'Please enter a valid 10-digit Indian mobile number',
    }),
  businessName: z.string().min(2, 'Business name is required'),
  shopName: z.string().min(2, 'Shop name is required'),
  category: z.string().min(1, 'Primary category is required'),
  address: z.string().min(5, 'Physical address must be at least 5 characters'),
  landmark: z.string().optional(),
  city: z.string().min(2, 'City is required').default('Delhi'),
  pincode: z.string().regex(/^\d{6}$/, 'Please enter a valid 6-digit postal pincode').optional().or(z.literal('')),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  openingHours: z.string().min(3, 'Opening hours are required').default('9:30 AM - 9:00 PM'),
  photoUrl: z.string().url('Must be a valid image URL').optional().or(z.literal('')),
});

// 3. Product & Inventory Schemas
export const productCreateSchema = z.object({
  shopId: z.string().optional(),
  name: z.string().min(2, 'Product name must be at least 2 characters'),
  brand: z.string().min(1, 'Brand name is required'),
  categoryId: z.string().min(1, 'Valid category ID required'),
  subcategoryId: z.string().optional(),
  variantName: z.string().default('Standard'),
  sku: z.string().min(2, 'SKU is required'),
  barcode: z.string().optional(),
  mrp: z.number().positive('MRP must be greater than 0'),
  sellingPrice: z.number().positive('Selling price must be greater than 0'),
  stockQuantity: z.number().int().nonnegative('Stock count cannot be negative').default(10),
  stockStatus: z.enum(['in_stock', 'low_stock', 'out_of_stock', 'available_on_order']).default('in_stock'),
  imageUrl: z.string().refine(
    val => !val || val.startsWith('http://') || val.startsWith('https://') || val.startsWith('data:image/') || val.startsWith('/'),
    'Must be a valid image URL or image upload'
  ),
  description: z.string().optional(),
}).refine(data => data.sellingPrice <= data.mrp, {
  message: 'Selling price cannot exceed printed MRP',
  path: ['sellingPrice'],
});

export const priceUpdateSchema = z.object({
  productId: z.string().uuid(),
  shopId: z.string().uuid(),
  newPrice: z.number().positive('Selling rate must be greater than 0'),
  stockStatus: z.enum(['in_stock', 'low_stock', 'out_of_stock', 'available_on_order']).default('in_stock'),
  stockQuantity: z.number().int().nonnegative().optional(),
});

// 4. Bulk CSV Row Schema
export const csvProductRowSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  brand: z.string().min(1, 'Brand is required'),
  category: z.string().min(1, 'Category is required'),
  variant: z.string().default('Standard'),
  sellingprice: z.coerce.number().positive('Selling price must be greater than 0'),
  mrp: z.coerce.number().positive('MRP must be greater than 0'),
  stockcount: z.coerce.number().int().nonnegative().default(10),
  sku: z.string().optional(),
  barcode: z.string().optional(),
});

// 5. Customer Enquiry Schema
export const enquiryCreateSchema = z.object({
  shopId: z.string().uuid(),
  productId: z.string().uuid(),
  customerName: z.string().min(2, 'Name is required'),
  customerPhone: z.string().regex(/^[6-9]\d{9}$/, 'Please enter a valid 10-digit mobile number'),
  message: z.string().min(5, 'Message must be at least 5 characters long'),
});

// 6. Price Alert Schema
export const priceAlertCreateSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  targetPrice: z.number().positive('Target price must be greater than 0'),
  radiusKm: z.number().int().min(1).max(50).default(10),
  lat: z.number(),
  lng: z.number(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
});

// 7. Review Submission Schema
export const reviewCreateSchema = z.object({
  shopId: z.string().uuid(),
  productId: z.string().uuid().optional(),
  rating: z.number().int().min(1).max(5, 'Rating must be between 1 and 5 stars'),
  reviewText: z.string().min(5, 'Review must be at least 5 characters long').max(1000),
  photos: z.array(z.string().url()).default([]),
});

// 8. Dispute & Price Anomaly Report Schema
export const reportCreateSchema = z.object({
  shopId: z.string().uuid(),
  productId: z.string().uuid().optional(),
  reportType: z.enum(['wrong_price', 'wrong_stock', 'fake_shop', 'fake_product', 'incorrect_location']),
  reportedRate: z.number().positive().optional(),
  actualRate: z.number().positive().optional(),
  evidenceText: z.string().min(10, 'Please describe the discrepancy with at least 10 characters'),
  evidencePhotos: z.array(z.string().url()).default([]),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type ShopOnboardingInput = z.infer<typeof shopOnboardingSchema>;
export type ProductCreateInput = z.infer<typeof productCreateSchema>;
export type PriceUpdateInput = z.infer<typeof priceUpdateSchema>;
export type CsvProductRow = z.infer<typeof csvProductRowSchema>;
export type EnquiryCreateInput = z.infer<typeof enquiryCreateSchema>;
export type PriceAlertCreateInput = z.infer<typeof priceAlertCreateSchema>;
export type ReviewCreateInput = z.infer<typeof reviewCreateSchema>;
export type ReportCreateInput = z.infer<typeof reportCreateSchema>;

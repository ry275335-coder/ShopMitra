// ==============================================================================
// src/server/actions/review.actions.ts
// Server Actions for Verified Customer Reviews
// Strictly persists to database — zero silent localStorage fallback on DB error
// Authenticated user -> customers.id -> reviews.customer_id
// ==============================================================================

'use server';

import { dbClient } from '@/lib/supabase/db';
import { getAuthenticatedUser, createServerSupabase, createAdminSupabase } from '@/lib/supabase/server';
import { maskPiiInText } from '@/lib/utils';
import { z } from 'zod';

const submitReviewSchema = z.object({
  shopId: z.string().uuid('Valid shop ID required'),
  productId: z.string().uuid().optional().or(z.literal('')),
  rating: z.number().int().min(1).max(5, 'Rating must be between 1 and 5'),
  reviewText: z.string().min(5, 'Review must be at least 5 characters').max(1000),
  photos: z.array(z.string()).optional().default([]),
  isInStoreVerified: z.boolean().optional().default(false),
});

export type SubmitReviewInput = z.infer<typeof submitReviewSchema>;

export async function submitReviewAction(input: SubmitReviewInput) {
  const validated = submitReviewSchema.safeParse(input);
  if (!validated.success) {
    return { success: false, error: validated.error.errors[0].message };
  }

  const { shopId, productId, rating, reviewText, photos, isInStoreVerified } = validated.data;

  // 1. Authenticate user
  const user = await getAuthenticatedUser();
  if (!user?.id) {
    return { success: false, error: 'Authentication required. Please sign in to submit a review.' };
  }

  const supabase = await createServerSupabase();

  // 2. Resolve customers.id from authenticated user.id (profiles.id)
  let customerId: string | null = null;
  const { data: customer, error: custErr } = await supabase
    .from('customers')
    .select('id')
    .eq('profile_id', user.id)
    .maybeSingle();

  if (custErr) {
    return { success: false, error: `Customer lookup error: ${custErr.message}` };
  }

  if (customer?.id) {
    customerId = customer.id;
  } else {
    // Auto-create customer record if it doesn't exist yet
    const { data: createdCust, error: createCustErr } = await supabase
      .from('customers')
      .insert([{ profile_id: user.id, preferred_language: 'en' }])
      .select('id')
      .single();

    if (createCustErr || !createdCust?.id) {
      // Admin fallback if service role is available
      try {
        const admin = createAdminSupabase();
        const { data: adminCust } = await admin
          .from('customers')
          .upsert([{ profile_id: user.id, preferred_language: 'en' }], { onConflict: 'profile_id' })
          .select('id')
          .single();
        if (adminCust?.id) {
          customerId = adminCust.id;
        }
      } catch {}

      if (!customerId) {
        return { 
          success: false, 
          error: `Failed to resolve customer record: ${createCustErr?.message || 'Unknown database error'}` 
        };
      }
    } else {
      customerId = createdCust.id;
    }
  }

  // 3. Persist review into Supabase reviews table (masking any PII in review text)
  const insertPayload = {
    customer_id: customerId,
    shop_id: shopId,
    product_id: productId && productId.length > 0 ? productId : null,
    rating,
    review_text: maskPiiInText(reviewText),
    photos: photos || [],
    is_verified_interaction: Boolean(isInStoreVerified),
    status: 'resolved' as const, // 'resolved' makes it visible under RLS policy
  };

  const { data, error } = await supabase
    .from('reviews')
    .insert([insertPayload])
    .select()
    .single();

  // STRICT REQUIREMENT: Do NOT report success if DB insert fails.
  // Do NOT silently fall back to localStorage after a failed DB write.
  if (error) {
    console.error('submitReviewAction DB error:', error);
    return { success: false, error: `Failed to save review to database: ${error.message}` };
  }

  return {
    success: true,
    reviewId: data?.id,
    message: '🌟 Your verified review has been recorded successfully!',
    data,
  };
}

export async function getShopReviewsAction(shopId: string) {
  try {
    const { data, error } = await dbClient
      .from('reviews')
      .select(`
        id, customer_id, shop_id, product_id, rating, review_text, photos,
        is_verified_interaction, status, created_at
      `)
      .eq('shop_id', shopId)
      .eq('status', 'resolved')
      .order('created_at', { ascending: false });

    if (error) {
      return { success: false, error: error.message, reviews: [] };
    }

    const sanitizedReviews = (data || []).map(r => ({
      ...r,
      review_text: maskPiiInText(r.review_text),
    }));

    return { success: true, reviews: sanitizedReviews };
  } catch (err: any) {
    return { success: false, error: err.message, reviews: [] };
  }
}

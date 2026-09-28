// ==============================================================================
// src/server/actions/wishlist.actions.ts
// Server Actions for DB-Backed Customer Wishlists
// Strictly enforces isolation: Customer A cannot access Customer B wishlist
// Identity derived strictly from getAuthenticatedUser()
// ==============================================================================

'use server';

import { dbClient } from '@/lib/supabase/db';
import { getAuthenticatedUser } from '@/lib/supabase/server';

/**
 * Resolves or initializes the customer record and default wishlist for authenticated user.
 */
async function resolveCustomerWishlist(userId: string): Promise<{ wishlistId?: string; error?: string }> {
  try {
    // 1. Resolve customer record
    let { data: customer, error: custErr } = await dbClient
      .from('customers')
      .select('id')
      .eq('profile_id', userId)
      .maybeSingle();

    if (custErr) {
      return { error: custErr.message };
    }

    let customerId = customer?.id;
    if (!customerId) {
      const { data: newCust, error: createCustErr } = await dbClient
        .from('customers')
        .insert([{ profile_id: userId, preferred_language: 'en' }])
        .select('id')
        .single();

      if (createCustErr || !newCust?.id) {
        return { error: createCustErr?.message || 'Failed to initialize customer account' };
      }
      customerId = newCust.id;
    }

    // 2. Resolve default wishlist for this customer
    const { data: existingWishlist, error: wlErr } = await dbClient
      .from('wishlists')
      .select('id')
      .eq('customer_id', customerId)
      .maybeSingle();

    if (wlErr) {
      return { error: wlErr.message };
    }

    if (existingWishlist?.id) {
      return { wishlistId: existingWishlist.id };
    }

    // Create default wishlist for this customer
    const { data: newWishlist, error: createWlErr } = await dbClient
      .from('wishlists')
      .insert([{ customer_id: customerId, name: 'My Saved Items' }])
      .select('id')
      .single();

    if (createWlErr || !newWishlist?.id) {
      return { error: createWlErr?.message || 'Failed to initialize customer wishlist' };
    }

    return { wishlistId: newWishlist.id };
  } catch (err: any) {
    return { error: err.message || 'Error resolving customer wishlist' };
  }
}

/**
 * Fetch wishlist product IDs for the authenticated customer
 */
export async function getWishlistAction(): Promise<{ success: boolean; items: string[]; error?: string }> {
  try {
    const user = await getAuthenticatedUser();
    if (!user?.id) {
      return { success: false, items: [], error: 'Not authenticated' };
    }

    const { wishlistId, error } = await resolveCustomerWishlist(user.id);
    if (error || !wishlistId) {
      return { success: false, items: [], error };
    }

    const { data, error: itemsErr } = await dbClient
      .from('wishlist_items')
      .select('product_id')
      .eq('wishlist_id', wishlistId);

    if (itemsErr) {
      return { success: false, items: [], error: itemsErr.message };
    }

    const productIds = (data || [])
      .map(item => item.product_id)
      .filter((id): id is string => Boolean(id));

    return { success: true, items: productIds };
  } catch (err: any) {
    return { success: false, items: [], error: err.message };
  }
}

/**
 * Toggle product in customer wishlist (inserts or deletes in wishlist_items)
 */
export async function toggleWishlistAction(
  productId: string, 
  shopId?: string
): Promise<{ success: boolean; action?: 'added' | 'removed'; error?: string }> {
  try {
    const user = await getAuthenticatedUser();
    if (!user?.id) {
      return { success: false, error: 'Sign in to synchronize your wishlist across devices' };
    }

    if (!productId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(productId)) {
      return { success: false, error: 'Valid product UUID is required' };
    }

    const { wishlistId, error } = await resolveCustomerWishlist(user.id);
    if (error || !wishlistId) {
      return { success: false, error };
    }

    // Check if product is already in the customer's wishlist
    const { data: existing, error: findErr } = await dbClient
      .from('wishlist_items')
      .select('id')
      .eq('wishlist_id', wishlistId)
      .eq('product_id', productId)
      .maybeSingle();

    if (findErr) {
      return { success: false, error: findErr.message };
    }

    if (existing?.id) {
      // Remove item
      const { error: delErr } = await dbClient
        .from('wishlist_items')
        .delete()
        .eq('id', existing.id);

      if (delErr) {
        return { success: false, error: delErr.message };
      }

      return { success: true, action: 'removed' };
    } else {
      // Add item
      const { error: insErr } = await dbClient
        .from('wishlist_items')
        .insert([{
          wishlist_id: wishlistId,
          product_id: productId,
          shop_id: (shopId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(shopId)) ? shopId : null,
        }]);

      if (insErr) {
        return { success: false, error: insErr.message };
      }

      return { success: true, action: 'added' };
    }
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

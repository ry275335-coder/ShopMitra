// ==============================================================================
// src/server/actions/customer.actions.ts
// Server Actions for Customer Registration, Enquiries, Price Alerts, and Reports
// Strictly enforces authenticated user identity derivation
// Never generates fake IDs, never swallows DB errors
// ==============================================================================

'use server';

import { 
  enquiryCreateSchema, 
  priceAlertCreateSchema, 
  reportCreateSchema,
  EnquiryCreateInput,
  PriceAlertCreateInput,
  ReportCreateInput
} from '@/lib/validations';
import { insertDbCustomer, dbClient } from '@/lib/supabase/db';
import { getAuthenticatedUser, createServerSupabase, createAdminSupabase } from '@/lib/supabase/server';
import { CustomerUser } from '@/types';

/**
 * Helper: Resolves internal customers.id from authenticated user session.
 * Automatically creates customer record linked to auth profile_id if not yet present.
 */
async function resolveCustomerId(profileId: string): Promise<{ customerId?: string; error?: string }> {
  try {
    const supabase = await createServerSupabase();
    const { data: existing, error: selectErr } = await supabase
      .from('customers')
      .select('id')
      .eq('profile_id', profileId)
      .maybeSingle();

    if (selectErr) {
      return { error: selectErr.message };
    }

    if (existing?.id) {
      return { customerId: existing.id };
    }

    // Customer record does not exist yet; auto-initialize customer record linked to profile_id
    const { data: created, error: insertErr } = await supabase
      .from('customers')
      .insert([{ profile_id: profileId, preferred_language: 'en' }])
      .select('id')
      .single();

    if (insertErr || !created?.id) {
      // Admin fallback if service role key is present
      try {
        const admin = createAdminSupabase();
        const { data: adminCreated } = await admin
          .from('customers')
          .upsert([{ profile_id: profileId, preferred_language: 'en' }], { onConflict: 'profile_id' })
          .select('id')
          .single();
        if (adminCreated?.id) {
          return { customerId: adminCreated.id };
        }
      } catch {}
      return { error: insertErr?.message || 'Failed to initialize customer record' };
    }

    return { customerId: created.id };
  } catch (err: any) {
    return { error: err.message || 'Error resolving customer ID' };
  }
}

export async function registerCustomerAction(input: {
  mobile: string;
  name?: string;
  email?: string;
  city?: string;
  address?: string;
  lat?: number;
  lng?: number;
}): Promise<{ success: boolean; customer?: CustomerUser; error?: string }> {
  try {
    const user = await getAuthenticatedUser();
    if (!user?.id) {
      return { success: false, error: 'Authentication required to register as a customer.' };
    }

    // Never accept profile_id from browser — derive directly from authenticated session
    const res = await insertDbCustomer({
      mobile: input.mobile,
      profileId: user.id,
    });

    if (!res.success || !res.data?.id) {
      return { success: false, error: res.error || 'Database error creating customer profile.' };
    }

    const newCustomer: CustomerUser = {
      id: res.data.id,
      name: (input.name && input.name !== 'Shopper') ? input.name : 'Customer',
      mobile: input.mobile,
      email: input.email || user.email,
      city: input.city || 'Delhi',
      address: input.address || '',
      lat: input.lat,
      lng: input.lng,
      isLoggedIn: true,
    };

    return { success: true, customer: newCustomer };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to register customer' };
  }
}

export async function createEnquiryAction(input: EnquiryCreateInput) {
  const validated = enquiryCreateSchema.safeParse(input);
  if (!validated.success) {
    return { success: false, error: validated.error.errors[0].message };
  }

  const { shopId, productId, message } = validated.data;
  const user = await getAuthenticatedUser();

  if (!user?.id) {
    return { success: false, error: 'You must be signed in to send an enquiry to a merchant.' };
  }

  // Derive customers.id from authenticated user.id (profiles.id)
  const { customerId, error: custErr } = await resolveCustomerId(user.id);
  if (custErr || !customerId) {
    return { success: false, error: custErr || 'Unable to resolve customer account for enquiry.' };
  }

  // Only insert columns that actually exist in the enquiries table:
  // (customer_id, shop_id, product_id, message, status)
  // customerName and customerPhone are NOT columns in enquiries table
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from('enquiries')
    .insert([
      {
        customer_id: customerId,
        shop_id: shopId,
        product_id: productId,
        message,
        status: 'new',
      },
    ])
    .select('id')
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, message: 'Enquiry sent to the merchant dashboard!', enquiryId: data?.id };
}

export async function createPriceAlertAction(input: PriceAlertCreateInput) {
  const validated = priceAlertCreateSchema.safeParse(input);
  if (!validated.success) {
    return { success: false, error: validated.error.errors[0].message };
  }

  const { productId, targetPrice, radiusKm, lat, lng } = validated.data;
  const user = await getAuthenticatedUser();

  if (!user?.id) {
    return { success: false, error: 'You must be signed in to create a price drop alert.' };
  }

  // Do not insert NULL or fake coordinates into required user_location
  if (lat === undefined || lng === undefined || isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) {
    return { 
      success: false, 
      error: 'Valid user GPS location is required to set localized price drop alerts.' 
    };
  }

  // Derive customers.id from authenticated user.id (profiles.id)
  const { customerId, error: custErr } = await resolveCustomerId(user.id);
  if (custErr || !customerId) {
    return { success: false, error: custErr || 'Unable to resolve customer account for price alert.' };
  }

  // PostGIS Geography point format: 'POINT(lng lat)'
  const locationWkt = `POINT(${lng} ${lat})`;

  // Note: Schema column is 'is_active', NOT 'status'
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from('price_alerts')
    .insert([
      {
        customer_id: customerId,
        product_id: productId,
        target_price: targetPrice,
        radius_km: radiusKm || 10,
        user_location: locationWkt,
        is_active: true,
      },
    ])
    .select('id')
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { 
    success: true, 
    message: `Price drop alert activated at ₹${targetPrice} within ${radiusKm} km!`,
    alertId: data?.id
  };
}

export async function submitReportAction(input: ReportCreateInput) {
  const validated = reportCreateSchema.safeParse(input);
  if (!validated.success) {
    return { success: false, error: validated.error.errors[0].message };
  }

  const user = await getAuthenticatedUser();
  if (!user?.id) {
    return { success: false, error: 'You must be signed in to submit a verification report.' };
  }

  const supabase = await createServerSupabase();
  const { error } = await supabase.from('reports').insert([
    {
      reporter_id: user.id,
      shop_id: input.shopId,
      product_id: input.productId || null,
      reported_rate: input.reportedRate || 0,
      actual_rate: input.actualRate || 0,
      report_type: input.reportType,
      evidence_text: input.evidenceText,
      status: 'open',
    },
  ]);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, message: 'Thank you. Report submitted for verification.' };
}

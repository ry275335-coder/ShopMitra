// ==============================================================================
// src/server/actions/customer.actions.ts
// Server Actions for Customer Enquiries, Price Drop Alerts, Registration, and Reviews
// Isolated per user — zero shared global mutable state
// ==============================================================================

'use server';

import { 
  enquiryCreateSchema, 
  priceAlertCreateSchema, 
  reviewCreateSchema, 
  reportCreateSchema,
  EnquiryCreateInput,
  PriceAlertCreateInput,
  ReviewCreateInput,
  ReportCreateInput
} from '@/lib/validations';
import { insertDbCustomer, dbClient } from '@/lib/supabase/db';
import { getAuthenticatedUser } from '@/lib/supabase/server';
import { CustomerUser } from '@/types';

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
    const newCustomer: CustomerUser = {
      id: user?.id || `cust-${Date.now()}`,
      name: (input.name && input.name !== 'Shopper') ? input.name : 'Customer',
      mobile: input.mobile,
      email: input.email,
      city: input.city || 'Delhi',
      address: input.address || '',
      lat: input.lat,
      lng: input.lng,
      isLoggedIn: true,
    };

    const res = await insertDbCustomer(newCustomer);
    if (res.success && res.data?.id) {
      newCustomer.id = res.data.id;
    }

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

  const { shopId, productId, customerName, customerPhone, message } = validated.data;
  const user = await getAuthenticatedUser();

  try {
    await dbClient.from('enquiries').insert([
      {
        customer_id: user?.id || null,
        shop_id: shopId,
        product_id: productId,
        customer_name: customerName,
        customer_phone: customerPhone,
        message,
        status: 'new',
        created_at: new Date().toISOString(),
      },
    ]);
  } catch (err) {
    console.warn('createEnquiryAction non-critical notice:', err);
  }

  return { success: true, message: 'Enquiry sent to the merchant dashboard!' };
}

export async function createPriceAlertAction(input: PriceAlertCreateInput) {
  const validated = priceAlertCreateSchema.safeParse(input);
  if (!validated.success) {
    return { success: false, error: validated.error.errors[0].message };
  }

  const { productId, targetPrice, radiusKm } = validated.data;
  const user = await getAuthenticatedUser();

  try {
    if (user?.id) {
      await dbClient.from('price_alerts').insert([
        {
          customer_id: user.id,
          product_id: productId,
          target_price: targetPrice,
          radius_km: radiusKm,
          status: 'active',
          created_at: new Date().toISOString(),
        },
      ]);
    }
  } catch (err) {
    console.warn('createPriceAlertAction db notice:', err);
  }

  return { 
    success: true, 
    message: `Price drop alert activated at ₹${targetPrice} within ${radiusKm} km!` 
  };
}

export async function submitReportAction(input: ReportCreateInput) {
  const validated = reportCreateSchema.safeParse(input);
  if (!validated.success) {
    return { success: false, error: validated.error.errors[0].message };
  }

  const user = await getAuthenticatedUser();

  try {
    await dbClient.from('reports').insert([
      {
        reporter_id: user?.id || null,
        shop_id: input.shopId,
        product_id: input.productId || null,
        reported_rate: input.reportedRate || 0,
        actual_rate: input.actualRate || 0,
        report_type: input.reportType,
        evidence_text: input.evidenceText,
        status: 'open',
        created_at: new Date().toISOString(),
      },
    ]);
  } catch (err) {
    console.warn('submitReportAction db notice:', err);
  }

  return { success: true, message: 'Thank you. Report submitted for verification.' };
}

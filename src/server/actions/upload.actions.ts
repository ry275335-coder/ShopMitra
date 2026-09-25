// ==============================================================================
// src/server/actions/upload.actions.ts
// Server-side High Reliability Storage Upload Actions (Zero RLS 403 Errors)
// ==============================================================================

'use server';

import { createAdminSupabase } from '@/lib/supabase/server';

export async function uploadShopImageAction(formData: FormData): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const file = formData.get('file') as File | null;
    if (!file) {
      return { success: false, error: 'No file provided' };
    }

    const adminSupabase = createAdminSupabase();
    const fileExt = file.name.split('.').pop() || 'jpg';
    const filePath = `storefronts/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await adminSupabase.storage
      .from('shop-images')
      .upload(filePath, buffer, {
        contentType: file.type || 'image/jpeg',
        upsert: true,
      });

    if (uploadError) {
      console.error('uploadShopImageAction error:', uploadError.message);
      return { success: false, error: uploadError.message };
    }

    const { data: urlData } = adminSupabase.storage
      .from('shop-images')
      .getPublicUrl(filePath);

    return { success: true, url: urlData.publicUrl };
  } catch (err: any) {
    console.error('uploadShopImageAction exception:', err);
    return { success: false, error: err.message || 'Upload failed' };
  }
}

export async function uploadProductImageAction(formData: FormData): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const file = formData.get('file') as File | null;
    if (!file) {
      return { success: false, error: 'No file provided' };
    }

    const adminSupabase = createAdminSupabase();
    const fileExt = file.name.split('.').pop() || 'jpg';
    const filePath = `catalog/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await adminSupabase.storage
      .from('product-images')
      .upload(filePath, buffer, {
        contentType: file.type || 'image/jpeg',
        upsert: true,
      });

    if (uploadError) {
      console.error('uploadProductImageAction error:', uploadError.message);
      return { success: false, error: uploadError.message };
    }

    const { data: urlData } = adminSupabase.storage
      .from('product-images')
      .getPublicUrl(filePath);

    return { success: true, url: urlData.publicUrl };
  } catch (err: any) {
    console.error('uploadProductImageAction exception:', err);
    return { success: false, error: err.message || 'Upload failed' };
  }
}

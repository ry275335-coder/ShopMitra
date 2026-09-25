// ==============================================================================
// src/server/actions/upload.actions.ts
// Production Secure Storage Upload Actions with Strict Auth, MIME, Size & Magic Byte Checks
// ==============================================================================

'use server';

import { createAdminSupabase, getAuthenticatedUser } from '@/lib/supabase/server';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];

interface ValidationResult {
  valid: boolean;
  error?: string;
  sanitizedExt?: string;
  mimeType?: string;
}

/**
 * Validates file size, extension, MIME type, and binary header magic bytes.
 */
function validateImageFile(file: File, buffer: Buffer): ValidationResult {
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: 'File size exceeds maximum allowed limit of 5MB.' };
  }

  if (file.size < 100) {
    return { valid: false, error: 'Invalid file: payload is too small or corrupt.' };
  }

  const rawExt = file.name.split('.').pop()?.toLowerCase() || '';
  if (!ALLOWED_EXTENSIONS.includes(rawExt)) {
    return { valid: false, error: 'Unsupported file extension. Only JPG, PNG, and WebP are allowed.' };
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return { valid: false, error: 'Invalid file type header. Only JPEG, PNG, and WebP images are accepted.' };
  }

  // Validate magic bytes to prevent malicious executables masquerading as images
  const isJpeg = buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  const isPng = buffer.length > 8 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
  const isWebp = buffer.length > 12 &&
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 && // 'RIFF'
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50; // 'WEBP'

  if (!isJpeg && !isPng && !isWebp) {
    return { valid: false, error: 'File content does not match genuine image data.' };
  }

  const sanitizedExt = isJpeg ? 'jpg' : isPng ? 'png' : 'webp';
  const mimeType = isJpeg ? 'image/jpeg' : isPng ? 'image/png' : 'image/webp';

  return { valid: true, sanitizedExt, mimeType };
}

/**
 * Upload storefront / shop banner photo
 * Tenant isolated path: {userId}/storefronts/{timestamp}-{rand}.ext
 */
export async function uploadShopImageAction(
  formData: FormData
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    // 1. Authenticate caller
    const user = await getAuthenticatedUser();
    if (!user?.id) {
      return { success: false, error: 'Authentication required: please sign in to upload images.' };
    }

    const file = formData.get('file') as File | null;
    if (!file || typeof file === 'string') {
      return { success: false, error: 'No file provided.' };
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 2. Validate MIME, size, and magic bytes
    const validation = validateImageFile(file, buffer);
    if (!validation.valid || !validation.sanitizedExt) {
      return { success: false, error: validation.error || 'Invalid image file.' };
    }

    // 3. Strict tenant path isolation under authenticated user's ID
    const randomSuffix = Math.random().toString(36).substring(2, 9);
    const filePath = `${user.id}/storefronts/${Date.now()}-${randomSuffix}.${validation.sanitizedExt}`;

    const adminSupabase = createAdminSupabase();
    const { error: uploadError } = await adminSupabase.storage
      .from('shop-images')
      .upload(filePath, buffer, {
        contentType: validation.mimeType,
        upsert: false,
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
    return { success: false, error: err.message || 'Upload failed.' };
  }
}

/**
 * Upload product catalog photo
 * Tenant isolated path: {userId}/catalog/{timestamp}-{rand}.ext
 */
export async function uploadProductImageAction(
  formData: FormData
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    // 1. Authenticate caller
    const user = await getAuthenticatedUser();
    if (!user?.id) {
      return { success: false, error: 'Authentication required: please sign in to upload product images.' };
    }

    // 2. Authorization check: must be a registered merchant or admin
    const adminSupabase = createAdminSupabase();
    const { data: merchantRecord } = await adminSupabase
      .from('merchants')
      .select('id')
      .eq('profile_id', user.id)
      .maybeSingle();

    let isAuthorized = Boolean(merchantRecord?.id);
    if (!isAuthorized) {
      const { data: adminRecord } = await adminSupabase
        .from('admin_users')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();
      if (adminRecord?.id) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return { 
        success: false, 
        error: 'Permission denied: only registered merchants and administrators can upload product images.' 
      };
    }

    const file = formData.get('file') as File | null;
    if (!file || typeof file === 'string') {
      return { success: false, error: 'No file provided.' };
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 3. Validate MIME, size, and magic bytes
    const validation = validateImageFile(file, buffer);
    if (!validation.valid || !validation.sanitizedExt) {
      return { success: false, error: validation.error || 'Invalid image file.' };
    }

    // 4. Strict tenant path isolation under authenticated user's ID
    const randomSuffix = Math.random().toString(36).substring(2, 9);
    const filePath = `${user.id}/catalog/${Date.now()}-${randomSuffix}.${validation.sanitizedExt}`;

    const { error: uploadError } = await adminSupabase.storage
      .from('product-images')
      .upload(filePath, buffer, {
        contentType: validation.mimeType,
        upsert: false,
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
    return { success: false, error: err.message || 'Upload failed.' };
  }
}

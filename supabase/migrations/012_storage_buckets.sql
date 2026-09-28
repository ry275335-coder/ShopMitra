-- ==============================================================================
-- MIGRATION 012: Storage Buckets Configuration & Security Policies
-- Buckets: product-images, shop-images
-- Constraints: JPEG, PNG, WebP only; Max 5MB (5242880 bytes)
-- Security: Public read; Authenticated merchant/admin uploads with ownership checks
-- ==============================================================================

-- 1. Create or update storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    (
        'product-images',
        'product-images',
        true,
        5242880,
        ARRAY['image/jpeg', 'image/png', 'image/webp']
    ),
    (
        'shop-images',
        'shop-images',
        true,
        5242880,
        ARRAY['image/jpeg', 'image/png', 'image/webp']
    )
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- 2. Storage Policies for shop-images
DROP POLICY IF EXISTS "Public can view shop images" ON storage.objects;
CREATE POLICY "Public can view shop images"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'shop-images');

DROP POLICY IF EXISTS "Authenticated users can upload shop images" ON storage.objects;
CREATE POLICY "Authenticated users can upload shop images"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'shop-images'
        AND (auth.uid() IS NOT NULL)
    );

DROP POLICY IF EXISTS "Users can update own shop images" ON storage.objects;
CREATE POLICY "Users can update own shop images"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'shop-images'
        AND (auth.uid() = owner OR (storage.foldername(name))[1] = auth.uid()::text OR public.is_admin_user())
    );

DROP POLICY IF EXISTS "Users can delete own shop images" ON storage.objects;
CREATE POLICY "Users can delete own shop images"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'shop-images'
        AND (auth.uid() = owner OR (storage.foldername(name))[1] = auth.uid()::text OR public.is_admin_user())
    );

-- 3. Storage Policies for product-images
DROP POLICY IF EXISTS "Public can view product images" ON storage.objects;
CREATE POLICY "Public can view product images"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Admins and merchants can upload product images" ON storage.objects;
CREATE POLICY "Admins and merchants can upload product images"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'product-images'
        AND (
            public.is_admin_user() 
            OR EXISTS (SELECT 1 FROM public.merchants WHERE profile_id = auth.uid())
        )
    );

DROP POLICY IF EXISTS "Admins can update product images" ON storage.objects;
CREATE POLICY "Admins can update product images"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'product-images'
        AND (auth.uid() = owner OR public.is_admin_user())
    );

DROP POLICY IF EXISTS "Admins can delete product images" ON storage.objects;
CREATE POLICY "Admins can delete product images"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'product-images'
        AND (auth.uid() = owner OR public.is_admin_user())
    );

-- ==============================================================================
-- MIGRATION 016: Storage Bucket Security & Access Lockdown (Phase 5)
-- ==============================================================================
-- Description:
--   Hardens Supabase Storage buckets ('shop-images', 'product-images', 'review-images')
--   Enforces strict tenant path isolation: files must reside under {auth.uid()}/...
--   Restricts upload permissions to authenticated owners and administrators.
--   Enforces MIME type limits (JPEG, PNG, WebP) and 5MB size ceiling.
--   Prohibits cross-tenant overwriting or deletion of assets.
-- ==============================================================================

-- 1. Create or update buckets with strict constraints
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    (
        'shop-images',
        'shop-images',
        true,
        5242880,
        ARRAY['image/jpeg', 'image/png', 'image/webp']
    ),
    (
        'product-images',
        'product-images',
        true,
        5242880,
        ARRAY['image/jpeg', 'image/png', 'image/webp']
    ),
    (
        'review-images',
        'review-images',
        true,
        5242880,
        ARRAY['image/jpeg', 'image/png', 'image/webp']
    )
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- 2. Drop legacy storage policies
DROP POLICY IF EXISTS "Public can view shop images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload shop images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own shop images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own shop images" ON storage.objects;

DROP POLICY IF EXISTS "Public can view product images" ON storage.objects;
DROP POLICY IF EXISTS "Admins and merchants can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update product images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete product images" ON storage.objects;

DROP POLICY IF EXISTS "Shop images select public" ON storage.objects;
DROP POLICY IF EXISTS "Shop images insert tenant isolated" ON storage.objects;
DROP POLICY IF EXISTS "Shop images update tenant isolated" ON storage.objects;
DROP POLICY IF EXISTS "Shop images delete tenant isolated" ON storage.objects;

DROP POLICY IF EXISTS "Product images select public" ON storage.objects;
DROP POLICY IF EXISTS "Product images insert tenant isolated" ON storage.objects;
DROP POLICY IF EXISTS "Product images update tenant isolated" ON storage.objects;
DROP POLICY IF EXISTS "Product images delete tenant isolated" ON storage.objects;

DROP POLICY IF EXISTS "Review images select public" ON storage.objects;
DROP POLICY IF EXISTS "Review images insert tenant isolated" ON storage.objects;
DROP POLICY IF EXISTS "Review images update tenant isolated" ON storage.objects;
DROP POLICY IF EXISTS "Review images delete tenant isolated" ON storage.objects;

-- 3. Public Read Access for active marketplace media
CREATE POLICY "Shop images select public"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'shop-images');

CREATE POLICY "Product images select public"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'product-images');

CREATE POLICY "Review images select public"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'review-images');

-- 4. Shop Images Insert: Authenticated user into their own tenant folder or admin
CREATE POLICY "Shop images insert tenant isolated"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'shop-images'
        AND (
            (storage.foldername(name))[1] = auth.uid()::text
            OR public.is_admin_user()
            OR public.is_admin()
        )
    );

-- 5. Product Images Insert: Authenticated merchant or admin into own tenant folder
CREATE POLICY "Product images insert tenant isolated"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'product-images'
        AND (
            (
                (storage.foldername(name))[1] = auth.uid()::text
                AND EXISTS (SELECT 1 FROM public.merchants WHERE profile_id = auth.uid())
            )
            OR public.is_admin_user()
            OR public.is_admin()
        )
    );

-- 6. Review Images Insert: Authenticated user into own tenant folder or admin
CREATE POLICY "Review images insert tenant isolated"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'review-images'
        AND (
            (storage.foldername(name))[1] = auth.uid()::text
            OR public.is_admin_user()
            OR public.is_admin()
        )
    );

-- 7. Update Policies: Only file creator (folder matches uid or owner) or admin
CREATE POLICY "Shop images update tenant isolated"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'shop-images'
        AND (
            (storage.foldername(name))[1] = auth.uid()::text
            OR auth.uid() = owner
            OR public.is_admin_user()
            OR public.is_admin()
        )
    );

CREATE POLICY "Product images update tenant isolated"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'product-images'
        AND (
            (storage.foldername(name))[1] = auth.uid()::text
            OR auth.uid() = owner
            OR public.is_admin_user()
            OR public.is_admin()
        )
    );

CREATE POLICY "Review images update tenant isolated"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'review-images'
        AND (
            (storage.foldername(name))[1] = auth.uid()::text
            OR auth.uid() = owner
            OR public.is_admin_user()
            OR public.is_admin()
        )
    );

-- 8. Delete Policies: Only file creator (folder matches uid or owner) or admin
CREATE POLICY "Shop images delete tenant isolated"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'shop-images'
        AND (
            (storage.foldername(name))[1] = auth.uid()::text
            OR auth.uid() = owner
            OR public.is_admin_user()
            OR public.is_admin()
        )
    );

CREATE POLICY "Product images delete tenant isolated"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'product-images'
        AND (
            (storage.foldername(name))[1] = auth.uid()::text
            OR auth.uid() = owner
            OR public.is_admin_user()
            OR public.is_admin()
        )
    );

CREATE POLICY "Review images delete tenant isolated"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'review-images'
        AND (
            (storage.foldername(name))[1] = auth.uid()::text
            OR auth.uid() = owner
            OR public.is_admin_user()
            OR public.is_admin()
        )
    );

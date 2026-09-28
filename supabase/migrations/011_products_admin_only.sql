-- ==============================================================================
-- MIGRATION 011: Master Products Admin-Only Mutation Policies
-- Only authorized admins (verified via admin_users table) may insert/update/delete.
-- Merchants and shoppers may read products, but merchants cannot mutate global products.
-- Do not trust frontend role or JWT user_metadata.
-- ==============================================================================

-- Ensure RLS is active on products
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Drop legacy broad/lenient policies
DROP POLICY IF EXISTS "Products manageable by admin only" ON public.products;
DROP POLICY IF EXISTS "Products viewable by public" ON public.products;
DROP POLICY IF EXISTS "Admins can insert products" ON public.products;
DROP POLICY IF EXISTS "Admins can update products" ON public.products;
DROP POLICY IF EXISTS "Admins can delete products" ON public.products;

-- 1. SELECT: Public and shoppers can view active products; admins can view all products
CREATE POLICY "Products viewable by public"
    ON public.products FOR SELECT
    USING (is_active = true OR public.is_admin_user());

-- 2. INSERT: Strictly restricted to active admin users in admin_users table
CREATE POLICY "Admins can insert products"
    ON public.products FOR INSERT
    WITH CHECK (public.is_admin_user());

-- 3. UPDATE: Strictly restricted to active admin users in admin_users table
CREATE POLICY "Admins can update products"
    ON public.products FOR UPDATE
    USING (public.is_admin_user())
    WITH CHECK (public.is_admin_user());

-- 4. DELETE: Strictly restricted to active admin users in admin_users table
CREATE POLICY "Admins can delete products"
    ON public.products FOR DELETE
    USING (public.is_admin_user());

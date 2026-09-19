-- ==============================================================================
-- 008_performance_indexes.sql
-- Performance Optimization: Missing Foreign Key & Filter Indexes,
-- Optimized Helper Functions, and Fast-Path RLS Policies
-- ==============================================================================

SET search_path TO public;

-- ------------------------------------------------------------------------------
-- 1. High-Impact Foreign Key & Filtering Secondary Indexes
-- ------------------------------------------------------------------------------

-- Foreign Key from shops to businesses (used in every merchant shop lookup & owns_shop join)
CREATE INDEX IF NOT EXISTS idx_shops_business_id 
    ON public.shops(business_id);

-- Filter index for active shops on customer storefront
CREATE INDEX IF NOT EXISTS idx_shops_is_active 
    ON public.shops(is_active);

-- Foreign Key from businesses to merchants (used in merchant hierarchy & owns_shop join)
CREATE INDEX IF NOT EXISTS idx_businesses_merchant_id 
    ON public.businesses(merchant_id);

-- Foreign Key from merchants to auth profile (used in auth resolution: m.profile_id = auth.uid())
CREATE INDEX IF NOT EXISTS idx_merchants_profile_id 
    ON public.merchants(profile_id);

-- Foreign Key from customers to auth profile
CREATE INDEX IF NOT EXISTS idx_customers_profile_id 
    ON public.customers(profile_id);

-- Filter index for products by category (used in category horizontal filter tabs)
CREATE INDEX IF NOT EXISTS idx_products_category_id 
    ON public.products(category_id);

-- Filter index for active products
CREATE INDEX IF NOT EXISTS idx_products_is_active 
    ON public.products(is_active);

-- Composite index for product rate lookups (filtering active inventory for a specific product)
CREATE INDEX IF NOT EXISTS idx_shop_products_prod_status 
    ON public.shop_products(product_id, status);

-- Composite index for merchant shop inventory lookups
CREATE INDEX IF NOT EXISTS idx_shop_products_shop_status 
    ON public.shop_products(shop_id, status);


-- ------------------------------------------------------------------------------
-- 2. Optimized Helper Functions with Immediate NULL Auth Early-Exits
-- ------------------------------------------------------------------------------

-- Optimize is_admin() with STABLE classification, immediate NULL early exit,
-- primary check against dedicated admin_users table (migration 007), and
-- backward-compatible fallback to profiles (migration 006).
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
DECLARE
    current_uid UUID;
BEGIN
    current_uid := auth.uid();
    IF current_uid IS NULL THEN
        RETURN false;
    END IF;

    -- 1. Primary Check: Dedicated admin_users table (migration 007)
    IF EXISTS (
        SELECT 1 FROM public.admin_users 
        WHERE user_id = current_uid 
          AND admin_role IN ('super_admin', 'admin', 'moderator')
          AND status = 'active'
    ) THEN
        RETURN true;
    END IF;

    -- 2. Fallback Check: profiles table (migration 006)
    RETURN EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = current_uid 
          AND role IN ('super_admin', 'admin', 'moderator')
          AND (status = 'active' OR (status IS NULL AND is_active = true))
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp;

-- Optimize owns_shop() with STABLE classification & immediate NULL check
CREATE OR REPLACE FUNCTION public.owns_shop(p_shop_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    current_uid UUID;
BEGIN
    current_uid := auth.uid();
    IF current_uid IS NULL THEN
        RETURN false;
    END IF;

    RETURN EXISTS (
        SELECT 1 FROM public.shops s
        JOIN public.businesses b ON s.business_id = b.id
        JOIN public.merchants m ON b.merchant_id = m.id
        WHERE s.id = p_shop_id AND m.profile_id = current_uid
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp;


-- ------------------------------------------------------------------------------
-- 3. Fast-Path Public vs Authenticated RLS Policies
-- ------------------------------------------------------------------------------

-- 3A. shop_products: Fast-path for public shoppers (index scan on status = 'active')
DROP POLICY IF EXISTS "Shop products viewable by public" ON public.shop_products;
DROP POLICY IF EXISTS "Public read active shop products" ON public.shop_products;
CREATE POLICY "Public read active shop products"
    ON public.shop_products FOR SELECT
    USING (status = 'active');

DROP POLICY IF EXISTS "Merchants and admins view own shop products" ON public.shop_products;
CREATE POLICY "Merchants and admins view own shop products"
    ON public.shop_products FOR SELECT
    USING (
        auth.uid() IS NOT NULL AND (public.is_admin() OR public.owns_shop(shop_id))
    );

-- 3B. shops: Fast-path for public shoppers (index scan on is_active = true)
DROP POLICY IF EXISTS "Active shops are viewable by public" ON public.shops;
DROP POLICY IF EXISTS "Public read active shops" ON public.shops;
CREATE POLICY "Public read active shops"
    ON public.shops FOR SELECT
    USING (is_active = true);

DROP POLICY IF EXISTS "Merchants and admins view own shops" ON public.shops;
CREATE POLICY "Merchants and admins view own shops"
    ON public.shops FOR SELECT
    USING (
        auth.uid() IS NOT NULL AND (public.is_admin() OR public.owns_shop(id))
    );

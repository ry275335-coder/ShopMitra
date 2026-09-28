-- ==============================================================================
-- MIGRATION 013: RLS Policy Review & Hardening
-- Ensures zero reliance on auth.jwt()->user_metadata->role
-- Standardizes authorization using trusted database-backed tables:
--   1. admin_users (via public.is_admin_user())
--   2. merchant ownership (merchants.profile_id = auth.uid())
--   3. customer ownership (customers.profile_id = auth.uid())
-- Prevents cross-customer wishlist/alert/enquiry access
-- Keeps RLS enabled on all sensitive tables
-- ==============================================================================

-- 1. Ensure RLS is enabled across all critical tables
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- 2. Master Categories: Public read active, admin_users only for mutation
DROP POLICY IF EXISTS "Categories manageable by admin only" ON public.categories;
CREATE POLICY "Categories manageable by admin only"
    ON public.categories FOR ALL
    USING (public.is_admin_user())
    WITH CHECK (public.is_admin_user());

-- 3. Master Subcategories: Public read active, admin_users only for mutation
DROP POLICY IF EXISTS "Subcategories manageable by admin only" ON public.subcategories;
CREATE POLICY "Subcategories manageable by admin only"
    ON public.subcategories FOR ALL
    USING (public.is_admin_user())
    WITH CHECK (public.is_admin_user());

-- 4. Wishlists: Ensure Customer A cannot access or tamper with Customer B wishlist
DROP POLICY IF EXISTS "Customers can manage their own wishlists" ON public.wishlists;
DROP POLICY IF EXISTS "Wishlists select own" ON public.wishlists;
DROP POLICY IF EXISTS "Wishlists insert own" ON public.wishlists;
DROP POLICY IF EXISTS "Wishlists update own" ON public.wishlists;
DROP POLICY IF EXISTS "Wishlists delete own" ON public.wishlists;

CREATE POLICY "Wishlists select own"
    ON public.wishlists FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.customers c
            WHERE c.id = wishlists.customer_id AND c.profile_id = auth.uid()
        )
        OR public.is_admin_user()
    );

CREATE POLICY "Wishlists insert own"
    ON public.wishlists FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.customers c
            WHERE c.id = wishlists.customer_id AND c.profile_id = auth.uid()
        )
        OR public.is_admin_user()
    );

CREATE POLICY "Wishlists update own"
    ON public.wishlists FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.customers c
            WHERE c.id = wishlists.customer_id AND c.profile_id = auth.uid()
        )
        OR public.is_admin_user()
    );

CREATE POLICY "Wishlists delete own"
    ON public.wishlists FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.customers c
            WHERE c.id = wishlists.customer_id AND c.profile_id = auth.uid()
        )
        OR public.is_admin_user()
    );

-- 5. Wishlist Items: Strict isolation per customer
DROP POLICY IF EXISTS "Customers can manage their own wishlist items" ON public.wishlist_items;
DROP POLICY IF EXISTS "Wishlist items select own" ON public.wishlist_items;
DROP POLICY IF EXISTS "Wishlist items insert own" ON public.wishlist_items;
DROP POLICY IF EXISTS "Wishlist items delete own" ON public.wishlist_items;

CREATE POLICY "Wishlist items select own"
    ON public.wishlist_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.wishlists w
            JOIN public.customers c ON w.customer_id = c.id
            WHERE w.id = wishlist_items.wishlist_id AND c.profile_id = auth.uid()
        )
        OR public.is_admin_user()
    );

CREATE POLICY "Wishlist items insert own"
    ON public.wishlist_items FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.wishlists w
            JOIN public.customers c ON w.customer_id = c.id
            WHERE w.id = wishlist_items.wishlist_id AND c.profile_id = auth.uid()
        )
        OR public.is_admin_user()
    );

CREATE POLICY "Wishlist items delete own"
    ON public.wishlist_items FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.wishlists w
            JOIN public.customers c ON w.customer_id = c.id
            WHERE w.id = wishlist_items.wishlist_id AND c.profile_id = auth.uid()
        )
        OR public.is_admin_user()
    );

-- 6. Price Alerts: Isolated by authenticated customer
DROP POLICY IF EXISTS "Customers can manage their own price alerts" ON public.price_alerts;
DROP POLICY IF EXISTS "Price alerts select own" ON public.price_alerts;
DROP POLICY IF EXISTS "Price alerts insert own" ON public.price_alerts;
DROP POLICY IF EXISTS "Price alerts update own" ON public.price_alerts;
DROP POLICY IF EXISTS "Price alerts delete own" ON public.price_alerts;

CREATE POLICY "Price alerts select own"
    ON public.price_alerts FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.customers
            WHERE id = price_alerts.customer_id AND profile_id = auth.uid()
        )
        OR public.is_admin_user()
    );

CREATE POLICY "Price alerts insert own"
    ON public.price_alerts FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.customers
            WHERE id = price_alerts.customer_id AND profile_id = auth.uid()
        )
        OR public.is_admin_user()
    );

CREATE POLICY "Price alerts update own"
    ON public.price_alerts FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.customers
            WHERE id = price_alerts.customer_id AND profile_id = auth.uid()
        )
        OR public.is_admin_user()
    );

CREATE POLICY "Price alerts delete own"
    ON public.price_alerts FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.customers
            WHERE id = price_alerts.customer_id AND profile_id = auth.uid()
        )
        OR public.is_admin_user()
    );

-- 7. Reviews: Customers insert own review, public read approved
DROP POLICY IF EXISTS "Customers can create reviews" ON public.reviews;
CREATE POLICY "Customers can create reviews"
    ON public.reviews FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.customers
            WHERE id = reviews.customer_id AND profile_id = auth.uid()
        )
    );

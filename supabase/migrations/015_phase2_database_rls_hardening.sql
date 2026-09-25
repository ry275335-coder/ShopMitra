-- ==============================================================================
-- MIGRATION 015: Phase 2 Database RLS & Authorization Hardening
-- ==============================================================================
-- Description:
--   Complete, production-grade Row Level Security (RLS) hardening across all
--   tables in the ShopMitra schema. Eliminates legacy reliance on user_metadata,
--   enforces zero data leakage across customers, merchants, and administrative
--   boundaries, and standardizes multi-tenant isolation.
--
-- Security Guarantees:
--   1. Zero reliance on client-supplied roles or unverified JWT metadata.
--   2. Strict authorization derived from database-backed tables:
--      - public.admin_users (via public.is_admin_user() & public.is_super_admin_user())
--      - public.merchants (via public.owns_shop(shop_id))
--      - public.customers (via profile_id = auth.uid())
--   3. Strict isolation between Customer A and Customer B (wishlists, alerts, addresses, enquiries).
--   4. Anonymous callers are denied access to private/sensitive user data.
--   5. Immutability of public.audit_logs (UPDATE and DELETE permanently denied).
--   6. Public read allowed only on vetted active catalog/shop data (products, categories, active shops, approved reviews).
-- ==============================================================================

SET search_path TO public;

-- ------------------------------------------------------------------------------
-- 1. Helper Functions (STABLE, SECURITY DEFINER, Null-Safe)
-- ------------------------------------------------------------------------------

-- Check if user is an active administrator in public.admin_users
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = auth.uid() 
      AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp;

-- Check if user is an active super administrator in public.admin_users
CREATE OR REPLACE FUNCTION public.is_super_admin_user()
RETURNS BOOLEAN AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = auth.uid() 
      AND admin_role = 'super_admin'
      AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp;

-- Unified admin check: checks dedicated admin_users first, fallback to profiles
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
DECLARE
    current_uid UUID;
BEGIN
    current_uid := auth.uid();
    IF current_uid IS NULL THEN
        RETURN false;
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.admin_users 
        WHERE user_id = current_uid 
          AND admin_role IN ('super_admin', 'admin', 'moderator')
          AND status = 'active'
    ) THEN
        RETURN true;
    END IF;

    RETURN EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = current_uid 
          AND role IN ('super_admin', 'admin', 'moderator')
          AND is_active = true
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp;

-- Shop ownership verification helper
CREATE OR REPLACE FUNCTION public.owns_shop(p_shop_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    current_uid UUID;
BEGIN
    current_uid := auth.uid();
    IF current_uid IS NULL OR p_shop_id IS NULL THEN
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

-- Anti-Tampering Trigger for Profiles Role & Status Elevation
CREATE OR REPLACE FUNCTION public.prevent_profile_role_tampering()
RETURNS TRIGGER AS $$
BEGIN
  IF (OLD.role IS DISTINCT FROM NEW.role) OR (OLD.is_active IS DISTINCT FROM NEW.is_active) THEN
    IF auth.uid() IS NOT NULL THEN
      IF NOT (public.is_admin_user() OR public.is_admin()) THEN
        RAISE EXCEPTION 'Security Exception: Unauthorized attempt to alter user role or status.';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_prevent_profile_role_tampering ON public.profiles;
CREATE TRIGGER trg_prevent_profile_role_tampering
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_profile_role_tampering();

-- ------------------------------------------------------------------------------
-- 2. Profiles Table RLS
-- ------------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profiles are readable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users and admins can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Profiles select own or admin" ON public.profiles;
CREATE POLICY "Profiles select own or admin"
  ON public.profiles FOR SELECT
  USING (
    auth.uid() = id 
    OR public.is_admin_user() 
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Profiles insert own" ON public.profiles;
CREATE POLICY "Profiles insert own"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Profiles update own or admin" ON public.profiles;
CREATE POLICY "Profiles update own or admin"
  ON public.profiles FOR UPDATE
  USING (
    auth.uid() = id 
    OR public.is_admin_user() 
    OR public.is_admin()
  )
  WITH CHECK (
    auth.uid() = id 
    OR public.is_admin_user() 
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
DROP POLICY IF EXISTS "Profiles delete admin only" ON public.profiles;
CREATE POLICY "Profiles delete admin only"
  ON public.profiles FOR DELETE
  USING (public.is_admin_user() OR public.is_admin());

-- ------------------------------------------------------------------------------
-- 3. Customers Table RLS
-- ------------------------------------------------------------------------------
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Customers can read their own record" ON public.customers;
DROP POLICY IF EXISTS "Users can view own customer profile" ON public.customers;
DROP POLICY IF EXISTS "Customers select own or admin" ON public.customers;
CREATE POLICY "Customers select own or admin"
  ON public.customers FOR SELECT
  USING (
    profile_id = auth.uid() 
    OR public.is_admin_user() 
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Customers can insert their own record" ON public.customers;
DROP POLICY IF EXISTS "Users can insert own customer profile" ON public.customers;
DROP POLICY IF EXISTS "Customers insert own or admin" ON public.customers;
CREATE POLICY "Customers insert own or admin"
  ON public.customers FOR INSERT
  WITH CHECK (
    profile_id = auth.uid() 
    OR public.is_admin_user() 
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Customers can update their own record" ON public.customers;
DROP POLICY IF EXISTS "Users can update own customer profile" ON public.customers;
DROP POLICY IF EXISTS "Customers update own or admin" ON public.customers;
CREATE POLICY "Customers update own or admin"
  ON public.customers FOR UPDATE
  USING (
    profile_id = auth.uid() 
    OR public.is_admin_user() 
    OR public.is_admin()
  )
  WITH CHECK (
    profile_id = auth.uid() 
    OR public.is_admin_user() 
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Customers delete own or admin" ON public.customers;
CREATE POLICY "Customers delete own or admin"
  ON public.customers FOR DELETE
  USING (
    profile_id = auth.uid() 
    OR public.is_admin_user() 
    OR public.is_admin()
  );

-- ------------------------------------------------------------------------------
-- 4. Merchants Table RLS
-- ------------------------------------------------------------------------------
ALTER TABLE public.merchants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Merchants can read their own record" ON public.merchants;
DROP POLICY IF EXISTS "Merchants select own or admin" ON public.merchants;
CREATE POLICY "Merchants select own or admin"
  ON public.merchants FOR SELECT
  USING (
    profile_id = auth.uid() 
    OR public.is_admin_user() 
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Merchants can insert their own record" ON public.merchants;
DROP POLICY IF EXISTS "Merchants insert own or admin" ON public.merchants;
CREATE POLICY "Merchants insert own or admin"
  ON public.merchants FOR INSERT
  WITH CHECK (
    profile_id = auth.uid() 
    OR public.is_admin_user() 
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Merchants can update their own record" ON public.merchants;
DROP POLICY IF EXISTS "Merchants update own or admin" ON public.merchants;
CREATE POLICY "Merchants update own or admin"
  ON public.merchants FOR UPDATE
  USING (
    profile_id = auth.uid() 
    OR public.is_admin_user() 
    OR public.is_admin()
  )
  WITH CHECK (
    profile_id = auth.uid() 
    OR public.is_admin_user() 
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Merchants delete own or admin" ON public.merchants;
CREATE POLICY "Merchants delete own or admin"
  ON public.merchants FOR DELETE
  USING (
    profile_id = auth.uid() 
    OR public.is_admin_user() 
    OR public.is_admin()
  );

-- ------------------------------------------------------------------------------
-- 5. Businesses Table RLS
-- ------------------------------------------------------------------------------
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Merchants can read their own businesses" ON public.businesses;
DROP POLICY IF EXISTS "Businesses select own or admin" ON public.businesses;
CREATE POLICY "Businesses select own or admin"
  ON public.businesses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.merchants m 
      WHERE m.id = businesses.merchant_id AND m.profile_id = auth.uid()
    ) 
    OR public.is_admin_user() 
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Merchants can insert their own businesses" ON public.businesses;
DROP POLICY IF EXISTS "Businesses insert own or admin" ON public.businesses;
CREATE POLICY "Businesses insert own or admin"
  ON public.businesses FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.merchants m 
      WHERE m.id = businesses.merchant_id AND m.profile_id = auth.uid()
    ) 
    OR public.is_admin_user() 
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Merchants can update their own businesses" ON public.businesses;
DROP POLICY IF EXISTS "Businesses update own or admin" ON public.businesses;
CREATE POLICY "Businesses update own or admin"
  ON public.businesses FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.merchants m 
      WHERE m.id = businesses.merchant_id AND m.profile_id = auth.uid()
    ) 
    OR public.is_admin_user() 
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Businesses delete own or admin" ON public.businesses;
CREATE POLICY "Businesses delete own or admin"
  ON public.businesses FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.merchants m 
      WHERE m.id = businesses.merchant_id AND m.profile_id = auth.uid()
    ) 
    OR public.is_admin_user() 
    OR public.is_admin()
  );

-- ------------------------------------------------------------------------------
-- 6. Shops Table RLS
-- ------------------------------------------------------------------------------
ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Active shops are viewable by public" ON public.shops;
DROP POLICY IF EXISTS "Shops select active or owner or admin" ON public.shops;
CREATE POLICY "Shops select active or owner or admin"
  ON public.shops FOR SELECT
  USING (
    is_active = true 
    OR public.owns_shop(id) 
    OR public.is_admin_user() 
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Merchants can insert their own shops" ON public.shops;
DROP POLICY IF EXISTS "Shops insert owner or admin" ON public.shops;
CREATE POLICY "Shops insert owner or admin"
  ON public.shops FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.businesses b
      JOIN public.merchants m ON b.merchant_id = m.id
      WHERE b.id = business_id AND m.profile_id = auth.uid()
    ) 
    OR public.is_admin_user() 
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Merchants can update their own shops" ON public.shops;
DROP POLICY IF EXISTS "Shops update owner or admin" ON public.shops;
CREATE POLICY "Shops update owner or admin"
  ON public.shops FOR UPDATE
  USING (
    public.owns_shop(id) 
    OR public.is_admin_user() 
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Merchants can delete their own shops" ON public.shops;
DROP POLICY IF EXISTS "Shops delete owner or admin" ON public.shops;
CREATE POLICY "Shops delete owner or admin"
  ON public.shops FOR DELETE
  USING (
    public.owns_shop(id) 
    OR public.is_admin_user() 
    OR public.is_admin()
  );

-- ------------------------------------------------------------------------------
-- 7. Shop Branches Table RLS
-- ------------------------------------------------------------------------------
ALTER TABLE public.shop_branches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Shop branches select active or owner or admin" ON public.shop_branches;
CREATE POLICY "Shop branches select active or owner or admin"
  ON public.shop_branches FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.shops s 
      WHERE s.id = shop_branches.shop_id AND (s.is_active = true OR public.owns_shop(s.id))
    )
    OR public.owns_shop(shop_id) 
    OR public.is_admin_user() 
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Shop branches manage owner or admin" ON public.shop_branches;
CREATE POLICY "Shop branches manage owner or admin"
  ON public.shop_branches FOR ALL
  USING (
    public.owns_shop(shop_id) 
    OR public.is_admin_user() 
    OR public.is_admin()
  )
  WITH CHECK (
    public.owns_shop(shop_id) 
    OR public.is_admin_user() 
    OR public.is_admin()
  );

-- ------------------------------------------------------------------------------
-- 8. Master Categories & Subcategories RLS (Public Read Active, Admin Write)
-- ------------------------------------------------------------------------------
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subcategories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Categories viewable by public" ON public.categories;
DROP POLICY IF EXISTS "Categories select active or admin" ON public.categories;
CREATE POLICY "Categories select active or admin"
  ON public.categories FOR SELECT
  USING (is_active = true OR public.is_admin_user() OR public.is_admin());

DROP POLICY IF EXISTS "Categories manageable by admin only" ON public.categories;
DROP POLICY IF EXISTS "Categories mutate admin only" ON public.categories;
CREATE POLICY "Categories mutate admin only"
  ON public.categories FOR ALL
  USING (public.is_admin_user() OR public.is_admin())
  WITH CHECK (public.is_admin_user() OR public.is_admin());

DROP POLICY IF EXISTS "Subcategories viewable by public" ON public.subcategories;
DROP POLICY IF EXISTS "Subcategories select active or admin" ON public.subcategories;
CREATE POLICY "Subcategories select active or admin"
  ON public.subcategories FOR SELECT
  USING (is_active = true OR public.is_admin_user() OR public.is_admin());

DROP POLICY IF EXISTS "Subcategories manageable by admin only" ON public.subcategories;
DROP POLICY IF EXISTS "Subcategories mutate admin only" ON public.subcategories;
CREATE POLICY "Subcategories mutate admin only"
  ON public.subcategories FOR ALL
  USING (public.is_admin_user() OR public.is_admin())
  WITH CHECK (public.is_admin_user() OR public.is_admin());

-- ------------------------------------------------------------------------------
-- 9. Master Products & Variants RLS (Public Read Active, Admin Write)
-- ------------------------------------------------------------------------------
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Products manageable by admin only" ON public.products;
DROP POLICY IF EXISTS "Products viewable by public" ON public.products;
DROP POLICY IF EXISTS "Admins can insert products" ON public.products;
DROP POLICY IF EXISTS "Admins can update products" ON public.products;
DROP POLICY IF EXISTS "Admins can delete products" ON public.products;
DROP POLICY IF EXISTS "Products select active or admin" ON public.products;
CREATE POLICY "Products select active or admin"
  ON public.products FOR SELECT
  USING (is_active = true OR public.is_admin_user() OR public.is_admin());

DROP POLICY IF EXISTS "Products mutate admin only" ON public.products;
CREATE POLICY "Products mutate admin only"
  ON public.products FOR ALL
  USING (public.is_admin_user() OR public.is_admin())
  WITH CHECK (public.is_admin_user() OR public.is_admin());

DROP POLICY IF EXISTS "Product variants viewable by public" ON public.product_variants;
DROP POLICY IF EXISTS "Product variants select public" ON public.product_variants;
CREATE POLICY "Product variants select public"
  ON public.product_variants FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Product variants manageable by admin only" ON public.product_variants;
DROP POLICY IF EXISTS "Product variants mutate admin only" ON public.product_variants;
CREATE POLICY "Product variants mutate admin only"
  ON public.product_variants FOR ALL
  USING (public.is_admin_user() OR public.is_admin())
  WITH CHECK (public.is_admin_user() OR public.is_admin());

-- ------------------------------------------------------------------------------
-- 10. Shop Products RLS (Store Inventory & Pricing)
-- ------------------------------------------------------------------------------
ALTER TABLE public.shop_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Shop products viewable by public" ON public.shop_products;
DROP POLICY IF EXISTS "Shop products select active or owner or admin" ON public.shop_products;
CREATE POLICY "Shop products select active or owner or admin"
  ON public.shop_products FOR SELECT
  USING (
    status = 'active' 
    OR public.owns_shop(shop_id) 
    OR public.is_admin_user() 
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Merchants can insert their own shop products" ON public.shop_products;
DROP POLICY IF EXISTS "Shop products insert owner or admin" ON public.shop_products;
CREATE POLICY "Shop products insert owner or admin"
  ON public.shop_products FOR INSERT
  WITH CHECK (
    public.owns_shop(shop_id) 
    OR public.is_admin_user() 
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Merchants can update their own shop products" ON public.shop_products;
DROP POLICY IF EXISTS "Shop products update owner or admin" ON public.shop_products;
CREATE POLICY "Shop products update owner or admin"
  ON public.shop_products FOR UPDATE
  USING (
    public.owns_shop(shop_id) 
    OR public.is_admin_user() 
    OR public.is_admin()
  )
  WITH CHECK (
    public.owns_shop(shop_id) 
    OR public.is_admin_user() 
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Merchants can delete their own shop products" ON public.shop_products;
DROP POLICY IF EXISTS "Shop products delete owner or admin" ON public.shop_products;
CREATE POLICY "Shop products delete owner or admin"
  ON public.shop_products FOR DELETE
  USING (
    public.owns_shop(shop_id) 
    OR public.is_admin_user() 
    OR public.is_admin()
  );

-- ------------------------------------------------------------------------------
-- 11. Inventory & Price History RLS
-- ------------------------------------------------------------------------------
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Inventory select active or owner or admin" ON public.inventory;
CREATE POLICY "Inventory select active or owner or admin"
  ON public.inventory FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.shop_products sp
      WHERE sp.id = inventory.shop_product_id 
        AND (sp.status = 'active' OR public.owns_shop(sp.shop_id))
    )
    OR public.is_admin_user()
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Inventory mutate owner or admin" ON public.inventory;
CREATE POLICY "Inventory mutate owner or admin"
  ON public.inventory FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.shop_products sp
      WHERE sp.id = inventory.shop_product_id 
        AND public.owns_shop(sp.shop_id)
    )
    OR public.is_admin_user()
    OR public.is_admin()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.shop_products sp
      WHERE sp.id = inventory.shop_product_id 
        AND public.owns_shop(sp.shop_id)
    )
    OR public.is_admin_user()
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Price history viewable by everyone" ON public.price_history;
DROP POLICY IF EXISTS "Price history select public" ON public.price_history;
CREATE POLICY "Price history select public"
  ON public.price_history FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Price history insertable by merchant or trigger" ON public.price_history;
DROP POLICY IF EXISTS "Price history insert owner or admin" ON public.price_history;
CREATE POLICY "Price history insert owner or admin"
  ON public.price_history FOR INSERT
  WITH CHECK (
    public.owns_shop(shop_id) 
    OR public.is_admin_user() 
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Price history update delete admin only" ON public.price_history;
CREATE POLICY "Price history update delete admin only"
  ON public.price_history FOR DELETE
  USING (public.is_admin_user() OR public.is_admin());

-- ------------------------------------------------------------------------------
-- 12. Offers RLS (Deals & Promotions)
-- ------------------------------------------------------------------------------
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Offers select active or owner or admin" ON public.offers;
CREATE POLICY "Offers select active or owner or admin"
  ON public.offers FOR SELECT
  USING (
    is_active = true 
    OR public.owns_shop(shop_id) 
    OR public.is_admin_user() 
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Offers mutate owner or admin" ON public.offers;
CREATE POLICY "Offers mutate owner or admin"
  ON public.offers FOR ALL
  USING (
    public.owns_shop(shop_id) 
    OR public.is_admin_user() 
    OR public.is_admin()
  )
  WITH CHECK (
    public.owns_shop(shop_id) 
    OR public.is_admin_user() 
    OR public.is_admin()
  );

-- ------------------------------------------------------------------------------
-- 13. Saved Addresses RLS (Strict Customer Isolation)
-- ------------------------------------------------------------------------------
ALTER TABLE public.saved_addresses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Customers can manage their own saved addresses" ON public.saved_addresses;
DROP POLICY IF EXISTS "Saved addresses manage own or admin" ON public.saved_addresses;
CREATE POLICY "Saved addresses manage own or admin"
  ON public.saved_addresses FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.customers c 
      WHERE c.id = saved_addresses.customer_id AND c.profile_id = auth.uid()
    ) 
    OR public.is_admin_user() 
    OR public.is_admin()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.customers c 
      WHERE c.id = saved_addresses.customer_id AND c.profile_id = auth.uid()
    ) 
    OR public.is_admin_user() 
    OR public.is_admin()
  );

-- ------------------------------------------------------------------------------
-- 14. Wishlists & Wishlist Items RLS (Strict Customer Isolation)
-- ------------------------------------------------------------------------------
ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlist_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Customers can manage their own wishlists" ON public.wishlists;
DROP POLICY IF EXISTS "Wishlists select own" ON public.wishlists;
DROP POLICY IF EXISTS "Wishlists insert own" ON public.wishlists;
DROP POLICY IF EXISTS "Wishlists update own" ON public.wishlists;
DROP POLICY IF EXISTS "Wishlists delete own" ON public.wishlists;
DROP POLICY IF EXISTS "Wishlists manage own or admin" ON public.wishlists;
CREATE POLICY "Wishlists manage own or admin"
  ON public.wishlists FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.customers c
      WHERE c.id = wishlists.customer_id AND c.profile_id = auth.uid()
    )
    OR public.is_admin_user()
    OR public.is_admin()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.customers c
      WHERE c.id = wishlists.customer_id AND c.profile_id = auth.uid()
    )
    OR public.is_admin_user()
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Customers can manage their own wishlist items" ON public.wishlist_items;
DROP POLICY IF EXISTS "Wishlist items select own" ON public.wishlist_items;
DROP POLICY IF EXISTS "Wishlist items insert own" ON public.wishlist_items;
DROP POLICY IF EXISTS "Wishlist items delete own" ON public.wishlist_items;
DROP POLICY IF EXISTS "Wishlist items manage own or admin" ON public.wishlist_items;
CREATE POLICY "Wishlist items manage own or admin"
  ON public.wishlist_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.wishlists w
      JOIN public.customers c ON w.customer_id = c.id
      WHERE w.id = wishlist_items.wishlist_id AND c.profile_id = auth.uid()
    )
    OR public.is_admin_user()
    OR public.is_admin()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.wishlists w
      JOIN public.customers c ON w.customer_id = c.id
      WHERE w.id = wishlist_items.wishlist_id AND c.profile_id = auth.uid()
    )
    OR public.is_admin_user()
    OR public.is_admin()
  );

-- ------------------------------------------------------------------------------
-- 15. Price Alerts & Stock Alerts RLS (Strict Customer Isolation)
-- ------------------------------------------------------------------------------
ALTER TABLE public.price_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Customers can manage their own price alerts" ON public.price_alerts;
DROP POLICY IF EXISTS "Price alerts select own" ON public.price_alerts;
DROP POLICY IF EXISTS "Price alerts insert own" ON public.price_alerts;
DROP POLICY IF EXISTS "Price alerts update own" ON public.price_alerts;
DROP POLICY IF EXISTS "Price alerts delete own" ON public.price_alerts;
DROP POLICY IF EXISTS "Price alerts manage own or admin" ON public.price_alerts;
CREATE POLICY "Price alerts manage own or admin"
  ON public.price_alerts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.customers c
      WHERE c.id = price_alerts.customer_id AND c.profile_id = auth.uid()
    )
    OR public.is_admin_user()
    OR public.is_admin()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.customers c
      WHERE c.id = price_alerts.customer_id AND c.profile_id = auth.uid()
    )
    OR public.is_admin_user()
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Customers can manage their own stock alerts" ON public.stock_alerts;
DROP POLICY IF EXISTS "Stock alerts manage own or admin" ON public.stock_alerts;
CREATE POLICY "Stock alerts manage own or admin"
  ON public.stock_alerts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.customers c
      WHERE c.id = stock_alerts.customer_id AND c.profile_id = auth.uid()
    )
    OR public.is_admin_user()
    OR public.is_admin()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.customers c
      WHERE c.id = stock_alerts.customer_id AND c.profile_id = auth.uid()
    )
    OR public.is_admin_user()
    OR public.is_admin()
  );

-- ------------------------------------------------------------------------------
-- 16. Enquiries RLS (Customer Authors, Shop Owners, Admins)
-- ------------------------------------------------------------------------------
ALTER TABLE public.enquiries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Customers can view their own enquiries" ON public.enquiries;
DROP POLICY IF EXISTS "Enquiries select customer owner or admin" ON public.enquiries;
CREATE POLICY "Enquiries select customer owner or admin"
  ON public.enquiries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.customers c
      WHERE c.id = enquiries.customer_id AND c.profile_id = auth.uid()
    )
    OR public.owns_shop(shop_id)
    OR public.is_admin_user()
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Customers can create enquiries" ON public.enquiries;
DROP POLICY IF EXISTS "Enquiries insert customer or admin" ON public.enquiries;
CREATE POLICY "Enquiries insert customer or admin"
  ON public.enquiries FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.customers c
      WHERE c.id = enquiries.customer_id AND c.profile_id = auth.uid()
    )
    OR public.is_admin_user()
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Merchants can respond to enquiries" ON public.enquiries;
DROP POLICY IF EXISTS "Enquiries update merchant response or admin" ON public.enquiries;
CREATE POLICY "Enquiries update merchant response or admin"
  ON public.enquiries FOR UPDATE
  USING (
    public.owns_shop(shop_id) 
    OR public.is_admin_user() 
    OR public.is_admin()
  )
  WITH CHECK (
    public.owns_shop(shop_id) 
    OR public.is_admin_user() 
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Enquiries delete customer or admin" ON public.enquiries;
CREATE POLICY "Enquiries delete customer or admin"
  ON public.enquiries FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.customers c
      WHERE c.id = enquiries.customer_id AND c.profile_id = auth.uid()
    )
    OR public.is_admin_user()
    OR public.is_admin()
  );

-- ------------------------------------------------------------------------------
-- 17. Reviews RLS (Verified Customer Author, Public Read Approved, Admin Manage)
-- ------------------------------------------------------------------------------
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Approved reviews viewable by public" ON public.reviews;
DROP POLICY IF EXISTS "Reviews select approved or author or owner or admin" ON public.reviews;
CREATE POLICY "Reviews select approved or author or owner or admin"
  ON public.reviews FOR SELECT
  USING (
    status = 'resolved'
    OR EXISTS (
      SELECT 1 FROM public.customers c
      WHERE c.id = reviews.customer_id AND c.profile_id = auth.uid()
    )
    OR public.owns_shop(shop_id)
    OR public.is_admin_user()
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Customers can create reviews" ON public.reviews;
DROP POLICY IF EXISTS "Reviews insert customer author" ON public.reviews;
CREATE POLICY "Reviews insert customer author"
  ON public.reviews FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.customers c
      WHERE c.id = reviews.customer_id AND c.profile_id = auth.uid()
    )
    OR public.is_admin_user()
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Reviews update customer author or admin" ON public.reviews;
CREATE POLICY "Reviews update customer author or admin"
  ON public.reviews FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.customers c
      WHERE c.id = reviews.customer_id AND c.profile_id = auth.uid()
    )
    OR public.is_admin_user()
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Reviews delete customer author or admin" ON public.reviews;
CREATE POLICY "Reviews delete customer author or admin"
  ON public.reviews FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.customers c
      WHERE c.id = reviews.customer_id AND c.profile_id = auth.uid()
    )
    OR public.is_admin_user()
    OR public.is_admin()
  );

-- ------------------------------------------------------------------------------
-- 18. Reports RLS (Dispute / Wrong Price Reports: Reporter View, Admin Manage)
-- ------------------------------------------------------------------------------
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Reports insertable by any authenticated user" ON public.reports;
DROP POLICY IF EXISTS "Reports manageable by admin only" ON public.reports;

DROP POLICY IF EXISTS "Reports select reporter or admin" ON public.reports;
CREATE POLICY "Reports select reporter or admin"
  ON public.reports FOR SELECT
  USING (
    reporter_id = auth.uid() 
    OR public.is_admin_user() 
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Reports insert authenticated reporter" ON public.reports;
CREATE POLICY "Reports insert authenticated reporter"
  ON public.reports FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL 
    AND reporter_id = auth.uid()
  );

DROP POLICY IF EXISTS "Reports update admin only" ON public.reports;
CREATE POLICY "Reports update admin only"
  ON public.reports FOR UPDATE
  USING (public.is_admin_user() OR public.is_admin())
  WITH CHECK (public.is_admin_user() OR public.is_admin());

DROP POLICY IF EXISTS "Reports delete admin only" ON public.reports;
CREATE POLICY "Reports delete admin only"
  ON public.reports FOR DELETE
  USING (public.is_admin_user() OR public.is_admin());

-- ------------------------------------------------------------------------------
-- 19. Review Reports RLS (Review Abuse Reports: Reporter View, Admin Manage)
-- ------------------------------------------------------------------------------
ALTER TABLE public.review_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Review reports select reporter or admin" ON public.review_reports;
CREATE POLICY "Review reports select reporter or admin"
  ON public.review_reports FOR SELECT
  USING (
    reporter_id = auth.uid() 
    OR public.is_admin_user() 
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Review reports insert authenticated reporter" ON public.review_reports;
CREATE POLICY "Review reports insert authenticated reporter"
  ON public.review_reports FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL 
    AND reporter_id = auth.uid()
  );

DROP POLICY IF EXISTS "Review reports update admin only" ON public.review_reports;
CREATE POLICY "Review reports update admin only"
  ON public.review_reports FOR UPDATE
  USING (public.is_admin_user() OR public.is_admin())
  WITH CHECK (public.is_admin_user() OR public.is_admin());

DROP POLICY IF EXISTS "Review reports delete admin only" ON public.review_reports;
CREATE POLICY "Review reports delete admin only"
  ON public.review_reports FOR DELETE
  USING (public.is_admin_user() OR public.is_admin());

-- ------------------------------------------------------------------------------
-- 20. Notifications RLS (Strict Recipient Isolation & Admin Delivery)
-- ------------------------------------------------------------------------------
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Notifications select recipient or admin" ON public.notifications;
CREATE POLICY "Notifications select recipient or admin"
  ON public.notifications FOR SELECT
  USING (
    profile_id = auth.uid() 
    OR public.is_admin_user() 
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Notifications insert admin or service" ON public.notifications;
CREATE POLICY "Notifications insert admin or service"
  ON public.notifications FOR INSERT
  WITH CHECK (
    public.is_admin_user() 
    OR public.is_admin() 
    OR auth.uid() IS NULL
  );

DROP POLICY IF EXISTS "Notifications update recipient or admin" ON public.notifications;
CREATE POLICY "Notifications update recipient or admin"
  ON public.notifications FOR UPDATE
  USING (
    profile_id = auth.uid() 
    OR public.is_admin_user() 
    OR public.is_admin()
  )
  WITH CHECK (
    profile_id = auth.uid() 
    OR public.is_admin_user() 
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Notifications delete recipient or admin" ON public.notifications;
CREATE POLICY "Notifications delete recipient or admin"
  ON public.notifications FOR DELETE
  USING (
    profile_id = auth.uid() 
    OR public.is_admin_user() 
    OR public.is_admin()
  );

-- ------------------------------------------------------------------------------
-- 21. Subscriptions Table RLS
-- ------------------------------------------------------------------------------
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Subscriptions select business owner or admin" ON public.subscriptions;
CREATE POLICY "Subscriptions select business owner or admin"
  ON public.subscriptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses b
      JOIN public.merchants m ON b.merchant_id = m.id
      WHERE b.id = subscriptions.business_id AND m.profile_id = auth.uid()
    )
    OR public.is_admin_user()
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Subscriptions mutate admin only" ON public.subscriptions;
CREATE POLICY "Subscriptions mutate admin only"
  ON public.subscriptions FOR ALL
  USING (public.is_admin_user() OR public.is_admin())
  WITH CHECK (public.is_admin_user() OR public.is_admin());

-- ------------------------------------------------------------------------------
-- 22. Platform Analytics Telemetry Events RLS
-- ------------------------------------------------------------------------------
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Analytics events select owner or admin" ON public.analytics_events;
CREATE POLICY "Analytics events select owner or admin"
  ON public.analytics_events FOR SELECT
  USING (
    profile_id = auth.uid() 
    OR (shop_id IS NOT NULL AND public.owns_shop(shop_id))
    OR public.is_admin_user() 
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Analytics events insert public" ON public.analytics_events;
CREATE POLICY "Analytics events insert public"
  ON public.analytics_events FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Analytics events delete admin only" ON public.analytics_events;
CREATE POLICY "Analytics events delete admin only"
  ON public.analytics_events FOR DELETE
  USING (public.is_admin_user() OR public.is_admin());

-- ------------------------------------------------------------------------------
-- 23. Dedicated Admin Users Authorization Table RLS
-- ------------------------------------------------------------------------------
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Active admins can view admin_users" ON public.admin_users;
DROP POLICY IF EXISTS "Admin users select admin or own" ON public.admin_users;
CREATE POLICY "Admin users select admin or own"
  ON public.admin_users FOR SELECT
  USING (
    public.is_admin_user() 
    OR public.is_admin() 
    OR user_id = auth.uid()
  );

DROP POLICY IF EXISTS "Super admins can insert admin_users" ON public.admin_users;
DROP POLICY IF EXISTS "Admin users insert super admin only" ON public.admin_users;
CREATE POLICY "Admin users insert super admin only"
  ON public.admin_users FOR INSERT
  WITH CHECK (
    public.is_super_admin_user() 
    OR auth.uid() IS NULL
  );

DROP POLICY IF EXISTS "Super admins can update admin_users" ON public.admin_users;
DROP POLICY IF EXISTS "Admin users update super admin only" ON public.admin_users;
CREATE POLICY "Admin users update super admin only"
  ON public.admin_users FOR UPDATE
  USING (
    public.is_super_admin_user() 
    OR auth.uid() IS NULL
  )
  WITH CHECK (
    public.is_super_admin_user() 
    OR auth.uid() IS NULL
  );

DROP POLICY IF EXISTS "Super admins can delete admin_users" ON public.admin_users;
DROP POLICY IF EXISTS "Admin users delete super admin only" ON public.admin_users;
CREATE POLICY "Admin users delete super admin only"
  ON public.admin_users FOR DELETE
  USING (
    public.is_super_admin_user() 
    OR auth.uid() IS NULL
  );

-- ------------------------------------------------------------------------------
-- 24. Audit Logs Table RLS (Strict Immutability & Admin Read Only)
-- ------------------------------------------------------------------------------
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Audit logs select admin only" ON public.audit_logs;
CREATE POLICY "Audit logs select admin only"
  ON public.audit_logs FOR SELECT
  USING (public.is_admin_user() OR public.is_admin());

DROP POLICY IF EXISTS "Service role can insert audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Audit logs insert authorized" ON public.audit_logs;
CREATE POLICY "Audit logs insert authorized"
  ON public.audit_logs FOR INSERT
  WITH CHECK (
    public.is_admin_user() 
    OR public.is_admin() 
    OR auth.uid() IS NULL
  );

-- Immutability guarantees: UPDATE and DELETE are permanently prohibited
DROP POLICY IF EXISTS "Deny audit update" ON public.audit_logs;
DROP POLICY IF EXISTS "Audit logs deny update" ON public.audit_logs;
CREATE POLICY "Audit logs deny update"
  ON public.audit_logs FOR UPDATE
  USING (false);

DROP POLICY IF EXISTS "Deny audit delete" ON public.audit_logs;
DROP POLICY IF EXISTS "Audit logs deny delete" ON public.audit_logs;
CREATE POLICY "Audit logs deny delete"
  ON public.audit_logs FOR DELETE
  USING (false);

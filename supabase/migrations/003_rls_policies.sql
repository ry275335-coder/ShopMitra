-- ==============================================================================
-- 003_rls_policies.sql
-- Supabase Row Level Security (RLS) Policies
-- Enforces zero data leakage and strict multi-tenant authorization
-- ==============================================================================

-- 1. Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE enquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- 2. Helper Functions for RBAC
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION owns_shop(p_shop_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM shops s
        JOIN businesses b ON s.business_id = b.id
        JOIN merchants m ON b.merchant_id = m.id
        WHERE s.id = p_shop_id AND m.profile_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Profiles Policies
CREATE POLICY "Public profiles are readable by everyone"
    ON profiles FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile"
    ON profiles FOR UPDATE USING (auth.uid() = id);

-- 4. Shops Policies
CREATE POLICY "Active shops are viewable by public"
    ON shops FOR SELECT USING (is_active = true OR is_admin() OR owns_shop(id));

CREATE POLICY "Merchants can insert their own shops"
    ON shops FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM businesses b
            JOIN merchants m ON b.merchant_id = m.id
            WHERE b.id = business_id AND m.profile_id = auth.uid()
        ) OR is_admin()
    );

CREATE POLICY "Merchants can update their own shops"
    ON shops FOR UPDATE USING (owns_shop(id) OR is_admin());

CREATE POLICY "Merchants can delete their own shops"
    ON shops FOR DELETE USING (owns_shop(id) OR is_admin());

-- 5. Master Categories & Products (Public Read, Admin Write)
CREATE POLICY "Categories viewable by public"
    ON categories FOR SELECT USING (is_active = true OR is_admin());

CREATE POLICY "Categories manageable by admin only"
    ON categories FOR ALL USING (is_admin());

CREATE POLICY "Subcategories viewable by public"
    ON subcategories FOR SELECT USING (is_active = true OR is_admin());

CREATE POLICY "Subcategories manageable by admin only"
    ON subcategories FOR ALL USING (is_admin());

CREATE POLICY "Products viewable by public"
    ON products FOR SELECT USING (is_active = true OR is_admin());

CREATE POLICY "Products manageable by admin only"
    ON products FOR ALL USING (is_admin());

CREATE POLICY "Product variants viewable by public"
    ON product_variants FOR SELECT USING (true);

CREATE POLICY "Product variants manageable by admin only"
    ON product_variants FOR ALL USING (is_admin());

-- 6. Shop Products & Inventory (Public Read Active, Merchant Manage Own)
CREATE POLICY "Shop products viewable by public"
    ON shop_products FOR SELECT USING (status = 'active' OR owns_shop(shop_id) OR is_admin());

CREATE POLICY "Merchants can insert their own shop products"
    ON shop_products FOR INSERT WITH CHECK (owns_shop(shop_id) OR is_admin());

CREATE POLICY "Merchants can update their own shop products"
    ON shop_products FOR UPDATE USING (owns_shop(shop_id) OR is_admin());

CREATE POLICY "Merchants can delete their own shop products"
    ON shop_products FOR DELETE USING (owns_shop(shop_id) OR is_admin());

-- 7. Price History
CREATE POLICY "Price history viewable by everyone"
    ON price_history FOR SELECT USING (true);

CREATE POLICY "Price history insertable by merchant or trigger"
    ON price_history FOR INSERT WITH CHECK (owns_shop(shop_id) OR is_admin());

-- 8. Customer Data: Saved Addresses, Wishlist, Alerts
CREATE POLICY "Customers can manage their own saved addresses"
    ON saved_addresses FOR ALL USING (
        EXISTS (SELECT 1 FROM customers WHERE id = customer_id AND profile_id = auth.uid()) OR is_admin()
    );

CREATE POLICY "Customers can manage their own wishlists"
    ON wishlists FOR ALL USING (
        EXISTS (SELECT 1 FROM customers WHERE id = customer_id AND profile_id = auth.uid()) OR is_admin()
    );

CREATE POLICY "Customers can manage their own wishlist items"
    ON wishlist_items FOR ALL USING (
        EXISTS (
            SELECT 1 FROM wishlists w
            JOIN customers c ON w.customer_id = c.id
            WHERE w.id = wishlist_id AND c.profile_id = auth.uid()
        ) OR is_admin()
    );

CREATE POLICY "Customers can manage their own price alerts"
    ON price_alerts FOR ALL USING (
        EXISTS (SELECT 1 FROM customers WHERE id = customer_id AND profile_id = auth.uid()) OR is_admin()
    );

CREATE POLICY "Customers can manage their own stock alerts"
    ON stock_alerts FOR ALL USING (
        EXISTS (SELECT 1 FROM customers WHERE id = customer_id AND profile_id = auth.uid()) OR is_admin()
    );

-- 9. Enquiries
CREATE POLICY "Customers can view their own enquiries"
    ON enquiries FOR SELECT USING (
        EXISTS (SELECT 1 FROM customers WHERE id = customer_id AND profile_id = auth.uid())
        OR owns_shop(shop_id)
        OR is_admin()
    );

CREATE POLICY "Customers can create enquiries"
    ON enquiries FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM customers WHERE id = customer_id AND profile_id = auth.uid())
    );

CREATE POLICY "Merchants can respond to enquiries"
    ON enquiries FOR UPDATE USING (owns_shop(shop_id) OR is_admin());

-- 10. Reviews & Reports
CREATE POLICY "Approved reviews viewable by public"
    ON reviews FOR SELECT USING (status = 'resolved' OR is_admin());

CREATE POLICY "Customers can create reviews"
    ON reviews FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM customers WHERE id = customer_id AND profile_id = auth.uid())
    );

CREATE POLICY "Reports insertable by any authenticated user"
    ON reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Reports manageable by admin only"
    ON reports FOR ALL USING (is_admin());

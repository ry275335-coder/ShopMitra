-- ============================================================
-- 004d_rls_only.sql
-- RLS Policies ONLY — run after triggers already applied
-- ============================================================

-- profiles: INSERT own
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- merchants: INSERT
DROP POLICY IF EXISTS "Merchants can insert their own record" ON merchants;
CREATE POLICY "Merchants can insert their own record"
  ON merchants FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles WHERE id = profile_id AND id = auth.uid()
  ));

-- merchants: SELECT
DROP POLICY IF EXISTS "Merchants can read their own record" ON merchants;
CREATE POLICY "Merchants can read their own record"
  ON merchants FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = profile_id AND id = auth.uid())
    OR is_admin()
  );

-- merchants: UPDATE
DROP POLICY IF EXISTS "Merchants can update their own record" ON merchants;
CREATE POLICY "Merchants can update their own record"
  ON merchants FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = profile_id AND id = auth.uid())
    OR is_admin()
  );

-- businesses: INSERT
DROP POLICY IF EXISTS "Merchants can insert their own businesses" ON businesses;
CREATE POLICY "Merchants can insert their own businesses"
  ON businesses FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM merchants m WHERE m.id = merchant_id AND m.profile_id = auth.uid())
    OR is_admin()
  );

-- businesses: SELECT
DROP POLICY IF EXISTS "Merchants can read their own businesses" ON businesses;
CREATE POLICY "Merchants can read their own businesses"
  ON businesses FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM merchants m WHERE m.id = merchant_id AND m.profile_id = auth.uid())
    OR is_admin()
  );

-- businesses: UPDATE
DROP POLICY IF EXISTS "Merchants can update their own businesses" ON businesses;
CREATE POLICY "Merchants can update their own businesses"
  ON businesses FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM merchants m WHERE m.id = merchant_id AND m.profile_id = auth.uid())
    OR is_admin()
  );

-- customers: INSERT
DROP POLICY IF EXISTS "Customers can insert their own record" ON customers;
CREATE POLICY "Customers can insert their own record"
  ON customers FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles WHERE id = profile_id AND id = auth.uid()
  ));

-- customers: SELECT
DROP POLICY IF EXISTS "Customers can read their own record" ON customers;
CREATE POLICY "Customers can read their own record"
  ON customers FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = profile_id AND id = auth.uid())
    OR is_admin()
  );

-- customers: UPDATE
DROP POLICY IF EXISTS "Customers can update their own record" ON customers;
CREATE POLICY "Customers can update their own record"
  ON customers FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = profile_id AND id = auth.uid())
    OR is_admin()
  );

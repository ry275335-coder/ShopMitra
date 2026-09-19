-- ============================================================
-- 004e_rls_final.sql — explicit public. schema prefix on all tables
-- ============================================================

SET search_path TO public;

-- profiles: INSERT own
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- merchants: INSERT
DROP POLICY IF EXISTS "Merchants can insert their own record" ON public.merchants;
CREATE POLICY "Merchants can insert their own record"
  ON public.merchants FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles WHERE id = profile_id AND id = auth.uid()
  ));

-- merchants: SELECT
DROP POLICY IF EXISTS "Merchants can read their own record" ON public.merchants;
CREATE POLICY "Merchants can read their own record"
  ON public.merchants FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = profile_id AND id = auth.uid())
    OR public.is_admin()
  );

-- merchants: UPDATE
DROP POLICY IF EXISTS "Merchants can update their own record" ON public.merchants;
CREATE POLICY "Merchants can update their own record"
  ON public.merchants FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = profile_id AND id = auth.uid())
    OR public.is_admin()
  );

-- businesses: INSERT
DROP POLICY IF EXISTS "Merchants can insert their own businesses" ON public.businesses;
CREATE POLICY "Merchants can insert their own businesses"
  ON public.businesses FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.merchants m WHERE m.id = merchant_id AND m.profile_id = auth.uid())
    OR public.is_admin()
  );

-- businesses: SELECT
DROP POLICY IF EXISTS "Merchants can read their own businesses" ON public.businesses;
CREATE POLICY "Merchants can read their own businesses"
  ON public.businesses FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.merchants m WHERE m.id = merchant_id AND m.profile_id = auth.uid())
    OR public.is_admin()
  );

-- businesses: UPDATE
DROP POLICY IF EXISTS "Merchants can update their own businesses" ON public.businesses;
CREATE POLICY "Merchants can update their own businesses"
  ON public.businesses FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.merchants m WHERE m.id = merchant_id AND m.profile_id = auth.uid())
    OR public.is_admin()
  );

-- customers: INSERT
DROP POLICY IF EXISTS "Customers can insert their own record" ON public.customers;
CREATE POLICY "Customers can insert their own record"
  ON public.customers FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles WHERE id = profile_id AND id = auth.uid()
  ));

-- customers: SELECT
DROP POLICY IF EXISTS "Customers can read their own record" ON public.customers;
CREATE POLICY "Customers can read their own record"
  ON public.customers FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = profile_id AND id = auth.uid())
    OR public.is_admin()
  );

-- customers: UPDATE
DROP POLICY IF EXISTS "Customers can update their own record" ON public.customers;
CREATE POLICY "Customers can update their own record"
  ON public.customers FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = profile_id AND id = auth.uid())
    OR public.is_admin()
  );

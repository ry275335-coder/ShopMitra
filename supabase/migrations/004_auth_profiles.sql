-- ==============================================================================
-- 004_auth_profiles.sql  (FIXED)
-- OTP Passwordless Auth: Profile Auto-Creation Trigger + Missing RLS Policies
-- Safe version — handles cases where columns may or may not exist
-- Run this in Supabase Dashboard → SQL Editor
-- ==============================================================================

-- 1. Create profiles table if it doesn't exist yet
--    (safe no-op if already created by 001_initial_schema.sql)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL DEFAULT '',
    full_name VARCHAR(150),
    avatar_url TEXT,
    role user_role NOT NULL DEFAULT 'customer',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Add phone & username columns if they don't exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone VARCHAR(30);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username VARCHAR(60);

-- 3. Relax email NOT NULL so phone-only users can sign up
--    (safe even if email column already allows null)
ALTER TABLE profiles ALTER COLUMN email DROP NOT NULL;
ALTER TABLE profiles ALTER COLUMN email SET DEFAULT '';

-- 4. RLS: Allow authenticated users to INSERT their own profile
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 5. Auto-create profile trigger when a new auth.users row is created
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role user_role := 'customer';
  v_full_name TEXT;
  v_phone TEXT;
  v_email TEXT;
BEGIN
  v_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    ''
  );
  v_phone := COALESCE(NEW.phone, '');
  v_email := COALESCE(NEW.email, '');

  IF NEW.raw_user_meta_data->>'role' IN ('customer', 'merchant') THEN
    v_role := (NEW.raw_user_meta_data->>'role')::user_role;
  END IF;

  INSERT INTO public.profiles (
    id, email, phone, full_name, role, is_active, created_at, updated_at
  )
  VALUES (
    NEW.id, v_email, v_phone, v_full_name, v_role, true, NOW(), NOW()
  )
  ON CONFLICT (id) DO UPDATE
    SET
      email      = EXCLUDED.email,
      phone      = COALESCE(NULLIF(EXCLUDED.phone, ''), profiles.phone),
      updated_at = NOW();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();

-- 6. Auto-create customer record when profile role = customer
CREATE OR REPLACE FUNCTION public.handle_new_customer_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role = 'customer' THEN
    INSERT INTO public.customers (
      profile_id, mobile, preferred_language, created_at, updated_at
    )
    VALUES (
      NEW.id, COALESCE(NEW.phone, ''), 'en', NOW(), NOW()
    )
    ON CONFLICT (profile_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_customer_profile_created ON profiles;
CREATE TRIGGER on_customer_profile_created
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_customer_profile();

-- 7. RLS policies for profiles
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 8. Merchants table RLS
DROP POLICY IF EXISTS "Merchants can insert their own record" ON merchants;
CREATE POLICY "Merchants can insert their own record"
  ON merchants FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = profile_id AND id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Merchants can read their own record" ON merchants;
CREATE POLICY "Merchants can read their own record"
  ON merchants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = profile_id AND id = auth.uid()
    ) OR is_admin()
  );

DROP POLICY IF EXISTS "Merchants can update their own record" ON merchants;
CREATE POLICY "Merchants can update their own record"
  ON merchants FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = profile_id AND id = auth.uid()
    ) OR is_admin()
  );

-- 9. Businesses table RLS
DROP POLICY IF EXISTS "Merchants can insert their own businesses" ON businesses;
CREATE POLICY "Merchants can insert their own businesses"
  ON businesses FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM merchants m
      WHERE m.id = merchant_id AND m.profile_id = auth.uid()
    ) OR is_admin()
  );

DROP POLICY IF EXISTS "Merchants can read their own businesses" ON businesses;
CREATE POLICY "Merchants can read their own businesses"
  ON businesses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM merchants m
      WHERE m.id = merchant_id AND m.profile_id = auth.uid()
    ) OR is_admin()
  );

DROP POLICY IF EXISTS "Merchants can update their own businesses" ON businesses;
CREATE POLICY "Merchants can update their own businesses"
  ON businesses FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM merchants m
      WHERE m.id = merchant_id AND m.profile_id = auth.uid()
    ) OR is_admin()
  );

-- 10. Customers table RLS
DROP POLICY IF EXISTS "Customers can read their own record" ON customers;
CREATE POLICY "Customers can read their own record"
  ON customers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = profile_id AND id = auth.uid()
    ) OR is_admin()
  );

DROP POLICY IF EXISTS "Customers can update their own record" ON customers;
CREATE POLICY "Customers can update their own record"
  ON customers FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = profile_id AND id = auth.uid()
    ) OR is_admin()
  );

DROP POLICY IF EXISTS "Customers can insert their own record" ON customers;
CREATE POLICY "Customers can insert their own record"
  ON customers FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = profile_id AND id = auth.uid()
    )
  );

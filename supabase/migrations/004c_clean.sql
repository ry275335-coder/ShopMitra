-- ============================================================
-- 004c_clean.sql
-- Clean minimal migration — no ALTER COLUMN email
-- Paste entire contents in Supabase SQL Editor → Run
-- ============================================================

-- Step 1: Add phone & username columns (safe if already exist)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone VARCHAR(30);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username VARCHAR(60);

-- Step 2: Profile auto-creation trigger (fires on new auth.users row)
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, phone, full_name, role, is_active, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.phone, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    'customer',
    true,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email      = COALESCE(NULLIF(EXCLUDED.email, ''), profiles.email),
    phone      = COALESCE(NULLIF(EXCLUDED.phone, ''), profiles.phone),
    updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();

-- Step 3: Customer record auto-creation trigger
CREATE OR REPLACE FUNCTION public.handle_new_customer_profile()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.role = 'customer' THEN
    INSERT INTO public.customers (profile_id, mobile, preferred_language, created_at, updated_at)
    VALUES (NEW.id, COALESCE(NEW.phone, ''), 'en', NOW(), NOW())
    ON CONFLICT (profile_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_customer_profile_created ON profiles;
CREATE TRIGGER on_customer_profile_created
  AFTER INSERT ON profiles FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_customer_profile();

-- Step 4: RLS — profiles INSERT
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Step 5: RLS — merchants
DROP POLICY IF EXISTS "Merchants can insert their own record" ON merchants;
CREATE POLICY "Merchants can insert their own record"
  ON merchants FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = profile_id AND id = auth.uid()));

DROP POLICY IF EXISTS "Merchants can read their own record" ON merchants;
CREATE POLICY "Merchants can read their own record"
  ON merchants FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = profile_id AND id = auth.uid()) OR is_admin());

DROP POLICY IF EXISTS "Merchants can update their own record" ON merchants;
CREATE POLICY "Merchants can update their own record"
  ON merchants FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = profile_id AND id = auth.uid()) OR is_admin());

-- Step 6: RLS — businesses
DROP POLICY IF EXISTS "Merchants can insert their own businesses" ON businesses;
CREATE POLICY "Merchants can insert their own businesses"
  ON businesses FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM merchants m WHERE m.id = merchant_id AND m.profile_id = auth.uid()) OR is_admin());

DROP POLICY IF EXISTS "Merchants can read their own businesses" ON businesses;
CREATE POLICY "Merchants can read their own businesses"
  ON businesses FOR SELECT
  USING (EXISTS (SELECT 1 FROM merchants m WHERE m.id = merchant_id AND m.profile_id = auth.uid()) OR is_admin());

DROP POLICY IF EXISTS "Merchants can update their own businesses" ON businesses;
CREATE POLICY "Merchants can update their own businesses"
  ON businesses FOR UPDATE
  USING (EXISTS (SELECT 1 FROM merchants m WHERE m.id = merchant_id AND m.profile_id = auth.uid()) OR is_admin());

-- Step 7: RLS — customers
DROP POLICY IF EXISTS "Customers can insert their own record" ON customers;
CREATE POLICY "Customers can insert their own record"
  ON customers FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = profile_id AND id = auth.uid()));

DROP POLICY IF EXISTS "Customers can read their own record" ON customers;
CREATE POLICY "Customers can read their own record"
  ON customers FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = profile_id AND id = auth.uid()) OR is_admin());

DROP POLICY IF EXISTS "Customers can update their own record" ON customers;
CREATE POLICY "Customers can update their own record"
  ON customers FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = profile_id AND id = auth.uid()) OR is_admin());

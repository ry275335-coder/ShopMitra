-- ============================================================
-- QUERY 1: Add columns + Triggers
-- Paste this FIRST in Supabase SQL Editor → Run
-- ============================================================

-- Add phone & username if missing
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone VARCHAR(30);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username VARCHAR(60);

-- Make email nullable (phone-only users won't have email)
DO $$
BEGIN
  BEGIN
    ALTER TABLE profiles ALTER COLUMN email DROP NOT NULL;
  EXCEPTION WHEN OTHERS THEN
    NULL; -- already nullable, ignore
  END;
END $$;

ALTER TABLE profiles ALTER COLUMN email SET DEFAULT '';

-- ── Auto-create profile trigger on new auth.users ──────────────
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

-- ── Auto-create customer record for new customer profiles ──────
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

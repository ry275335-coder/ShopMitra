-- ==============================================================================
-- 005_multi_account_architecture.sql
-- Enables simultaneous Customer and Merchant accounts under a single Supabase user
-- ==============================================================================

-- 1. Drop trigger that automatically forces customer creation on profile creation
-- This allows direct merchant-first registration without creating an empty customer row.
DROP TRIGGER IF EXISTS on_customer_profile_created ON profiles;
DROP FUNCTION IF EXISTS handle_new_customer_profile();

-- 2. Ensure RLS policies on customers, merchants, businesses, and shops allow
-- the owner (auth.uid() = profile_id) to SELECT, INSERT, and UPDATE independently.

-- Ensure customers table RLS
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'customers' AND policyname = 'Users can view own customer profile'
  ) THEN
    CREATE POLICY "Users can view own customer profile"
      ON customers FOR SELECT
      USING (auth.uid() = profile_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'customers' AND policyname = 'Users can insert own customer profile'
  ) THEN
    CREATE POLICY "Users can insert own customer profile"
      ON customers FOR INSERT
      WITH CHECK (auth.uid() = profile_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'customers' AND policyname = 'Users can update own customer profile'
  ) THEN
    CREATE POLICY "Users can update own customer profile"
      ON customers FOR UPDATE
      USING (auth.uid() = profile_id);
  END IF;
END $$;

-- Ensure merchants table RLS
ALTER TABLE merchants ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'merchants' AND policyname = 'Users can view own merchant profile'
  ) THEN
    CREATE POLICY "Users can view own merchant profile"
      ON merchants FOR SELECT
      USING (auth.uid() = profile_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'merchants' AND policyname = 'Users can insert own merchant profile'
  ) THEN
    CREATE POLICY "Users can insert own merchant profile"
      ON merchants FOR INSERT
      WITH CHECK (auth.uid() = profile_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'merchants' AND policyname = 'Users can update own merchant profile'
  ) THEN
    CREATE POLICY "Users can update own merchant profile"
      ON merchants FOR UPDATE
      USING (auth.uid() = profile_id);
  END IF;
END $$;

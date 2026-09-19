-- ==============================================================================
-- 009_security_hardening.sql
-- Production Security Hardening: Restrict public profiles SELECT policy
-- Eliminates anonymous user harvesting and enforces zero-trust profile visibility
-- ==============================================================================

SET search_path TO public;

-- 1. Drop the overly permissive public SELECT policy from migration 003
DROP POLICY IF EXISTS "Public profiles are readable by everyone" ON public.profiles;

-- 2. Create restricted SELECT policy:
-- Authenticated users can read their own profile row.
-- Authorized administrators (super_admin, admin, moderator) can view user profiles for governance.
-- Unauthenticated / public callers cannot read arbitrary user records.
DROP POLICY IF EXISTS "Users and admins can view profiles" ON public.profiles;
CREATE POLICY "Users and admins can view profiles"
  ON public.profiles
  FOR SELECT
  USING (
    auth.uid() = id
    OR public.is_admin()
  );

-- 3. Ensure INSERT policy is intact
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 4. Ensure UPDATE policy is intact
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id OR public.is_admin())
  WITH CHECK (auth.uid() = id OR public.is_admin());

-- 5. Ensure DELETE is restricted to administrative staff or service role
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
CREATE POLICY "Admins can delete profiles"
  ON public.profiles
  FOR DELETE
  USING (public.is_admin());

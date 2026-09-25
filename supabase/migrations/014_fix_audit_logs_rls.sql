-- ==============================================================================
-- Migration 014: Fix audit_logs RLS Policies (Security Hardening CRIT-02)
-- ==============================================================================
-- Description:
--   Removes the dangerous 'OR auth.uid() IS NULL' clause from public.audit_logs SELECT policy.
--   Restricts SELECT access strictly to active admins via public.is_admin_user().
--   Denies SELECT access to anonymous users, unauthenticated callers, customers, and merchants.
--   Preserves audit log immutability (denying UPDATE and DELETE).
-- ==============================================================================

-- 1. Ensure RLS is enabled on public.audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 2. Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;

-- 3. Re-create the SELECT policy strictly requiring an authenticated admin
CREATE POLICY "Admins can view audit logs"
    ON public.audit_logs FOR SELECT
    USING (public.is_admin_user());

-- 4. Ensure immutability policies remain strictly in place
DROP POLICY IF EXISTS "Deny audit update" ON public.audit_logs;
CREATE POLICY "Deny audit update"
    ON public.audit_logs FOR UPDATE
    USING (false);

DROP POLICY IF EXISTS "Deny audit delete" ON public.audit_logs;
CREATE POLICY "Deny audit delete"
    ON public.audit_logs FOR DELETE
    USING (false);

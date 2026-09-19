-- ==============================================================================
-- 007_admin_users_system.sql
-- Dedicated Admin Users Authorization Table, Multi-Tier RBAC & Audit Enhancement
-- ==============================================================================

-- 1. Create dedicated admin_users table
CREATE TABLE IF NOT EXISTS public.admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    admin_role VARCHAR(20) NOT NULL CHECK (admin_role IN ('super_admin', 'admin', 'moderator')),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_admin_users_user_id ON public.admin_users(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_role ON public.admin_users(admin_role);
CREATE INDEX IF NOT EXISTS idx_admin_users_status ON public.admin_users(status);

-- 2. Create or enhance audit_logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(50) NOT NULL,
    target_id VARCHAR(150),
    metadata JSONB DEFAULT '{}'::jsonb,
    old_value JSONB DEFAULT NULL,
    new_value JSONB DEFAULT NULL,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure old_value and new_value exist if audit_logs was already created earlier
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'audit_logs') THEN
    ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS old_value JSONB DEFAULT NULL;
    ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS new_value JSONB DEFAULT NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_id ON public.audit_logs(admin_id);

-- 3. Security Definer Helper Functions for RLS
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = auth.uid() 
      AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_super_admin_user()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = auth.uid() 
      AND admin_role = 'super_admin'
      AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Enable RLS on admin_users
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Admins can view other admin records; or a user can view their own record
DROP POLICY IF EXISTS "Active admins can view admin_users" ON public.admin_users;
CREATE POLICY "Active admins can view admin_users"
    ON public.admin_users FOR SELECT
    USING (public.is_admin_user() OR user_id = auth.uid());

-- Only super_admin or service_role can INSERT new admin_users
DROP POLICY IF EXISTS "Super admins can insert admin_users" ON public.admin_users;
CREATE POLICY "Super admins can insert admin_users"
    ON public.admin_users FOR INSERT
    WITH CHECK (public.is_super_admin_user() OR auth.uid() IS NULL);

-- Only super_admin or service_role can UPDATE admin_users
DROP POLICY IF EXISTS "Super admins can update admin_users" ON public.admin_users;
CREATE POLICY "Super admins can update admin_users"
    ON public.admin_users FOR UPDATE
    USING (public.is_super_admin_user() OR auth.uid() IS NULL)
    WITH CHECK (public.is_super_admin_user() OR auth.uid() IS NULL);

-- Only super_admin or service_role can DELETE admin_users
DROP POLICY IF EXISTS "Super admins can delete admin_users" ON public.admin_users;
CREATE POLICY "Super admins can delete admin_users"
    ON public.admin_users FOR DELETE
    USING (public.is_super_admin_user() OR auth.uid() IS NULL);

-- 5. Auto-update updated_at timestamp trigger
CREATE OR REPLACE FUNCTION public.update_admin_users_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_admin_users_timestamp ON public.admin_users;
CREATE TRIGGER trg_update_admin_users_timestamp
    BEFORE UPDATE ON public.admin_users
    FOR EACH ROW
    EXECUTE FUNCTION public.update_admin_users_timestamp();

-- 6. Enable RLS on audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
CREATE POLICY "Admins can view audit logs"
    ON public.audit_logs FOR SELECT
    USING (public.is_admin_user() OR auth.uid() IS NULL);

DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;
CREATE POLICY "System can insert audit logs"
    ON public.audit_logs FOR INSERT
    WITH CHECK (true);


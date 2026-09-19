import React from 'react';
import { redirect } from 'next/navigation';
import { getAuthenticatedUser, createAdminSupabase } from '@/lib/supabase/server';
import { AdminLayoutShell } from '@/components/admin/AdminLayoutShell';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect('/admin/login?next=/admin/dashboard');
  }

  const adminDb = createAdminSupabase();

  // 1. Check isolated admin_users table
  const { data: adminUserRecord } = await adminDb
    .from('admin_users')
    .select('id, user_id, admin_role, status')
    .eq('user_id', user.id)
    .maybeSingle();

  let role: string | undefined = adminUserRecord?.admin_role;
  let isActive = adminUserRecord?.status === 'active';

  // 2. Compatibility check: query profiles if admin_users migration is still running
  if (!adminUserRecord) {
    const { data: profile } = await adminDb
      .from('profiles')
      .select('id, full_name, email, role, is_active')
      .eq('id', user.id)
      .maybeSingle();

    if (profile && ['super_admin', 'admin', 'moderator'].includes(profile.role)) {
      role = profile.role;
      isActive = profile.is_active !== false;
    }
  }

  const isAllowedRole = Boolean(role && ['super_admin', 'admin', 'moderator'].includes(role));

  if (!isAllowedRole) {
    redirect('/admin/login?error=unauthorized');
  }

  if (!isActive) {
    redirect('/admin/login?error=suspended');
  }

  // Fetch admin display name & email
  const { data: profile } = await adminDb
    .from('profiles')
    .select('full_name, email')
    .eq('id', user.id)
    .maybeSingle();

  const adminUser = {
    id: user.id,
    email: profile?.email || user.email || 'admin@shopmitra.in',
    role: role as string,
    name: profile?.full_name || (user.email ? user.email.split('@')[0] : 'Administrator'),
  };

  return <AdminLayoutShell adminUser={adminUser}>{children}</AdminLayoutShell>;
}

'use client';

import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { AdminSidebar } from './AdminSidebar';
import { AdminHeader } from './AdminHeader';
import { getAdminDashboardDataAction, type AdminDashboardPayload } from '@/server/actions/admin.actions';
import { ToastProvider, useToast } from '@/components/ui/Toast';
import { createClient } from '@/lib/supabase/client';

interface AdminUser {
  id: string;
  email: string;
  role: string;
  name: string;
}

interface AdminDataContextType {
  adminUser: AdminUser;
  payload: AdminDashboardPayload | null;
  isLoading: boolean;
  refreshData: (silent?: boolean) => Promise<void>;
}

const AdminDataContext = createContext<AdminDataContextType | null>(null);

export function useAdminData() {
  const context = useContext(AdminDataContext);
  if (!context) {
    throw new Error('useAdminData must be used within an AdminLayoutShell');
  }
  return context;
}

interface AdminLayoutShellProps {
  adminUser: AdminUser;
  children: React.ReactNode;
}

export function AdminLayoutShell({ adminUser, children }: AdminLayoutShellProps) {
  const router = useRouter();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [payload, setPayload] = useState<AdminDashboardPayload | null>(null);

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setIsRefreshing(true);
    try {
      const res = await getAdminDashboardDataAction();
      if (res.success) {
        setPayload(res);
      }
    } catch (err) {
      console.error('Failed to load admin payload:', err);
    } finally {
      if (!silent) setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData(true);
  }, [loadData]);

  const handleSignOut = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push('/?auth=signed_out');
      router.refresh();
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  const pendingShopsCount = payload?.stats?.pendingShops ?? 0;
  const activeAnomaliesCount = payload?.stats?.activeAnomalies ?? 0;
  const openReportsCount = payload?.stats?.openReports ?? 0;

  return (
    <AdminDataContext.Provider
      value={{
        adminUser,
        payload,
        isLoading: isRefreshing,
        refreshData: loadData,
      }}
    >
      <div className="min-h-screen bg-slate-950 text-slate-100 flex">
        {/* Admin Navigation Sidebar */}
        <AdminSidebar
          adminRole={adminUser.role}
          pendingVerifications={pendingShopsCount}
          activeAnomalies={activeAnomaliesCount}
          openReports={openReportsCount}
          isMobileOpen={isMobileOpen}
          onCloseMobile={() => setIsMobileOpen(false)}
          onSignOut={handleSignOut}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 lg:pl-72">
          {/* Header */}
          <AdminHeader
            adminEmail={adminUser.email}
            adminRole={adminUser.role}
            adminName={adminUser.name}
            isRefreshing={isRefreshing}
            onRefresh={() => loadData(false)}
            onOpenMobileSidebar={() => setIsMobileOpen(true)}
          />

          {/* Page Content */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
            {children}
          </main>
        </div>
      </div>
    </AdminDataContext.Provider>
  );
}

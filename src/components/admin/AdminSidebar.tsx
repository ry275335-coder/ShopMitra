'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  BadgeCheck,
  Users,
  Store,
  Package,
  FolderTree,
  AlertTriangle,
  MessageSquare,
  FileWarning,
  FileText,
  Settings,
  Bell,
  ExternalLink,
  ShieldAlert,
  ChevronRight,
  LogOut,
  X,
  UserCheck,
  Building2,
  BarChart3,
  ShieldCheck,
  Crown
} from 'lucide-react';

interface AdminSidebarProps {
  pendingVerifications?: number;
  activeAnomalies?: number;
  openReports?: number;
  adminRole?: string;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  onSignOut?: () => void;
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  badgeColor?: string;
  roles?: string[]; // Allowed roles. Default all admin tiers
}

const NAV_ITEMS: NavItem[] = [
  {
    name: 'Dashboard',
    href: '/admin/dashboard',
    icon: LayoutDashboard,
  },
  {
    name: 'Users Ledger',
    href: '/admin/users',
    icon: Users,
    roles: ['super_admin', 'admin'],
  },
  {
    name: 'Customers',
    href: '/admin/customers',
    icon: UserCheck,
    roles: ['super_admin', 'admin'],
  },
  {
    name: 'Merchants',
    href: '/admin/merchants',
    icon: Building2,
    roles: ['super_admin', 'admin'],
  },
  {
    name: 'Shops & Counters',
    href: '/admin/shops',
    icon: Store,
  },
  {
    name: 'Master Products',
    href: '/admin/products',
    icon: Package,
  },
  {
    name: 'Categories',
    href: '/admin/categories',
    icon: FolderTree,
  },
  {
    name: 'Merchant Verification',
    href: '/admin/merchant-verification',
    icon: BadgeCheck,
    badgeColor: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
  },
  {
    name: 'Review Moderation',
    href: '/admin/reviews',
    icon: MessageSquare,
  },
  {
    name: 'Disputes & Reports',
    href: '/admin/reports',
    icon: FileWarning,
    badgeColor: 'bg-orange-500/20 text-orange-400 border border-orange-500/30',
  },
  {
    name: 'Notifications',
    href: '/admin/notifications',
    icon: Bell,
  },
  {
    name: 'Analytics',
    href: '/admin/analytics',
    icon: BarChart3,
  },
  {
    name: 'Audit Logs',
    href: '/admin/audit-logs',
    icon: FileText,
    roles: ['super_admin', 'admin'],
  },
  {
    name: 'Admin Management',
    href: '/admin/admin-management',
    icon: Crown,
    roles: ['super_admin'],
  },
  {
    name: 'Platform Settings',
    href: '/admin/settings',
    icon: Settings,
    roles: ['super_admin'],
  },
  {
    name: 'Security & RLS',
    href: '/admin/security',
    icon: ShieldCheck,
    roles: ['super_admin'],
  },
];

export function AdminSidebar({
  pendingVerifications = 0,
  activeAnomalies = 0,
  openReports = 0,
  adminRole = 'admin',
  isMobileOpen = false,
  onCloseMobile,
  onSignOut,
}: AdminSidebarProps) {
  const pathname = usePathname();

  // Attach real-time badges
  const navItemsWithBadges = NAV_ITEMS.map((item) => {
    if (item.href === '/admin/merchant-verification' && pendingVerifications > 0) {
      return { ...item, badge: pendingVerifications };
    }
    if (item.href === '/admin/inventory' && activeAnomalies > 0) {
      return { ...item, badge: activeAnomalies };
    }
    if (item.href === '/admin/reports' && openReports > 0) {
      return { ...item, badge: openReports };
    }
    return item;
  }).filter((item) => {
    if (!item.roles) return true;
    return item.roles.includes(adminRole);
  });

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden animate-fade-in"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 flex flex-col bg-slate-950 border-r border-slate-800 text-slate-200 transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header Branding */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800 bg-slate-900/50">
          <Link href="/admin/dashboard" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-600/30 text-white font-bold group-hover:scale-105 transition-transform">
              <ShieldAlert className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-white">ShopMitra</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 tracking-wider uppercase">
                  Admin
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Master Governance Desk</p>
            </div>
          </Link>

          {/* Close button on mobile */}
          <button
            onClick={onCloseMobile}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Role Badge Indicator */}
        <div className="px-6 py-3 bg-slate-900/70 border-b border-slate-800/80 flex items-center justify-between text-xs">
          <span className="text-slate-400">Governance Tier:</span>
          <span
            className={`font-semibold uppercase tracking-wider text-[10px] px-2 py-0.5 rounded ${
              adminRole === 'super_admin'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                : adminRole === 'admin'
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
            }`}
          >
            {adminRole?.replace('_', ' ')}
          </span>
        </div>

        {/* Navigation List */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1 custom-scrollbar">
          <div className="px-3 pb-2 text-[10px] font-bold tracking-wider uppercase text-slate-500">
            Navigation Desk
          </div>
          {navItemsWithBadges.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onCloseMobile}
                className={`group flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                    }`}
                  />
                  <span>{item.name}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  {item.badge !== undefined && (
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        isActive ? 'bg-white/20 text-white' : item.badgeColor || 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                  {isActive && <ChevronRight className="w-3.5 h-3.5 text-white/70" />}
                </div>
              </Link>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/30 space-y-2">
          <Link
            href="/"
            target="_blank"
            className="flex items-center justify-between w-full px-3 py-2 text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800/60 rounded-lg transition-colors"
          >
            <span className="flex items-center gap-2">
              <ExternalLink className="w-3.5 h-3.5" />
              Public Storefront
            </span>
            <span className="text-[10px] text-slate-500">Live</span>
          </Link>

          {onSignOut && (
            <button
              onClick={onSignOut}
              className="flex items-center gap-2 w-full px-3 py-2 text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out Session
            </button>
          )}
        </div>
      </aside>
    </>
  );
}

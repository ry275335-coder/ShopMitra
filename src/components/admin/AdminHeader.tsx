'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import {
  Menu,
  RefreshCw,
  Shield,
  ExternalLink,
  Bell,
  CheckCircle2,
  Database
} from 'lucide-react';
import Link from 'next/link';

interface AdminHeaderProps {
  adminEmail?: string;
  adminRole?: string;
  adminName?: string;
  isRefreshing?: boolean;
  onRefresh?: () => void;
  onOpenMobileSidebar?: () => void;
}

const SECTION_TITLES: Record<string, { title: string; subtitle: string }> = {
  '/admin/dashboard': {
    title: 'Platform Overview',
    subtitle: 'Real-time telemetry, KPIs, and governance radar',
  },
  '/admin/merchant-verification': {
    title: 'Merchant Verification Desk',
    subtitle: 'KYC, GSTIN, shop ownership, and counter authenticity validation',
  },
  '/admin/users': {
    title: 'User Management Ledger',
    subtitle: 'Customer, merchant, and staff identities with suspension lifecycle',
  },
  '/admin/shops': {
    title: 'Stores & Counters Directory',
    subtitle: 'Physical local shop listings, verification badges, and status',
  },
  '/admin/products': {
    title: 'Master Catalog Management',
    subtitle: 'Canonical product database, duplicate detection, and category mappings',
  },
  '/admin/categories': {
    title: 'Taxonomy & Categories',
    subtitle: 'Organize category tree, subcategories, and slug routing',
  },
  '/admin/inventory': {
    title: 'Inventory & Anti-Fraud Shield',
    subtitle: 'Deep discount anomaly audit, predatory pricing, and out-of-stock monitor',
  },
  '/admin/reviews': {
    title: 'Review Moderation Desk',
    subtitle: 'Customer ratings, authenticity audits, and community safeguards',
  },
  '/admin/reports': {
    title: 'Grievance & Dispute Resolution',
    subtitle: 'Shopper price discrepancy reports and merchant claims ledger',
  },
  '/admin/audit-logs': {
    title: 'Immutable Audit Trail',
    subtitle: 'Cryptographically indexed ledger of all administrative interventions',
  },
  '/admin/notifications': {
    title: 'System Alerts & Broadcasts',
    subtitle: 'Active incident monitor, webhooks, and merchant announcements',
  },
  '/admin/customers': {
    title: 'Customer Identity Directory',
    subtitle: 'Shopper profiles, phone credentials, and account suspension',
  },
  '/admin/merchants': {
    title: 'Merchant Operations Desk',
    subtitle: 'Retailer verification, business authenticity, and physical shop registry',
  },
  '/admin/admin-management': {
    title: 'Staff & Admin Management',
    subtitle: 'Super Admin authority: Authorize staff accounts, manage tiers, and enforce access revocation',
  },
  '/admin/analytics': {
    title: 'Platform Telemetry & Growth',
    subtitle: 'Network velocity, retailer regional density, and catalog performance',
  },
  '/admin/security': {
    title: 'Security Audit & RBAC Matrix',
    subtitle: 'Database RLS policies, credential isolation, and defense-in-depth posture',
  },
  '/admin/settings': {
    title: 'Security & Platform Controls',
    subtitle: 'Maintenance mode, emergency registration toggles, and RBAC policies',
  },
};

export function AdminHeader({
  adminEmail = 'admin@shopmitra.in',
  adminRole = 'admin',
  adminName = 'System Administrator',
  isRefreshing = false,
  onRefresh,
  onOpenMobileSidebar,
}: AdminHeaderProps) {
  const pathname = usePathname();
  const activeMeta = SECTION_TITLES[pathname] || {
    title: 'Admin Governance',
    subtitle: 'Centralized Platform Oversight',
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-4 sm:px-8 py-3.5 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 text-slate-100 transition-all">
      {/* Left: Mobile trigger & Section Title */}
      <div className="flex items-center gap-3 sm:gap-4">
        <button
          onClick={onOpenMobileSidebar}
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 lg:hidden"
          aria-label="Open sidebar menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h1 className="text-base sm:text-lg font-bold text-white tracking-tight leading-tight">
            {activeMeta.title}
          </h1>
          <p className="text-xs text-slate-400 hidden sm:block">
            {activeMeta.subtitle}
          </p>
        </div>
      </div>

      {/* Right: Actions & User Capsule */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Live DB Indicator / Refresh */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 hover:border-slate-700 transition-all disabled:opacity-60"
          title="Calibrate live database state"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-indigo-400 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">{isRefreshing ? 'Syncing...' : 'Sync DB'}</span>
        </button>

        {/* Live Status Pill */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>Live Supabase</span>
        </div>

        {/* User Capsule */}
        <div className="flex items-center gap-2.5 pl-2 sm:pl-3 border-l border-slate-800">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs shadow-md shadow-indigo-600/20">
            {adminName?.charAt(0)?.toUpperCase() || 'A'}
          </div>
          <div className="hidden sm:block text-left">
            <div className="text-xs font-semibold text-white leading-tight max-w-[140px] truncate">
              {adminEmail}
            </div>
            <div className="text-[10px] font-medium text-indigo-400 uppercase tracking-wider">
              {adminRole?.replace('_', ' ')}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

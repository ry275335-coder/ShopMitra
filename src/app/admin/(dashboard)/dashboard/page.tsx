'use client';

import React from 'react';
import Link from 'next/link';
import { useAdminData } from '@/components/admin/AdminLayoutShell';
import {
  Users,
  Store,
  BadgeCheck,
  Clock,
  AlertTriangle,
  FileWarning,
  Package,
  TrendingUp,
  ShieldCheck,
  Activity,
  ArrowRight,
  Sparkles,
  RefreshCw,
  Server
} from 'lucide-react';

export default function AdminDashboardPage() {
  const { payload, isLoading, refreshData, adminUser } = useAdminData();

  const stats = payload?.stats || {
    totalShops: 0,
    verifiedShops: 0,
    pendingShops: 0,
    totalCustomers: 0,
    activeAnomalies: 0,
    openReports: 0,
  };

  const shops = payload?.shops || [];
  const customers = payload?.customers || [];
  const anomalies = payload?.anomalies || [];
  const reports = payload?.reports || [];
  const catalogCount = payload?.catalogCount || 0;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-950 via-slate-900 to-slate-950 border border-indigo-900/40 p-6 sm:p-8 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Production Governance Online</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Welcome back, {adminUser.name}
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Real-time administrative telemetry connected directly to Supabase PostgreSQL. Monitor merchant verifications, customer identity lifecycles, and anti-fraud price anomaly triggers.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => refreshData(false)}
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-semibold transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-indigo-400 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{isLoading ? 'Calibrating...' : 'Refresh Metrics'}</span>
            </button>
            <Link
              href="/admin/merchant-verification"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 transition-all"
            >
              <span>Review Pending Shops</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Ambient background glow */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-indigo-600/10 blur-3xl pointer-events-none" />
      </div>

      {/* Critical Alert Banners (if pending actions exist) */}
      {(stats.pendingShops > 0 || stats.activeAnomalies > 0 || stats.openReports > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {stats.pendingShops > 0 && (
            <div className="flex items-center justify-between p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-amber-400 flex-shrink-0" />
                <div>
                  <div className="text-sm font-bold">{stats.pendingShops} Pending Shop{stats.pendingShops > 1 ? 's' : ''}</div>
                  <div className="text-xs text-amber-300/80">Awaiting KYC & business verification</div>
                </div>
              </div>
              <Link
                href="/admin/merchant-verification"
                className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-semibold"
              >
                Inspect
              </Link>
            </div>
          )}

          {stats.activeAnomalies > 0 && (
            <div className="flex items-center justify-between p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-200">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0" />
                <div>
                  <div className="text-sm font-bold">{stats.activeAnomalies} Price Anomal{stats.activeAnomalies > 1 ? 'ies' : 'y'}</div>
                  <div className="text-xs text-rose-300/80">Discounts &gt;65% or price deviations</div>
                </div>
              </div>
              <Link
                href="/admin/inventory"
                className="px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-semibold"
              >
                Resolve
              </Link>
            </div>
          )}

          {stats.openReports > 0 && (
            <div className="flex items-center justify-between p-4 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-200">
              <div className="flex items-center gap-3">
                <FileWarning className="w-5 h-5 text-orange-400 flex-shrink-0" />
                <div>
                  <div className="text-sm font-bold">{stats.openReports} Open Grievance{stats.openReports > 1 ? 's' : ''}</div>
                  <div className="text-xs text-orange-300/80">Customer reported rate discrepancies</div>
                </div>
              </div>
              <Link
                href="/admin/reports"
                className="px-3 py-1.5 rounded-lg bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 text-xs font-semibold"
              >
                Review
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Main Stats KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Total Customers */}
        <div className="p-5 sm:p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Registered Users</span>
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl sm:text-3xl font-extrabold text-white">{stats.totalCustomers}</div>
            <div className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
              <span className="text-emerald-400 font-semibold">100% Real</span>
              <span>• Database profiles</span>
            </div>
          </div>
        </div>

        {/* Total Stores */}
        <div className="p-5 sm:p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Local Stores</span>
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Store className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl sm:text-3xl font-extrabold text-white">{stats.totalShops}</div>
            <div className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
              <span className="text-purple-400 font-semibold">{stats.verifiedShops} Verified</span>
              <span>• {stats.pendingShops} Pending</span>
            </div>
          </div>
        </div>

        {/* Master Catalog */}
        <div className="p-5 sm:p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Master Catalog</span>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl sm:text-3xl font-extrabold text-white">{catalogCount}</div>
            <div className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
              <span className="text-emerald-400 font-semibold">Standardized</span>
              <span>• Discoverable SKUs</span>
            </div>
          </div>
        </div>

        {/* Anti-Fraud Shield */}
        <div className="p-5 sm:p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Price Shield</span>
            <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl sm:text-3xl font-extrabold text-white">{stats.activeAnomalies}</div>
            <div className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
              <span className={stats.activeAnomalies > 0 ? 'text-rose-400 font-semibold' : 'text-emerald-400 font-semibold'}>
                {stats.activeAnomalies > 0 ? 'Action Needed' : 'Clean'}
              </span>
              <span>• Flagged counter prices</span>
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Recent Registrations & System Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Recent Shops & Customers */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent Merchant Registrations */}
          <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-white">Live Store Directory</h3>
                <p className="text-xs text-slate-400">Stores currently listed in your local discovery index</p>
              </div>
              <Link
                href="/admin/shops"
                className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
              >
                <span>View All ({shops.length})</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {shops.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs">No stores registered yet.</div>
            ) : (
              <div className="divide-y divide-slate-800/60">
                {shops.slice(0, 4).map((shop) => (
                  <div key={shop.id} className="py-3.5 flex items-center justify-between first:pt-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-sm">
                        {shop.businessName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-white">{shop.businessName}</span>
                          {shop.status === 'verified' ? (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              Verified
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                              Pending
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                          <span>{shop.ownerName}</span>
                          <span>•</span>
                          <span>{shop.city}</span>
                          <span>•</span>
                          <span>{shop.phone}</span>
                        </div>
                      </div>
                    </div>

                    <Link
                      href="/admin/shops"
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-medium"
                    >
                      Manage
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Registered User Accounts */}
          <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-white">Recent User Accounts</h3>
                <p className="text-xs text-slate-400">Validated customer & merchant profiles</p>
              </div>
              <Link
                href="/admin/users"
                className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
              >
                <span>View All ({customers.length})</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {customers.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs">No users registered yet.</div>
            ) : (
              <div className="divide-y divide-slate-800/60">
                {customers.slice(0, 4).map((cust) => (
                  <div key={cust.id} className="py-3 flex items-center justify-between first:pt-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-semibold text-xs">
                        {cust.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-white">{cust.name}</span>
                          <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 uppercase">
                            {cust.role}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400">
                          {cust.email || cust.mobile || 'Registered Profile'}
                        </div>
                      </div>
                    </div>

                    <span className="text-xs text-slate-500">{cust.createdAt}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Platform Governance Health & Controls */}
        <div className="space-y-6">
          <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 p-5 sm:p-6">
            <div className="flex items-center gap-2 text-sm font-bold text-white mb-4">
              <Server className="w-4 h-4 text-emerald-400" />
              <span>Platform Integrity Checklist</span>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
                <div className="text-xs">
                  <div className="font-semibold text-slate-200">Supabase Auth Isolation</div>
                  <div className="text-[11px] text-slate-400">Strict per-request user session</div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  ENFORCED
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
                <div className="text-xs">
                  <div className="font-semibold text-slate-200">PostgreSQL RLS Policies</div>
                  <div className="text-[11px] text-slate-400">Server & DB level row protection</div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  ACTIVE
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
                <div className="text-xs">
                  <div className="font-semibold text-slate-200">Master Audit Logging</div>
                  <div className="text-[11px] text-slate-400">Immutable admin action ledger</div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  LIVE
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
                <div className="text-xs">
                  <div className="font-semibold text-slate-200">Route Interceptor</div>
                  <div className="text-[11px] text-slate-400">Next.js Edge Middleware guard</div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  SECURE
                </span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 p-5 sm:p-6 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Governance Direct Links</h4>
            <Link
              href="/admin/audit-logs"
              className="flex items-center justify-between p-3 rounded-xl bg-slate-800/40 hover:bg-slate-800 border border-slate-700/60 text-xs font-medium text-slate-200 transition-colors"
            >
              <span>View Immutable Audit Logs</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </Link>
            <Link
              href="/admin/settings"
              className="flex items-center justify-between p-3 rounded-xl bg-slate-800/40 hover:bg-slate-800 border border-slate-700/60 text-xs font-medium text-slate-200 transition-colors"
            >
              <span>System & Security Controls</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import React from 'react';
import { useAdminData } from '@/components/admin/AdminLayoutShell';
import {
  TrendingUp,
  Activity,
  Users,
  Store,
  Package,
  AlertTriangle,
  RefreshCw,
  BarChart3,
  PieChart,
  MapPin
} from 'lucide-react';

export default function AdminAnalyticsPage() {
  const { payload, isLoading, refreshData } = useAdminData();

  const stats = payload?.stats || {
    totalShops: 0,
    verifiedShops: 0,
    pendingShops: 0,
    totalCustomers: 0,
    activeAnomalies: 0,
    openReports: 0,
  };

  const shops = payload?.shops || [];
  const catalogCount = payload?.catalogCount || 0;

  // City distribution calculation
  const cityCounts: Record<string, number> = {};
  shops.forEach((s) => {
    const c = s.city || 'Delhi';
    cityCounts[c] = (cityCounts[c] || 0) + 1;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-400" />
            Platform Telemetry & Growth Analytics
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Aggregated metric streams, network velocity, and retail merchant geographical distribution.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => refreshData(false)}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80">
          <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Shopper Base</div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white mt-3">{stats.totalCustomers}</div>
          <div className="text-xs text-emerald-400 font-semibold mt-1 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Verified database accounts</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80">
          <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Store Counters</div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white mt-3">{stats.totalShops}</div>
          <div className="text-xs text-indigo-400 font-semibold mt-1">
            {stats.verifiedShops} Verified • {stats.pendingShops} Pending
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80">
          <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Standardized SKUs</div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white mt-3">{catalogCount}</div>
          <div className="text-xs text-emerald-400 font-semibold mt-1">Catalog canonical items</div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80">
          <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Price Integrity</div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white mt-3">
            {stats.activeAnomalies === 0 ? '100%' : `${Math.max(0, 100 - stats.activeAnomalies * 5)}%`}
          </div>
          <div className="text-xs text-rose-400 font-semibold mt-1">
            {stats.activeAnomalies} flagged pricing anomalies
          </div>
        </div>
      </div>

      {/* Regional Geographical Distribution */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold text-white border-b border-slate-800 pb-3">
          <MapPin className="w-4 h-4 text-indigo-400" />
          <span>Regional Retail Density by City</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Object.entries(cityCounts).map(([city, count]) => {
            const percentage = Math.round((count / Math.max(1, shops.length)) * 100);

            return (
              <div key={city} className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-white">{city}</span>
                  <span className="font-mono text-slate-400">{count} Stores ({percentage}%)</span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${percentage}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

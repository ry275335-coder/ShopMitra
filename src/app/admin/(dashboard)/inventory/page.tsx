'use client';

import React, { useState } from 'react';
import { useAdminData } from '@/components/admin/AdminLayoutShell';
import {
  resolveAnomalyAction,
  type AdminPriceAnomalyItem
} from '@/server/actions/admin.actions';
import {
  AlertTriangle,
  ShieldAlert,
  Search,
  CheckCircle,
  XCircle,
  RefreshCw,
  TrendingDown,
  Store,
  Tag,
  ShieldCheck,
  Ban
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

export default function AdminInventoryPage() {
  const { payload, isLoading, refreshData } = useAdminData();
  const { showToast } = useToast();

  const [statusFilter, setStatusFilter] = useState<'all' | 'investigating' | 'resolved' | 'penalized'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const anomalies = payload?.anomalies || [];

  const filteredAnomalies = anomalies.filter((a) => {
    if (statusFilter !== 'all' && a.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        a.productName.toLowerCase().includes(q) ||
        a.shopName.toLowerCase().includes(q) ||
        a.brand.toLowerCase().includes(q) ||
        a.flagReason.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleResolve = async (
    anomaly: AdminPriceAnomalyItem,
    resolution: 'approve' | 'delist'
  ) => {
    setActionLoadingId(anomaly.id);
    try {
      const res = await resolveAnomalyAction(anomaly.id, resolution);
      if (res.success) {
        showToast(
          resolution === 'approve'
            ? `Price for "${anomaly.productName}" verified as authentic`
            : `Shop listing suspended for predatory pricing`,
          'success'
        );
        await refreshData(true);
      } else {
        showToast(res.error || 'Failed to update anomaly status', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error processing action', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-400" />
            Inventory & Anti-Fraud Pricing Shield
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Automated guardrail detecting severe pricing drops (&gt;65% below MRP) or counterfeit/bait-and-switch listings.
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

      {/* Filter and Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-900 border border-slate-800 self-start">
          {(['all', 'investigating', 'resolved', 'penalized'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize ${
                statusFilter === status
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search product, merchant, brand..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Anomalies Table */}
      <div className="overflow-hidden rounded-2xl bg-slate-900/60 border border-slate-800/80 shadow-md">
        {filteredAnomalies.length === 0 ? (
          <div className="text-center py-16 px-4">
            <ShieldCheck className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-white">All Clear</h3>
            <p className="text-xs text-slate-400 mt-1">
              No price anomalies or predatory discounting alerts detected.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px] font-bold">
                <tr>
                  <th className="px-5 py-3.5">Flagged Counter SKU</th>
                  <th className="px-5 py-3.5">Store Details</th>
                  <th className="px-5 py-3.5">Catalog MRP</th>
                  <th className="px-5 py-3.5">Listed Price</th>
                  <th className="px-5 py-3.5">Deviation Alert</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Shield Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredAnomalies.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-bold text-white text-sm">{item.productName}</div>
                      <div className="text-xs text-slate-400">{item.brand}</div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="font-semibold text-white">{item.shopName}</div>
                      <div className="text-[10px] text-slate-500">ID: {item.shopId.slice(0, 8)}</div>
                    </td>

                    <td className="px-5 py-4 font-mono text-slate-400">
                      {formatCurrency(item.mrp)}
                    </td>

                    <td className="px-5 py-4">
                      <span className="font-mono font-bold text-rose-400 text-sm">
                        {formatCurrency(item.listedPrice)}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/30 text-[11px] font-bold">
                        <TrendingDown className="w-3 h-3 text-rose-400" />
                        <span>-{item.discountPercent}%</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1 max-w-xs line-clamp-1">
                        {item.flagReason}
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize ${
                          item.status === 'resolved'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : item.status === 'penalized'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-right space-x-1.5">
                      {item.status !== 'resolved' && (
                        <button
                          onClick={() => handleResolve(item, 'approve')}
                          disabled={actionLoadingId === item.id}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white text-xs font-semibold transition-colors disabled:opacity-50 inline-flex items-center gap-1"
                          title="Verify counter rate as genuine promotional offer"
                        >
                          <CheckCircle className="w-3 h-3" />
                          <span>Approve Rate</span>
                        </button>
                      )}

                      {item.status !== 'penalized' && (
                        <button
                          onClick={() => handleResolve(item, 'delist')}
                          disabled={actionLoadingId === item.id}
                          className="px-2.5 py-1 rounded-lg bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white text-xs font-semibold transition-colors disabled:opacity-50 inline-flex items-center gap-1"
                          title="Suspend predatory listing"
                        >
                          <Ban className="w-3 h-3" />
                          <span>Delist</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import { useAdminData } from '@/components/admin/AdminLayoutShell';
import {
  resolveReportAction,
  type AdminGrievanceItem
} from '@/server/actions/admin.actions';
import {
  FileWarning,
  Search,
  CheckCircle,
  XCircle,
  RefreshCw,
  Clock,
  Store,
  Tag,
  ShieldAlert,
  AlertCircle
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';

export default function AdminReportsPage() {
  const { payload, isLoading, refreshData } = useAdminData();
  const { showToast } = useToast();

  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'action_taken' | 'dismissed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const reports = payload?.reports || [];

  const filteredReports = reports.filter((r) => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        r.shopName.toLowerCase().includes(q) ||
        r.productName.toLowerCase().includes(q) ||
        r.reason.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleResolve = async (
    report: AdminGrievanceItem,
    resolution: 'action_taken' | 'dismissed'
  ) => {
    setActionLoadingId(report.id);
    try {
      const res = await resolveReportAction(report.id, resolution);
      if (res.success) {
        showToast(
          resolution === 'action_taken'
            ? 'Action recorded on price discrepancy report'
            : 'Grievance report dismissed',
          'success'
        );
        await refreshData(true);
      } else {
        showToast(res.error || 'Failed to update report', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error processing report', 'error');
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
            <FileWarning className="w-5 h-5 text-orange-400" />
            Price Grievance & Dispute Desk
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Resolve customer reported price discrepancies between advertised portal rates and in-store counter checkout.
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

      {/* Filters and Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-900 border border-slate-800 self-start">
          {(['all', 'open', 'action_taken', 'dismissed'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize ${
                statusFilter === status
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              {status.replace('_', ' ')}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search store, product, dispute..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Reports Table */}
      <div className="overflow-hidden rounded-2xl bg-slate-900/60 border border-slate-800/80 shadow-md">
        {filteredReports.length === 0 ? (
          <div className="text-center py-16 px-4">
            <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-white">No disputes found</h3>
            <p className="text-xs text-slate-400 mt-1">All customer grievances are resolved.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px] font-bold">
                <tr>
                  <th className="px-5 py-3.5">Store & Product</th>
                  <th className="px-5 py-3.5">Reported Grievance</th>
                  <th className="px-5 py-3.5">Counter Price vs Listed</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Date</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredReports.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-bold text-white text-sm">{r.shopName}</div>
                      <div className="text-indigo-400 text-xs mt-0.5">{r.productName}</div>
                    </td>

                    <td className="px-5 py-4 max-w-sm">
                      <p className="text-slate-300 text-xs leading-relaxed">{r.reason}</p>
                    </td>

                    <td className="px-5 py-4">
                      <div className="space-y-0.5">
                        <div className="text-xs font-semibold text-rose-400">
                          Charged: {formatCurrency(r.actualPrice)}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Portal: {formatCurrency(r.reportedPrice)}
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full capitalize ${
                          r.status === 'action_taken'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : r.status === 'dismissed'
                            ? 'bg-slate-800 text-slate-400'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        {r.status.replace('_', ' ')}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-slate-400 text-[11px] whitespace-nowrap">
                      {r.createdAt}
                    </td>

                    <td className="px-5 py-4 text-right space-x-2">
                      {r.status === 'open' && (
                        <>
                          <button
                            onClick={() => handleResolve(r, 'action_taken')}
                            disabled={actionLoadingId === r.id}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors disabled:opacity-50"
                          >
                            Resolve
                          </button>
                          <button
                            onClick={() => handleResolve(r, 'dismissed')}
                            disabled={actionLoadingId === r.id}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs font-semibold transition-colors disabled:opacity-50"
                          >
                            Dismiss
                          </button>
                        </>
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

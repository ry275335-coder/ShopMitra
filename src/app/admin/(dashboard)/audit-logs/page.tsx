'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { getAuditLogsAction, type AuditLogEntry } from '@/server/actions/audit.actions';
import {
  FileText,
  Search,
  RefreshCw,
  Clock,
  User,
  Shield,
  Filter,
  Eye,
  ChevronLeft,
  ChevronRight,
  Database
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

export default function AdminAuditLogsPage() {
  const { showToast } = useToast();

  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [targetTypeFilter, setTargetTypeFilter] = useState('all');
  const [page, setPage] = useState(0);
  const pageSize = 20;

  // Selected Log for metadata JSON viewer
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAuditLogsAction({
        limit: pageSize,
        offset: page * pageSize,
        search: searchQuery.trim() || undefined,
        targetType: targetTypeFilter !== 'all' ? targetTypeFilter : undefined,
      });

      if (res.success) {
        setLogs(res.logs);
        setTotal(res.total);
      } else {
        showToast(res.error || 'Failed to retrieve audit trail', 'error');
      }
    } catch (err: any) {
      showToast('Error loading audit logs', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, targetTypeFilter, showToast]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-400" />
            Immutable Administrative Audit Ledger
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Every critical platform action (approvals, suspensions, deletions, role escalations) is recorded here permanently.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadLogs}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Target Type Filter */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-900 border border-slate-800 self-start overflow-x-auto">
          {['all', 'merchant', 'shop', 'user', 'category', 'anomaly', 'review'].map((type) => (
            <button
              key={type}
              onClick={() => {
                setTargetTypeFilter(type);
                setPage(0);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize whitespace-nowrap ${
                targetTypeFilter === type
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search action or email..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(0);
            }}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Logs Table */}
      <div className="overflow-hidden rounded-2xl bg-slate-900/60 border border-slate-800/80 shadow-md">
        {logs.length === 0 ? (
          <div className="text-center py-16 px-4">
            <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-white">No audit records</h3>
            <p className="text-xs text-slate-400 mt-1">No admin actions match the current criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px] font-bold">
                <tr>
                  <th className="px-5 py-3.5">Timestamp</th>
                  <th className="px-5 py-3.5">Admin Operator</th>
                  <th className="px-5 py-3.5">Action Code</th>
                  <th className="px-5 py-3.5">Target</th>
                  <th className="px-5 py-3.5 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-5 py-3.5 text-slate-400 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString('en-IN')}
                    </td>

                    <td className="px-5 py-3.5">
                      <div className="text-slate-200 font-sans font-medium text-xs">
                        {log.adminEmail || 'Admin User'}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {log.adminId ? `${log.adminId.slice(0, 10)}...` : 'system'}
                      </div>
                    </td>

                    <td className="px-5 py-3.5">
                      <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-semibold">
                        {log.action}
                      </span>
                    </td>

                    <td className="px-5 py-3.5 font-sans">
                      <span className="capitalize text-slate-300 font-medium">{log.targetType}</span>
                      {log.targetId && (
                        <div className="text-[10px] font-mono text-slate-500">
                          {log.targetId.slice(0, 12)}...
                        </div>
                      )}
                    </td>

                    <td className="px-5 py-3.5 text-right font-sans">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold inline-flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Payload</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-800 bg-slate-950/40 text-xs text-slate-400">
            <div>
              Showing {page * pageSize + 1} to {Math.min((page + 1) * pageSize, total)} of {total} entries
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-300 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span>
                Page {page + 1} of {totalPages}
              </span>
              <button
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-300 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Metadata JSON Modal */}
      <Modal
        isOpen={selectedLog !== null}
        onClose={() => setSelectedLog(null)}
        title={`Audit Event: ${selectedLog?.action}`}
      >
        <div className="space-y-3 pt-2 font-mono text-xs">
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 space-y-1 font-sans">
            <div>
              <span className="text-slate-500">Event ID:</span>{' '}
              <span className="font-mono text-white">{selectedLog?.id}</span>
            </div>
            <div>
              <span className="text-slate-500">Actor Email:</span>{' '}
              <span className="text-indigo-400 font-semibold">{selectedLog?.adminEmail}</span>
            </div>
            <div>
              <span className="text-slate-500">Target Type:</span>{' '}
              <span className="capitalize text-white">{selectedLog?.targetType}</span> (
              <span className="font-mono text-slate-400">{selectedLog?.targetId || 'N/A'}</span>)
            </div>
            <div>
              <span className="text-slate-500">Logged At:</span>{' '}
              <span className="text-slate-300">{selectedLog?.createdAt}</span>
            </div>
          </div>

          <div>
            <div className="text-[11px] font-sans font-semibold text-slate-400 mb-1">
              Cryptographic Payload & Parameters:
            </div>
            <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-emerald-400 overflow-x-auto text-[11px] max-h-60 custom-scrollbar">
              {JSON.stringify(selectedLog?.metadata || {}, null, 2)}
            </pre>
          </div>

          <div className="flex justify-end pt-2 font-sans">
            <Button variant="outline" size="sm" onClick={() => setSelectedLog(null)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

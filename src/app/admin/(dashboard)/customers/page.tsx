'use client';

import React, { useState } from 'react';
import { useAdminData } from '@/components/admin/AdminLayoutShell';
import {
  toggleUserSuspensionAction,
  deleteCustomerAction,
  type AdminCustomerItem,
} from '@/server/actions/admin.actions';
import {
  Users,
  Search,
  Phone,
  Mail,
  MapPin,
  RefreshCw,
  UserCheck,
  UserX,
  Trash2,
  Calendar,
  Activity,
  AlertTriangle
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

export default function CustomersManagementPage() {
  const { payload, isLoading, refreshData } = useAdminData();
  const { showToast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Modals
  const [selectedCustomer, setSelectedCustomer] = useState<AdminCustomerItem | null>(null);
  const [suspendTarget, setSuspendTarget] = useState<AdminCustomerItem | null>(null);
  const [suspendReason, setSuspendReason] = useState('');

  const allUsers = payload?.customers || [];
  // Filter for shoppers / customers
  const customers = allUsers.filter((u) => u.role === 'customer' || !['admin', 'super_admin'].includes(u.role));

  const filteredCustomers = customers.filter((cust) => {
    if (statusFilter === 'active' && !cust.isActive) return false;
    if (statusFilter === 'suspended' && cust.isActive) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        cust.name.toLowerCase().includes(q) ||
        cust.email.toLowerCase().includes(q) ||
        cust.mobile.includes(q) ||
        cust.city.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleToggleSuspension = async () => {
    if (!suspendTarget) return;
    setActionLoadingId(suspendTarget.profileId);
    const willSuspend = suspendTarget.isActive;

    try {
      const res = await toggleUserSuspensionAction(
        suspendTarget.profileId,
        willSuspend,
        suspendReason || undefined
      );

      if (res.success) {
        showToast(
          `Customer account "${suspendTarget.name}" ${willSuspend ? 'suspended' : 'unsuspended'}`,
          'success'
        );
        setSuspendTarget(null);
        setSuspendReason('');
        await refreshData(true);
      } else {
        showToast(res.error || 'Failed to update customer status', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error updating status', 'error');
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
            <Users className="w-5 h-5 text-indigo-400" />
            Customer Accounts Directory
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Registered shopper profiles, verified mobile credentials, account suspension, and location data.
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
          {(['all', 'active', 'suspended'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize ${
                statusFilter === status
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              {status} ({status === 'all' ? customers.length : customers.filter((c) => (status === 'active' ? c.isActive : !c.isActive)).length})
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search shopper name, mobile, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl bg-slate-900/60 border border-slate-800/80 shadow-md">
        {filteredCustomers.length === 0 ? (
          <div className="text-center py-16 px-4">
            <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-white">No customers found</h3>
            <p className="text-xs text-slate-400 mt-1">Try adjusting your search criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px] font-bold">
                <tr>
                  <th className="px-5 py-3.5">Shopper Name</th>
                  <th className="px-5 py-3.5">Verified Contact</th>
                  <th className="px-5 py-3.5">Location</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Registered</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredCustomers.map((c) => (
                  <tr key={c.profileId} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-white">
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-white text-sm">{c.name}</div>
                          <div className="text-[10px] font-mono text-slate-500">ID: {c.profileId.slice(0, 10)}...</div>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4 space-y-1">
                      {c.mobile && (
                        <div className="flex items-center gap-1.5 text-slate-200">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{c.mobile}</span>
                        </div>
                      )}
                      {c.email && (
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <Mail className="w-3 h-3 text-slate-400" />
                          <span>{c.email}</span>
                        </div>
                      )}
                    </td>

                    <td className="px-5 py-4 text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span>{c.city || 'Local Neighborhood'}</span>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      {c.isActive ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400 text-[11px] font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-400 text-[11px] font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                          Suspended
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-4 text-slate-400 text-[11px] whitespace-nowrap">
                      {c.createdAt}
                    </td>

                    <td className="px-5 py-4 text-right space-x-1.5">
                      <button
                        onClick={() => setSelectedCustomer(c)}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
                      >
                        Profile
                      </button>

                      <button
                        onClick={() => {
                          setSuspendTarget(c);
                          setSuspendReason('');
                        }}
                        className={`p-1.5 rounded-lg transition-colors ${
                          c.isActive
                            ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400'
                            : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400'
                        }`}
                        title={c.isActive ? 'Suspend customer' : 'Reactivate customer'}
                      >
                        {c.isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Profile Modal */}
      <Modal
        isOpen={selectedCustomer !== null}
        onClose={() => setSelectedCustomer(null)}
        title={`Customer Profile: ${selectedCustomer?.name}`}
      >
        <div className="space-y-4 pt-2 text-xs">
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div>
              <span className="text-slate-400">Account ID:</span>{' '}
              <span className="font-mono text-slate-200">{selectedCustomer?.profileId}</span>
            </div>
            <div>
              <span className="text-slate-400">Mobile Phone:</span>{' '}
              <span className="font-mono text-white">{selectedCustomer?.mobile || 'Not provided'}</span>
            </div>
            <div>
              <span className="text-slate-400">Email Address:</span>{' '}
              <span className="text-white">{selectedCustomer?.email || 'Not provided'}</span>
            </div>
            <div>
              <span className="text-slate-400">Default Location:</span>{' '}
              <span className="text-white">{selectedCustomer?.city || 'Local Market Area'}</span>
            </div>
            <div>
              <span className="text-slate-400">Account Status:</span>{' '}
              <span className={selectedCustomer?.isActive ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                {selectedCustomer?.isActive ? 'Active' : 'Suspended'}
              </span>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button variant="outline" size="sm" onClick={() => setSelectedCustomer(null)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* Suspend Confirmation Modal */}
      <Modal
        isOpen={suspendTarget !== null}
        onClose={() => setSuspendTarget(null)}
        title={suspendTarget?.isActive ? `Suspend Customer: ${suspendTarget?.name}` : `Reactivate Customer: ${suspendTarget?.name}`}
      >
        <div className="space-y-4 pt-2">
          <p className="text-xs text-slate-400">
            {suspendTarget?.isActive
              ? 'Suspending this customer will revoke active login sessions and block orders or store reviews.'
              : 'Reactivating this customer will restore normal platform access.'}
          </p>

          {suspendTarget?.isActive && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Suspension Reason</label>
              <textarea
                rows={3}
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                placeholder="Reason for suspension (logged to audit ledger)..."
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setSuspendTarget(null)}>
              Cancel
            </Button>
            <Button
              variant={suspendTarget?.isActive ? 'danger' : 'primary'}
              size="sm"
              onClick={handleToggleSuspension}
              isLoading={actionLoadingId !== null}
            >
              {suspendTarget?.isActive ? 'Confirm Suspension' : 'Confirm Reactivation'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

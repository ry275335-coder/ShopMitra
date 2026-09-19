'use client';

import React, { useState } from 'react';
import { useAdminData } from '@/components/admin/AdminLayoutShell';
import {
  verifyShopAction,
  deleteShopAction,
  toggleShopSuspensionAction,
  type AdminMerchantItem
} from '@/server/actions/admin.actions';
import {
  Store,
  BadgeCheck,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Trash2,
  Phone,
  MapPin,
  RefreshCw,
  AlertTriangle,
  ExternalLink,
  PowerOff,
  Power
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

export default function AdminShopsPage() {
  const { payload, isLoading, refreshData } = useAdminData();
  const { showToast } = useToast();

  const [statusFilter, setStatusFilter] = useState<'all' | 'verified' | 'pending' | 'suspended'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Modals
  const [deleteTarget, setDeleteTarget] = useState<AdminMerchantItem | null>(null);
  const [suspendTarget, setSuspendTarget] = useState<AdminMerchantItem | null>(null);

  const shops = payload?.shops || [];

  const filteredShops = shops.filter((shop) => {
    if (statusFilter === 'verified' && shop.status !== 'verified') return false;
    if (statusFilter === 'pending' && shop.status !== 'pending') return false;
    if (statusFilter === 'suspended' && shop.isActive) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        shop.businessName.toLowerCase().includes(q) ||
        shop.ownerName.toLowerCase().includes(q) ||
        shop.phone.includes(q) ||
        shop.city.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleToggleVerify = async (shop: AdminMerchantItem) => {
    setActionLoadingId(shop.id);
    const newStatus = shop.status !== 'verified';
    try {
      const res = await verifyShopAction(shop.id, newStatus);
      if (res.success) {
        showToast(`Store "${shop.businessName}" ${newStatus ? 'verified' : 'unverified'}`, 'success');
        await refreshData(true);
      } else {
        showToast(res.error || 'Failed to update verification', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error executing action', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleToggleSuspension = async () => {
    if (!suspendTarget) return;
    setActionLoadingId(suspendTarget.id);
    const willSuspend = suspendTarget.isActive;
    try {
      const res = await toggleShopSuspensionAction(suspendTarget.id, willSuspend);
      if (res.success) {
        showToast(
          `Store "${suspendTarget.businessName}" ${willSuspend ? 'suspended' : 'reactivated'}`,
          'success'
        );
        setSuspendTarget(null);
        await refreshData(true);
      } else {
        showToast(res.error || 'Failed to toggle shop status', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error updating status', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteShop = async () => {
    if (!deleteTarget) return;
    setActionLoadingId(deleteTarget.id);
    try {
      const res = await deleteShopAction(deleteTarget.id);
      if (res.success) {
        showToast(`Store "${deleteTarget.businessName}" deleted successfully`, 'success');
        setDeleteTarget(null);
        await refreshData(true);
      } else {
        showToast(res.error || 'Failed to delete shop', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error deleting shop', 'error');
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
            <Store className="w-5 h-5 text-indigo-400" />
            Stores & Counters Directory
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Manage physical retail partners, operational status, and verification badges across your discovery index.
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
          {(['all', 'verified', 'pending', 'suspended'] as const).map((status) => (
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
            placeholder="Search store name, owner, city..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Shops Table */}
      <div className="overflow-hidden rounded-2xl bg-slate-900/60 border border-slate-800/80 shadow-md">
        {filteredShops.length === 0 ? (
          <div className="text-center py-16 px-4">
            <Store className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-white">No shops found</h3>
            <p className="text-xs text-slate-400 mt-1">No retail store records match the filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px] font-bold">
                <tr>
                  <th className="px-5 py-3.5">Store & Owner</th>
                  <th className="px-5 py-3.5">Location & Contact</th>
                  <th className="px-5 py-3.5">Verification</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredShops.map((shop) => (
                  <tr key={shop.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-bold text-white text-sm">{shop.businessName}</div>
                      <div className="text-slate-400 text-xs">{shop.ownerName}</div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">ID: {shop.id.slice(0, 10)}...</div>
                    </td>

                    <td className="px-5 py-4 space-y-1">
                      <div className="flex items-center gap-1.5 text-slate-200">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span>{shop.address || shop.city}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{shop.phone}</span>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      {shop.status === 'verified' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-semibold">
                          <CheckCircle className="w-3 h-3" />
                          Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[11px] font-semibold">
                          Pending
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      {shop.isActive ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400 text-[11px] font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          Online
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-400 text-[11px] font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                          Suspended
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-4 text-right space-x-2">
                      {/* Verify / Unverify */}
                      <button
                        onClick={() => handleToggleVerify(shop)}
                        disabled={actionLoadingId === shop.id}
                        className={`p-1.5 rounded-lg transition-colors ${
                          shop.status === 'verified'
                            ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                            : 'bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white'
                        }`}
                        title={shop.status === 'verified' ? 'Revoke verification badge' : 'Grant verification badge'}
                      >
                        <BadgeCheck className="w-4 h-4" />
                      </button>

                      {/* Suspend / Reactivate */}
                      <button
                        onClick={() => setSuspendTarget(shop)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          shop.isActive
                            ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400'
                            : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400'
                        }`}
                        title={shop.isActive ? 'Suspend shop listings' : 'Reactivate shop'}
                      >
                        {shop.isActive ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => setDeleteTarget(shop)}
                        className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors"
                        title="Permanently remove store"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Shop Modal */}
      <Modal
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title={`Permanently Delete Shop: ${deleteTarget?.businessName}`}
      >
        <div className="space-y-4 pt-2">
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            <AlertTriangle className="w-4 h-4 inline mr-1 text-rose-400" />
            Warning: This action will permanently remove this physical shop and all associated counter listings.
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={handleDeleteShop} isLoading={actionLoadingId !== null}>
              Delete Store
            </Button>
          </div>
        </div>
      </Modal>

      {/* Suspend Shop Modal */}
      <Modal
        isOpen={suspendTarget !== null}
        onClose={() => setSuspendTarget(null)}
        title={suspendTarget?.isActive ? `Suspend Store: ${suspendTarget?.businessName}` : `Reactivate Store: ${suspendTarget?.businessName}`}
      >
        <div className="space-y-4 pt-2">
          <p className="text-xs text-slate-400">
            {suspendTarget?.isActive
              ? 'Suspending this store will hide it from local search, category browsing, and product discovery.'
              : 'Reactivating this store will make it visible to local shoppers again.'}
          </p>

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

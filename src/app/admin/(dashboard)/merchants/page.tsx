'use client';

import React, { useState } from 'react';
import { useAdminData } from '@/components/admin/AdminLayoutShell';
import {
  processMerchantVerificationAction,
  toggleShopSuspensionAction,
  type AdminMerchantItem,
} from '@/server/actions/admin.actions';
import {
  Store,
  BadgeCheck,
  Search,
  CheckCircle,
  XCircle,
  HelpCircle,
  PowerOff,
  Power,
  RefreshCw,
  Phone,
  MapPin,
  FileText
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

export default function MerchantsManagementPage() {
  const { payload, isLoading, refreshData } = useAdminData();
  const { showToast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'verified' | 'pending' | 'rejected' | 'suspended'>('all');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Modals
  const [selectedMerchant, setSelectedMerchant] = useState<AdminMerchantItem | null>(null);
  const [modalMode, setModalMode] = useState<'reject' | 'request_info' | null>(null);
  const [modalReason, setModalReason] = useState('');
  const [suspendTarget, setSuspendTarget] = useState<AdminMerchantItem | null>(null);

  const merchants = payload?.shops || [];

  const filteredMerchants = merchants.filter((m) => {
    if (statusFilter === 'verified' && m.status !== 'verified') return false;
    if (statusFilter === 'pending' && m.status !== 'pending') return false;
    if (statusFilter === 'rejected' && m.status !== 'rejected') return false;
    if (statusFilter === 'suspended' && m.isActive) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        m.businessName.toLowerCase().includes(q) ||
        m.ownerName.toLowerCase().includes(q) ||
        m.phone.includes(q) ||
        m.city.toLowerCase().includes(q) ||
        m.gstin.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleApprove = async (merchant: AdminMerchantItem) => {
    setActionLoadingId(merchant.id);
    try {
      const res = await processMerchantVerificationAction({
        merchantId: merchant.id,
        decision: 'approve',
      });
      if (res.success) {
        showToast(`✅ "${merchant.businessName}" approved & verified`, 'success');
        await refreshData(true);
      } else {
        showToast(res.error || 'Failed to approve merchant', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error processing approval', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleModalSubmit = async () => {
    if (!selectedMerchant || !modalMode) return;
    if (!modalReason.trim()) {
      showToast('Please provide a message or reason for the merchant', 'error');
      return;
    }

    setActionLoadingId(selectedMerchant.id);
    try {
      const res = await processMerchantVerificationAction({
        merchantId: selectedMerchant.id,
        decision: modalMode,
        reason: modalMode === 'reject' ? modalReason.trim() : undefined,
        notes: modalMode === 'request_info' ? modalReason.trim() : undefined,
      });

      if (res.success) {
        showToast(
          modalMode === 'reject'
            ? `Merchant "${selectedMerchant.businessName}" marked rejected`
            : `Information requested from "${selectedMerchant.businessName}"`,
          'info'
        );
        setModalMode(null);
        setSelectedMerchant(null);
        setModalReason('');
        await refreshData(true);
      } else {
        showToast(res.error || 'Failed to submit decision', 'error');
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
          `Merchant "${suspendTarget.businessName}" ${willSuspend ? 'suspended' : 'reactivated'}`,
          'success'
        );
        setSuspendTarget(null);
        await refreshData(true);
      } else {
        showToast(res.error || 'Failed to update merchant status', 'error');
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
            <Store className="w-5 h-5 text-indigo-400" />
            Merchant Operations Center
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Oversee retailer profiles, KYC business authenticity, document verification, and operational controls.
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
        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-900 border border-slate-800 self-start overflow-x-auto">
          {(['all', 'verified', 'pending', 'rejected', 'suspended'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize whitespace-nowrap ${
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
            placeholder="Search business, owner, GSTIN, phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl bg-slate-900/60 border border-slate-800/80 shadow-md">
        {filteredMerchants.length === 0 ? (
          <div className="text-center py-16 px-4">
            <Store className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-white">No merchants found</h3>
            <p className="text-xs text-slate-400 mt-1">No merchant records match the active criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px] font-bold">
                <tr>
                  <th className="px-5 py-3.5">Business & Owner</th>
                  <th className="px-5 py-3.5">Contact Details</th>
                  <th className="px-5 py-3.5">Tax & Category</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Operations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredMerchants.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-bold text-white text-sm">{m.businessName}</div>
                      <div className="text-xs text-slate-400">{m.ownerName}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span>{m.address || m.city}</span>
                      </div>
                    </td>

                    <td className="px-5 py-4 space-y-1">
                      <div className="flex items-center gap-1.5 text-slate-200">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{m.phone}</span>
                      </div>
                      <div className="text-[11px] text-slate-400">City: {m.city}</div>
                    </td>

                    <td className="px-5 py-4 space-y-1">
                      <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300 inline-block">
                        {m.gstin}
                      </span>
                      <div className="text-[11px] text-slate-500">{m.category}</div>
                    </td>

                    <td className="px-5 py-4">
                      {m.status === 'verified' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[11px] font-semibold">
                          <CheckCircle className="w-3 h-3" />
                          Verified
                        </span>
                      ) : m.status === 'rejected' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 text-[11px] font-semibold">
                          <XCircle className="w-3 h-3" />
                          Rejected
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-[11px] font-semibold">
                          Pending KYC
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-4 text-right space-x-1.5">
                      {m.status !== 'verified' && (
                        <button
                          onClick={() => handleApprove(m)}
                          disabled={actionLoadingId === m.id}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors disabled:opacity-50"
                        >
                          Approve
                        </button>
                      )}

                      {m.status !== 'rejected' && (
                        <button
                          onClick={() => {
                            setSelectedMerchant(m);
                            setModalMode('reject');
                            setModalReason('');
                          }}
                          disabled={actionLoadingId === m.id}
                          className="px-2.5 py-1 rounded-lg bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white text-xs font-semibold transition-colors disabled:opacity-50"
                        >
                          Reject
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setSelectedMerchant(m);
                          setModalMode('request_info');
                          setModalReason('');
                        }}
                        disabled={actionLoadingId === m.id}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                        title="Request additional information"
                      >
                        <HelpCircle className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => setSuspendTarget(m)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          m.isActive
                            ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400'
                            : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400'
                        }`}
                        title={m.isActive ? 'Suspend merchant store' : 'Reactivate merchant'}
                      >
                        {m.isActive ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Decision Modal (Reject / Request Info) */}
      <Modal
        isOpen={modalMode !== null}
        onClose={() => setModalMode(null)}
        title={modalMode === 'reject' ? `Reject Merchant: ${selectedMerchant?.businessName}` : `Request Info from: ${selectedMerchant?.businessName}`}
      >
        <div className="space-y-4 pt-2">
          <p className="text-xs text-slate-400">
            {modalMode === 'reject'
              ? 'Specify the formal reason for rejecting this merchant verification application.'
              : 'Specify which documents or corrections are required from the merchant.'}
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              {modalMode === 'reject' ? 'Rejection Reason (Required)' : 'Instructions for Merchant (Required)'}
            </label>
            <textarea
              rows={4}
              value={modalReason}
              onChange={(e) => setModalReason(e.target.value)}
              placeholder="Enter message for merchant..."
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setModalMode(null)}>
              Cancel
            </Button>
            <Button
              variant={modalMode === 'reject' ? 'danger' : 'primary'}
              size="sm"
              onClick={handleModalSubmit}
              isLoading={actionLoadingId !== null}
            >
              {modalMode === 'reject' ? 'Confirm Rejection' : 'Submit Request'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Suspend Confirmation Modal */}
      <Modal
        isOpen={suspendTarget !== null}
        onClose={() => setSuspendTarget(null)}
        title={suspendTarget?.isActive ? `Suspend Merchant: ${suspendTarget?.businessName}` : `Reactivate Merchant: ${suspendTarget?.businessName}`}
      >
        <div className="space-y-4 pt-2">
          <p className="text-xs text-slate-400">
            {suspendTarget?.isActive
              ? 'Suspending this merchant will immediately hide all counter inventory listings from public shopper discovery.'
              : 'Reactivating this merchant will restore their public search visibility.'}
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

'use client';

import React, { useState } from 'react';
import { useAdminData } from '@/components/admin/AdminLayoutShell';
import {
  processMerchantVerificationAction,
  verifyShopAction,
  type AdminMerchantItem
} from '@/server/actions/admin.actions';
import {
  BadgeCheck,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Filter,
  FileText,
  Phone,
  MapPin,
  AlertTriangle,
  Send,
  HelpCircle,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

export default function MerchantVerificationPage() {
  const { payload, isLoading, refreshData } = useAdminData();
  const { showToast } = useToast();

  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'verified' | 'rejected'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Modals for Reject & Request Info
  const [selectedMerchant, setSelectedMerchant] = useState<AdminMerchantItem | null>(null);
  const [modalMode, setModalMode] = useState<'reject' | 'request_info' | null>(null);
  const [modalReason, setModalReason] = useState('');

  const shops = payload?.shops || [];

  const filteredShops = shops.filter((s) => {
    if (filterStatus !== 'all' && s.status !== filterStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        s.businessName.toLowerCase().includes(q) ||
        s.ownerName.toLowerCase().includes(q) ||
        s.phone.includes(q) ||
        s.city.toLowerCase().includes(q) ||
        s.gstin.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleApprove = async (shop: AdminMerchantItem) => {
    setActionLoadingId(shop.id);
    try {
      const res = await processMerchantVerificationAction({
        merchantId: shop.id,
        decision: 'approve',
      });
      if (res.success) {
        showToast(`✅ "${shop.businessName}" verified successfully`, 'success');
        await refreshData(true);
      } else {
        showToast(res.error || 'Failed to verify merchant', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error processing verification', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleModalSubmit = async () => {
    if (!selectedMerchant || !modalMode) return;
    if (!modalReason.trim()) {
      showToast('Please provide a reason or message for the merchant', 'error');
      return;
    }

    setActionLoadingId(selectedMerchant.id);
    try {
      if (modalMode === 'reject') {
        const res = await processMerchantVerificationAction({
          merchantId: selectedMerchant.id,
          decision: 'reject',
          reason: modalReason.trim(),
        });
        if (res.success) {
          showToast(`Merchant "${selectedMerchant.businessName}" rejected with reason provided`, 'info');
        } else {
          showToast(res.error || 'Failed to reject merchant', 'error');
        }
      } else if (modalMode === 'request_info') {
        const res = await processMerchantVerificationAction({
          merchantId: selectedMerchant.id,
          decision: 'request_info',
          notes: modalReason.trim(),
        });
        if (res.success) {
          showToast(`Information requested from "${selectedMerchant.businessName}"`, 'info');
        } else {
          showToast(res.error || 'Failed to submit request', 'error');
        }
      }

      setModalMode(null);
      setSelectedMerchant(null);
      setModalReason('');
      await refreshData(true);
    } catch (err: any) {
      showToast(err.message || 'Error processing request', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <BadgeCheck className="w-5 h-5 text-indigo-400" />
            Merchant Verification Desk
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Review submitted local shops, counter registrations, and KYC documents before public listing.
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

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Status Pills */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-900 border border-slate-800 self-start">
          {(['all', 'pending', 'verified', 'rejected'] as const).map((status) => {
            const count =
              status === 'all'
                ? shops.length
                : shops.filter((s) => s.status === status).length;

            return (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize ${
                  filterStatus === status
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                {status} ({count})
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search store, owner, GSTIN, phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Table of Merchants */}
      <div className="overflow-hidden rounded-2xl bg-slate-900/60 border border-slate-800/80 shadow-md">
        {filteredShops.length === 0 ? (
          <div className="text-center py-16 px-4">
            <BadgeCheck className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-white">No merchants found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              No store registrations match the active filter or search query.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px] font-bold">
                <tr>
                  <th className="px-5 py-3.5">Store & Owner</th>
                  <th className="px-5 py-3.5">Contact Details</th>
                  <th className="px-5 py-3.5">Registration & GSTIN</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Verification Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredShops.map((shop) => (
                  <tr key={shop.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-bold text-white text-sm">{shop.businessName}</div>
                      <div className="text-slate-400 text-xs mt-0.5">{shop.ownerName}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span>{shop.address || shop.city}</span>
                      </div>
                    </td>

                    <td className="px-5 py-4 space-y-1">
                      <div className="flex items-center gap-1.5 text-slate-200">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{shop.phone}</span>
                      </div>
                      {shop.whatsapp && (
                        <div className="text-[11px] text-emerald-400">
                          WA: {shop.whatsapp}
                        </div>
                      )}
                      <div className="text-[11px] text-slate-400">
                        City: {shop.city}
                      </div>
                    </td>

                    <td className="px-5 py-4 space-y-1">
                      <div className="font-mono text-slate-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 inline-block text-[11px]">
                        {shop.gstin}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Category: {shop.category}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Submitted: {shop.submittedAt}
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      {shop.status === 'verified' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-semibold">
                          <CheckCircle className="w-3 h-3" />
                          Verified
                        </span>
                      ) : shop.status === 'rejected' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[11px] font-semibold">
                          <XCircle className="w-3 h-3" />
                          Rejected
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[11px] font-semibold">
                          <Clock className="w-3 h-3" />
                          Pending Review
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-4 text-right space-x-2">
                      {shop.status !== 'verified' && (
                        <button
                          onClick={() => handleApprove(shop)}
                          disabled={actionLoadingId === shop.id}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors disabled:opacity-50 inline-flex items-center gap-1"
                        >
                          <CheckCircle className="w-3 h-3" />
                          <span>Approve</span>
                        </button>
                      )}

                      {shop.status !== 'rejected' && (
                        <button
                          onClick={() => {
                            setSelectedMerchant(shop);
                            setModalMode('reject');
                            setModalReason('');
                          }}
                          disabled={actionLoadingId === shop.id}
                          className="px-3 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-600/30 font-semibold text-xs transition-colors disabled:opacity-50 inline-flex items-center gap-1"
                        >
                          <XCircle className="w-3 h-3" />
                          <span>Reject</span>
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setSelectedMerchant(shop);
                          setModalMode('request_info');
                          setModalReason('');
                        }}
                        disabled={actionLoadingId === shop.id}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
                        title="Request documentation or clarifications"
                      >
                        <HelpCircle className="w-3.5 h-3.5" />
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
        title={
          modalMode === 'reject'
            ? `Reject Store: ${selectedMerchant?.businessName}`
            : `Request Info from: ${selectedMerchant?.businessName}`
        }
      >
        <div className="space-y-4 pt-2">
          <p className="text-xs text-slate-400">
            {modalMode === 'reject'
              ? 'Please provide a clear rejection reason. This will be logged in the immutable audit trail and sent to the merchant.'
              : 'Specify which KYC documents, photos, or shop details need to be resubmitted for verification.'}
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              {modalMode === 'reject' ? 'Rejection Reason (Required)' : 'Instructions for Merchant (Required)'}
            </label>
            <textarea
              rows={4}
              value={modalReason}
              onChange={(e) => setModalReason(e.target.value)}
              placeholder={
                modalMode === 'reject'
                  ? 'e.g., GSTIN does not match provided business trade name; physical shop signboard missing in address photos...'
                  : 'e.g., Please upload a clearer copy of your Electricity Bill or Trade License matching the shop address...'
              }
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setModalMode(null)}
              disabled={actionLoadingId !== null}
            >
              Cancel
            </Button>
            <Button
              variant={modalMode === 'reject' ? 'danger' : 'primary'}
              size="sm"
              onClick={handleModalSubmit}
              isLoading={actionLoadingId !== null}
            >
              {modalMode === 'reject' ? 'Confirm Rejection' : 'Send Request'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import { useAdminData } from '@/components/admin/AdminLayoutShell';
import {
  deleteCustomerAction,
  toggleUserSuspensionAction,
  updateUserRoleAction,
  type AdminCustomerItem
} from '@/server/actions/admin.actions';
import {
  Users,
  Search,
  Filter,
  UserCheck,
  UserX,
  Trash2,
  Shield,
  Phone,
  Mail,
  RefreshCw,
  AlertTriangle,
  UserCog
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

export default function AdminUsersPage() {
  const { payload, isLoading, refreshData, adminUser } = useAdminData();
  const { showToast } = useToast();

  const [roleFilter, setRoleFilter] = useState<'all' | 'customer' | 'merchant' | 'admin' | 'moderator'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Modals
  const [deleteTarget, setDeleteTarget] = useState<AdminCustomerItem | null>(null);
  const [suspendTarget, setSuspendTarget] = useState<AdminCustomerItem | null>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [roleChangeTarget, setRoleChangeTarget] = useState<AdminCustomerItem | null>(null);
  const [selectedNewRole, setSelectedNewRole] = useState<string>('customer');

  const customers = payload?.customers || [];

  const filteredUsers = customers.filter((user) => {
    if (roleFilter !== 'all') {
      if (roleFilter === 'admin' && !['admin', 'super_admin'].includes(user.role)) return false;
      if (roleFilter !== 'admin' && user.role !== roleFilter) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        user.name.toLowerCase().includes(q) ||
        user.email.toLowerCase().includes(q) ||
        user.mobile.includes(q) ||
        user.city.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleDeleteUser = async () => {
    if (!deleteTarget) return;
    setActionLoadingId(deleteTarget.id);
    try {
      const res = await deleteCustomerAction(deleteTarget.id);
      if (res.success) {
        showToast(`User account "${deleteTarget.name}" deleted successfully`, 'success');
        setDeleteTarget(null);
        await refreshData(true);
      } else {
        showToast(res.error || 'Failed to delete user', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error executing deletion', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleToggleSuspension = async () => {
    if (!suspendTarget) return;
    setActionLoadingId(suspendTarget.profileId);
    try {
      const willSuspend = suspendTarget.isActive; // if currently active, suspend it
      const res = await toggleUserSuspensionAction(
        suspendTarget.profileId,
        willSuspend,
        suspendReason || undefined
      );

      if (res.success) {
        showToast(
          `User "${suspendTarget.name}" ${willSuspend ? 'suspended' : 'unsuspended'} successfully`,
          'success'
        );
        setSuspendTarget(null);
        setSuspendReason('');
        await refreshData(true);
      } else {
        showToast(res.error || 'Failed to update user status', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error updating status', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRoleChange = async () => {
    if (!roleChangeTarget) return;
    setActionLoadingId(roleChangeTarget.profileId);
    try {
      const res = await updateUserRoleAction(
        roleChangeTarget.profileId,
        selectedNewRole as 'super_admin' | 'admin' | 'moderator' | 'merchant' | 'customer'
      );
      if (res.success) {
        showToast(`Role for "${roleChangeTarget.name}" updated to ${selectedNewRole}`, 'success');
        setRoleChangeTarget(null);
        await refreshData(true);
      } else {
        showToast(res.error || 'Failed to update role', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error changing user role', 'error');
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
            User Management Directory
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Oversee all shopper, merchant, and administrative accounts with reversible suspension controls.
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
          {(['all', 'customer', 'merchant', 'admin', 'moderator'] as const).map((role) => (
            <button
              key={role}
              onClick={() => setRoleFilter(role)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize ${
                roleFilter === role
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              {role}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search name, email, mobile..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="overflow-hidden rounded-2xl bg-slate-900/60 border border-slate-800/80 shadow-md">
        {filteredUsers.length === 0 ? (
          <div className="text-center py-16 px-4">
            <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-white">No accounts found</h3>
            <p className="text-xs text-slate-400 mt-1">No user records matched your criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px] font-bold">
                <tr>
                  <th className="px-5 py-3.5">User Identity</th>
                  <th className="px-5 py-3.5">Contact Details</th>
                  <th className="px-5 py-3.5">Assigned Role</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Registered</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredUsers.map((user) => (
                  <tr key={user.profileId} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-white text-xs">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-white text-sm">{user.name}</div>
                          <div className="text-[11px] text-slate-500 font-mono">{user.profileId.slice(0, 12)}...</div>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4 space-y-1">
                      {user.email && (
                        <div className="flex items-center gap-1.5 text-slate-200">
                          <Mail className="w-3 h-3 text-slate-400" />
                          <span>{user.email}</span>
                        </div>
                      )}
                      {user.mobile && (
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{user.mobile}</span>
                        </div>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                          user.role === 'super_admin'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : user.role === 'admin'
                            ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                            : user.role === 'merchant'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-slate-800 text-slate-300 border border-slate-700'
                        }`}
                      >
                        {user.role}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      {user.isActive ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[11px] font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 text-[11px] font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                          Suspended
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-4 text-slate-400 text-[11px]">{user.createdAt}</td>

                    <td className="px-5 py-4 text-right space-x-2">
                      {/* Role Elevation (Super Admin Only) */}
                      {adminUser.role === 'super_admin' && (
                        <button
                          onClick={() => {
                            setRoleChangeTarget(user);
                            setSelectedNewRole(user.role);
                          }}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                          title="Change user RBAC role"
                        >
                          <UserCog className="w-4 h-4" />
                        </button>
                      )}

                      {/* Suspend / Unsuspend */}
                      <button
                        onClick={() => {
                          setSuspendTarget(user);
                          setSuspendReason('');
                        }}
                        className={`p-1.5 rounded-lg transition-colors ${
                          user.isActive
                            ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400'
                            : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400'
                        }`}
                        title={user.isActive ? 'Suspend account' : 'Reactivate account'}
                      >
                        {user.isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => setDeleteTarget(user)}
                        className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors"
                        title="Delete user profile"
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

      {/* Suspend / Reactivate Modal */}
      <Modal
        isOpen={suspendTarget !== null}
        onClose={() => setSuspendTarget(null)}
        title={suspendTarget?.isActive ? `Suspend User: ${suspendTarget?.name}` : `Reactivate User: ${suspendTarget?.name}`}
      >
        <div className="space-y-4 pt-2">
          <p className="text-xs text-slate-400">
            {suspendTarget?.isActive
              ? 'Suspending this user will immediately revoke login sessions and block API actions across customer & merchant portals.'
              : 'Reactivating this user will restore normal login and platform access.'}
          </p>

          {suspendTarget?.isActive && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Suspension Reason (Logged to Audit Trail)
              </label>
              <textarea
                rows={3}
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                placeholder="e.g., Policy violation, fraudulent price reports, suspected multiple abusive accounts..."
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

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title={`Permanently Delete User: ${deleteTarget?.name}`}
      >
        <div className="space-y-4 pt-2">
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            <AlertTriangle className="w-4 h-4 inline mr-1 text-rose-400" />
            Warning: This action will permanently remove this customer record and cannot be undone.
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleDeleteUser}
              isLoading={actionLoadingId !== null}
            >
              Delete Account
            </Button>
          </div>
        </div>
      </Modal>

      {/* Role Management Modal (Super Admin) */}
      <Modal
        isOpen={roleChangeTarget !== null}
        onClose={() => setRoleChangeTarget(null)}
        title={`Change Role: ${roleChangeTarget?.name}`}
      >
        <div className="space-y-4 pt-2">
          <p className="text-xs text-slate-400">
            Select the new administrative or operational role for this user account.
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">Select Tier:</label>
            <div className="space-y-2">
              {[
                { role: 'customer', title: 'Customer', desc: 'Standard shopper discoverability access' },
                { role: 'merchant', title: 'Merchant', desc: 'Store owner with inventory and counter controls' },
                { role: 'moderator', title: 'Moderator', desc: 'Can review content and resolve customer disputes' },
                { role: 'admin', title: 'Administrator', desc: 'Full store, verification, and user management' },
                { role: 'super_admin', title: 'Super Admin', desc: 'Complete root platform authority' },
              ].map((item) => (
                <label
                  key={item.role}
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    selectedNewRole === item.role
                      ? 'bg-indigo-600/20 border-indigo-500 text-white'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="newRole"
                    value={item.role}
                    checked={selectedNewRole === item.role}
                    onChange={(e) => setSelectedNewRole(e.target.value)}
                    className="mt-1"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-200">{item.title}</div>
                    <div className="text-[11px] text-slate-400">{item.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setRoleChangeTarget(null)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleRoleChange} isLoading={actionLoadingId !== null}>
              Save Role Assignment
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

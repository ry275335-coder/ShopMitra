'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAdminData } from '@/components/admin/AdminLayoutShell';
import {
  getAdminUsersAction,
  createAdminUserAction,
  toggleAdminSuspensionAction,
  removeAdminAuthorizationAction,
  updateAdminRolePrivilegeAction,
  type AdminUserListItem,
} from '@/server/actions/admin.actions';
import {
  ShieldCheck,
  UserPlus,
  Shield,
  Trash2,
  PowerOff,
  Power,
  Search,
  RefreshCw,
  AlertTriangle,
  Lock,
  UserCog,
  CheckCircle,
  Crown
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

export default function AdminManagementPage() {
  const { adminUser } = useAdminData();
  const { showToast } = useToast();

  const [admins, setAdmins] = useState<AdminUserListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addIdentifier, setAddIdentifier] = useState('');
  const [addRole, setAddRole] = useState<'admin' | 'moderator'>('admin');

  const [suspendTarget, setSuspendTarget] = useState<AdminUserListItem | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<AdminUserListItem | null>(null);
  const [roleChangeTarget, setRoleChangeTarget] = useState<AdminUserListItem | null>(null);
  const [selectedNewRole, setSelectedNewRole] = useState<'admin' | 'moderator'>('admin');

  const loadAdmins = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAdminUsersAction();
      if (res.success) {
        setAdmins(res.admins);
      } else {
        showToast(res.error || 'Failed to load admin directory', 'error');
      }
    } catch (err: any) {
      showToast('Error loading administrators', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadAdmins();
  }, [loadAdmins]);

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addIdentifier.trim()) {
      showToast('Please enter an email, phone, or User ID', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await createAdminUserAction({
        identifier: addIdentifier.trim(),
        adminRole: addRole,
      });

      if (res.success) {
        showToast(`Staff authorization granted to "${addIdentifier}" as ${addRole}`, 'success');
        setIsAddOpen(false);
        setAddIdentifier('');
        await loadAdmins();
      } else {
        showToast(res.error || 'Failed to authorize admin user', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error executing action', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSuspension = async () => {
    if (!suspendTarget) return;
    setActionLoadingId(suspendTarget.id);
    const willSuspend = suspendTarget.status === 'active';

    try {
      const res = await toggleAdminSuspensionAction(suspendTarget.id, willSuspend);
      if (res.success) {
        showToast(
          `Staff account "${suspendTarget.email}" ${willSuspend ? 'suspended' : 'unsuspended'}`,
          'success'
        );
        setSuspendTarget(null);
        await loadAdmins();
      } else {
        showToast(res.error || 'Failed to change status', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error updating account status', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRevoke = async () => {
    if (!revokeTarget) return;
    setActionLoadingId(revokeTarget.id);

    try {
      const res = await removeAdminAuthorizationAction(revokeTarget.id);
      if (res.success) {
        showToast(`Administrative privileges revoked for "${revokeTarget.email}"`, 'success');
        setRevokeTarget(null);
        await loadAdmins();
      } else {
        showToast(res.error || 'Failed to revoke privileges', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error revoking privileges', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRoleChange = async () => {
    if (!roleChangeTarget) return;
    setActionLoadingId(roleChangeTarget.id);

    try {
      const res = await updateAdminRolePrivilegeAction(roleChangeTarget.id, selectedNewRole);
      if (res.success) {
        showToast(`Role updated to "${selectedNewRole}" for "${roleChangeTarget.email}"`, 'success');
        setRoleChangeTarget(null);
        await loadAdmins();
      } else {
        showToast(res.error || 'Failed to change role', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error updating role', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredAdmins = admins.filter((a) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      a.email.toLowerCase().includes(q) ||
      (a.name && a.name.toLowerCase().includes(q)) ||
      (a.phone && a.phone.includes(q)) ||
      a.adminRole.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-rose-950/40 via-slate-900 to-slate-900 border border-rose-900/30">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[10px] font-bold uppercase tracking-wider mb-2">
            <Crown className="w-3 h-3" />
            <span>Super Admin Privilege Zone</span>
          </div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-rose-400" />
            Administrative Staff Governance
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Authorize new Administrators & Content Moderators, manage privileges, and enforce access revocation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-500 text-white"
          >
            <UserPlus className="w-4 h-4" />
            <span>Authorize Staff Account</span>
          </Button>

          <button
            onClick={loadAdmins}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* Search & Count */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search staff email, name, role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
          />
        </div>

        <div className="text-xs text-slate-400">
          Authorized Staff: <span className="font-bold text-white">{admins.length}</span>
        </div>
      </div>

      {/* Staff Table */}
      <div className="overflow-hidden rounded-2xl bg-slate-900/60 border border-slate-800/80 shadow-md">
        {filteredAdmins.length === 0 ? (
          <div className="text-center py-16 px-4">
            <Shield className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-white">No administrators found</h3>
            <p className="text-xs text-slate-400 mt-1">Try adjusting your search criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px] font-bold">
                <tr>
                  <th className="px-5 py-3.5">Staff Identity</th>
                  <th className="px-5 py-3.5">Administrative Role</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Granted On</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredAdmins.map((item) => {
                  const isSelf = item.userId === adminUser.id;

                  return (
                    <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-white">
                            {(item.name || item.email).charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-white text-sm flex items-center gap-1.5">
                              <span>{item.name || item.email}</span>
                              {isSelf && (
                                <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-400">{item.email}</div>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                            item.adminRole === 'super_admin'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : item.adminRole === 'admin'
                              ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          }`}
                        >
                          {item.adminRole.replace('_', ' ')}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        {item.status === 'active' ? (
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
                        {item.createdAt}
                      </td>

                      <td className="px-5 py-4 text-right space-x-1.5">
                        {/* Change Role (not for self) */}
                        {!isSelf && item.adminRole !== 'super_admin' && (
                          <button
                            onClick={() => {
                              setRoleChangeTarget(item);
                              setSelectedNewRole(item.adminRole as any);
                            }}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                            title="Modify admin tier permissions"
                          >
                            <UserCog className="w-4 h-4" />
                          </button>
                        )}

                        {/* Suspend / Unsuspend (not for self) */}
                        {!isSelf && (
                          <button
                            onClick={() => setSuspendTarget(item)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              item.status === 'active'
                                ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400'
                                : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400'
                            }`}
                            title={item.status === 'active' ? 'Suspend staff account' : 'Reactivate account'}
                          >
                            {item.status === 'active' ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                          </button>
                        )}

                        {/* Revoke (not for self) */}
                        {!isSelf && item.adminRole !== 'super_admin' && (
                          <button
                            onClick={() => setRevokeTarget(item)}
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors"
                            title="Revoke staff authorization"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Authorize New Staff Modal */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Authorize Administrative Staff">
        <form onSubmit={handleCreateAdmin} className="space-y-4 pt-2">
          <p className="text-xs text-slate-400">
            Grant administrative or moderator privileges to an existing user account. The user must already exist in the system via Phone or Email registration.
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              User Email, Phone (+91...), or User ID
            </label>
            <input
              type="text"
              value={addIdentifier}
              onChange={(e) => setAddIdentifier(e.target.value)}
              placeholder="e.g. staff@shopmitra.in or +919876543210"
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Assign Role Tier</label>
            <div className="grid grid-cols-2 gap-3">
              <label
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  addRole === 'admin'
                    ? 'bg-indigo-600/20 border-indigo-500 text-white'
                    : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
              >
                <input
                  type="radio"
                  name="role"
                  value="admin"
                  checked={addRole === 'admin'}
                  onChange={() => setAddRole('admin')}
                  className="sr-only"
                />
                <div className="font-bold text-xs text-white">Administrator</div>
                <div className="text-[11px] text-slate-400 mt-0.5">Can manage shops, products, and verifications.</div>
              </label>

              <label
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  addRole === 'moderator'
                    ? 'bg-emerald-600/20 border-emerald-500 text-white'
                    : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
              >
                <input
                  type="radio"
                  name="role"
                  value="moderator"
                  checked={addRole === 'moderator'}
                  onChange={() => setAddRole('moderator')}
                  className="sr-only"
                />
                <div className="font-bold text-xs text-white">Moderator</div>
                <div className="text-[11px] text-slate-400 mt-0.5">Can review customer reports and moderate content.</div>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={loading}>
              Authorize Account
            </Button>
          </div>
        </form>
      </Modal>

      {/* Suspend Confirmation Modal */}
      <Modal
        isOpen={suspendTarget !== null}
        onClose={() => setSuspendTarget(null)}
        title={suspendTarget?.status === 'active' ? `Suspend Staff: ${suspendTarget?.email}` : `Reactivate Staff: ${suspendTarget?.email}`}
      >
        <div className="space-y-4 pt-2">
          <p className="text-xs text-slate-400">
            {suspendTarget?.status === 'active'
              ? 'Suspending this staff account will immediately block access to all /admin/* routes and invalidate administrative API calls.'
              : 'Reactivating this staff account will restore their administrative dashboard privileges.'}
          </p>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setSuspendTarget(null)}>
              Cancel
            </Button>
            <Button
              variant={suspendTarget?.status === 'active' ? 'danger' : 'primary'}
              size="sm"
              onClick={handleToggleSuspension}
              isLoading={actionLoadingId !== null}
            >
              {suspendTarget?.status === 'active' ? 'Confirm Suspension' : 'Confirm Reactivation'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Revoke Confirmation Modal */}
      <Modal
        isOpen={revokeTarget !== null}
        onClose={() => setRevokeTarget(null)}
        title={`Revoke Privileges: ${revokeTarget?.email}`}
      >
        <div className="space-y-4 pt-2">
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            <AlertTriangle className="w-4 h-4 inline mr-1 text-rose-400" />
            Warning: This will permanently remove this user from the administrative staff directory. Their standard customer and merchant accounts will remain intact.
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setRevokeTarget(null)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={handleRevoke} isLoading={actionLoadingId !== null}>
              Revoke Authorization
            </Button>
          </div>
        </div>
      </Modal>

      {/* Change Role Modal */}
      <Modal
        isOpen={roleChangeTarget !== null}
        onClose={() => setRoleChangeTarget(null)}
        title={`Change Permissions: ${roleChangeTarget?.email}`}
      >
        <div className="space-y-4 pt-2">
          <p className="text-xs text-slate-400">Select the new administrative tier for this user.</p>

          <div className="grid grid-cols-2 gap-3">
            <label
              className={`p-3 rounded-xl border cursor-pointer transition-all ${
                selectedNewRole === 'admin'
                  ? 'bg-indigo-600/20 border-indigo-500 text-white'
                  : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}
            >
              <input
                type="radio"
                name="changeRole"
                value="admin"
                checked={selectedNewRole === 'admin'}
                onChange={() => setSelectedNewRole('admin')}
                className="sr-only"
              />
              <div className="font-bold text-xs text-white">Administrator</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Full operational authority.</div>
            </label>

            <label
              className={`p-3 rounded-xl border cursor-pointer transition-all ${
                selectedNewRole === 'moderator'
                  ? 'bg-emerald-600/20 border-emerald-500 text-white'
                  : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}
            >
              <input
                type="radio"
                name="changeRole"
                value="moderator"
                checked={selectedNewRole === 'moderator'}
                onChange={() => setSelectedNewRole('moderator')}
                className="sr-only"
              />
              <div className="font-bold text-xs text-white">Moderator</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Reviews & disputes only.</div>
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setRoleChangeTarget(null)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleRoleChange} isLoading={actionLoadingId !== null}>
              Save Permission Tier
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

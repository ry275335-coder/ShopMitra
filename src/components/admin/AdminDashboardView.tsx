// ==============================================================================
// src/components/admin/AdminDashboardView.tsx
// Complete Administrative Governance, Calibrated with Live Supabase Database
// ==============================================================================

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/components/common/AppContext';
import { MasterProduct } from '@/types';
import { fetchDbProducts } from '@/lib/supabase/db';
import { 
  getAdminDashboardDataAction,
  verifyShopAction, 
  deleteShopAction, 
  deleteProductAction,
  deleteCustomerAction,
  resolveAnomalyAction,
  resolveReportAction,
  updateUserRoleAction,
  type AdminMerchantItem,
  type AdminCustomerItem,
  type AdminPriceAnomalyItem,
  type AdminGrievanceItem
} from '@/server/actions/admin.actions';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { 
  ShieldCheck, 
  AlertTriangle, 
  Store, 
  Users, 
  TrendingUp, 
  CheckCircle, 
  XCircle, 
  Eye, 
  FileText, 
  Search,
  Filter,
  Package,
  Layers,
  Sparkles,
  AlertCircle,
  Plus,
  Trash2,
  UserCheck,
  UserX,
  User,
  Phone,
  MapPin,
  RefreshCw,
  Database
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

export function AdminDashboardView({
  activeMobileView,
  onViewChange,
}: {
  activeMobileView?: string;
  onViewChange?: (view: string) => void;
} = {}) {
  const { showToast } = useToast();
  const { 
    deleteShop: contextDeleteShop, 
    deleteCustomerAccount: contextDeleteCustomer,
    customerUser 
  } = useApp();

  const [activeTab, setActiveTab] = useState<'merchants' | 'users' | 'anomalies' | 'reports' | 'catalog'>('merchants');
  const [catalogSearch, setCatalogSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [merchantSearch, setMerchantSearch] = useState('');
  const [masterProducts, setMasterProducts] = useState<MasterProduct[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Live Database Records
  const [dbShops, setDbShops] = useState<AdminMerchantItem[]>([]);
  const [dbCustomers, setDbCustomers] = useState<AdminCustomerItem[]>([]);
  const [anomalies, setAnomalies] = useState<AdminPriceAnomalyItem[]>([]);
  const [reports, setReports] = useState<AdminGrievanceItem[]>([]);
  const [dbStats, setDbStats] = useState({
    totalShops: 0,
    verifiedShops: 0,
    pendingShops: 0,
    totalCustomers: 0,
    activeAnomalies: 0,
    openReports: 0,
  });

  // Fetch Live Database Records directly via elevated Server Action
  const refreshLiveDashboard = useCallback(async (showNotification = false) => {
    setIsRefreshing(true);
    try {
      const res = await getAdminDashboardDataAction();
      if (res.success) {
        setDbShops(res.shops);
        setDbCustomers(res.customers);
        setAnomalies(res.anomalies);
        setReports(res.reports);
        setDbStats(res.stats);
        if (showNotification) {
          showToast('⚡ Admin dashboard calibrated with live database', 'success');
        }
      } else {
        if (showNotification) {
          showToast(res.error || 'Failed to calibrate with database', 'error');
        }
      }
    } catch (err: any) {
      console.error('refreshLiveDashboard error:', err);
      if (showNotification) {
        showToast('Error syncing with database', 'error');
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [showToast]);

  // Initial load
  useEffect(() => {
    refreshLiveDashboard(false);
    fetchDbProducts().then(prods => {
      if (prods && prods.length > 0) setMasterProducts(prods);
    }).catch(err => console.log('Admin catalog load note:', err));
  }, [refreshLiveDashboard]);

  // Deletion Confirmation States
  const [shopToDelete, setShopToDelete] = useState<{ id: string; name: string } | null>(null);
  const [customerToDelete, setCustomerToDelete] = useState<{ id: string; name: string; mobile: string } | null>(null);
  const [productToDelete, setProductToDelete] = useState<{ id: string; name: string; brand?: string } | null>(null);

  useEffect(() => {
    if (!activeMobileView) return;
    if (activeMobileView === 'admin-overview' || activeMobileView === 'verifications') {
      setActiveTab('merchants');
    } else if (activeMobileView === 'users' || activeMobileView === 'customers') {
      setActiveTab('users');
    } else if (activeMobileView === 'anti-fraud') {
      setActiveTab('anomalies');
    } else if (activeMobileView === 'categories') {
      setActiveTab('catalog');
    }
  }, [activeMobileView]);

  // 1. Verify Partner in Database
  const handleVerifyMerchant = async (id: string, name: string) => {
    setActionLoadingId(id);
    try {
      const res = await verifyShopAction(id, true);
      if (res.success) {
        setDbShops(prev => prev.map(s => s.id === id ? { ...s, status: 'verified', verificationBadge: 'Verified Retail Partner' } : s));
        setDbStats(prev => ({
          ...prev,
          verifiedShops: prev.verifiedShops + 1,
          pendingShops: Math.max(0, prev.pendingShops - 1)
        }));
        showToast({
          title: 'Merchant Verified',
          message: `${name} approved and granted the "Verified Partner" badge in database.`,
          type: 'success',
        });
        refreshLiveDashboard(false);
      } else {
        showToast(res.error || 'Failed to verify merchant in database', 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Verification error', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // 2. Reject Partner in Database
  const handleRejectMerchant = async (id: string, name: string) => {
    setActionLoadingId(id);
    try {
      const res = await verifyShopAction(id, false);
      if (res.success) {
        setDbShops(prev => prev.map(s => s.id === id ? { ...s, status: 'rejected', verificationBadge: undefined } : s));
        setDbStats(prev => ({
          ...prev,
          pendingShops: Math.max(0, prev.pendingShops - 1)
        }));
        showToast({
          title: 'Merchant Rejected',
          message: `Registration for ${name} rejected in database.`,
          type: 'warning',
        });
        refreshLiveDashboard(false);
      } else {
        showToast(res.error || 'Failed to reject merchant', 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Rejection error', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // 3. Confirm Delete Shop from Database
  const confirmDeleteShop = async () => {
    if (!shopToDelete) return;
    const { id, name } = shopToDelete;
    setShopToDelete(null);
    try {
      const res = await deleteShopAction(id);
      if (res.success) {
        setDbShops(prev => prev.filter(s => s.id !== id));
        contextDeleteShop(id);
        showToast({
          title: 'Store Permanently Deleted',
          message: `"${name}" and all branch counter inventory were deleted from the database.`,
          type: 'success',
        });
        refreshLiveDashboard(false);
      } else {
        showToast(res.error || 'Failed to delete store from database', 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Deletion error', 'error');
    }
  };

  // 4. Confirm Delete Customer Account from Database
  const confirmDeleteCustomer = async () => {
    if (!customerToDelete) return;
    const { id, name } = customerToDelete;
    setCustomerToDelete(null);
    try {
      const res = await deleteCustomerAction(id);
      if (res.success) {
        setDbCustomers(prev => prev.filter(c => c.id !== id && c.profileId !== id));
        contextDeleteCustomer(id);
        showToast({
          title: 'Customer Account Deleted',
          message: `Account for ${name} was permanently erased from the database.`,
          type: 'success',
        });
        refreshLiveDashboard(false);
      } else {
        showToast(res.error || 'Failed to delete customer from database', 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Deletion error', 'error');
    }
  };

  // 4b. Confirm Delete Product from Database (Super Admin)
  const confirmDeleteProduct = async () => {
    if (!productToDelete) return;
    const { id, name } = productToDelete;
    setActionLoadingId(id);
    try {
      const res = await deleteProductAction(id);
      if (res.success) {
        setMasterProducts(prev => prev.filter(p => p.id !== id));
        showToast({
          title: 'Product Permanently Deleted',
          message: `"${name}" and all associated counter listings were deleted from the database.`,
          type: 'success',
        });
        setProductToDelete(null);
        refreshLiveDashboard(false);
      } else {
        showToast(res.error || 'Failed to delete product from database', 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Product deletion error', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // 4b. Promote to Admin / Revoke Admin in Database
  const handleToggleAdminRole = async (profileId: string, currentRole: string, name: string) => {
    setActionLoadingId(profileId);
    const newRole: 'admin' | 'customer' = currentRole === 'admin' ? 'customer' : 'admin';
    try {
      const res = await updateUserRoleAction(profileId, newRole);
      if (res.success) {
        setDbCustomers(prev => prev.map(c => c.profileId === profileId ? { ...c, role: newRole } : c));
        showToast({
          title: newRole === 'admin' ? 'Promoted to Administrator' : 'Admin Role Revoked',
          message: `${name} is now ${newRole === 'admin' ? 'a Platform Administrator with full governance privileges' : 'a standard customer'} in the database.`,
          type: 'success',
        });
        refreshLiveDashboard(false);
      } else {
        showToast(res.error || 'Failed to update user role in database', 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Role update error', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // 5. Anti-Fraud Actions calibrated with Database

  const handleApproveDeal = async (id: string) => {
    setActionLoadingId(id);
    try {
      const res = await resolveAnomalyAction(id, 'approve');
      if (res.success) {
        setAnomalies(prev => prev.map(a => a.id === id ? { ...a, status: 'resolved' } : a));
        showToast({
          title: 'Deal Verified Legitimate',
          message: 'Merchant authorized clearance sale confirmed in database. Flag cleared.',
          type: 'success',
        });
        refreshLiveDashboard(false);
      } else {
        showToast(res.error || 'Failed to approve deal in database', 'error');
      }
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelistRate = async (id: string, shopName: string) => {
    setActionLoadingId(id);
    try {
      const res = await resolveAnomalyAction(id, 'delist');
      if (res.success) {
        setAnomalies(prev => prev.map(a => a.id === id ? { ...a, status: 'penalized' } : a));
        showToast({
          title: 'Listing Delisted & Penalized',
          message: `Counter rate by ${shopName} suspended in database. Notice dispatched.`,
          type: 'error',
        });
        refreshLiveDashboard(false);
      } else {
        showToast(res.error || 'Failed to delist listing in database', 'error');
      }
    } finally {
      setActionLoadingId(null);
    }
  };

  // 6. Report Resolution calibrated with Database
  const handleResolveReport = async (id: string) => {
    setActionLoadingId(id);
    try {
      const res = await resolveReportAction(id, 'action_taken');
      if (res.success) {
        setReports(prev => prev.map(r => r.id === id ? { ...r, status: 'action_taken' } : r));
        showToast({
          title: 'Grievance Resolved in Database',
          message: 'Merchant issued pricing compliance notice. Report logged.',
          type: 'success',
        });
        refreshLiveDashboard(false);
      } else {
        showToast(res.error || 'Failed to update report status in database', 'error');
      }
    } finally {
      setActionLoadingId(null);
    }
  };

  // Search Filters
  const filteredMerchants = dbShops.filter(m => {
    const q = merchantSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      m.businessName.toLowerCase().includes(q) ||
      m.ownerName.toLowerCase().includes(q) ||
      m.phone.includes(q) ||
      m.city.toLowerCase().includes(q) ||
      m.gstin.toLowerCase().includes(q)
    );
  });

  const filteredCustomers = dbCustomers.filter(c => {
    const q = userSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      c.mobile.includes(q) ||
      (c.city && c.city.toLowerCase().includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q)) ||
      (c.role && c.role.toLowerCase().includes(q))
    );
  });


  return (
    <div className="space-y-6 pb-16">
      {/* Header Banner */}
      <div className="bg-slate-900 text-white p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold border border-indigo-500/30 mb-2">
            <Database className="w-3.5 h-3.5" />
            <span>Platform Governance & Database Center</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Admin & Compliance Portal</h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-xl">
            Live database records calibrated: Authorize physical retailers, delete accounts, audit fraud price anomalies, and oversee customer grievances.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <a
            href="/admin/dashboard"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Open Master Admin Center (/admin)</span>
          </a>
          <button
            onClick={() => refreshLiveDashboard(true)}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-all active:scale-95 disabled:opacity-50 cursor-pointer shadow-sm"
            title="Re-fetch and synchronize with Supabase Database"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-indigo-400' : 'text-slate-400'}`} />
            <span>{isRefreshing ? 'Syncing...' : 'Sync Database'}</span>
          </button>
          <Badge variant="success" size="md">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse mr-1" />
            Database Synchronized
          </Badge>
        </div>
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Live Stores in DB</span>
            <Store className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-2">
            {dbStats.totalShops}
          </p>
          <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1 mt-1">
            <TrendingUp className="w-3 h-3" /> {dbStats.verifiedShops} verified • {dbStats.pendingShops} pending
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Customer Accounts</span>
            <Users className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-2">
            {dbStats.totalCustomers}
          </p>
          <span className="text-[11px] font-semibold text-indigo-600 mt-1 block">
            {customerUser ? '1 Active Session' : 'Database Registered'}
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Anti-Fraud Flags</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-2">
            {dbStats.activeAnomalies}
          </p>
          <span className="text-[11px] font-semibold text-rose-600 mt-1 block">
            Price anomalies held
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Pending Approvals</span>
            <AlertCircle className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-amber-600 mt-2">
            {dbStats.pendingShops}
          </p>
          <span className="text-[11px] font-semibold text-slate-400 mt-1 block">
            Store approval queue
          </span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('merchants')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'merchants'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Store className="w-4 h-4" />
          <span>Stores & Merchants</span>
          <Badge variant={activeTab === 'merchants' ? 'neutral' : 'warning'} size="sm">
            {dbShops.length}
          </Badge>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'users'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Customer Accounts</span>
          <Badge variant={activeTab === 'users' ? 'neutral' : 'primary'} size="sm">
            {dbCustomers.length}
          </Badge>
        </button>

        <button
          onClick={() => setActiveTab('anomalies')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'anomalies'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <span>Anti-Fraud Shield</span>
          <Badge variant="danger" size="sm">
            {anomalies.filter(a => a.status === 'investigating').length}
          </Badge>
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'reports'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Customer Grievances</span>
          <Badge variant="neutral" size="sm">{reports.filter(r => r.status === 'open').length}</Badge>
        </button>

        <button
          onClick={() => setActiveTab('catalog')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'catalog'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Master Catalog</span>
          <Badge variant="neutral" size="sm">{masterProducts.length}</Badge>
        </button>
      </div>

      {/* Tab 1: Merchant & Store Governance (With Real DB Actions & Deletion) */}
      {activeTab === 'merchants' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Stores & Merchant Verification Queue ({dbShops.length})
              </h2>
              <p className="text-xs text-slate-500">
                Calibrated with live PostgreSQL database: approve stores, inspect details, or permanently delete outlets
              </p>
            </div>

            <div className="relative min-w-[240px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={merchantSearch}
                onChange={e => setMerchantSearch(e.target.value)}
                placeholder="Search store, owner, city, or phone..."
                className="w-full text-xs font-bold pl-8 pr-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="space-y-3">
            {filteredMerchants.length === 0 ? (
              <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-500 text-xs">
                No stores match your search query.
              </div>
            ) : (
              filteredMerchants.map((merchant) => (
                <div
                  key={merchant.id}
                  className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        {merchant.businessName}
                      </h3>
                      <Badge variant="outline">{merchant.category}</Badge>
                      <Badge 
                        variant={merchant.status === 'verified' ? 'success' : merchant.status === 'rejected' ? 'danger' : 'warning'}
                      >
                        {merchant.status.toUpperCase()}
                      </Badge>
                      {merchant.verificationBadge && (
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/40">
                          {merchant.verificationBadge}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
                      <p><strong>Owner:</strong> {merchant.ownerName} ({merchant.phone})</p>
                      <p><strong>GSTIN:</strong> <span className="font-mono">{merchant.gstin}</span></p>
                      <p className="sm:col-span-2"><strong>Address:</strong> {merchant.address}</p>
                      <p><strong>Submitted:</strong> {merchant.submittedAt}</p>
                      <p><strong>City / Market:</strong> {merchant.city}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800 flex-wrap">
                    {merchant.status === 'pending' && (
                      <>
                        <Button
                          variant="primary"
                          size="sm"
                          leftIcon={<CheckCircle className="w-4 h-4" />}
                          isLoading={actionLoadingId === merchant.id}
                          onClick={() => handleVerifyMerchant(merchant.id, merchant.businessName)}
                        >
                          Approve
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          leftIcon={<XCircle className="w-4 h-4" />}
                          isLoading={actionLoadingId === merchant.id}
                          onClick={() => handleRejectMerchant(merchant.id, merchant.businessName)}
                        >
                          Reject
                        </Button>
                      </>
                    )}

                    {merchant.status === 'verified' && (
                      <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 mr-1">
                        <CheckCircle className="w-4 h-4" /> Verified Partner
                      </span>
                    )}

                    {/* ADMIN DELETE STORE BUTTON */}
                    <Button
                      variant="danger"
                      size="sm"
                      leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                      onClick={() => setShopToDelete({ id: merchant.id, name: merchant.businessName })}
                      title="Permanently delete store and all counter prices from database"
                    >
                      Delete Store
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Customer / User Account Management (With Real DB Records & Deletion) */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Registered Customer Accounts ({dbCustomers.length})
              </h2>
              <p className="text-xs text-slate-500">
                Calibrated with live PostgreSQL database: inspect user profiles, phone numbers, and location preferences
              </p>
            </div>

            <div className="relative min-w-[240px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                placeholder="Search by name, mobile, email, or city..."
                className="w-full text-xs font-bold pl-8 pr-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="space-y-3">
            {filteredCustomers.length === 0 ? (
              <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-500 text-xs">
                No customer accounts match your search filter.
              </div>
            ) : (
              filteredCustomers.map(customer => {
                const isCurrentSession = customerUser?.id === customer.id || customerUser?.id === customer.profileId;
                return (
                  <div
                    key={customer.id}
                    className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="flex items-start space-x-3.5 min-w-0">
                      <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 flex items-center justify-center font-black text-sm shrink-0 border border-indigo-200 dark:border-indigo-800/40">
                        {customer.name ? customer.name.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                            {customer.name}
                          </h3>
                          <Badge variant={customer.role === 'merchant' ? 'warning' : 'neutral'} size="sm">
                            {customer.role ? customer.role.toUpperCase() : 'CUSTOMER'}
                          </Badge>
                          {isCurrentSession && (
                            <Badge variant="success" size="sm">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping mr-1" />
                              Active Session
                            </Badge>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-400 font-medium">
                          {customer.mobile ? (
                            <span className="flex items-center gap-1 font-mono">
                              <Phone className="w-3 h-3 text-slate-400" />
                              +91 {customer.mobile}
                            </span>
                          ) : (
                            <span className="text-slate-400">No mobile linked</span>
                          )}
                          {customer.email && (
                            <span className="text-indigo-600 dark:text-indigo-400">{customer.email}</span>
                          )}
                          <span className="flex items-center gap-1 text-slate-500">
                            <MapPin className="w-3 h-3 text-emerald-500" />
                            {customer.city || 'Local Area'}
                          </span>
                          <span className="text-slate-400 text-[11px]">
                            Joined: {customer.createdAt}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800 flex-wrap">
                      {customer.role === 'admin' ? (
                        <Button
                          variant="outline"
                          size="sm"
                          isLoading={actionLoadingId === customer.profileId}
                          onClick={() => handleToggleAdminRole(customer.profileId, customer.role, customer.name)}
                          title="Revoke Administrator privileges"
                        >
                          Revoke Admin
                        </Button>
                      ) : (
                        <Button
                          variant="secondary"
                          size="sm"
                          leftIcon={<ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />}
                          isLoading={actionLoadingId === customer.profileId}
                          onClick={() => handleToggleAdminRole(customer.profileId, customer.role, customer.name)}
                          title="Promote this user to Platform Administrator in Supabase"
                        >
                          Make Admin
                        </Button>
                      )}

                      <Button
                        variant="danger"
                        size="sm"
                        leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                        onClick={() => setCustomerToDelete({ id: customer.id, name: customer.name, mobile: customer.mobile })}
                        title="Permanently delete this customer account from database"
                      >
                        Delete Account
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Anti-Fraud Price Anomaly Detector (Calibrated with Database Rates) */}
      {activeTab === 'anomalies' && (
        <div className="space-y-4">
          <div className="bg-amber-50 dark:bg-amber-950/40 p-4 rounded-2xl border border-amber-200 dark:border-amber-800 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-amber-800 dark:text-amber-300">
              <strong className="block font-bold mb-0.5">Automated Anomaly Shield Rule:</strong>
              Any price update quoting more than <strong>65% below MRP</strong> or plunging drastically within 2 hours is held for administrative audit to protect consumers from counterfeit traps or merchant typos.
            </div>
          </div>

          {anomalies.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-2">
              <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Anti-Fraud Shield Active</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                No active price anomalies detected in database. All physical retailer counter listings are within verified fair-pricing tolerances.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {anomalies.map((ano) => (
                <div
                  key={ano.id}
                  className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-rose-200 dark:border-rose-900/60 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="danger">{ano.discountPercent}% OFF MRP</Badge>
                      <span className="font-bold text-slate-900 dark:text-white text-base">
                        {ano.productName}
                      </span>
                      {ano.brand && <span className="text-xs text-slate-500 font-semibold">({ano.brand})</span>}
                    </div>

                    <p className="text-xs text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 p-2.5 rounded-xl border border-rose-200 dark:border-rose-900/50">
                      <strong>Flag Reason:</strong> {ano.flagReason}
                    </p>

                    <div className="flex items-center gap-4 text-xs font-mono">
                      <span className="text-slate-400 line-through">MRP ₹{ano.mrp.toLocaleString('en-IN')}</span>
                      <span className="text-rose-600 font-bold text-sm">Listed: ₹{ano.listedPrice.toLocaleString('en-IN')}</span>
                      <span className="text-slate-500">Store: <strong>{ano.shopName}</strong></span>
                      <span className="text-slate-400">{ano.reportedAt}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-slate-800">
                    {ano.status === 'investigating' ? (
                      <>
                        <Button
                          variant="primary"
                          size="sm"
                          isLoading={actionLoadingId === ano.id}
                          onClick={() => handleApproveDeal(ano.id)}
                        >
                          Verify Clearance Sale
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          isLoading={actionLoadingId === ano.id}
                          onClick={() => handleDelistRate(ano.id, ano.shopName)}
                        >
                          Delist & Penalize
                        </Button>
                      </>
                    ) : ano.status === 'resolved' ? (
                      <Badge variant="success">Verified Legitimate</Badge>
                    ) : (
                      <Badge variant="danger">Delisted & Penalized</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Customer Grievances Queue (Calibrated with Database Reports) */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Customer Price Discrepancy Grievances ({reports.length})
              </h2>
              <p className="text-xs text-slate-500">In-store customers reporting physical counter discrepancies in Supabase</p>
            </div>
            <Badge variant="neutral" size="sm">
              {reports.filter(r => r.status === 'open').length} Open Grievances
            </Badge>
          </div>

          {reports.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-2">
              <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Zero Grievances Logged</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                No pricing discrepancy reports or consumer complaints currently open in the database.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map((rep) => (
                <div
                  key={rep.id}
                  className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="warning">In-Store Grievance</Badge>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        {rep.shopName}
                      </h3>
                      {rep.productName && (
                        <span className="text-xs text-slate-400">({rep.productName})</span>
                      )}
                    </div>

                    <p className="text-xs text-slate-700 dark:text-slate-300">
                      <strong>Complaint:</strong> {rep.reason}
                    </p>

                    <div className="flex items-center gap-4 text-xs font-mono">
                      <span className="text-emerald-600">Listed: ₹{rep.reportedPrice}</span>
                      <span className="text-rose-600 font-bold">Counter Charged: ₹{rep.actualPrice}</span>
                      <span className="text-slate-400">Reporter: {rep.reporterPhone}</span>
                      <span className="text-slate-400">{rep.createdAt}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
                    {rep.status === 'open' ? (
                      <Button
                        variant="primary"
                        size="sm"
                        isLoading={actionLoadingId === rep.id}
                        onClick={() => handleResolveReport(rep.id)}
                      >
                        Issue Rate Warning
                      </Button>
                    ) : (
                      <Badge variant="success">Warning Dispatched</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}


      {/* Tab 5: Master Catalog */}
      {activeTab === 'catalog' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Master Product Catalog & Barcode Directory
              </h2>
              <p className="text-xs text-slate-500">
                Official MRP benchmark standards across Indian retail categories
              </p>
            </div>

            <div className="relative min-w-[240px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={catalogSearch}
                onChange={e => setCatalogSearch(e.target.value)}
                placeholder="Search catalog products or brands..."
                className="w-full text-xs font-bold pl-8 pr-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {masterProducts
              .filter(p => !catalogSearch.trim() || p.name.toLowerCase().includes(catalogSearch.toLowerCase()) || (p.brand && p.brand.toLowerCase().includes(catalogSearch.toLowerCase())))
              .map(prod => (
                <div
                  key={prod.id}
                  className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded">
                        {prod.brand || 'Retail'}
                      </span>
                      <span className="text-xs font-black text-emerald-600 font-mono">
                        MRP {formatCurrency(prod.mrp)}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-2 mt-1">
                      {prod.name}
                    </h3>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/40">
                      Standard Verified
                    </span>
                    <button
                      onClick={() => setProductToDelete({ id: prod.id, name: prod.name, brand: prod.brand })}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-rose-500 hover:text-white hover:bg-rose-600 dark:hover:bg-rose-600 transition-colors text-xs font-bold border border-rose-200 dark:border-rose-900/40"
                      title="Permanently delete product from master catalog"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* CONFIRM DELETE STORE MODAL */}
      <Modal
        isOpen={Boolean(shopToDelete)}
        onClose={() => setShopToDelete(null)}
        size="sm"
        title="Confirm Store Account Deletion"
      >
        <div className="space-y-4">
          <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-2xl text-xs space-y-2">
            <div className="flex items-center space-x-2 text-rose-700 dark:text-rose-400 font-bold">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>Irreversible Administrative Action</span>
            </div>
            <p className="text-slate-700 dark:text-slate-300">
              Are you sure you want to permanently delete <strong>{shopToDelete?.name}</strong>?
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              This will delist this retail outlet, erase its counter inventory prices, and remove all branch listings from local customer searches.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShopToDelete(null)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              leftIcon={<Trash2 className="w-4 h-4" />}
              onClick={confirmDeleteShop}
            >
              Permanently Delete Store
            </Button>
          </div>
        </div>
      </Modal>

      {/* CONFIRM DELETE CUSTOMER ACCOUNT MODAL */}
      <Modal
        isOpen={Boolean(customerToDelete)}
        onClose={() => setCustomerToDelete(null)}
        size="sm"
        title="Confirm Customer Account Deletion"
      >
        <div className="space-y-4">
          <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-2xl text-xs space-y-2">
            <div className="flex items-center space-x-2 text-rose-700 dark:text-rose-400 font-bold">
              <UserX className="w-5 h-5 shrink-0" />
              <span>Permanent Account Erasure</span>
            </div>
            <p className="text-slate-700 dark:text-slate-300">
              Delete customer account for <strong>{customerToDelete?.name}</strong> ({customerToDelete?.mobile})?
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              This will permanently wipe their saved addresses, target price alerts, wishlists, and any active counter reservation holds.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCustomerToDelete(null)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              leftIcon={<Trash2 className="w-4 h-4" />}
              onClick={confirmDeleteCustomer}
            >
              Permanently Delete Account
            </Button>
          </div>
        </div>
      </Modal>

      {/* CONFIRM DELETE PRODUCT MODAL */}
      <Modal
        isOpen={Boolean(productToDelete)}
        onClose={() => setProductToDelete(null)}
        size="sm"
        title="Confirm Master Product Deletion"
      >
        <div className="space-y-4">
          <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-2xl text-xs space-y-2">
            <div className="flex items-center space-x-2 text-rose-700 dark:text-rose-400 font-bold">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>Irreversible Administrative Action</span>
            </div>
            <p className="text-slate-700 dark:text-slate-300">
              Are you sure you want to permanently delete <strong>{productToDelete?.name}</strong>{productToDelete?.brand ? ` (${productToDelete.brand})` : ''}?
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              This will remove this product from the master catalog, including all live merchant inventory rates, counter price tags, and search comparisons across the platform.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setProductToDelete(null)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              leftIcon={<Trash2 className="w-4 h-4" />}
              onClick={confirmDeleteProduct}
              isLoading={actionLoadingId === productToDelete?.id}
            >
              Permanently Delete Product
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

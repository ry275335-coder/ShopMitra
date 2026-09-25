'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAdminData } from '@/components/admin/AdminLayoutShell';
import { fetchDbProducts } from '@/lib/supabase/db';
import { MasterProduct } from '@/types';
import {
  Package,
  Search,
  Plus,
  RefreshCw,
  Layers,
  Copy,
  AlertCircle,
  Tag,
  CheckCircle2,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { deleteProductAction } from '@/server/actions/admin.actions';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

export default function AdminProductsPage() {
  const { isLoading: adminLoading, refreshData } = useAdminData();
  const { showToast } = useToast();

  const [products, setProducts] = useState<MasterProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<MasterProduct | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchDbProducts();
      setProducts(data);
    } catch (err: any) {
      showToast('Error loading product catalog', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const categories = Array.from(new Set(products.map((p) => p.categoryName || 'General').filter(Boolean)));

  const filteredProducts = products.filter((p) => {
    if (selectedCategory !== 'all' && (p.categoryName || 'General') !== selectedCategory) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.brand?.toLowerCase().includes(q) ||
        p.barcode?.includes(q) ||
        p.categoryName?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Simple duplicate detection heuristic: similar names or identical brand + name tokens
  const findDuplicates = () => {
    const map = new Map<string, MasterProduct[]>();
    products.forEach((p) => {
      const key = `${p.brand || ''}-${p.name.trim().toLowerCase().slice(0, 15)}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    });
    const duplicates: { key: string; items: MasterProduct[] }[] = [];
    map.forEach((items, key) => {
      if (items.length > 1) {
        duplicates.push({ key, items });
      }
    });
    return duplicates;
  };

  const detectedDuplicates = findDuplicates();

  const handleDeleteProduct = async () => {
    if (!deleteTarget) return;
    setActionLoadingId(deleteTarget.id);
    try {
      const res = await deleteProductAction(deleteTarget.id);
      if (res.success) {
        showToast(`Product "${deleteTarget.name}" deleted permanently`, 'success');
        setProducts((prev) => prev.filter((p) => p.id !== deleteTarget.id));
        setDeleteTarget(null);
        await refreshData(true);
      } else {
        showToast(res.error || 'Failed to delete product', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error deleting product', 'error');
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
            <Package className="w-5 h-5 text-indigo-400" />
            Master Product Catalog
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Standardized catalog SKUs referenced by all local merchant counters for price discovery.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowDuplicateModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Audit Duplicates ({detectedDuplicates.length})</span>
          </button>

          <button
            onClick={loadProducts}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Category selector */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 max-w-xl custom-scrollbar">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              selectedCategory === 'all'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            All Categories ({products.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search SKU, brand, barcode..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Catalog Table */}
      <div className="overflow-hidden rounded-2xl bg-slate-900/60 border border-slate-800/80 shadow-md">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-16 px-4">
            <Package className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-white">No products found</h3>
            <p className="text-xs text-slate-400 mt-1">Try adjusting search query or category filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px] font-bold">
                <tr>
                  <th className="px-5 py-3.5">Product SKU</th>
                  <th className="px-5 py-3.5">Category & Taxa</th>
                  <th className="px-5 py-3.5">Barcode / GTIN</th>
                  <th className="px-5 py-3.5">Catalog MRP</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredProducts.map((prod) => (
                  <tr key={prod.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {prod.imageUrl ? (
                            <img
                              src={prod.imageUrl}
                              alt={prod.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Package className="w-5 h-5 text-slate-500" />
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-white text-sm leading-tight">{prod.name}</div>
                          <div className="text-xs text-indigo-400 mt-0.5">{prod.brand || 'Generic Brand'}</div>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-3.5">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 text-[11px]">
                        {prod.categoryName || 'General'}
                      </span>
                    </td>

                    <td className="px-5 py-3.5 font-mono text-[11px] text-slate-400">
                      {prod.barcode || '—'}
                    </td>

                    <td className="px-5 py-3.5">
                      <div className="font-bold text-slate-200 text-sm">{formatCurrency(prod.mrp)}</div>
                    </td>

                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1 text-emerald-400 text-[11px] font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Active
                      </span>
                    </td>

                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => setDeleteTarget(prod)}
                        className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 transition-colors"
                        title="Permanently remove product from master catalog"
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

      {/* Duplicate Audit Modal */}
      <Modal
        isOpen={showDuplicateModal}
        onClose={() => setShowDuplicateModal(false)}
        title="Duplicate SKU Detection"
      >
        <div className="space-y-4 pt-2">
          <p className="text-xs text-slate-400">
            Automated heuristic detects products sharing identical brands or similar names that may be duplicates.
          </p>

          {detectedDuplicates.length === 0 ? (
            <div className="text-center py-8 text-emerald-400 text-xs">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-400" />
              Clean catalog! No obvious duplicate SKUs detected.
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
              {detectedDuplicates.map((group, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                  <div className="text-xs font-bold text-amber-400">
                    Potential Duplicate Cluster ({group.items.length} items)
                  </div>
                  <div className="space-y-1">
                    {group.items.map((item) => (
                      <div key={item.id} className="text-xs text-slate-300 flex justify-between">
                        <span>{item.name} ({item.brand})</span>
                        <span className="font-mono text-slate-400">{formatCurrency(item.mrp)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button variant="outline" size="sm" onClick={() => setShowDuplicateModal(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Product Modal */}
      <Modal
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title={`Permanently Delete Product: ${deleteTarget?.name}`}
      >
        <div className="space-y-4 pt-2">
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs leading-relaxed">
            <AlertTriangle className="w-4 h-4 inline mr-1 text-rose-400" />
            Warning: This action will permanently remove this master product from the catalog, including all live merchant inventory rates and price comparison listings across the platform.
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleDeleteProduct}
              isLoading={actionLoadingId !== null}
              leftIcon={<Trash2 className="w-3.5 h-3.5" />}
            >
              Delete Product Permanently
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

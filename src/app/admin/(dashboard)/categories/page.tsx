'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAdminData } from '@/components/admin/AdminLayoutShell';
import { fetchDbCategories } from '@/lib/supabase/db';
import { createCategoryAction, deleteCategoryAction } from '@/server/actions/admin.actions';
import { Category } from '@/types';
import {
  FolderTree,
  Plus,
  Trash2,
  Search,
  RefreshCw,
  Tag,
  CheckCircle,
  AlertTriangle,
  Layers,
  ChevronRight
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

export default function AdminCategoriesPage() {
  const { isLoading: adminLoading } = useAdminData();
  const { showToast } = useToast();

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Add Category Modal State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatSlug, setNewCatSlug] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('ShoppingBag');

  // Delete Category Modal State
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);

  const loadCategories = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchDbCategories();
      setCategories(data);
    } catch (err: any) {
      showToast('Error loading categories', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const handleNameChange = (name: string) => {
    setNewCatName(name);
    setNewCatSlug(name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
  };

  const handleCreateCategory = async () => {
    if (!newCatName.trim() || !newCatSlug.trim()) {
      showToast('Name and unique slug are required', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await createCategoryAction({
        name: newCatName.trim(),
        slug: newCatSlug.trim(),
        description: newCatDesc.trim() || undefined,
        icon: newCatIcon,
      });

      if (res.success) {
        showToast(`Category "${newCatName}" created successfully`, 'success');
        setIsAddOpen(false);
        setNewCatName('');
        setNewCatSlug('');
        setNewCatDesc('');
        await loadCategories();
      } else {
        showToast(res.error || 'Failed to create category', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error creating category', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!deleteTarget) return;
    setActionLoadingId(deleteTarget.id);
    try {
      const res = await deleteCategoryAction(deleteTarget.id);
      if (res.success) {
        showToast(`Category "${deleteTarget.name}" deleted successfully`, 'success');
        setDeleteTarget(null);
        await loadCategories();
      } else {
        showToast(res.error || 'Failed to delete category', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error deleting category', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredCategories = categories.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <FolderTree className="w-5 h-5 text-indigo-400" />
            Category & Taxonomy Management
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Organize catalog hierarchy, browse channels, and unique SEO slug routing for local discovery.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>New Category</span>
          </Button>

          <button
            onClick={loadCategories}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search category name or slug..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="text-xs text-slate-400">
          Total Categories: <span className="font-bold text-white">{categories.length}</span>
        </div>
      </div>

      {/* Categories Grid / Table */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCategories.map((cat) => (
          <div
            key={cat.id}
            className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <Tag className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">{cat.name}</h3>
                    <span className="text-[11px] font-mono text-slate-400">/{cat.slug}</span>
                  </div>
                </div>

                <button
                  onClick={() => setDeleteTarget(cat)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                  title="Delete category"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {cat.description && (
                <p className="text-xs text-slate-400 mt-3 line-clamp-2">{cat.description}</p>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1 text-emerald-400 font-semibold text-[11px]">
                <CheckCircle className="w-3 h-3" />
                Active
              </span>
              <span className="text-[10px] font-mono text-slate-500">ID: {cat.id.slice(0, 8)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Create Category Modal */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Create New Category">
        <div className="space-y-4 pt-2">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Category Title</label>
            <input
              type="text"
              value={newCatName}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g., Electronics & Appliances"
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              URL Slug (Unique Route Identifier)
            </label>
            <input
              type="text"
              value={newCatSlug}
              onChange={(e) => setNewCatSlug(e.target.value)}
              placeholder="electronics-appliances"
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Description (Optional)</label>
            <textarea
              rows={2}
              value={newCatDesc}
              onChange={(e) => setNewCatDesc(e.target.value)}
              placeholder="Brief description for shoppers and SEO meta tags..."
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleCreateCategory} isLoading={loading}>
              Create Category
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Category Modal */}
      <Modal
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title={`Delete Category: ${deleteTarget?.name}`}
      >
        <div className="space-y-4 pt-2">
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            <AlertTriangle className="w-4 h-4 inline mr-1 text-rose-400" />
            Category deletion is protected. If this category contains linked catalog products, the server will block deletion to prevent orphaned products.
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleDeleteCategory}
              isLoading={actionLoadingId !== null}
            >
              Confirm Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

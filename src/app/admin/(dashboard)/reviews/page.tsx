'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  getAdminReviewsAction,
  moderateReviewAction,
  type AdminReviewItem
} from '@/server/actions/admin.actions';
import {
  MessageSquare,
  Star,
  Search,
  CheckCircle,
  EyeOff,
  Trash2,
  RefreshCw,
  Filter,
  ShieldCheck
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

export default function AdminReviewsPage() {
  const { showToast } = useToast();

  const [reviews, setReviews] = useState<AdminReviewItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [ratingFilter, setRatingFilter] = useState<number | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState<AdminReviewItem | null>(null);

  const loadReviews = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAdminReviewsAction();
      if (res.success) {
        setReviews(res.reviews);
      } else {
        showToast(res.error || 'Failed to load reviews', 'error');
      }
    } catch (err: any) {
      showToast('Error loading reviews', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  const handleModerate = async (reviewId: string, action: 'hide' | 'restore' | 'delete') => {
    setActionLoadingId(reviewId);
    try {
      const res = await moderateReviewAction(reviewId, action);
      if (res.success) {
        showToast(`Review ${action === 'delete' ? 'deleted' : action === 'hide' ? 'hidden' : 'restored'} successfully`, 'success');
        if (action === 'delete') {
          setDeleteTarget(null);
        }
        await loadReviews();
      } else {
        showToast(res.error || 'Action failed', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error moderating review', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredReviews = reviews.filter((r) => {
    if (ratingFilter !== 'all' && r.rating !== ratingFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        r.customerName.toLowerCase().includes(q) ||
        r.shopName.toLowerCase().includes(q) ||
        r.reviewText.toLowerCase().includes(q) ||
        r.productName?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-indigo-400" />
            Customer Review Moderation
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Audit customer feedback, ratings, and counterfeit or abusive reviews across stores and products.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadReviews}
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
        {/* Rating Pills */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-900 border border-slate-800 self-start">
          <button
            onClick={() => setRatingFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              ratingFilter === 'all'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            All Ratings ({reviews.length})
          </button>
          {[5, 4, 3, 2, 1].map((stars) => (
            <button
              key={stars}
              onClick={() => setRatingFilter(stars)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                ratingFilter === stars
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <span>{stars}</span>
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search shopper, store, review text..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Reviews Table */}
      <div className="overflow-hidden rounded-2xl bg-slate-900/60 border border-slate-800/80 shadow-md">
        {filteredReviews.length === 0 ? (
          <div className="text-center py-16 px-4">
            <MessageSquare className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-white">No reviews found</h3>
            <p className="text-xs text-slate-400 mt-1">
              No customer reviews match your active rating filter or query.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px] font-bold">
                <tr>
                  <th className="px-5 py-3.5">Shopper & Store</th>
                  <th className="px-5 py-3.5">Rating & Review</th>
                  <th className="px-5 py-3.5">Product</th>
                  <th className="px-5 py-3.5">Date</th>
                  <th className="px-5 py-3.5 text-right">Moderation Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredReviews.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-bold text-white text-sm">{r.customerName}</div>
                      <div className="text-indigo-400 text-xs mt-0.5">Store: {r.shopName}</div>
                      {r.isVerifiedInteraction && (
                        <div className="text-[10px] text-emerald-400 flex items-center gap-1 mt-1">
                          <CheckCircle className="w-3 h-3" />
                          <span>Verified Store Visit</span>
                        </div>
                      )}
                    </td>

                    <td className="px-5 py-4 max-w-md">
                      <div className="flex items-center gap-1 mb-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3.5 h-3.5 ${
                              i < r.rating
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-slate-600'
                            }`}
                          />
                        ))}
                        <span className="ml-1 text-slate-300 font-bold text-xs">{r.rating}/5</span>
                      </div>
                      <p className="text-slate-300 text-xs leading-relaxed">
                        {r.reviewText || <span className="italic text-slate-500">No written text</span>}
                      </p>
                    </td>

                    <td className="px-5 py-4 text-slate-400">
                      {r.productName || 'General Store Review'}
                    </td>

                    <td className="px-5 py-4 text-slate-400 text-[11px] whitespace-nowrap">
                      {r.createdAt}
                    </td>

                    <td className="px-5 py-4 text-right space-x-1.5">
                      <button
                        onClick={() => handleModerate(r.id, 'hide')}
                        disabled={actionLoadingId === r.id}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                        title="Hide review from public store page"
                      >
                        <EyeOff className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => setDeleteTarget(r)}
                        disabled={actionLoadingId === r.id}
                        className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors"
                        title="Permanently remove abusive review"
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

      {/* Delete Review Modal */}
      <Modal
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Delete Abusive Review"
      >
        <div className="space-y-4 pt-2">
          <p className="text-xs text-slate-400">
            Are you sure you want to permanently delete this customer review? This action will remove it completely from the store's rating history.
          </p>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => deleteTarget && handleModerate(deleteTarget.id, 'delete')}
              isLoading={actionLoadingId !== null}
            >
              Delete Review
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

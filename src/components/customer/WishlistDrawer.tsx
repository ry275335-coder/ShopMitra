// ==============================================================================
// src/components/customer/WishlistDrawer.tsx
// Saved Items & Watchlist Drawer for Quick Price Tracking (Step 48 & 53)
// ==============================================================================

'use client';

import React from 'react';
import { useApp } from '@/components/common/AppContext';
import { MasterProduct, ShopProductRate } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Heart, Trash2, ArrowRight, Store, ShoppingBag } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

export function WishlistDrawer({
  isOpen,
  onClose,
  products,
  onSelectProduct,
}: {
  isOpen: boolean;
  onClose: () => void;
  products: MasterProduct[];
  onSelectProduct: (p: MasterProduct) => void;
}) {
  const { wishlist, toggleWishlist } = useApp();

  const savedProducts = products.filter((p) => wishlist.includes(p.id));

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" title={`My Wishlist (${savedProducts.length})`}>
      {savedProducts.length === 0 ? (
        <div className="text-center py-12 px-4">
          <div className="w-16 h-16 bg-rose-50 dark:bg-rose-950/50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Heart className="w-8 h-8 opacity-60" />
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
            Your Wishlist is Empty
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            Save products and shops to track their counter prices and get notified of sudden price drops.
          </p>
          <Button variant="primary" size="sm" className="mt-4" onClick={onClose}>
            Browse Local Products
          </Button>
        </div>
      ) : (
        <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
          {savedProducts.map((product) => (
            <div
              key={product.id}
              className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-3 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-14 h-14 rounded-lg bg-slate-50 dark:bg-slate-800 p-1 flex-shrink-0 flex items-center justify-center border border-slate-200 dark:border-slate-700">
                  <img
                    src={product.imageUrl || 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=400&q=80'}
                    alt={product.name}
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase">
                    {product.brand}
                  </span>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {product.name}
                  </h4>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs font-semibold text-slate-500">
                      MRP: {formatCurrency(product.mrp)}
                    </span>
                    <Badge variant="outline" size="sm">{product.category}</Badge>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    onClose();
                    onSelectProduct(product);
                  }}
                  rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                >
                  Compare
                </Button>
                <button
                  onClick={() => toggleWishlist(product.id)}
                  className="p-2 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="Remove from wishlist"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

// ==============================================================================
// src/components/merchant/PriceQuickEditor.tsx
// Rapid In-Store Price & Stock Management Board (Step 12, 13, 35)
// ==============================================================================

'use client';

import React, { useState } from 'react';
import { useApp } from '@/components/common/AppContext';
import { updateProductPriceAction } from '@/server/actions/merchant.actions';
import { MasterProduct, StockStatus } from '@/types';
import { fetchDbProducts, fetchDbShopProducts } from '@/lib/supabase/db';
import { 
  Check, 
  Clock, 
  Save, 
  Search, 
  Sparkles,
  AlertTriangle,
  Loader2,
  RefreshCw,
  PlusCircle,
  PackagePlus,
  Plus
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

export function PriceQuickEditor() {
  const { activeMerchantShopId } = useApp();
  const { showToast } = useToast();

  const [searchFilter, setSearchFilter] = useState('');
  const [editedPrices, setEditedPrices] = useState<Record<string, number>>({});
  const [editedStocks, setEditedStocks] = useState<Record<string, StockStatus>>({});
  const [loadingRowId, setLoadingRowId] = useState<string | null>(null);
  const [productsList, setProductsList] = useState<MasterProduct[]>([]);
  const [dbInventory, setDbInventory] = useState<any[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showCatalogPicker, setShowCatalogPicker] = useState(false);
  const [addingCatalogId, setAddingCatalogId] = useState<string | null>(null);

  const loadData = React.useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [prods, inv] = await Promise.all([
        fetchDbProducts(),
        activeMerchantShopId ? fetchDbShopProducts(undefined, activeMerchantShopId) : Promise.resolve([]),
      ]);

      // Merge any locally saved inventory for this shop
      let localItems: any[] = [];
      if (activeMerchantShopId) {
        try {
          const raw = localStorage.getItem('shopmitra_shop_inventory_' + activeMerchantShopId);
          if (raw) localItems = JSON.parse(raw);
        } catch {}
      }

      const combinedInv = [...inv];
      localItems.forEach(item => {
        if (!combinedInv.some(c => (c.product_id || c.productId) === (item.product_id || item.productId))) {
          combinedInv.push(item);
        }
      });

      setProductsList(prods);
      setDbInventory(combinedInv);
    } catch (err) {
      console.warn('PriceQuickEditor load error:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [activeMerchantShopId]);

  React.useEffect(() => {
    loadData();
    const handleInvUpdated = (e: any) => {
      if (!e?.detail?.shopId || e.detail.shopId === activeMerchantShopId) {
        loadData();
      }
    };
    window.addEventListener('shopmitra:inventory_updated', handleInvUpdated);
    return () => window.removeEventListener('shopmitra:inventory_updated', handleInvUpdated);
  }, [loadData, activeMerchantShopId]);

  // Map ONLY real listed products in this shop's inventory (NO fake placeholders!)
  const items = React.useMemo(() => {
    if (dbInventory.length === 0) return [];

    return dbInventory.map(inv => {
      const prodId = inv.product_id || inv.productId;
      const prod = productsList.find(p => p.id === prodId);
      const price = Number(inv.selling_price || inv.price || 0);
      const mrp = prod ? prod.mrp : Number(inv.mrp || price * 1.15);
      const stock = (inv.stock_status || inv.stock || 'in_stock') as StockStatus;
      const count = Number(inv.stock_quantity || inv.count || 10);

      return {
        invId: inv.id || `inv-${activeMerchantShopId}-${prodId}`,
        productId: prodId,
        name: prod?.name || inv.product_name || inv.name || 'Product',
        brand: prod?.brand || inv.brand || 'General',
        model: prod?.model || inv.model || '',
        mrp,
        imageUrl: prod?.imageUrl || inv.image_url || inv.imageUrl || '',
        currentPrice: price,
        stockStatus: stock,
        stockCount: count,
        updatedMinutesAgo: inv.updatedMinutesAgo ?? 0,
        isListed: true,
      };
    });
  }, [dbInventory, productsList, activeMerchantShopId]);

  const filteredItems = items.filter(item =>
    !searchFilter ||
    item.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
    item.brand.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const handlePriceInput = (productId: string, val: string) => {
    const num = parseFloat(val);
    setEditedPrices(prev => ({
      ...prev,
      [productId]: isNaN(num) ? 0 : num,
    }));
  };

  const handleStockChange = (productId: string, newStatus: StockStatus) => {
    setEditedStocks(prev => ({
      ...prev,
      [productId]: newStatus,
    }));
  };

  const handleSaveItem = async (item: (typeof items)[0]) => {
    const newPrice = editedPrices[item.productId] ?? item.currentPrice;
    const newStock = editedStocks[item.productId] ?? item.stockStatus;

    if (newPrice <= 0) {
      showToast('Please enter a valid price greater than 0', 'error');
      return;
    }

    setLoadingRowId(item.productId);
    try {
      const res = await updateProductPriceAction({
        productId: item.productId,
        shopId: activeMerchantShopId,
        newPrice,
        stockStatus: newStock,
        stockQuantity: item.stockCount,
      });

      if (res.success) {
        showToast(res.message || 'Rate and stock updated successfully!');
        // Update local storage cache
        if (activeMerchantShopId) {
          try {
            const key = 'shopmitra_shop_inventory_' + activeMerchantShopId;
            const existing = JSON.parse(localStorage.getItem(key) || '[]');
            const idx = existing.findIndex((i: any) => (i.product_id || i.productId) === item.productId);
            if (idx !== -1) {
              existing[idx].selling_price = newPrice;
              existing[idx].stock_status = newStock;
            } else {
              existing.unshift({
                product_id: item.productId,
                selling_price: newPrice,
                stock_status: newStock,
                stock_quantity: item.stockCount,
                product_name: item.name,
                brand: item.brand,
                image_url: item.imageUrl,
                mrp: item.mrp,
              });
            }
            localStorage.setItem(key, JSON.stringify(existing));
          } catch {}
        }

        // Clear dirtiness
        setEditedPrices(prev => {
          const copy = { ...prev };
          delete copy[item.productId];
          return copy;
        });

        loadData();
      } else {
        showToast(res.error || 'Failed to update rate', 'error');
      }
    } catch {
      showToast('Network error while updating rate', 'error');
    } finally {
      setLoadingRowId(null);
    }
  };

  const handleQuickAddCatalogProduct = async (prod: MasterProduct) => {
    if (!activeMerchantShopId) {
      showToast('Please select or register a store first', 'error');
      return;
    }

    setAddingCatalogId(prod.id);
    const counterRate = Math.round(prod.mrp * 0.9);

    try {
      const res = await updateProductPriceAction({
        productId: prod.id,
        shopId: activeMerchantShopId,
        newPrice: counterRate,
        stockStatus: 'in_stock',
        stockQuantity: 15,
      });

      if (res.success) {
        // Save to local storage cache
        try {
          const key = 'shopmitra_shop_inventory_' + activeMerchantShopId;
          const existing = JSON.parse(localStorage.getItem(key) || '[]');
          if (!existing.some((i: any) => (i.product_id || i.productId) === prod.id)) {
            existing.unshift({
              id: `inv-${Date.now()}`,
              shop_id: activeMerchantShopId,
              product_id: prod.id,
              selling_price: counterRate,
              previous_price: counterRate,
              stock_status: 'in_stock',
              stock_quantity: 15,
              product_name: prod.name,
              brand: prod.brand,
              image_url: prod.imageUrl,
              mrp: prod.mrp,
              created_at: new Date().toISOString(),
            });
            localStorage.setItem(key, JSON.stringify(existing));
          }
        } catch {}

        showToast(`Added ${prod.name} to store catalogue at ₹${counterRate}!`);
        await loadData();
        window.dispatchEvent(new CustomEvent('shopmitra:inventory_updated', { detail: { shopId: activeMerchantShopId } }));
      } else {
        showToast(res.error || 'Could not add product to store', 'error');
      }
    } catch {
      showToast('Network error adding product', 'error');
    } finally {
      setAddingCatalogId(null);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Table Action Bar */}
      <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/60">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-base font-black text-slate-900">
              ⚡ Rapid Price & Stock Quick-Editor
            </span>
            <span className="text-[10px] font-black uppercase bg-merchant-100 text-merchant-800 px-2 py-0.5 rounded-full">
              {items.length} Listed Items
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Prices update instantly across nearby customer searches. Shows exact "Updated X ago" timestamp for customer trust.
          </p>
        </div>

        {/* Action Controls & Search Filter */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {items.length > 0 && (
            <div className="relative w-full sm:w-56">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchFilter}
                onChange={e => setSearchFilter(e.target.value)}
                placeholder="Filter listed items..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl outline-none focus:border-merchant-500 font-semibold"
              />
            </div>
          )}

          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('shopmitra:open_add_product'))}
            className="px-3.5 py-1.5 bg-merchant-600 hover:bg-merchant-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-xs transition-all active:scale-95 shrink-0"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>+ Add Product</span>
          </button>

          <button
            type="button"
            onClick={() => setShowCatalogPicker(!showCatalogPicker)}
            className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all active:scale-95 shrink-0"
            title="Browse Master Catalog presets"
          >
            <Sparkles className="w-3.5 h-3.5 text-merchant-600" />
            <span>{showCatalogPicker ? 'Hide Catalog' : 'Catalog Presets'}</span>
          </button>

          <button
            type="button"
            onClick={loadData}
            disabled={isRefreshing}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors shrink-0"
            title="Refresh Inventory"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Expandable Master Catalog Presets Strip */}
      {showCatalogPicker && productsList.length > 0 && (
        <div className="p-4 sm:p-5 bg-gradient-to-r from-merchant-50/70 via-slate-50 to-emerald-50/40 border-b border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-merchant-600" />
                <span>Popular Retail Essentials (1-Click Add to Store)</span>
              </h4>
              <p className="text-[11px] text-slate-500">Select any standard item to stock in your shop catalog at counter rate</p>
            </div>
            <button
              type="button"
              onClick={() => setShowCatalogPicker(false)}
              className="text-[11px] font-bold text-slate-500 hover:text-slate-800"
            >
              Done
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {productsList.map(prod => {
              const isAlreadyInStore = items.some(i => i.productId === prod.id);
              const isAdding = addingCatalogId === prod.id;
              const defaultPrice = Math.round(prod.mrp * 0.9);

              return (
                <div key={prod.id} className="p-2.5 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center gap-2.5">
                  <img
                    src={prod.imageUrl}
                    alt={prod.name}
                    className="w-11 h-11 rounded-xl object-cover border border-slate-100 shrink-0 bg-slate-50"
                  />
                  <div className="min-w-0 flex-1">
                    <h5 className="text-xs font-bold text-slate-900 truncate">{prod.name}</h5>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                      <span>MRP: ₹{prod.mrp}</span>
                      <span>•</span>
                      <span className="font-bold text-emerald-600">Rate: ₹{defaultPrice}</span>
                    </div>
                  </div>

                  {isAlreadyInStore ? (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-xl shrink-0">
                      In Store ✓
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleQuickAddCatalogProduct(prod)}
                      disabled={isAdding}
                      className="px-2.5 py-1 bg-merchant-600 hover:bg-merchant-700 text-white rounded-xl text-xs font-black shrink-0 transition-all flex items-center gap-1 active:scale-95"
                    >
                      {isAdding ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Plus className="w-3 h-3" />
                      )}
                      <span>Add</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Content: Either Empty State or Real Table */}
      {items.length === 0 ? (
        <div className="p-8 sm:p-14 text-center max-w-lg mx-auto space-y-4">
          <div className="w-14 h-14 rounded-3xl bg-merchant-50 border border-merchant-200 text-merchant-600 flex items-center justify-center mx-auto shadow-xs">
            <PackagePlus className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900">
              No Products in This Store Yet
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
              Your store catalog is currently empty. Add your shop's items with live camera photos, or pick from popular master catalog items to start showing up in customer price searches!
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('shopmitra:open_add_product'))}
              className="px-4 py-2.5 bg-merchant-600 hover:bg-merchant-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ Add New Product (Camera / Photo)</span>
            </button>
            <button
              type="button"
              onClick={() => setShowCatalogPicker(true)}
              className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all active:scale-95"
            >
              <Sparkles className="w-4 h-4 text-merchant-600" />
              <span>⚡ Pick from Catalog</span>
            </button>
          </div>
        </div>
      ) : (
        /* Spreadsheet-Like Interactive Table for Real Products Only */
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] font-black uppercase tracking-wider text-slate-400 bg-slate-50/80">
                <th className="py-3 px-4 sm:px-6">Product Details</th>
                <th className="py-3 px-4">MRP</th>
                <th className="py-3 px-4">Current Rate</th>
                <th className="py-3 px-4">New Selling Rate (₹)</th>
                <th className="py-3 px-4">Stock Status</th>
                <th className="py-3 px-4">Freshness</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 font-semibold">
                    No items match "{searchFilter}".
                  </td>
                </tr>
              ) : (
                filteredItems.map(item => {
                  const isDirtyPrice = editedPrices[item.productId] !== undefined && editedPrices[item.productId] !== item.currentPrice;
                  const isDirtyStock = editedStocks[item.productId] !== undefined && editedStocks[item.productId] !== item.stockStatus;
                  const isDirty = isDirtyPrice || isDirtyStock;
                  const activePrice = editedPrices[item.productId] ?? item.currentPrice;
                  const activeStock = editedStocks[item.productId] ?? item.stockStatus;
                  const isSaving = loadingRowId === item.productId;

                  const minutesAgo = item.updatedMinutesAgo;
                  const updatedText = minutesAgo === 0 
                    ? 'Just now' 
                    : minutesAgo < 60 
                    ? `${minutesAgo}m ago` 
                    : `${Math.round(minutesAgo / 60)}h ago`;

                  return (
                    <tr key={item.productId} className="hover:bg-slate-50/70 transition-colors">
                      {/* Thumbnail & Title */}
                      <td className="py-3 px-4 sm:px-6">
                        <div className="flex items-center space-x-3">
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt={item.name}
                              className="w-10 h-10 rounded-xl object-cover bg-slate-100 shrink-0 border border-slate-200/60"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 font-black text-xs shrink-0 border border-slate-200">
                              📦
                            </div>
                          )}
                          <div className="min-w-0 max-w-xs">
                            <span className="text-[10px] font-black uppercase text-merchant-600">
                              {item.brand}
                            </span>
                            <h4 className="font-bold text-slate-900 truncate">{item.name}</h4>
                            <span className="text-[10px] text-slate-400">{item.model}</span>
                          </div>
                        </div>
                      </td>

                      {/* MRP */}
                      <td className="py-3 px-4 text-slate-400 font-semibold">
                        ₹{item.mrp}
                      </td>

                      {/* Current In-Store Rate */}
                      <td className="py-3 px-4 font-extrabold text-slate-800">
                        ₹{item.currentPrice}
                      </td>

                      {/* New Rate Input */}
                      <td className="py-3 px-4">
                        <div className="relative w-28">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-black">
                            ₹
                          </span>
                          <input
                            type="number"
                            value={activePrice}
                            onChange={e => handlePriceInput(item.productId, e.target.value)}
                            className={`w-full pl-6 pr-2 py-1.5 rounded-xl text-xs font-black border outline-none transition-all ${
                              isDirtyPrice
                                ? 'bg-amber-50 border-amber-400 text-amber-900 ring-2 ring-amber-300/40'
                                : 'bg-white border-slate-200 text-slate-900 focus:border-merchant-500'
                            }`}
                          />
                        </div>
                      </td>

                      {/* Stock Status Selector */}
                      <td className="py-3 px-4">
                        <select
                          value={activeStock}
                          onChange={e => handleStockChange(item.productId, e.target.value as StockStatus)}
                          className={`text-xs font-bold py-1 px-2.5 rounded-xl border outline-none ${
                            activeStock === 'in_stock'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : activeStock === 'low_stock'
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-rose-50 text-rose-800 border-rose-200'
                          }`}
                        >
                          <option value="in_stock">🟢 In Stock</option>
                          <option value="low_stock">🟡 Low Stock</option>
                          <option value="out_of_stock">🔴 Out of Stock</option>
                          <option value="available_on_order">📦 On Order</option>
                        </select>
                      </td>

                      {/* Freshness Timestamp */}
                      <td className="py-3 px-4 text-slate-500 text-[11px] whitespace-nowrap">
                        <span className="inline-flex items-center space-x-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span className="font-semibold">{updatedText}</span>
                        </span>
                      </td>

                      {/* Action Save Button */}
                      <td className="py-3 px-4 text-right">
                        {isDirty ? (
                          <button
                            onClick={() => handleSaveItem(item)}
                            disabled={isSaving}
                            className="bg-merchant-600 hover:bg-merchant-700 text-white text-xs font-black px-3.5 py-1.5 rounded-xl flex items-center space-x-1 ml-auto shadow-sm transition-all"
                          >
                            {isSaving ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Save className="w-3.5 h-3.5" />
                            )}
                            <span>Save</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-emerald-700 font-bold inline-flex items-center space-x-1">
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Live</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

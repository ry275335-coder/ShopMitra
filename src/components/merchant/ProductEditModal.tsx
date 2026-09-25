// ==============================================================================
// src/components/merchant/ProductEditModal.tsx
// Merchant Product Edit Suite: Name, Brand, Photo (Camera/Gallery/URL), Rates & Stock
// ==============================================================================

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useToast } from '@/components/ui/Toast';
import { updateProductDetailsAction } from '@/server/actions/merchant.actions';
import { uploadProductImageAction } from '@/server/actions/upload.actions';
import { 
  X, 
  Camera, 
  Upload, 
  Link as LinkIcon, 
  Save, 
  Loader2, 
  Trash2, 
  Sparkles,
  Package,
  IndianRupee
} from 'lucide-react';
import { StockStatus } from '@/types';

export interface EditableProduct {
  productId: string;
  name: string;
  brand: string;
  mrp: number;
  currentPrice: number;
  stockStatus: StockStatus;
  stockCount: number;
  imageUrl: string;
}

export function ProductEditModal({
  isOpen,
  onClose,
  product,
  shopId,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  product: EditableProduct | null;
  shopId: string;
  onSuccess?: () => void;
}) {
  const { showToast } = useToast();

  const [form, setForm] = useState({
    name: '',
    brand: '',
    mrp: '',
    sellingPrice: '',
    stockStatus: 'in_stock' as StockStatus,
    stockQuantity: 10,
    imageUrl: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);

  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (product) {
      setForm({
        name: product.name || '',
        brand: product.brand || 'General',
        mrp: product.mrp ? String(product.mrp) : '',
        sellingPrice: product.currentPrice ? String(product.currentPrice) : '',
        stockStatus: product.stockStatus || 'in_stock',
        stockQuantity: product.stockCount ?? 10,
        imageUrl: product.imageUrl || '',
      });
      setShowUrlInput(false);
    }
  }, [product]);

  if (!isOpen || !product) return null;

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      showToast('Please upload a valid image (JPEG, PNG, WebP)', 'error');
      return;
    }

    setIsProcessingPhoto(true);
    try {
      showToast('Uploading photo...', 'info');
      const formData = new FormData();
      formData.append('file', file);
      const res = await uploadProductImageAction(formData);

      if (res.success && res.url) {
        setForm(prev => ({ ...prev, imageUrl: res.url || '' }));
        showToast('📸 Product photo updated successfully!');
      } else {
        // Fallback to local DataURL
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            setForm(prev => ({ ...prev, imageUrl: event.target!.result as string }));
            showToast('Photo loaded!');
          }
        };
        reader.readAsDataURL(file);
      }
    } catch {
      showToast('Photo uploaded!');
    } finally {
      setIsProcessingPhoto(false);
      e.target.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name.trim()) {
      showToast('Product name is required', 'error');
      return;
    }

    const mrpNum = parseFloat(form.mrp);
    const priceNum = parseFloat(form.sellingPrice);

    if (isNaN(mrpNum) || mrpNum <= 0) {
      showToast('Please enter a valid MRP greater than 0', 'error');
      return;
    }

    if (isNaN(priceNum) || priceNum <= 0) {
      showToast('Please enter a valid Selling Price greater than 0', 'error');
      return;
    }

    if (priceNum > mrpNum) {
      showToast('Selling rate cannot exceed printed MRP', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await updateProductDetailsAction({
        shopId,
        productId: product.productId,
        name: form.name.trim(),
        brand: form.brand.trim() || 'General',
        mrp: mrpNum,
        sellingPrice: priceNum,
        imageUrl: form.imageUrl,
        stockStatus: form.stockStatus,
        stockQuantity: Number(form.stockQuantity) || 10,
      });

      if (res.success) {
        // Update local storage cache
        try {
          const key = 'shopmitra_shop_inventory_' + shopId;
          const existing = JSON.parse(localStorage.getItem(key) || '[]');
          const idx = existing.findIndex((i: any) => (i.product_id || i.productId) === product.productId);
          const updatedItem = {
            id: idx >= 0 ? existing[idx].id : `inv-${Date.now()}`,
            shop_id: shopId,
            product_id: product.productId,
            productId: product.productId,
            name: form.name.trim(),
            product_name: form.name.trim(),
            brand: form.brand.trim() || 'General',
            mrp: mrpNum,
            selling_price: priceNum,
            price: priceNum,
            previous_price: priceNum,
            image_url: form.imageUrl,
            imageUrl: form.imageUrl,
            stock_status: form.stockStatus,
            stock: form.stockStatus,
            stock_quantity: Number(form.stockQuantity) || 10,
            count: Number(form.stockQuantity) || 10,
            last_price_update: new Date().toISOString(),
          };

          if (idx >= 0) {
            existing[idx] = { ...existing[idx], ...updatedItem };
          } else {
            existing.unshift(updatedItem);
          }
          localStorage.setItem(key, JSON.stringify(existing));
        } catch {}

        showToast(`✨ "${form.name}" updated successfully!`);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('shopmitra:inventory_updated', { detail: { shopId } }));
        }
        if (onSuccess) onSuccess();
        onClose();
      } else {
        showToast(res.error || 'Failed to update product', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error saving changes', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-2xl bg-merchant-100 text-merchant-700 flex items-center justify-center">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">
                Edit Product Details
              </h3>
              <p className="text-[11px] text-slate-500">
                सामान का नाम, फोटो, कीमत और स्टॉक बदलें
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-200/60 text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Photo Management */}
          <div>
            <label className="text-xs font-black text-slate-800 block mb-1.5">
              Product Photo (सामान की फोटो)
            </label>

            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhotoSelect}
              className="hidden"
            />
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoSelect}
              className="hidden"
            />

            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200">
              <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-200 shrink-0 border border-slate-300 flex items-center justify-center">
                {form.imageUrl ? (
                  <img
                    src={form.imageUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Package className="w-8 h-8 text-slate-400" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    disabled={isProcessingPhoto}
                    className="px-3 py-1.5 bg-merchant-600 hover:bg-merchant-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-xs transition-all active:scale-95"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Camera</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => galleryInputRef.current?.click()}
                    disabled={isProcessingPhoto}
                    className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all active:scale-95"
                  >
                    <Upload className="w-3.5 h-3.5 text-merchant-600" />
                    <span>Gallery</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowUrlInput(!showUrlInput)}
                    className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all active:scale-95"
                  >
                    <LinkIcon className="w-3.5 h-3.5 text-slate-400" />
                    <span>URL</span>
                  </button>

                  {form.imageUrl && (
                    <button
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, imageUrl: '' }))}
                      className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors ml-auto"
                      title="Remove Photo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {isProcessingPhoto ? (
                  <p className="text-[10px] text-merchant-600 font-bold mt-1.5 flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> Uploading new photo...
                  </p>
                ) : (
                  <p className="text-[10px] text-slate-500 mt-1.5">
                    Click Camera or Gallery to change the photo
                  </p>
                )}
              </div>
            </div>

            {showUrlInput && (
              <div className="mt-2">
                <input
                  type="url"
                  value={form.imageUrl}
                  onChange={e => setForm(prev => ({ ...prev, imageUrl: e.target.value }))}
                  placeholder="https://example.com/product-image.jpg"
                  className="w-full text-xs font-medium p-2.5 rounded-xl border border-slate-200 focus:border-merchant-500 outline-none"
                />
              </div>
            )}
          </div>

          {/* Product Name */}
          <div>
            <label className="text-xs font-black text-slate-800 block mb-1">
              Product Title * (सामान का नाम)
            </label>
            <input
              type="text"
              required
              value={form.name}
              onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g. Jockey Men's Round Neck T-Shirt"
              className="w-full text-xs font-bold p-3 rounded-xl border border-slate-200 focus:border-merchant-500 outline-none"
            />
          </div>

          {/* Brand Name */}
          <div>
            <label className="text-xs font-black text-slate-800 block mb-1">
              Brand Name (कंपनी / ब्रांड)
            </label>
            <input
              type="text"
              value={form.brand}
              onChange={e => setForm(prev => ({ ...prev, brand: e.target.value }))}
              placeholder="e.g. Jockey, Tata, Amul, Samsung"
              className="w-full text-xs font-bold p-3 rounded-xl border border-slate-200 focus:border-merchant-500 outline-none"
            />
          </div>

          {/* Pricing: MRP and Selling Price */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-black text-slate-800 block mb-1">
                Printed MRP (₹) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">₹</span>
                <input
                  type="number"
                  required
                  step="any"
                  value={form.mrp}
                  onChange={e => setForm(prev => ({ ...prev, mrp: e.target.value }))}
                  placeholder="e.g. 500"
                  className="w-full pl-7 pr-3 py-2.5 text-xs font-black rounded-xl border border-slate-200 focus:border-merchant-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-black text-merchant-700 block mb-1">
                Your Selling Rate (₹) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-merchant-500 font-bold text-xs">₹</span>
                <input
                  type="number"
                  required
                  step="any"
                  value={form.sellingPrice}
                  onChange={e => setForm(prev => ({ ...prev, sellingPrice: e.target.value }))}
                  placeholder="e.g. 450"
                  className="w-full pl-7 pr-3 py-2.5 text-xs font-black rounded-xl border-2 border-merchant-500 bg-merchant-50/30 text-merchant-950 focus:border-merchant-600 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Stock Status & Quantity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-black text-slate-800 block mb-1">
                Stock Status (स्टॉक स्थिति)
              </label>
              <select
                value={form.stockStatus}
                onChange={e => setForm(prev => ({ ...prev, stockStatus: e.target.value as StockStatus }))}
                className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 focus:border-merchant-500 outline-none bg-white"
              >
                <option value="in_stock">🟢 In Stock (उपलब्ध है)</option>
                <option value="low_stock">🟡 Low Stock (कम बचा है)</option>
                <option value="out_of_stock">🔴 Out of Stock (खत्म हो गया)</option>
                <option value="available_on_order">📦 Available on Order</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-black text-slate-800 block mb-1">
                Stock Quantity (कुल पीस / मात्रा)
              </label>
              <input
                type="number"
                min="0"
                value={form.stockQuantity}
                onChange={e => setForm(prev => ({ ...prev, stockQuantity: parseInt(e.target.value) || 0 }))}
                placeholder="10"
                className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 focus:border-merchant-500 outline-none"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl text-xs font-black bg-merchant-600 hover:bg-merchant-700 text-white shadow-md shadow-merchant-500/20 transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

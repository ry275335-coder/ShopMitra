// ==============================================================================
// src/components/merchant/ProductCreateModal.tsx
// 1-Click Master Catalog Picker, Live Camera Capture, Gallery Picker & Custom Product Creator
// ==============================================================================

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '@/components/common/AppContext';
import { createProductAction } from '@/server/actions/merchant.actions';
import { SEED_CATEGORIES } from '@/lib/data/store';
import { MASTER_MARKET_CATEGORIES, searchMarketCategories, getCategoryByIdOrSlug } from '@/lib/data/marketCategories';
import { searchProductSuggestions, ProductSuggestionItem } from '@/lib/data/productSuggestions';
import { 
  X, 
  PlusCircle, 
  Sparkles, 
  Plus, 
  Loader2, 
  Image as ImageIcon,
  Camera,
  Upload,
  Trash2,
  CheckCircle2,
  Video,
  SwitchCamera,
  Link as LinkIcon,
  ScanLine,
  Barcode as BarcodeIcon,
  Search,
  ChevronDown,
  Check,
  Layers,
  Lightbulb
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { BarcodeScannerOverlay } from '@/components/common/BarcodeScannerOverlay';
import { BarcodeProductInfo } from '@/lib/barcodeCatalog';



// Helper to compress camera/gallery images into lightweight fast-loading Data URLs
const compressImageFile = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1000;
        const MAX_HEIGHT = 1000;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round((width * MAX_HEIGHT) / height);
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(img.src);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        // Compress to high quality JPEG
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        resolve(dataUrl);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

export function ProductCreateModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { showToast } = useToast();
  const { activeMerchantShopId } = useApp();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [isLiveCameraOpen, setIsLiveCameraOpen] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const [isBarcodeScannerOpen, setIsBarcodeScannerOpen] = useState(false);

  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const titleInputContainerRef = useRef<HTMLDivElement | null>(null);
  const categoryPickerRef = useRef<HTMLDivElement | null>(null);

  const [isCategoryPickerOpen, setIsCategoryPickerOpen] = useState(false);
  const [categorySearchQuery, setCategorySearchQuery] = useState('');
  const [showTitleSuggestions, setShowTitleSuggestions] = useState(false);
  const [titleSuggestions, setTitleSuggestions] = useState<ProductSuggestionItem[]>([]);

  const [form, setForm] = useState({
    name: '',
    brand: '',
    categoryId: SEED_CATEGORIES[0].id,
    variantName: 'Standard',
    sku: `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
    mrp: '',
    sellingPrice: '',
    stockQuantity: 15,
    stockStatus: 'in_stock' as any,
    imageUrl: '',
    description: '',
    barcode: '',
  });

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setForm(prev => ({ ...prev, name: val }));
    if (val.trim().length >= 1) {
      const results = searchProductSuggestions(val, form.categoryId, 8);
      setTitleSuggestions(results);
      setShowTitleSuggestions(results.length > 0);
    } else {
      setShowTitleSuggestions(false);
    }
  };

  const handleSelectSuggestion = (item: ProductSuggestionItem) => {
    setForm(prev => ({
      ...prev,
      name: item.name,
      brand: item.brand,
      categoryId: item.categoryId || prev.categoryId,
      variantName: item.variantName || prev.variantName,
      mrp: item.mrp ? item.mrp.toString() : prev.mrp,
      sellingPrice: item.defaultRate ? item.defaultRate.toString() : (item.mrp ? Math.round(item.mrp * 0.85).toString() : prev.sellingPrice),
      imageUrl: item.imageUrl || prev.imageUrl,
      description: item.description || prev.description,
    }));
    setShowTitleSuggestions(false);
    showToast(`⚡ Auto-filled details for ${item.name}!`);
  };

  const handleBarcodeDetected = (product: BarcodeProductInfo, rawBarcode: string) => {
    setForm(prev => ({
      ...prev,
      name: product.name || prev.name,
      brand: product.brand || prev.brand,
      categoryId: product.categoryId || prev.categoryId,
      variantName: product.variantName || prev.variantName,
      mrp: product.mrp ? product.mrp.toString() : prev.mrp,
      sellingPrice: product.defaultRate ? product.defaultRate.toString() : (product.mrp ? Math.round(product.mrp * 0.85).toString() : prev.sellingPrice),
      imageUrl: product.imageUrl || prev.imageUrl,
      description: product.description || prev.description,
      barcode: rawBarcode || product.barcode || prev.barcode,
      sku: product.sku || `BAR-${rawBarcode.slice(-6)}`,
    }));
    setIsBarcodeScannerOpen(false);
    showToast(`⚡ Barcode verified! Auto-filled details for ${product.name || 'scanned product'}`);
  };

  // Clean up live camera stream when modal closes or unmounts & dismiss outside clicks
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        titleInputContainerRef.current &&
        !titleInputContainerRef.current.contains(event.target as Node)
      ) {
        setShowTitleSuggestions(false);
      }
      if (
        categoryPickerRef.current &&
        !categoryPickerRef.current.contains(event.target as Node)
      ) {
        setIsCategoryPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      stopLiveCamera();
    };
  }, []);

  const handleClose = () => {
    stopLiveCamera();
    setIsCategoryPickerOpen(false);
    setShowTitleSuggestions(false);
    setCategorySearchQuery('');
    setForm({
      name: '',
      brand: '',
      categoryId: SEED_CATEGORIES[0].id,
      variantName: 'Standard',
      sku: `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
      mrp: '',
      sellingPrice: '',
      stockQuantity: 15,
      stockStatus: 'in_stock' as any,
      imageUrl: '',
      description: '',
      barcode: '',
    });
    onClose();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, source: 'camera' | 'gallery') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingImage(true);
    try {
      const compressedDataUrl = await compressImageFile(file);
      setForm(prev => ({ ...prev, imageUrl: compressedDataUrl }));
      showToast(source === 'camera' ? '📷 Product photo captured!' : '🖼️ Photo selected from gallery!');
    } catch (err) {
      console.error('Failed to process image', err);
      showToast('Could not process photo. Please try again.', 'error');
    } finally {
      setIsProcessingImage(false);
      // Reset input value so re-selecting same file triggers onChange
      e.target.value = '';
    }
  };

  const startLiveCamera = async (facing: 'environment' | 'user' = cameraFacing) => {
    stopLiveCamera();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      streamRef.current = stream;
      setIsLiveCameraOpen(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(e => console.warn('Video play error:', e));
        }
      }, 100);
    } catch (err) {
      console.warn('Live camera stream not supported or denied, triggering native camera input', err);
      if (cameraInputRef.current) {
        cameraInputRef.current.click();
      } else {
        showToast('Camera permission denied or camera not found', 'error');
      }
    }
  };

  const stopLiveCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsLiveCameraOpen(false);
  };

  const toggleCameraFacing = () => {
    const nextFacing = cameraFacing === 'environment' ? 'user' : 'environment';
    setCameraFacing(nextFacing);
    startLiveCamera(nextFacing);
  };

  const captureFromLiveCamera = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setForm(prev => ({ ...prev, imageUrl: dataUrl }));
      showToast('📷 Live photo captured successfully!');
    }
    stopLiveCamera();
  };

  if (!isOpen) return null;



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await createProductAction({
        shopId: activeMerchantShopId,
        name: form.name.trim(),
        brand: form.brand.trim() || 'General',
        categoryId: form.categoryId,
        variantName: form.variantName,
        sku: form.sku,
        mrp: parseFloat(form.mrp),
        sellingPrice: parseFloat(form.sellingPrice),
        stockQuantity: Number(form.stockQuantity) || 10,
        stockStatus: form.stockStatus,
        imageUrl: form.imageUrl || 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=800&auto=format&fit=crop&q=80',
        description: form.description,
        barcode: form.barcode || undefined,
      });

      if (res.success) {
        if (activeMerchantShopId) {
          try {
            const key = 'shopmitra_shop_inventory_' + activeMerchantShopId;
            const existing = JSON.parse(localStorage.getItem(key) || '[]');
            const prodId = res.product?.id || `prod-${Date.now()}`;
            existing.unshift({
              id: `inv-${Date.now()}`,
              shop_id: activeMerchantShopId,
              product_id: prodId,
              productId: prodId,
              selling_price: parseFloat(form.sellingPrice),
              price: parseFloat(form.sellingPrice),
              previous_price: parseFloat(form.sellingPrice),
              stock_status: form.stockStatus,
              stock: form.stockStatus,
              stock_quantity: Number(form.stockQuantity) || 10,
              count: Number(form.stockQuantity) || 10,
              product_name: form.name.trim(),
              name: form.name.trim(),
              brand: form.brand.trim() || 'General',
              image_url: form.imageUrl || 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=800&auto=format&fit=crop&q=80',
              imageUrl: form.imageUrl || 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=800&auto=format&fit=crop&q=80',
              mrp: parseFloat(form.mrp),
              created_at: new Date().toISOString(),
            });
            localStorage.setItem(key, JSON.stringify(existing));
          } catch {}
        }
        showToast(res.message || 'Product published to store catalogue successfully!');
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('shopmitra:inventory_updated', { detail: { shopId: activeMerchantShopId } }));
        }
        handleClose();
      } else {
        showToast(res.error || 'Failed to add product', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Network error while adding product', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedCategory = MASTER_MARKET_CATEGORIES.find(c => c.id === form.categoryId) || MASTER_MARKET_CATEGORIES[0];

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
    >
      {/* Hidden Native File Inputs for Camera & Gallery */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFileChange(e, 'camera')}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFileChange(e, 'gallery')}
      />

      <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl border border-slate-100 max-h-[92vh] flex flex-col my-auto">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-merchant-100 text-merchant-700 rounded-2xl">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">Add Item to Store Inventory</h3>
              <p className="text-xs text-slate-500">Take a photo with camera, pick from gallery, or choose from master catalog</p>
            </div>
          </div>
          <button onClick={handleClose} className="p-1 text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {/* Barcode & QR Scanner Hero Action Card */}
          <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 p-3.5 sm:p-4 rounded-2xl text-white shadow-md flex items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0 border border-white/20">
                <ScanLine className="w-5 h-5 text-emerald-100 animate-pulse" />
              </div>
              <div>
                <div className="text-xs sm:text-sm font-black flex items-center gap-1.5">
                  <span>Scan Retail Barcode with Phone Camera</span>
                  {form.barcode && (
                    <span className="bg-emerald-400/30 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border border-emerald-300/40">
                      EAN: {form.barcode}
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-emerald-100">
                  Point camera at box stripes to auto-fill title, brand, MRP, picture & SKU
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsBarcodeScannerOpen(true)}
              className="bg-white hover:bg-emerald-50 text-emerald-800 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-black shadow-xs transition-all shrink-0 active:scale-95 flex items-center gap-1.5"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Scan Barcode</span>
            </button>
          </div>



          <form id="product-form" onSubmit={handleSubmit} className="space-y-4">
            {/* PRODUCT PHOTO SECTION (Camera Access & Gallery Picker) */}
            <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-slate-800 flex items-center space-x-1.5">
                  <Camera className="w-4 h-4 text-merchant-600" />
                  <span>Product Photo (Camera or Gallery) *</span>
                </label>
                {form.imageUrl && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center space-x-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>Photo Attached</span>
                  </span>
                )}
              </div>

              {/* LIVE CAMERA VIEWFINDER (When in-app camera stream is opened) */}
              {isLiveCameraOpen && (
                <div className="relative rounded-2xl overflow-hidden bg-black border-2 border-merchant-500 shadow-lg">
                  <video
                    ref={videoRef}
                    playsInline
                    autoPlay
                    muted
                    className="w-full h-56 sm:h-72 object-cover"
                  />
                  {/* Viewfinder target box */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-6">
                    <div className="w-48 h-48 sm:w-60 sm:h-60 border-2 border-dashed border-white/70 rounded-2xl"></div>
                  </div>
                  {/* Controls */}
                  <div className="absolute bottom-3 inset-x-0 flex items-center justify-center space-x-3 px-4">
                    <button
                      type="button"
                      onClick={toggleCameraFacing}
                      className="bg-black/60 hover:bg-black/80 text-white p-2.5 rounded-full backdrop-blur-sm border border-white/20"
                      title="Switch Camera (Front/Back)"
                    >
                      <SwitchCamera className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={captureFromLiveCamera}
                      className="bg-merchant-600 hover:bg-merchant-500 text-white font-black text-xs px-5 py-2.5 rounded-full shadow-lg flex items-center space-x-2 border-2 border-white"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Snap Photo</span>
                    </button>
                    <button
                      type="button"
                      onClick={stopLiveCamera}
                      className="bg-black/60 hover:bg-black/80 text-white p-2.5 rounded-full backdrop-blur-sm border border-white/20"
                      title="Close Camera"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* PHOTO PREVIEW CARD (If image exists and live camera is not open) */}
              {!isLiveCameraOpen && form.imageUrl && (
                <div className="flex flex-col sm:flex-row items-center gap-3 p-3 bg-white rounded-xl border border-slate-200">
                  <div className="relative w-28 h-28 sm:w-32 sm:h-32 shrink-0 rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                    <img
                      src={form.imageUrl}
                      alt="Product Preview"
                      className="w-full h-full object-cover"
                    />
                    {isProcessingImage && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <Loader2 className="w-6 h-6 text-white animate-spin" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 w-full space-y-2 text-center sm:text-left">
                    <p className="text-xs font-bold text-slate-800">
                      Product Photo Ready
                    </p>
                    <p className="text-[11px] text-slate-500 line-clamp-1">
                      {form.imageUrl.startsWith('data:') ? 'High-quality compressed photo from device' : form.imageUrl}
                    </p>

                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 pt-1">
                      {/* Direct Camera Trigger */}
                      <button
                        type="button"
                        onClick={() => cameraInputRef.current?.click()}
                        className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1.5 rounded-xl border border-emerald-200 transition-colors flex items-center space-x-1.5"
                      >
                        <Camera className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Take New Photo</span>
                      </button>

                      {/* Gallery Trigger */}
                      <button
                        type="button"
                        onClick={() => galleryInputRef.current?.click()}
                        className="bg-indigo-50 hover:bg-indigo-100 text-indigo-800 text-xs font-bold px-3 py-1.5 rounded-xl border border-indigo-200 transition-colors flex items-center space-x-1.5"
                      >
                        <Upload className="w-3.5 h-3.5 text-indigo-600" />
                        <span>From Gallery</span>
                      </button>

                      {/* Live In-App Camera */}
                      <button
                        type="button"
                        onClick={() => startLiveCamera()}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-2.5 py-1.5 rounded-xl border border-slate-200 transition-colors flex items-center space-x-1"
                        title="Open Live Camera Viewfinder"
                      >
                        <Video className="w-3.5 h-3.5 text-slate-600" />
                        <span>Live Feed</span>
                      </button>

                      {/* Remove Button */}
                      <button
                        type="button"
                        onClick={() => setForm(prev => ({ ...prev, imageUrl: '' }))}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"
                        title="Remove photo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ACTION BUTTONS (When no photo is selected and camera is not open) */}
              {!isLiveCameraOpen && !form.imageUrl && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Camera button */}
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="p-4 rounded-2xl border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-emerald-50/50 hover:bg-emerald-50 transition-all text-center flex flex-col items-center justify-center group cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
                      <Camera className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-black text-slate-900">📷 Take Photo with Camera</span>
                    <span className="text-[10px] text-slate-500 font-medium mt-0.5">Click photo of product at counter</span>
                  </button>

                  {/* Gallery button */}
                  <button
                    type="button"
                    onClick={() => galleryInputRef.current?.click()}
                    className="p-4 rounded-2xl border-2 border-dashed border-indigo-300 hover:border-indigo-500 bg-indigo-50/50 hover:bg-indigo-50 transition-all text-center flex flex-col items-center justify-center group cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
                      <ImageIcon className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-black text-slate-900">🖼️ Select from Gallery</span>
                    <span className="text-[10px] text-slate-500 font-medium mt-0.5">Pick existing photo from phone / files</span>
                  </button>
                </div>
              )}

              {/* Secondary Options */}
              <div className="flex items-center justify-between text-[11px] text-slate-500 px-1 pt-1">
                <button
                  type="button"
                  onClick={() => startLiveCamera()}
                  className="text-merchant-600 hover:underline font-bold flex items-center space-x-1"
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>Use Live Camera Viewfinder</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowUrlInput(!showUrlInput)}
                  className="text-slate-500 hover:text-slate-800 font-bold flex items-center space-x-1"
                >
                  <LinkIcon className="w-3.5 h-3.5" />
                  <span>{showUrlInput ? 'Hide URL input' : 'Paste Image URL instead'}</span>
                </button>
              </div>

              {/* Collapsible Direct URL Input */}
              {showUrlInput && (
                <div className="pt-2 border-t border-slate-200">
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Direct Image Web URL</label>
                  <input
                    type="text"
                    value={form.imageUrl}
                    onChange={e => setForm({ ...form, imageUrl: e.target.value })}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full text-xs font-medium p-2.5 rounded-xl border border-slate-200 focus:border-merchant-500 outline-none bg-white"
                  />
                </div>
              )}
            </div>

            {/* 1. SEARCHABLE MARKET CATEGORY PICKER (30+ Entire Market Spectrum) */}
            <div className="relative" ref={categoryPickerRef}>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-black text-slate-800 flex items-center space-x-1.5">
                  <Layers className="w-4 h-4 text-merchant-600" />
                  <span>Market Category * (बाजार की श्रेणी)</span>
                </label>
                <span className="text-[10px] text-slate-500 font-semibold bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                  {MASTER_MARKET_CATEGORIES.length}+ Categories Available
                </span>
              </div>

              {/* Category Selector Trigger */}
              <button
                type="button"
                onClick={() => {
                  setIsCategoryPickerOpen(!isCategoryPickerOpen);
                  setCategorySearchQuery('');
                }}
                className="w-full flex items-center justify-between p-3 rounded-2xl border-2 border-slate-200 hover:border-merchant-400 bg-white hover:bg-slate-50/70 transition-all text-left group shadow-xs active:scale-[0.99]"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-merchant-50 to-emerald-50 text-merchant-700 flex items-center justify-center shrink-0 border border-merchant-200 font-black text-base shadow-2xs">
                    🏷️
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-black text-slate-900 truncate flex items-center gap-1.5">
                      <span>{selectedCategory.name}</span>
                      {selectedCategory.hindiName && (
                        <span className="text-[10px] text-merchant-800 bg-merchant-100/70 px-2 py-0.5 rounded-md font-bold shrink-0">
                          {selectedCategory.hindiName.split(' ')[0]}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate mt-0.5">
                      {selectedCategory.description || selectedCategory.hindiName}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0 ml-2">
                  <span className="text-[11px] font-black text-merchant-700 bg-merchant-100/60 hover:bg-merchant-100 px-3 py-1.5 rounded-xl border border-merchant-200/80 transition-colors flex items-center gap-1">
                    <Search className="w-3 h-3" />
                    <span>Search / Change</span>
                  </span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isCategoryPickerOpen ? 'rotate-180' : ''}`} />
                </div>
              </button>

              {/* SEARCHABLE CATEGORY PICKER OVERLAY */}
              {isCategoryPickerOpen && (
                <div className="absolute left-0 right-0 top-full mt-2 z-50 bg-white rounded-3xl shadow-2xl border-2 border-merchant-200 p-3 sm:p-4 space-y-3 max-h-[380px] flex flex-col animate-in fade-in zoom-in-95 duration-150">
                  {/* Category Search Input */}
                  <div className="relative">
                    <Search className="w-4 h-4 text-merchant-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      autoFocus
                      value={categorySearchQuery}
                      onChange={(e) => setCategorySearchQuery(e.target.value)}
                      placeholder="Search category (e.g. 'kirana', 'dairy', 'दूध', 'mobile', 'hardware', 'कपड़े', 'दवा')..."
                      className="w-full pl-10 pr-9 py-2.5 text-xs font-bold rounded-xl border border-slate-200 focus:border-merchant-500 focus:ring-2 focus:ring-merchant-200 outline-none bg-slate-50 placeholder:font-medium"
                    />
                    {categorySearchQuery && (
                      <button
                        type="button"
                        onClick={() => setCategorySearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Fast-Pick Category Chips */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none shrink-0 text-[11px]">
                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider shrink-0">Popular:</span>
                    {['Grocery', 'Dairy', 'Packaged Foods', 'Beverages', 'Electronics', 'Computers', 'Hardware', 'Electricals', 'Pharmacy', 'Men\'s Wear', 'Women\'s Wear', 'Footwear', 'Stationery', 'Pooja'].map((tag) => {
                      const matched = MASTER_MARKET_CATEGORIES.find(c => c.name.toLowerCase().includes(tag.toLowerCase()));
                      if (!matched) return null;
                      const isSelected = form.categoryId === matched.id;
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => {
                            setForm(prev => ({ ...prev, categoryId: matched.id }));
                            setIsCategoryPickerOpen(false);
                            showToast(`Selected category: ${matched.name}`);
                          }}
                          className={`px-2.5 py-1 rounded-xl text-[11px] font-black border transition-all shrink-0 ${
                            isSelected
                              ? 'bg-merchant-600 text-white border-merchant-600 shadow-xs'
                              : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-merchant-50 hover:border-merchant-300'
                          }`}
                        >
                          {tag}
                        </button>
                      );
                    })}
                  </div>

                  {/* Scrollable Category Grid / List */}
                  <div className="overflow-y-auto max-h-56 space-y-1 pr-1 divide-y divide-slate-100">
                    {searchMarketCategories(categorySearchQuery).length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-500 font-medium">
                        🔍 No categories matching "{categorySearchQuery}". Try searching "kirana", "dairy", "phone" or browse all categories above.
                      </div>
                    ) : (
                      searchMarketCategories(categorySearchQuery).map((cat) => {
                        const isSelected = form.categoryId === cat.id;
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => {
                              setForm(prev => ({ ...prev, categoryId: cat.id }));
                              setIsCategoryPickerOpen(false);
                              showToast(`Selected: ${cat.name}`);
                            }}
                            className={`w-full text-left p-2.5 rounded-xl transition-all flex items-center justify-between group ${
                              isSelected
                                ? 'bg-merchant-50/90 border border-merchant-300 text-merchant-950 font-bold'
                                : 'hover:bg-slate-50 text-slate-700'
                            }`}
                          >
                            <div className="min-w-0 pr-2">
                              <div className="text-xs font-black flex items-center gap-2">
                                <span className="group-hover:text-merchant-700">{cat.name}</span>
                                {cat.hindiName && (
                                  <span className="text-[10px] font-bold text-slate-500 group-hover:text-merchant-800 bg-slate-100 px-1.5 py-0.5 rounded">
                                    {cat.hindiName}
                                  </span>
                                )}
                              </div>
                              {cat.description && (
                                <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                                  {cat.description}
                                </div>
                              )}
                            </div>
                            {isSelected && (
                              <Check className="w-4 h-4 text-merchant-600 shrink-0 font-black" />
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 2. PRODUCT TITLE (With Smart Auto-Suggestions) & BRAND NAME */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Product Title Field */}
              <div className="relative" ref={titleInputContainerRef}>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700 block">Product Title * (सामान का नाम)</label>
                  <span className="text-[10px] text-merchant-600 font-bold flex items-center gap-0.5">
                    <Sparkles className="w-3 h-3" />
                    <span>Auto-suggestions</span>
                  </span>
                </div>
                <input
                  type="text"
                  value={form.name}
                  onChange={handleTitleChange}
                  onFocus={() => {
                    if (form.name.trim().length >= 1) {
                      const res = searchProductSuggestions(form.name, form.categoryId, 8);
                      setTitleSuggestions(res);
                      setShowTitleSuggestions(res.length > 0);
                    }
                  }}
                  placeholder="e.g. Amul Butter / Aashirvaad Atta / Samsung Charger"
                  className="w-full text-xs font-bold p-3 rounded-xl border border-slate-200 focus:border-merchant-500 focus:ring-1 focus:ring-merchant-500 outline-none bg-white"
                  required
                  autoComplete="off"
                />

                {/* AUTO-SUGGESTIONS POPUP */}
                {showTitleSuggestions && titleSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white rounded-2xl shadow-2xl border-2 border-merchant-200 overflow-hidden max-h-80 flex flex-col animate-in fade-in zoom-in-95 duration-150">
                    <div className="p-2.5 bg-gradient-to-r from-merchant-50 via-emerald-50 to-teal-50 border-b border-merchant-100 flex items-center justify-between px-3">
                      <span className="text-[11px] font-black text-merchant-900 flex items-center gap-1.5">
                        <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                        <span>Market Suggestions (Tap to 1-Click Auto-Fill):</span>
                      </span>
                      <span className="text-[10px] text-slate-500 font-bold bg-white/80 px-2 py-0.5 rounded-full border border-merchant-100">
                        {titleSuggestions.length} items
                      </span>
                    </div>

                    <div className="overflow-y-auto divide-y divide-slate-100 p-1.5">
                      {titleSuggestions.map((item, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSelectSuggestion(item)}
                          className="w-full text-left p-2.5 hover:bg-merchant-50/80 transition-colors rounded-xl flex items-center justify-between group gap-2"
                        >
                          <div className="flex items-center space-x-2.5 min-w-0">
                            {item.imageUrl ? (
                              <img
                                src={item.imageUrl}
                                alt={item.name}
                                className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0 bg-slate-50"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-400 flex items-center justify-center shrink-0 font-black text-xs">
                                📦
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="text-xs font-black text-slate-800 group-hover:text-merchant-700 truncate">
                                {item.name}
                              </div>
                              <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                                <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-bold">
                                  {item.brand}
                                </span>
                                <span>•</span>
                                <span className="truncate">{item.categoryName}</span>
                                {item.variantName && (
                                  <>
                                    <span>•</span>
                                    <span className="font-semibold text-slate-600">{item.variantName}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <div className="text-xs font-black text-emerald-700">
                              ₹{item.defaultRate}
                            </div>
                            <div className="text-[10px] text-slate-400 line-through">
                              MRP ₹{item.mrp}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Brand Name Field */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Brand Name * (कंपनी / ब्रांड)</label>
                <input
                  type="text"
                  value={form.brand}
                  onChange={e => setForm({ ...form, brand: e.target.value })}
                  placeholder="e.g. Samsung / Amul / Crucial / Tata"
                  className="w-full text-xs font-bold p-3 rounded-xl border border-slate-200 focus:border-merchant-500 outline-none bg-white"
                  required
                />
              </div>
            </div>

            {/* 3. SELLING RATE & PRINTED MRP */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Your Selling Rate (₹) * (आपकी दुकान का रेट)</label>
                <input
                  type="number"
                  value={form.sellingPrice}
                  onChange={e => setForm({ ...form, sellingPrice: e.target.value })}
                  placeholder="e.g. 699"
                  className="w-full text-xs font-black p-3 rounded-xl border border-slate-200 focus:border-merchant-500 outline-none text-slate-900 bg-white"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Printed MRP (₹) * (प्रिंटेड एमआरपी)</label>
                <input
                  type="number"
                  value={form.mrp}
                  onChange={e => setForm({ ...form, mrp: e.target.value })}
                  placeholder="e.g. 1299"
                  className="w-full text-xs font-bold p-3 rounded-xl border border-slate-200 focus:border-merchant-500 outline-none text-slate-500 bg-white"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Variant / Size</label>
                <input
                  type="text"
                  value={form.variantName}
                  onChange={e => setForm({ ...form, variantName: e.target.value })}
                  placeholder="e.g. 1TB / 5kg / Black"
                  className="w-full text-xs font-bold p-3 rounded-xl border border-slate-200 focus:border-merchant-500 outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Stock Quantity</label>
                <input
                  type="number"
                  value={form.stockQuantity}
                  onChange={e => setForm({ ...form, stockQuantity: parseInt(e.target.value, 10) || 0 })}
                  className="w-full text-xs font-bold p-3 rounded-xl border border-slate-200 focus:border-merchant-500 outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Stock Status</label>
                <select
                  value={form.stockStatus}
                  onChange={e => setForm({ ...form, stockStatus: e.target.value as any })}
                  className="w-full text-xs font-bold p-3 rounded-xl border border-slate-200 focus:border-merchant-500 outline-none bg-white"
                >
                  <option value="in_stock">🟢 In Stock</option>
                  <option value="low_stock">🟡 Low Stock</option>
                  <option value="out_of_stock">🔴 Out of Stock</option>
                  <option value="available_on_order">📦 On Order</option>
                </select>
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="p-4 px-6 bg-white border-t border-slate-200 flex items-center justify-between shrink-0">
          <button onClick={handleClose} className="text-xs font-bold text-slate-500 hover:text-slate-800">
            Cancel
          </button>

          <button
            type="submit"
            form="product-form"
            disabled={isSubmitting}
            className="bg-merchant-600 hover:bg-merchant-700 text-white font-black text-xs px-6 py-2.5 rounded-xl shadow-md shadow-merchant-600/20 flex items-center space-x-2 transition-colors"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Publishing...</span>
              </>
            ) : (
              <>
                <PlusCircle className="w-4 h-4" />
                <span>Publish Item Live</span>
              </>
            )}
          </button>
        </div>
      </div>

      <BarcodeScannerOverlay
        isOpen={isBarcodeScannerOpen}
        onClose={() => setIsBarcodeScannerOpen(false)}
        onBarcodeDetected={handleBarcodeDetected}
        title="Scan Product Barcode / QR Code"
        subtitle="Point phone camera at retail packaging barcode stripes to auto-fill product specifications"
      />
    </div>
  );
}

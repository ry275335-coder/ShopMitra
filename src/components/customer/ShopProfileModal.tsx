// ==============================================================================
// src/components/customer/ShopProfileModal.tsx
// Public Shop Page Modal with Full Inventory & Direct Connect (Step 18 & 25)
// ==============================================================================

'use client';

import React, { useState } from 'react';
import { Shop, ShopProductRate, MasterProduct } from '@/types';
import { formatDistance, getDirectionsUrl } from '@/lib/geo';
import { 
  X, 
  MapPin, 
  Phone, 
  MessageCircle, 
  Star, 
  ShieldCheck, 
  Navigation, 
  Clock, 
  Tag, 
  ShoppingBag,
  Share2,
  AlertTriangle,
  Send,
  Camera,
  CheckCircle2,
  Receipt as ReceiptIcon
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { useApp } from '@/components/common/AppContext';
import { VerifiedReviewModal } from './VerifiedReviewModal';
import { getReviewsForShop, VerifiedReview } from '@/lib/reviews';
import { recordShopInteraction } from '@/lib/analytics/interactionTracker';

export function ShopProfileModal({
  shop: propShop,
  shopId,
  products: propProducts,
  isOpen,
  onClose,
  onSelectProduct,
  onOpenReport,
  onHoldAtCounter,
}: {
  shop?: Shop | null;
  shopId?: string | null;
  products?: ShopProductRate[];
  isOpen: boolean;
  onClose: () => void;
  onSelectProduct?: (productId: string) => void;
  onOpenReport?: (shopId: string, productId?: string) => void;
  onHoldAtCounter?: (product: MasterProduct, rate: ShopProductRate) => void;
}) {
  const { showToast } = useToast();
  const { userLocation, allShops } = useApp();
  const [activeTab, setActiveTab] = useState<'products' | 'offers' | 'reviews'>('products');
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  const shop = propShop || (shopId ? (allShops.find(s => s.id === shopId) || null) : null);
  const [reviews, setReviews] = useState<VerifiedReview[]>(() => shop ? getReviewsForShop(shop.id) : []);

  // Sync reviews when shop changes or review is added
  React.useEffect(() => {
    if (shop) {
      setReviews(getReviewsForShop(shop.id));
    }
    const handleUpdate = () => {
      if (shop) setReviews(getReviewsForShop(shop.id));
    };
    window.addEventListener('shopmitra:review_added', handleUpdate);
    return () => window.removeEventListener('shopmitra:review_added', handleUpdate);
  }, [shop?.id]);
  const products = propProducts || [];

  React.useEffect(() => {
    if (isOpen && shop?.id) {
      recordShopInteraction(shop.id, 'view');
    }
  }, [isOpen, shop?.id]);

  const handleReportPrice = () => {
    if (!shop) return;
    if (onOpenReport) {
      onOpenReport(shop.id);
      return;
    }
    const sampleProduct = products[0];
    const newReport = {
      id: `rep-${Date.now()}`,
      shopName: shop.name,
      productName: sampleProduct ? sampleProduct.productName : 'Counter Items',
      reason: `Customer reported price inconsistency at ${shop.name} counter.`,
      reportedPrice: sampleProduct ? sampleProduct.currentPrice : 500,
      actualPrice: sampleProduct ? Math.round(sampleProduct.currentPrice * 1.15) : 575,
      reporterPhone: 'In-Store Customer',
      status: 'open',
      createdAt: 'Just now',
    };
    try {
      const existing = JSON.parse(localStorage.getItem('shopmitra_customer_reports') || '[]');
      existing.unshift(newReport);
      localStorage.setItem('shopmitra_customer_reports', JSON.stringify(existing));
      window.dispatchEvent(new CustomEvent('shopmitra:report_added', { detail: newReport }));
    } catch {}
    showToast('Inaccurate price report submitted to admin audit queue', 'info');
  };

  if (!isOpen || !shop) return null;

  const directionsUrl = getDirectionsUrl(shop.lat, shop.lng, shop.name, userLocation.lat, userLocation.lng);

  const handleWhatsApp = () => {
    recordShopInteraction(shop.id, 'whatsapp');
    const msg = encodeURIComponent(`Hello ${shop.name}, I am contacting you via your ShopMitra store page.`);
    window.open(`https://wa.me/91${shop.whatsapp || shop.phone}?text=${msg}`, '_blank');
  };

  const handleShare = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      showToast('Store link copied to clipboard!');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-150"
    >
      <div className="bg-white rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl border border-slate-100 max-h-[92vh] flex flex-col my-auto">
        {/* Exterior Photo Banner */}
        <div className="relative h-44 sm:h-52 bg-slate-900 shrink-0">
          <img
            src={shop.photos[0] || 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=800&auto=format&fit=crop&q=80'}
            alt={shop.name}
            className="w-full h-full object-cover opacity-80"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent" />

          {/* Share & Close */}
          <div className="absolute top-3 right-3 flex items-center space-x-2 z-10">
            <button
              onClick={handleShare}
              className="p-2 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md transition-colors"
              title="Share Shop"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md transition-colors"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Verification Badge */}
          <div className="absolute top-3 left-3">
            <span
              className={`text-[11px] font-black px-2.5 py-1 rounded-full flex items-center space-x-1 shadow-md backdrop-blur-md ${
                shop.isVerified ? 'bg-brand-600/90 text-white' : 'bg-slate-800/90 text-slate-300'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{shop.verificationBadge || 'Local Store'}</span>
            </span>
          </div>

          {/* Header Title Details */}
          <div className="absolute bottom-3 left-4 right-4 text-white">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 className="text-xl sm:text-2xl font-black">{shop.name}</h2>
                <div className="flex items-center space-x-2 text-xs text-slate-300 mt-1 font-semibold">
                  <span className="flex items-center space-x-1">
                    <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                    <span className="font-black text-white">{shop.rating}</span>
                    <span>({shop.reviewCount} reviews)</span>
                  </span>
                  <span>•</span>
                  <span>{shop.city}</span>
                </div>
              </div>

              <span
                className={`text-xs font-black px-3 py-1 rounded-full ${
                  shop.isOpen ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
                }`}
              >
                {shop.isOpen ? 'Open Now' : 'Closed'}
              </span>
            </div>
          </div>
        </div>

        {/* Action Bar (WhatsApp, Call, Navigate) */}
        <div className="bg-slate-50 border-b border-slate-200 p-3 px-4 sm:px-6 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center space-x-2 text-xs text-slate-600 font-medium">
            <MapPin className="w-4 h-4 text-brand-600 shrink-0" />
            <span className="font-bold text-slate-900">{formatDistance(shop.distanceKm || 1.0)} away</span>
            <span>•</span>
            <span className="truncate max-w-[200px] sm:max-w-xs">{shop.address}</span>
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
            <button
              onClick={handleWhatsApp}
              className="flex-1 sm:flex-initial bg-brand-600 hover:bg-brand-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-black flex items-center justify-center space-x-1.5 shadow-sm transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </button>
            <a
              href={`tel:${shop.phone}`}
              onClick={() => recordShopInteraction(shop.id, 'call')}
              className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1 transition-colors"
            >
              <Phone className="w-3.5 h-3.5 text-slate-600" />
              <span>Call</span>
            </a>
            <a
              href={directionsUrl}
              target="_blank"
              rel="noreferrer"
              onClick={() => recordShopInteraction(shop.id, 'direction')}
              className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1 transition-colors"
            >
              <Navigation className="w-3.5 h-3.5 text-brand-600" />
              <span>Map</span>
            </a>
          </div>
        </div>

        {/* Tabs Bar */}
        <div className="flex border-b border-slate-200 px-6 bg-white shrink-0">
          <button
            onClick={() => setActiveTab('products')}
            className={`py-3 px-4 text-xs font-black border-b-2 transition-colors flex items-center space-x-1.5 ${
              activeTab === 'products'
                ? 'border-brand-600 text-brand-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Products ({products.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('offers')}
            className={`py-3 px-4 text-xs font-black border-b-2 transition-colors flex items-center space-x-1.5 ${
              activeTab === 'offers'
                ? 'border-brand-600 text-brand-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Offers & Timing</span>
          </button>
          <button
            onClick={() => setActiveTab('reviews')}
            className={`py-3 px-4 text-xs font-black border-b-2 transition-colors flex items-center space-x-1.5 ${
              activeTab === 'reviews'
                ? 'border-brand-600 text-brand-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Star className="w-3.5 h-3.5" />
            <span>Verified Reviews ({reviews.length})</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-50/50">
          {activeTab === 'products' && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-600">
                  In-store rates confirmed by merchant:
                </span>
                <button
                  onClick={handleReportPrice}
                  className="text-[11px] font-bold text-rose-600 hover:text-rose-700 flex items-center space-x-1"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Report Wrong Price</span>
                </button>
              </div>

              {products.length === 0 ? (
                <div className="bg-white p-8 rounded-2xl text-center border border-slate-200 text-slate-400">
                  <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm font-semibold">No items currently listed for this store.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {products.map(prod => (
                    <div
                      key={prod.id}
                      onClick={() => {
                        onClose();
                        if (onSelectProduct) {
                          onSelectProduct(prod.productId);
                        }
                      }}
                      className="bg-white p-3.5 rounded-2xl border border-slate-200 hover:border-brand-400 hover:shadow-sm transition-all cursor-pointer flex items-center gap-3"
                    >
                      <img
                        src={prod.productImage}
                        alt={prod.productName}
                        className="w-16 h-16 rounded-xl object-cover bg-slate-100 shrink-0 border border-slate-100"
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-[10px] font-black text-brand-700 uppercase">
                          {prod.productBrand}
                        </span>
                        <h4 className="text-xs font-bold text-slate-900 truncate">
                          {prod.productName}
                        </h4>
                        <div className="flex items-center space-x-1.5 mt-0.5">
                          <span className="text-sm font-black text-slate-900">
                            ₹{prod.currentPrice}
                          </span>
                          <span className="text-[10px] text-slate-400 line-through">
                            ₹{prod.mrp}
                          </span>
                          <span className="text-[10px] font-black text-brand-600">
                            Save ₹{prod.savings}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-1 gap-2">
                          <span className="text-[10px] text-slate-400 font-semibold truncate">
                            {prod.stockStatus === 'in_stock' ? '🟢 In Stock' : '🟡 Low Stock'} • {prod.freshnessLabel}
                          </span>
                          {onHoldAtCounter && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const masterProd: MasterProduct = {
                                  id: prod.productId,
                                  name: prod.productName,
                                  brand: prod.productBrand,
                                  imageUrl: prod.productImage,
                                  mrp: prod.mrp,
                                  categoryId: '',
                                  slug: prod.productName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                                  galleryUrls: [],
                                  specifications: {},
                                };
                                onHoldAtCounter(masterProd, prod);
                              }}
                              className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] flex items-center gap-1 transition-colors shadow-xs shrink-0"
                            >
                              <MessageCircle className="w-3 h-3" />
                              <span>Hold</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'offers' && (
            <div className="space-y-3">
              <div className="bg-white p-4 rounded-2xl border border-amber-200/80 shadow-sm flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                    Store Special
                  </span>
                  <h4 className="text-sm font-black text-slate-900 mt-1">🔥 Walk-in Discount</h4>
                  <p className="text-xs text-slate-600 mt-0.5">Flat ₹100 off on cash billing above ₹600</p>
                </div>
                <div className="bg-slate-100 px-3 py-1.5 rounded-xl border border-dashed border-slate-300 text-center">
                  <span className="text-[9px] text-slate-400 font-bold block uppercase">Code</span>
                  <span className="text-xs font-black text-slate-800">WALKIN100</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'reviews' && (
            <div className="space-y-4">
              {/* Reviews Summary & Write Action */}
              <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3 shadow-sm">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-1">
                      <span>{shop.rating}</span>
                      <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                    </span>
                    <span className="text-xs text-slate-500 font-semibold">
                      ({reviews.length} Verified Reviews)
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Reviews verified with physical in-store GPS & counter receipts
                  </p>
                </div>

                <button
                  onClick={() => setIsReviewModalOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition-all"
                >
                  <Camera className="w-4 h-4" />
                  <span>Write In-Store Review & Photo</span>
                </button>
              </div>

              {/* Reviews Feed */}
              <div className="space-y-3">
                {reviews.map((rev) => (
                  <div
                    key={rev.id}
                    className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2.5 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-black text-slate-900 dark:text-white">
                            {rev.authorName}
                          </span>
                          {rev.isInStoreVerified && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-extrabold border border-emerald-200 dark:border-emerald-800">
                              <ShieldCheck className="w-3 h-3 text-emerald-600" />
                              <span>Verified In-Store Customer</span>
                            </span>
                          )}
                          {rev.hasBillProof && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[10px] font-extrabold border border-blue-200 dark:border-blue-800">
                              <ReceiptIcon className="w-3 h-3 text-blue-600" />
                              <span>Bill Proof</span>
                            </span>
                          )}
                        </div>

                        {/* Stars & Date */}
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex items-center space-x-0.5">
                            {[1, 2, 3, 4, 5].map((i) => (
                              <Star
                                key={i}
                                className={`w-3.5 h-3.5 ${
                                  i <= rev.rating
                                    ? 'text-amber-400 fill-amber-400'
                                    : 'text-slate-300 dark:text-slate-600'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-[10px] text-slate-400">
                            {new Date(rev.createdAt).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Review text */}
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                      "{rev.reviewText}"
                    </p>

                    {/* Experience Tags */}
                    {rev.tags && rev.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-0.5">
                        {rev.tags.map((tag) => (
                          <span
                            key={tag}
                            className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                          >
                            ✓ {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Photo Proof Gallery */}
                    {rev.photos && rev.photos.length > 0 && (
                      <div className="flex items-center gap-2 pt-1">
                        {rev.photos.map((photoUrl, pIdx) => (
                          <a
                            key={pIdx}
                            href={photoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-16 h-16 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 hover:opacity-90 transition-opacity block shrink-0"
                          >
                            <img
                              src={photoUrl}
                              alt="Customer verification photo"
                              className="w-full h-full object-cover"
                            />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal for creating verified review */}
        <VerifiedReviewModal
          isOpen={isReviewModalOpen}
          onClose={() => setIsReviewModalOpen(false)}
          shop={shop}
          onReviewSubmitted={(newRev) => {
            setReviews((prev) => [newRev, ...prev]);
          }}
        />

        {/* Footer */}
        <div className="p-3 px-6 bg-white border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0 font-medium">
          <span>Operating: {shop.openingHours}</span>
          <button onClick={onClose} className="text-slate-700 font-black hover:text-slate-900">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

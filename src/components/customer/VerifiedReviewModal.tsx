// ==============================================================================
// src/components/customer/VerifiedReviewModal.tsx
// In-Store GPS Verification, Counter Photo Upload & Review Creator Modal
// ==============================================================================

'use client';

import React, { useState, useMemo } from 'react';
import {
  Star,
  Camera,
  X,
  MapPin,
  ShieldCheck,
  CheckCircle2,
  Upload,
  Receipt,
  Tag,
  AlertCircle,
  Sparkles,
  Send
} from 'lucide-react';
import { Shop } from '@/types';
import { useApp } from '@/components/common/AppContext';
import {
  VerifiedReview,
  REVIEW_TAG_PRESETS,
  verifyInStoreProximity,
  saveVerifiedReview
} from '@/lib/reviews';
import { submitReviewAction } from '@/server/actions/review.actions';
import { useToast } from '@/components/ui/Toast';

interface VerifiedReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  shop: Shop;
  onReviewSubmitted?: (review: VerifiedReview) => void;
}

export function VerifiedReviewModal({
  isOpen,
  onClose,
  shop,
  onReviewSubmitted,
}: VerifiedReviewModalProps) {
  const { userLocation } = useApp();
  const { showToast } = useToast();

  const [rating, setRating] = useState<number>(5);
  const [authorName, setAuthorName] = useState<string>('');
  const [reviewText, setReviewText] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<string[]>(['Exact Counter Rate Honored']);
  const [photos, setPhotos] = useState<string[]>([]);
  const [hasBillProof, setHasBillProof] = useState<boolean>(false);
  const [forceInStoreSimulation, setForceInStoreSimulation] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Calculate real GPS proximity
  const proximity = useMemo(() => {
    return verifyInStoreProximity(userLocation.lat, userLocation.lng, shop.lat, shop.lng);
  }, [userLocation, shop]);

  const isInStore = proximity.isInStore || forceInStoreSimulation;
  const displayDistance = forceInStoreSimulation ? 12 : proximity.distanceMeters;

  // Toggle experience tag
  const handleToggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  // Handle Photo Upload (reads as base64 data URL)
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (photos.length >= 3) {
      showToast('Maximum 3 photos allowed per review', 'info');
      return;
    }

    const file = files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setPhotos(prev => [...prev, dataUrl]);
        setHasBillProof(true);
        showToast('📸 Photo attached successfully!');
      }
    };
    reader.readAsDataURL(file);
    e.target.value = ''; // Reset input
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!reviewText.trim()) {
      showToast('Please enter your review feedback', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await submitReviewAction({
        shopId: shop.id,
        rating,
        reviewText: reviewText.trim(),
        photos,
        isInStoreVerified: isInStore,
      });

      if (!res.success) {
        showToast(res.error || 'Failed to submit review to database', 'error');
        setIsSubmitting(false);
        return;
      }

      const review: VerifiedReview = {
        id: res.reviewId || `rev-${Date.now()}`,
        shopId: shop.id,
        shopName: shop.name,
        authorName: authorName.trim() || 'Verified Customer',
        rating,
        reviewText: reviewText.trim(),
        photos,
        tags: selectedTags,
        isInStoreVerified: isInStore,
        distanceMetersAtReview: displayDistance,
        hasBillProof,
        createdAt: (res.data as any)?.created_at || new Date().toISOString(),
      };

      saveVerifiedReview(review);
      showToast(res.message || '🌟 Your verified in-store review has been posted!');
      if (onReviewSubmitted) onReviewSubmitted(review);

      // Reset & close
      setReviewText('');
      setPhotos([]);
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Error submitting review', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-600 flex items-center justify-center">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                Write Verified Store Review
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {shop.name}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[82vh] overflow-y-auto">
          {/* GPS In-Store Verification Banner */}
          <div
            className={`p-3.5 rounded-2xl border flex items-start gap-2.5 transition-colors ${
              isInStore
                ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800/80 text-emerald-900 dark:text-emerald-200'
                : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/70 text-amber-900 dark:text-amber-200'
            }`}
          >
            {isInStore ? (
              <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <MapPin className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            )}
            <div className="text-xs flex-1">
              <div className="font-extrabold flex items-center justify-between">
                <span>{isInStore ? 'Physical Store Presence Verified!' : 'Community Review (Outside Store)'}</span>
                <span className="font-mono text-[10px] opacity-80">{displayDistance}m away</span>
              </div>
              <p className="text-[11px] opacity-90 mt-0.5 leading-relaxed">
                {isInStore
                  ? 'Your GPS confirms you are inside the store premises. Your review will receive the green "Verified In-Store Customer" badge!'
                  : 'You are located outside the 100m in-store radius. Reviews within 100m receive verified physical badges.'}
              </p>
              {/* Simulation switch for easy testing */}
              <button
                type="button"
                onClick={() => setForceInStoreSimulation(!forceInStoreSimulation)}
                className="mt-2 text-[10px] font-bold text-brand-600 underline"
              >
                {forceInStoreSimulation ? 'Switch back to actual GPS' : '🧪 Simulate In-Store Presence (<100m)'}
              </button>
            </div>
          </div>

          {/* Star Rating Picker */}
          <div>
            <label className="text-xs font-black uppercase tracking-wider text-slate-400 block mb-1.5">
              Rate Your In-Store Experience:
            </label>
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="p-1 text-slate-300 hover:text-amber-400 transition-colors"
                >
                  <Star
                    className={`w-7 h-7 ${
                      star <= rating ? 'text-amber-400 fill-amber-400' : 'text-slate-300'
                    }`}
                  />
                </button>
              ))}
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300 ml-2">
                {rating === 5 && 'Outstanding Experience'}
                {rating === 4 && 'Very Good Store'}
                {rating === 3 && 'Average'}
                {rating <= 2 && 'Needs Improvement'}
              </span>
            </div>
          </div>

          {/* Experience Tags Chips */}
          <div>
            <label className="text-xs font-black uppercase tracking-wider text-slate-400 block mb-1.5">
              Select What Stood Out:
            </label>
            <div className="flex flex-wrap gap-1.5">
              {REVIEW_TAG_PRESETS.map((tag) => {
                const active = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleToggleTag(tag)}
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all border ${
                      active
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Customer Name */}
          <div>
            <label className="text-xs font-black uppercase tracking-wider text-slate-400 block mb-1.5">
              Your Name (Optional)
            </label>
            <input
              type="text"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder="e.g. Rahul S."
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold outline-none focus:border-brand-500"
            />
          </div>

          {/* Review Text */}
          <div>
            <label className="text-xs font-black uppercase tracking-wider text-slate-400 block mb-1.5">
              Review Details:
            </label>
            <textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="Describe your purchase: Was the price transparent? Was the product in stock and original? How was the service?"
              rows={3}
              className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium outline-none focus:border-brand-500 resize-none"
              required
            />
          </div>

          {/* Photo Uploader / Receipt Proof */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Camera className="w-3.5 h-3.5" />
                <span>Upload Photos / Receipt Proof (Up to 3):</span>
              </label>
              <span className="text-[10px] text-slate-400">{photos.length}/3 attached</span>
            </div>

            {/* Photo Thumbnails */}
            <div className="grid grid-cols-4 gap-2 mb-2">
              {photos.map((img, idx) => (
                <div key={idx} className="relative rounded-xl overflow-hidden border border-slate-200 aspect-square group">
                  <img src={img} alt="Review upload" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(idx)}
                    className="absolute top-1 right-1 p-1 bg-black/70 hover:bg-rose-600 text-white rounded-full transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}

              {photos.length < 3 && (
                <label className="border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-brand-500 rounded-xl aspect-square flex flex-col items-center justify-center text-slate-400 hover:text-brand-600 cursor-pointer transition-colors bg-slate-50 dark:bg-slate-800/50">
                  <Upload className="w-5 h-5 mb-1" />
                  <span className="text-[9px] font-bold">Add Photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* Receipt Proof Toggle */}
            <label className="flex items-center gap-2 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={hasBillProof}
                onChange={(e) => setHasBillProof(e.target.checked)}
                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                Photo includes printed store receipt / GST bill proof
              </span>
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-extrabold text-sm shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all mt-2"
          >
            <Send className="w-4 h-4" />
            <span>{isSubmitting ? 'Posting Review...' : 'Post Verified Review'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}

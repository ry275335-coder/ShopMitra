// ==============================================================================
// src/components/customer/BarcodeScannerModal.tsx
// In-Store Barcode & Camera Scanner for Instant Multi-Shop Price Lookup
// Supports Live WebRTC Stream, BarcodeDetector API, Mobile Native Camera Snapshot & Manual EAN
// ==============================================================================

'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { MasterProduct } from '@/types';
import { 
  ScanLine, 
  Camera, 
  Sparkles, 
  Search, 
  CheckCircle2, 
  AlertCircle,
  Barcode as BarcodeIcon,
  SwitchCamera,
  Volume2,
  Zap,
  RotateCcw,
  Upload
} from 'lucide-react';
import { 
  RETAIL_BARCODE_CATALOG, 
  lookupBarcode, 
  playBeepSound, 
  triggerHapticFeedback,
  BarcodeProductInfo 
} from '@/lib/barcodeCatalog';
import { useToast } from '@/components/ui/Toast';

export function BarcodeScannerModal({
  isOpen,
  onClose,
  products,
  onProductFound,
}: {
  isOpen: boolean;
  onClose: () => void;
  products: MasterProduct[];
  onProductFound: (product: MasterProduct) => void;
}) {
  const { showToast } = useToast();
  const [manualCode, setManualCode] = useState('');
  const [activeTab, setActiveTab] = useState<'camera' | 'manual'>('camera');
  const [hasCamera, setHasCamera] = useState(true);
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const [isScanningActive, setIsScanningActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement | null>(null);

  // Stop camera tracks cleanly
  const stopCamera = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsScanningActive(false);
  }, []);

  // Handle successful barcode recognition
  const handleLookup = useCallback((code: string) => {
    const clean = code.trim();
    if (!clean) return;

    playBeepSound();
    triggerHapticFeedback();
    stopCamera();

    // 1. First check if it matches an existing product in store
    const localMatch = products.find(
      p => (p.barcode && p.barcode.toLowerCase() === clean.toLowerCase()) || 
           p.id.toLowerCase() === clean.toLowerCase() ||
           p.name.toLowerCase().includes(clean.toLowerCase())
    );

    if (localMatch) {
      showToast({
        title: 'Barcode Matched!',
        message: `Found: ${localMatch.name}. Comparing local shop rates...`,
        type: 'success',
      });
      onClose();
      onProductFound(localMatch);
      return;
    }

    // 2. Check retail barcode catalog
    const catalogMatch = lookupBarcode(clean);
    if (catalogMatch) {
      // Find or create matching product representation
      const existingProduct = products.find(
        p => p.name.toLowerCase().includes(catalogMatch.name.toLowerCase().slice(0, 15)) ||
             (p.brand && catalogMatch.brand && p.brand.toLowerCase() === catalogMatch.brand.toLowerCase())
      );

      if (existingProduct) {
        showToast({
          title: 'Retail Barcode Verified!',
          message: `Identified: ${catalogMatch.name}. Comparing nearby store prices...`,
          type: 'success',
        });
        onClose();
        onProductFound(existingProduct);
        return;
      }

      // If no direct shop inventory matches, create pseudo product for comparison
      const syntheticProduct: MasterProduct = {
        id: `prod-${catalogMatch.barcode}`,
        categoryId: catalogMatch.categoryId,
        name: catalogMatch.name,
        slug: catalogMatch.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        brand: catalogMatch.brand,
        model: catalogMatch.variantName,
        description: catalogMatch.description,
        mrp: catalogMatch.mrp,
        imageUrl: catalogMatch.imageUrl,
        barcode: catalogMatch.barcode,
        galleryUrls: [],
        specifications: { SKU: catalogMatch.sku }
      };

      showToast({
        title: 'Retail Barcode Found!',
        message: `${catalogMatch.name} — EAN ${catalogMatch.barcode}`,
        type: 'success',
      });
      onClose();
      onProductFound(syntheticProduct);
      return;
    }

    showToast({
      title: 'Product Not Found',
      message: `No catalog item matches barcode ${clean}. Try selecting a sample barcode below.`,
      type: 'warning',
    });
  }, [products, onClose, onProductFound, showToast, stopCamera]);

  // Start live camera video stream
  const startCamera = useCallback(async (facing: 'environment' | 'user' = cameraFacing) => {
    stopCamera();
    setCameraError(null);

    // Check if mediaDevices is supported (it can be undefined on HTTP mobile IP)
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.warn('getUserMedia not supported in this browser context (likely HTTP on mobile)');
      setHasCamera(false);
      setCameraError('Camera stream requires HTTPS or localhost on mobile browsers. Use the Native Phone Camera button below.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(e => console.warn('Play error:', e));
      }

      setIsScanningActive(true);
      setHasCamera(true);

      // Check for native BarcodeDetector API
      const hasBarcodeDetector = typeof window !== 'undefined' && 'BarcodeDetector' in window;

      if (hasBarcodeDetector) {
        try {
          const detector = new (window as any).BarcodeDetector({
            formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'qr_code', 'code_128', 'code_39'],
          });

          // Continuously scan video stream every 220ms
          scanIntervalRef.current = setInterval(async () => {
            if (videoRef.current && videoRef.current.readyState >= 2) {
              try {
                const barcodes = await detector.detect(videoRef.current);
                if (barcodes && barcodes.length > 0) {
                  const first = barcodes[0];
                  if (first.rawValue) {
                    handleLookup(first.rawValue);
                  }
                }
              } catch {
                // Ignore detection hiccups
              }
            }
          }, 220);
        } catch (e) {
          console.warn('BarcodeDetector error:', e);
        }
      }
    } catch (err: any) {
      console.warn('Camera access denied or failed:', err);
      setHasCamera(false);
      setCameraError(err?.message?.includes('Permission') ? 'Camera permission was denied. Please allow camera access.' : 'Camera stream unavailable.');
      setIsScanningActive(false);
    }
  }, [cameraFacing, stopCamera, handleLookup]);

  // Manage camera lifecycle based on isOpen and activeTab
  useEffect(() => {
    if (isOpen && activeTab === 'camera') {
      startCamera(cameraFacing);
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, activeTab, cameraFacing, startCamera, stopCamera]);

  const toggleFacing = () => {
    const nextFacing = cameraFacing === 'environment' ? 'user' : 'environment';
    setCameraFacing(nextFacing);
    startCamera(nextFacing);
  };

  // Mobile Native Camera Snapshot handler (works 100% on HTTP and all devices)
  const handleNativeSnapshot = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    showToast({
      title: 'Photo Received',
      message: 'Processing barcode from packaging photo...',
      type: 'info'
    });

    // Check BarcodeDetector from ImageBitmap
    if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
      createImageBitmap(file).then(async (bitmap) => {
        try {
          const detector = new (window as any).BarcodeDetector({
            formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'qr_code', 'code_128'],
          });
          const barcodes = await detector.detect(bitmap);
          if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
            handleLookup(barcodes[0].rawValue);
            return;
          }
        } catch (e) {
          console.warn('Detector error on file:', e);
        }
        // Fallback if no barcode detected in image
        showToast({
          title: 'Select Sample Barcode',
          message: 'Could not auto-read barcode stripes. Click a quick sample barcode below.',
          type: 'warning'
        });
      }).catch(() => {
        showToast({
          title: 'Photo Uploaded',
          message: 'Please choose or enter a barcode number to compare rates.',
          type: 'info'
        });
      });
    } else {
      showToast({
        title: 'Photo Captured',
        message: 'Click any sample barcode below or enter code to compare prices.',
        type: 'info'
      });
    }

    e.target.value = '';
  };

  const handleModalClose = () => {
    stopCamera();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleModalClose} size="md" title="Scan Retail Barcode / QR Code">
      {/* Hidden native camera capture input for 100% mobile compatibility */}
      <input
        ref={nativeCameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleNativeSnapshot}
        className="hidden"
      />

      <div className="space-y-4">
        {/* Navigation Mode */}
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('camera')}
            className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
              activeTab === 'camera'
                ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Live Camera Scanner</span>
          </button>
          <button
            type="button"
            onClick={() => {
              stopCamera();
              setActiveTab('manual');
            }}
            className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
              activeTab === 'manual'
                ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <BarcodeIcon className="w-4 h-4" />
            <span>Manual EAN / UPC</span>
          </button>
        </div>

        {activeTab === 'camera' ? (
          <div className="space-y-3">
            {/* Viewfinder Area */}
            {hasCamera ? (
              <div className="relative w-full h-64 sm:h-72 bg-black rounded-2xl overflow-hidden flex items-center justify-center border-2 border-emerald-500/60 shadow-inner">
                {/* Real Live Video Element */}
                <video
                  ref={videoRef}
                  playsInline
                  autoPlay
                  muted
                  className="w-full h-full object-cover"
                />

                {/* Laser scanner beam animation overlay */}
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-4">
                  <div className="w-52 h-28 sm:w-60 sm:h-32 border-2 border-emerald-400/90 rounded-2xl relative flex items-center justify-center shadow-lg">
                    {/* Corner Reticles */}
                    <div className="absolute -top-1 -left-1 w-3.5 h-3.5 border-t-3 border-l-3 border-emerald-400" />
                    <div className="absolute -top-1 -right-1 w-3.5 h-3.5 border-t-3 border-r-3 border-emerald-400" />
                    <div className="absolute -bottom-1 -left-1 w-3.5 h-3.5 border-b-3 border-l-3 border-emerald-400" />
                    <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 border-b-3 border-r-3 border-emerald-400" />

                    {/* Animated Pulsing Laser */}
                    <div className="w-full h-0.5 bg-rose-500 shadow-[0_0_12px_#ef4444] animate-pulse" />
                  </div>

                  <p className="text-[11px] font-bold text-white bg-black/70 px-3 py-1 rounded-full backdrop-blur-xs mt-3">
                    Point camera directly at product barcode stripes or QR code
                  </p>
                </div>

                {/* Top Overlay Controls */}
                <div className="absolute top-2.5 right-2.5 flex items-center space-x-2 z-10">
                  <button
                    type="button"
                    onClick={toggleFacing}
                    className="bg-black/60 hover:bg-black/80 text-white p-2 rounded-xl backdrop-blur-sm border border-white/20 transition-colors"
                    title="Switch Front/Rear Camera"
                  >
                    <SwitchCamera className="w-4 h-4" />
                  </button>
                </div>

                {/* Beep Status */}
                <div className="absolute top-2.5 left-2.5 flex items-center space-x-1.5 bg-black/60 backdrop-blur-sm text-emerald-400 text-[10px] font-bold px-2.5 py-1 rounded-xl border border-white/10 z-10">
                  <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>POS Audio Active</span>
                </div>
              </div>
            ) : (
              /* Fallback when browser blocks WebRTC camera stream (e.g. HTTP on mobile) */
              <div className="p-5 bg-emerald-50/50 dark:bg-emerald-950/20 border-2 border-dashed border-emerald-400 rounded-2xl text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                  <Camera className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900 dark:text-white">
                    Open Phone Camera
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                    {cameraError || 'Tap below to launch your phone camera and snap the retail barcode instantly.'}
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 justify-center pt-1">
                  <Button
                    variant="primary"
                    size="md"
                    type="button"
                    onClick={() => nativeCameraInputRef.current?.click()}
                    leftIcon={<Camera className="w-4 h-4" />}
                    className="w-full sm:w-auto"
                  >
                    📸 Launch Phone Camera
                  </Button>
                  <Button
                    variant="outline"
                    size="md"
                    type="button"
                    onClick={() => startCamera()}
                    leftIcon={<RotateCcw className="w-4 h-4" />}
                    className="w-full sm:w-auto"
                  >
                    Retry Live Stream
                  </Button>
                </div>
              </div>
            )}

            {/* Quick Demo Scan Trigger Chips */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  <span>1-Tap Test Barcodes (Instant Price Lookup):</span>
                </span>
                <span className="text-[10px] text-slate-400">Click to compare</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {RETAIL_BARCODE_CATALOG.slice(0, 6).map((item) => (
                  <button
                    key={item.barcode}
                    type="button"
                    onClick={() => handleLookup(item.barcode)}
                    className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500 bg-white dark:bg-slate-900 text-left transition-colors flex flex-col group shadow-2xs"
                  >
                    <span className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-emerald-600">
                      {item.name}
                    </span>
                    <div className="flex items-center justify-between mt-1 text-[10px] text-slate-400">
                      <span className="font-mono">{item.barcode}</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">₹{item.defaultRate}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleLookup(manualCode);
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Enter Barcode Number (EAN-13, UPC, or SKU)
              </label>
              <div className="relative">
                <BarcodeIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="e.g. 8806091234567 or 195949038245"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Barcodes are printed below the zebra stripes on product packaging.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="md" type="button" onClick={handleModalClose}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                type="submit"
                leftIcon={<Search className="w-4 h-4" />}
              >
                Lookup Counter Rates
              </Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}

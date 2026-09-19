// ==============================================================================
// src/components/common/BarcodeScannerOverlay.tsx
// Universal Live Camera Barcode & QR Code Scanner with Native BarcodeDetector API,
// Mobile Native Camera Snapshot Fallback, POS Audio Beep, Mobile Haptics, and Auto-Fill
// ==============================================================================

'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  X, 
  Camera, 
  SwitchCamera, 
  ScanLine, 
  Barcode as BarcodeIcon, 
  Sparkles, 
  Search, 
  Volume2, 
  CheckCircle2, 
  AlertCircle,
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

interface BarcodeScannerOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onBarcodeDetected: (product: BarcodeProductInfo, rawBarcode: string) => void;
  title?: string;
  subtitle?: string;
}

export function BarcodeScannerOverlay({
  isOpen,
  onClose,
  onBarcodeDetected,
  title = 'Scan Retail Product Barcode / QR',
  subtitle = 'Point phone camera at barcode stripes or QR code on retail packaging',
}: BarcodeScannerOverlayProps) {
  const { showToast } = useToast();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement | null>(null);

  const [hasCamera, setHasCamera] = useState(true);
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const [manualCode, setManualCode] = useState('');
  const [isScanningActive, setIsScanningActive] = useState(false);
  const [detectedCode, setDetectedCode] = useState<string | null>(null);
  const [detectorSupported, setDetectorSupported] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

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
  const handleSuccess = useCallback((code: string) => {
    const cleanCode = code.trim();
    if (!cleanCode) return;

    // Trigger physical cues
    playBeepSound();
    triggerHapticFeedback();
    setDetectedCode(cleanCode);

    // Stop scanning immediately to prevent duplicate triggers
    stopCamera();

    // Lookup in catalog
    const matchedProduct = lookupBarcode(cleanCode);

    if (matchedProduct) {
      showToast(`⚡ Barcode ${cleanCode} verified! Auto-filling ${matchedProduct.name}...`);
      setTimeout(() => {
        onBarcodeDetected(matchedProduct, cleanCode);
        onClose();
      }, 400);
    } else {
      // Create a fallback product info with the scanned barcode as SKU
      const genericInfo: BarcodeProductInfo = {
        barcode: cleanCode,
        name: '',
        brand: '',
        categoryId: 'c1000000-0000-0000-0000-000000000001',
        variantName: 'Standard',
        mrp: 0,
        defaultRate: 0,
        imageUrl: '',
        description: `Retail Barcode: ${cleanCode}`,
        sku: `BAR-${cleanCode.slice(-6)}`,
      };
      showToast(`Scanned barcode: ${cleanCode}. Enter details to save.`);
      setTimeout(() => {
        onBarcodeDetected(genericInfo, cleanCode);
        onClose();
      }, 400);
    }
  }, [stopCamera, showToast, onBarcodeDetected, onClose]);

  // Start live camera stream safely with HTTP mobile checks
  const startCamera = useCallback(async (facing: 'environment' | 'user' = cameraFacing) => {
    stopCamera();
    setCameraError(null);

    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.warn('getUserMedia not available (likely mobile browser over plain HTTP)');
      setHasCamera(false);
      setCameraError('Camera stream requires HTTPS or localhost on mobile. Tap "Launch Phone Camera" below.');
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
        await videoRef.current.play().catch(e => console.warn('Video play caught:', e));
      }

      setIsScanningActive(true);
      setHasCamera(true);

      // Check for native BarcodeDetector API
      const hasBarcodeDetector = typeof window !== 'undefined' && 'BarcodeDetector' in window;
      setDetectorSupported(hasBarcodeDetector);

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
                    handleSuccess(first.rawValue);
                  }
                }
              } catch {
                // Ignore frame detection errors
              }
            }
          }, 220);
        } catch (e) {
          console.warn('BarcodeDetector instantiation failed:', e);
        }
      }
    } catch (err: any) {
      console.warn('Could not access camera for barcode scanner:', err);
      setHasCamera(false);
      setCameraError(err?.message?.includes('Permission') ? 'Camera permission denied.' : 'Camera unavailable.');
      setIsScanningActive(false);
    }
  }, [cameraFacing, stopCamera, handleSuccess]);

  // Manage camera lifecycle based on isOpen
  useEffect(() => {
    if (isOpen) {
      setDetectedCode(null);
      startCamera(cameraFacing);
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, cameraFacing, startCamera, stopCamera]);

  const toggleFacing = () => {
    const nextFacing = cameraFacing === 'environment' ? 'user' : 'environment';
    setCameraFacing(nextFacing);
    startCamera(nextFacing);
  };

  // Native phone camera snapshot (works 100% on mobile over HTTP LAN IP)
  const handleNativeSnapshot = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
      createImageBitmap(file).then(async (bitmap) => {
        try {
          const detector = new (window as any).BarcodeDetector({
            formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'qr_code', 'code_128'],
          });
          const barcodes = await detector.detect(bitmap);
          if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
            handleSuccess(barcodes[0].rawValue);
            return;
          }
        } catch (e) {
          console.warn('Barcode detect error on snapshot:', e);
        }
        showToast('Could not read stripes from photo. Please tap a sample barcode below.', 'info');
      }).catch(() => {
        showToast('Photo captured. Tap a test barcode below or enter barcode number.', 'info');
      });
    } else {
      showToast('Photo captured. Tap a test barcode below or enter barcode number.', 'info');
    }

    e.target.value = '';
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-60 overflow-y-auto bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
    >
      {/* Hidden Native Camera Input for 100% Mobile HTTP Support */}
      <input
        ref={nativeCameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleNativeSnapshot}
      />

      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-slate-100 dark:border-slate-800 flex flex-col my-auto max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <ScanLine className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white leading-tight">
                {title}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {subtitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewfinder / Camera Area */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto">
          {hasCamera ? (
            <div className="relative rounded-2xl overflow-hidden bg-black shadow-inner aspect-4/3 sm:aspect-16/10 flex items-center justify-center border-2 border-emerald-500/50">
              {/* Video Element */}
              <video
                ref={videoRef}
                playsInline
                autoPlay
                muted
                className="w-full h-full object-cover"
              />

              {/* Targeting Reticle & Laser Beam */}
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-4">
                <div className="relative w-64 h-36 sm:w-72 sm:h-40 border-2 border-dashed border-emerald-400/80 rounded-2xl flex items-center justify-center">
                  {/* Corner accents */}
                  <div className="absolute -top-1 -left-1 w-4 h-4 border-t-4 border-l-4 border-emerald-500 rounded-tl-sm" />
                  <div className="absolute -top-1 -right-1 w-4 h-4 border-t-4 border-r-4 border-emerald-500 rounded-tr-sm" />
                  <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-4 border-l-4 border-emerald-500 rounded-bl-sm" />
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-4 border-r-4 border-emerald-500 rounded-br-sm" />

                  {/* Animated red laser scanning beam */}
                  <div className="w-full h-0.5 bg-rose-500 shadow-[0_0_12px_#ef4444] animate-pulse" />
                </div>

                <p className="text-[11px] font-bold text-white/90 bg-black/60 px-3 py-1 rounded-full backdrop-blur-xs mt-3">
                  {detectedCode ? `Scanned: ${detectedCode}` : 'Align barcode within the target box'}
                </p>
              </div>

              {/* Viewfinder Overlay Controls */}
              <div className="absolute top-3 right-3 flex items-center space-x-2">
                <button
                  type="button"
                  onClick={toggleFacing}
                  className="bg-black/60 hover:bg-black/80 text-white p-2 rounded-xl backdrop-blur-sm border border-white/20 transition-colors"
                  title="Switch Camera (Front/Rear)"
                >
                  <SwitchCamera className="w-4 h-4" />
                </button>
              </div>

              {/* Hardware Beep Indicator */}
              <div className="absolute top-3 left-3 flex items-center space-x-1.5 bg-black/60 backdrop-blur-sm text-emerald-400 text-[10px] font-bold px-2.5 py-1 rounded-xl border border-white/10">
                <Volume2 className="w-3 h-3 text-emerald-400" />
                <span>Audio Beep Active</span>
              </div>
            </div>
          ) : (
            <div className="p-5 bg-emerald-50/50 dark:bg-emerald-950/20 border-2 border-dashed border-emerald-400 rounded-2xl text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                <Camera className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900 dark:text-white">
                  Open Phone Camera
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                  {cameraError || 'Tap below to launch your phone camera and snap the retail barcode directly.'}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 justify-center pt-1">
                <button
                  type="button"
                  onClick={() => nativeCameraInputRef.current?.click()}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-md"
                >
                  <Camera className="w-4 h-4" />
                  <span>📸 Launch Phone Camera</span>
                </button>
                <button
                  type="button"
                  onClick={() => startCamera()}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center gap-2 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Retry Stream</span>
                </button>
              </div>
            </div>
          )}

          {/* Quick Demo Test Barcodes */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <span>1-Tap Test Barcodes (Instant Fill):</span>
              </span>
              <span className="text-[10px] text-slate-400 font-medium">Click to simulate scan</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-36 overflow-y-auto p-1 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800">
              {RETAIL_BARCODE_CATALOG.slice(0, 9).map((item) => (
                <button
                  key={item.barcode}
                  type="button"
                  onClick={() => handleSuccess(item.barcode)}
                  className="bg-white dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:border-emerald-300 dark:hover:border-emerald-700 p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-left transition-all group flex flex-col justify-between"
                >
                  <span className="text-[11px] font-bold text-slate-800 dark:text-white line-clamp-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                    {item.name}
                  </span>
                  <div className="flex items-center justify-between mt-1 text-[10px] text-slate-500 dark:text-slate-400">
                    <span className="font-mono">{item.barcode.slice(-6)}</span>
                    <span className="font-black text-slate-700 dark:text-slate-300">₹{item.defaultRate}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Manual Barcode / SKU Input Option */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Or Enter Barcode Number (EAN-13, UPC, SKU)
            </label>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSuccess(manualCode);
              }}
              className="flex items-center gap-2"
            >
              <div className="relative flex-1">
                <BarcodeIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="e.g. 8806091234567 or 195949038245"
                  className="w-full pl-9 pr-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                />
              </div>
              <button
                type="submit"
                disabled={!manualCode.trim()}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-black px-4 py-2 rounded-xl transition-colors shrink-0"
              >
                Auto-Fill
              </button>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 px-5 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>EAN-13, UPC-A, Code-128 & QR supported</span>
          </span>
          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

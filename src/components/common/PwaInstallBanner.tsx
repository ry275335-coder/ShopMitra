// ==============================================================================
// src/components/common/PwaInstallBanner.tsx
// PWA Install Prompt Banner & Service Worker Registrar (Phase 6)
// ==============================================================================

'use client';

import React, { useState, useEffect } from 'react';
import { Download, X, Sparkles, Smartphone, CheckCircle2, Share2, MoreVertical } from 'lucide-react';

export function PwaInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const deferredPromptRef = React.useRef<any>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [isOfflineReady, setIsOfflineReady] = useState(false);

  useEffect(() => {
    // 1. Register Service Worker
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then(() => {
          setIsOfflineReady(true);
        })
        .catch(() => {
          // Fallback in dev/unsupported
        });
    }

    // 2. Check if already running in standalone mode (installed app)
    const isStandalone =
      typeof window !== 'undefined' &&
      (window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone ||
        document.referrer.includes('android-app://'));

    // 3. Listen for native browser beforeinstallprompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      deferredPromptRef.current = e;
      setDeferredPrompt(e);
      if (!isStandalone) {
        setShowBanner(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // 4. Guaranteed timer: on mobile or local IP where beforeinstallprompt doesn't fire over HTTP,
    // display the floating install banner after 1.5 seconds
    const timer = setTimeout(() => {
      const sessionDismissed = sessionStorage.getItem('shopmitra_pwa_minimized');
      if (!sessionDismissed && !isStandalone) {
        setShowBanner(true);
      }
    }, 1500);

    // 5. Global trigger for install button clicks anywhere in the app
    const handleTriggerInstall = () => {
      if (deferredPromptRef.current) {
        try {
          deferredPromptRef.current.prompt();
          deferredPromptRef.current.userChoice.then(({ outcome }: any) => {
            if (outcome === 'accepted') {
              setShowBanner(false);
            }
            deferredPromptRef.current = null;
            setDeferredPrompt(null);
          }).catch(() => {
            setShowGuideModal(true);
          });
        } catch {
          setShowGuideModal(true);
        }
      } else {
        setShowGuideModal(true);
      }
    };

    window.addEventListener('shopmitra:trigger_install', handleTriggerInstall);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('shopmitra:trigger_install', handleTriggerInstall);
      clearTimeout(timer);
    };
  }, []);

  const handleInstallClick = async () => {
    const promptObj = deferredPromptRef.current || deferredPrompt;
    if (promptObj) {
      try {
        promptObj.prompt();
        const { outcome } = await promptObj.userChoice;
        if (outcome === 'accepted') {
          setShowBanner(false);
        }
        deferredPromptRef.current = null;
        setDeferredPrompt(null);
      } catch {
        setShowGuideModal(true);
      }
    } else {
      // On HTTP LAN or iOS Safari where beforeinstallprompt doesn't exist, show quick 2-tap install guide
      setShowGuideModal(true);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    try {
      sessionStorage.setItem('shopmitra_pwa_minimized', 'true');
    } catch {}
  };

  return (
    <>
      {/* Floating PWA Install Banner */}
      {showBanner && (
        <div className="fixed bottom-20 sm:bottom-6 left-3 right-3 sm:left-auto sm:right-6 max-w-sm z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className="bg-slate-900/95 text-white p-3.5 rounded-2xl shadow-2xl border border-slate-700/80 backdrop-blur-md flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shrink-0 shadow-md">
                <Smartphone className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-white flex items-center gap-1 truncate">
                  <span>Install ShopMitra App</span>
                  <Sparkles className="w-3 h-3 text-yellow-400 shrink-0" />
                </h4>
                <p className="text-[11px] text-slate-300 truncate">
                  {isOfflineReady ? '🟢 Offline Ready • Fast Counter Access' : 'Add to Home Screen for fast rates'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={handleInstallClick}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black px-3 py-1.5 rounded-xl transition-colors shadow-sm flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Install</span>
              </button>
              <button
                onClick={handleDismiss}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual "Add to Home Screen" Visual Guide Modal (For HTTP LAN & Safari) */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm">
                  ₹
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    Add ShopMitra to Home Screen
                  </h3>
                  <p className="text-[10px] text-emerald-600 font-bold">Offline Shell & Instant Counter Speed</p>
                </div>
              </div>
              <button
                onClick={() => setShowGuideModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
              <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2">
                <span className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5 text-xs">
                  <MoreVertical className="w-4 h-4 text-emerald-600" />
                  <span>On Android (Chrome / Brave / Edge):</span>
                </span>
                <ol className="list-decimal list-inside space-y-1 pl-1 text-[11px]">
                  <li>Tap the <strong>three dots (⋮)</strong> menu at the top right of Chrome.</li>
                  <li>Select <strong>&quot;Install app&quot;</strong> or <strong>&quot;Add to Home screen&quot;</strong>.</li>
                  <li>Confirm by tapping <strong>Install</strong>.</li>
                </ol>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2">
                <span className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5 text-xs">
                  <Share2 className="w-4 h-4 text-blue-600" />
                  <span>On iPhone / iPad (Safari):</span>
                </span>
                <ol className="list-decimal list-inside space-y-1 pl-1 text-[11px]">
                  <li>Tap the <strong>Share</strong> button (<Share2 className="w-3 h-3 inline" />) at the bottom.</li>
                  <li>Scroll down and tap <strong>&quot;Add to Home Screen&quot;</strong>.</li>
                  <li>Tap <strong>Add</strong> at top right.</li>
                </ol>
              </div>
            </div>

            <button
              onClick={() => {
                setShowGuideModal(false);
                setShowBanner(false);
              }}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl transition-colors shadow-sm flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Got It, Ready to Install</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
}

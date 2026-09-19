// ==============================================================================
// src/components/common/ShopMitraApp.tsx
// Core Client App Shell connecting Header, Views (Customer, Merchant, Admin),
// Navigation, and Global Modals (Step 38, 56 & 60)
// ==============================================================================

'use client';

import React, { useState } from 'react';
import { useApp } from './AppContext';
import { Header } from './Header';
import { MobileBottomBar } from './MobileBottomBar';
import { CustomerHomeView } from '@/components/customer/CustomerHomeView';
import { MerchantDashboardView } from '@/components/merchant/MerchantDashboardView';
import { AdminDashboardView } from '@/components/admin/AdminDashboardView';
import { MerchantOnboardingModal } from '@/components/merchant/MerchantOnboardingModal';
import { WishlistDrawer } from '@/components/customer/WishlistDrawer';
import { BarcodeScannerModal } from '@/components/customer/BarcodeScannerModal';
import { CounterHoldsDrawer } from '@/components/customer/CounterHoldsDrawer';
import { PriceAlertsDrawer } from '@/components/customer/PriceAlertsDrawer';
import { CustomerAuthModal } from '@/components/customer/CustomerAuthModal';
import { SupabaseConnectModal } from '@/components/common/SupabaseConnectModal';
import { VoiceSearchModal } from '@/components/customer/VoiceSearchModal';
import { PwaInstallBanner } from './PwaInstallBanner';
import { MasterProduct, Shop, ShopProductRate, Category } from '@/types';
import { ShieldCheck, Heart, Store, Phone, HelpCircle } from 'lucide-react';

export function ShopMitraApp({
  categories,
  initialProducts,
  initialShops,
  initialRates,
}: {
  categories: Category[];
  initialProducts: MasterProduct[];
  initialShops: Shop[];
  initialRates: Record<string, ShopProductRate[]>;
}) {
  const { role, setRole, setSearchQuery, switchPortal } = useApp();
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isWishlistOpen, setIsWishlistOpen] = useState(false);
  const [isBarcodeOpen, setIsBarcodeOpen] = useState(false);
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [isHoldsOpen, setIsHoldsOpen] = useState(false);
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);
  const [isCloudModalOpen, setIsCloudModalOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authModalRole, setAuthModalRole] = useState<'customer' | 'merchant'>('customer');
  const [mobileActiveView, setMobileActiveView] = useState('home');

  const handleOpenAuth = (entryRole: 'customer' | 'merchant' = 'customer') => {
    setAuthModalRole(entryRole);
    setIsAuthOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 w-full overflow-x-hidden">
      {/* Universal Application Header */}
      <Header
        products={initialProducts}
        onOpenWishlist={() => setIsWishlistOpen(true)}
        onOpenOnboarding={() => setIsOnboardingOpen(true)}
        onOpenBarcode={() => setIsBarcodeOpen(true)}
        onOpenVoice={() => setIsVoiceOpen(true)}
        onOpenHolds={() => setIsHoldsOpen(true)}
        onOpenAlerts={() => setIsAlertsOpen(true)}
        onOpenCloudSync={() => setIsCloudModalOpen(true)}
        onOpenAuth={(role) => handleOpenAuth(role || 'customer')}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 pb-24 sm:pb-8 overflow-x-hidden">
        {role === 'customer' && (
          <CustomerHomeView
            categories={categories}
            initialProducts={initialProducts}
            initialShops={initialShops}
            initialRates={initialRates}
            onOpenHolds={() => setIsHoldsOpen(true)}
            onOpenVoice={() => setIsVoiceOpen(true)}
            onOpenOnboarding={() => setIsOnboardingOpen(true)}
            onOpenAuth={(role) => handleOpenAuth(role || 'customer')}
            activeMobileView={mobileActiveView}
            onViewChange={setMobileActiveView}
          />
        )}

        {role === 'merchant' && (
          <MerchantDashboardView
            onOpenOnboarding={() => setIsOnboardingOpen(true)}
            onOpenAuth={(role) => handleOpenAuth(role || 'merchant')}
            activeMobileView={mobileActiveView}
            onViewChange={setMobileActiveView}
          />
        )}

        {role === 'admin' && (
          <AdminDashboardView
            activeMobileView={mobileActiveView}
            onViewChange={setMobileActiveView}
          />
        )}
      </main>

      {/* Mobile-first Thumb Zone Navigation */}
      <MobileBottomBar
        activeView={mobileActiveView}
        setActiveView={setMobileActiveView}
        onOpenWishlist={() => setIsWishlistOpen(true)}
        onOpenHolds={() => setIsHoldsOpen(true)}
        onOpenAuth={() => handleOpenAuth(role === 'merchant' ? 'merchant' : 'customer')}
      />

      {/* Global Modals */}
      <CustomerAuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onOpenHolds={() => setIsHoldsOpen(true)}
        onOpenAlerts={() => setIsAlertsOpen(true)}
        onOpenWishlist={() => setIsWishlistOpen(true)}
        onOpenOnboarding={() => setIsOnboardingOpen(true)}
        initialRole={authModalRole}
      />

      <MerchantOnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        onSuccess={() => {
          setIsOnboardingOpen(false);
          switchPortal('merchant');
        }}
      />

      <WishlistDrawer
        isOpen={isWishlistOpen}
        onClose={() => setIsWishlistOpen(false)}
        products={initialProducts}
        onSelectProduct={(p) => {
          setIsWishlistOpen(false);
        }}
      />

      <CounterHoldsDrawer
        isOpen={isHoldsOpen}
        onClose={() => setIsHoldsOpen(false)}
      />

      <PriceAlertsDrawer
        isOpen={isAlertsOpen}
        onClose={() => setIsAlertsOpen(false)}
        onOpenProduct={(productId) => {
          setIsAlertsOpen(false);
          setSearchQuery(productId);
        }}
      />

      <BarcodeScannerModal
        isOpen={isBarcodeOpen}
        onClose={() => setIsBarcodeOpen(false)}
        products={initialProducts}
        onProductFound={(p) => {
          setSearchQuery(p.name);
        }}
      />

      <VoiceSearchModal
        isOpen={isVoiceOpen}
        onClose={() => setIsVoiceOpen(false)}
        onSearch={(query) => {
          setSearchQuery(query);
        }}
      />

      <SupabaseConnectModal
        isOpen={isCloudModalOpen}
        onClose={() => setIsCloudModalOpen(false)}
      />

      <PwaInstallBanner />

      {/* Desktop Professional Footer */}
      <footer className="hidden sm:block bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-10 mt-12 text-slate-600 dark:text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-black text-lg">
                  S
                </div>
                <span className="font-extrabold text-xl text-slate-900 dark:text-white tracking-tight">
                  Shop<span className="text-emerald-600">Mitra</span>
                </span>
              </div>
              <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                Empowering neighborhood retailers with live transparent price discovery. Compare counter rates, check real stock, and support local community commerce.
              </p>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-3">
                For Customers
              </h4>
              <ul className="space-y-2 text-xs">
                <li><a href="#" className="hover:text-emerald-600 transition-colors">Nearby Stores Directory</a></li>
                <li><a href="#" className="hover:text-emerald-600 transition-colors">Live Price Comparison</a></li>
                <li><a href="#" className="hover:text-emerald-600 transition-colors">Price Drop Alerts</a></li>
                <li><a href="#" className="hover:text-emerald-600 transition-colors">Report Inaccurate Price</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-3">
                For Retailers
              </h4>
              <ul className="space-y-2 text-xs">
                <li>
                  <button onClick={() => setIsOnboardingOpen(true)} className="hover:text-emerald-600 transition-colors text-left">
                    Register Your Store
                  </button>
                </li>
                <li><button onClick={() => setRole('merchant')} className="hover:text-emerald-600 transition-colors text-left">Merchant Operations Portal</button></li>
                <li><a href="#" className="hover:text-emerald-600 transition-colors">Bulk CSV Inventory Upload</a></li>
                <li><a href="#" className="hover:text-emerald-600 transition-colors">Verified Merchant Badge</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-3">
                Trust & Verification
              </h4>
              <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                Prices and stock are updated directly by verified physical shop owners. Never pay delivery markups.
              </p>
              <div className="mt-3 flex items-center space-x-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="w-4 h-4" />
                <span>100% Counter Direct Rates</span>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
            <p>© {new Date().getFullYear()} ShopMitra Technologies Pvt. Ltd. All rights reserved.</p>
            <div className="flex items-center space-x-4">
              <span>Hyper-Local Commerce Platform</span>
              <span>•</span>
              <span>Built for Bharat Retailers</span>
              <span>•</span>
              <a href="/admin/login" className="hover:text-slate-700 dark:hover:text-slate-300 transition-colors text-[11px] text-slate-400 dark:text-slate-500">
                Staff Portal
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

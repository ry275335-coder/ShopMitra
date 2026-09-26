// ==============================================================================
// src/components/customer/CustomerAuthModal.tsx
// Customer OTP Passwordless Authentication — Phone + Email
// NO passwords. Uses Supabase Auth OTP only.
// ==============================================================================

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useApp } from '@/components/common/AppContext';
import { useToast } from '@/components/ui/Toast';
import { OtpInput } from '@/components/auth/OtpInput';
import {
  sendPhoneOtp,
  sendEmailOtp,
  verifyPhoneOtp,
  verifyEmailOtp,
  maskPhone,
  maskEmail,
} from '@/lib/supabase/auth';
import {
  getProfile,
  upsertProfile,
  upsertCustomerRecord,
  checkAccountExistsInDatabase,
} from '@/lib/supabase/profile';
import { reverseGeocodeCoordinates } from '@/lib/geo';
import { getStoredCounterHolds } from '@/lib/counterHolds';
import {
  User,
  Phone,
  Mail,
  MapPin,
  ShieldCheck,
  Heart,
  ShoppingBag,
  Bell,
  LogOut,
  X,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  Navigation,
  Store,
  MessageCircle,
  Loader2,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { getCustomerStoreInteractions, CustomerStoreInteraction } from '@/lib/analytics/interactionTracker';

type AuthStep =
  | 'choose-method'    // Choose Phone or Email
  | 'enter-contact'    // Enter phone/email
  | 'enter-otp'        // Enter OTP code
  | 'collect-profile'  // New user — collect name/city
  | 'logged-in';       // Show account dashboard

type AuthMethod = 'phone' | 'email';

const RESEND_COOLDOWN_SECONDS = 60;

export function CustomerAuthModal({
  isOpen,
  onClose,
  onOpenHolds,
  onOpenAlerts,
  onOpenWishlist,
  onOpenOnboarding,
  initialRole = 'customer',
}: {
  isOpen: boolean;
  onClose: () => void;
  onOpenHolds?: () => void;
  onOpenAlerts?: () => void;
  onOpenWishlist?: () => void;
  onOpenOnboarding?: () => void;
  initialRole?: 'customer' | 'merchant';
}) {
  const { 
    customerUser, 
    loginCustomer, 
    logoutCustomer, 
    userLocation, 
    wishlist, 
    priceAlerts,
    role,
    hasCustomerAccount,
    hasMerchantAccount,
    registeredShops,
    switchPortal,
    refreshAccountStatus,
    createCustomerAccountAction,
    authUser,
  } = useApp();
  const { showToast } = useToast();

  // ── Auth state ──────────────────────────────────────────────────────────────
  const [step, setStep] = useState<AuthStep>('choose-method');
  const [method, setMethod] = useState<AuthMethod>('phone');
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');

  // Profile collection for new users
  const [fullName, setFullName] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [lat, setLat] = useState(userLocation.lat);
  const [lng, setLng] = useState(userLocation.lng);

  // Both phone and email verification options
  const [verifyVia, setVerifyVia] = useState<'phone' | 'email'>('phone');
  const [dbDetection, setDbDetection] = useState<{
    checked: boolean;
    exists: boolean;
    byPhone: boolean;
    byEmail: boolean;
    role?: string | null;
    nameHint?: string;
    message?: string;
  } | null>(null);

  // Loading / error states
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isLocatingGps, setIsLocatingGps] = useState(false);
  const [isGpsPinned, setIsGpsPinned] = useState(false);
  const [error, setError] = useState('');

  // Resend cooldown
  const [resendCountdown, setResendCountdown] = useState(0);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Store interactions
  const [visitedStores, setVisitedStores] = useState<CustomerStoreInteraction[]>([]);

  // Detect account in database in background by both Phone and Email
  useEffect(() => {
    const raw = phone.replace(/\D/g, '');
    const hasValidPhone = raw.length >= 10;
    const hasValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

    if (!hasValidPhone && !hasValidEmail) {
      setDbDetection(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await checkAccountExistsInDatabase({
          phone: hasValidPhone ? raw : undefined,
          email: hasValidEmail ? email.trim() : undefined,
        });

        if (res.exists) {
          const sources = [];
          if (res.phoneExists) sources.push('Phone');
          if (res.emailExists) sources.push('Email');
          const greeting = res.nameHint ? `Welcome back, ${res.nameHint}! ` : '';
          const roleLabel = res.role === 'merchant' ? 'merchant' : 'customer';
          setDbDetection({
            checked: true,
            exists: true,
            byPhone: res.phoneExists,
            byEmail: res.emailExists,
            role: res.role,
            nameHint: res.nameHint,
            message: `${greeting}Registered ${roleLabel} account detected via ${sources.join(' & ')}! OTP will sign you in directly.`,
          });
        } else {
          setDbDetection({
            checked: true,
            exists: false,
            byPhone: false,
            byEmail: false,
            message: `New account: Verification code will activate your ShopMitra profile.`,
          });
        }
      } catch {
        setDbDetection(null);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [phone, email]);

  // ── Effects ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (isOpen) {
      setVisitedStores(getCustomerStoreInteractions());
      setError('');
      setOtp('');

      if (customerUser?.isLoggedIn) {
        // Logged in user -> Always show unified Account Dashboard
        setStep('logged-in');
      } else if (initialRole === 'merchant') {
        if (hasMerchantAccount) {
          setStep('logged-in');
        } else {
          setStep('choose-method');
        }
      } else {
        setStep('choose-method');
      }
    }
    const handleUpdate = () => setVisitedStores(getCustomerStoreInteractions());
    window.addEventListener('shopmitra:customer_interactions_updated', handleUpdate);
    return () => window.removeEventListener('shopmitra:customer_interactions_updated', handleUpdate);
  }, [isOpen, hasCustomerAccount, customerUser?.isLoggedIn, initialRole, authUser]);

  useEffect(() => {
    if (userLocation?.name && !city) {
      const loc = userLocation.name.toLowerCase().includes('live location') 
        ? '' 
        : userLocation.name.split(',')[0].trim();
      if (loc) setCity(loc);
    }
    setLat(userLocation.lat);
    setLng(userLocation.lng);
  }, [userLocation?.name, userLocation.lat, userLocation.lng, city]);

  // Cleanup countdown on unmount
  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  const activeHoldsCount = React.useMemo(() => {
    const uid = authUser?.id;
    return getStoredCounterHolds(uid).length;
  }, [authUser?.id, isOpen]);

  if (!isOpen) return null;

  // ── Countdown helper ────────────────────────────────────────────────────────

  const startResendCountdown = () => {
    setResendCountdown(RESEND_COOLDOWN_SECONDS);
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setResendCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // ── Send OTP ─────────────────────────────────────────────────────────────────

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSending(true);

    try {
      let result;
      if (method === 'phone') {
        if (!phone || phone.replace(/\D/g, '').length < 7) {
          setError('Please enter a valid phone number.');
          setIsSending(false);
          return;
        }
        const fullPhone = `${countryCode}${phone.replace(/\D/g, '')}`;
        result = await sendPhoneOtp(fullPhone);
      } else {
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          setError('Please enter a valid email address.');
          setIsSending(false);
          return;
        }
        result = await sendEmailOtp(email);
      }

      if (result.success) {
        setStep('enter-otp');
        setOtp('');
        startResendCountdown();
        showToast(
          method === 'phone'
            ? `📲 Code sent to ${countryCode} ${phone}`
            : `📧 Code sent to ${email}`,
          'info'
        );
      } else {
        setError(result.error || 'Failed to send code. Please try again.');
      }
    } finally {
      setIsSending(false);
    }
  };

  // ── Verify OTP ────────────────────────────────────────────────────────────────

  const handleVerifyOtp = async () => {
    if (otp.length < 6) {
      setError('Please enter all 6 digits of the verification code.');
      return;
    }
    setError('');
    setIsVerifying(true);

    try {
      let result;
      if (method === 'phone') {
        const fullPhone = `${countryCode}${phone.replace(/\D/g, '')}`;
        result = await verifyPhoneOtp(fullPhone, otp);
      } else {
        result = await verifyEmailOtp(email, otp);
      }

      if (result.success) {
        // Check if user has a profile
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          setError('Authentication succeeded but user session not found. Please try again.');
          return;
        }

        const { getUserAccountStatus } = await import('@/lib/supabase/profile');
        const status = await getUserAccountStatus(user.id);

        if (initialRole === 'merchant') {
          // Merchant entry flow
          if (!status.hasMerchantAccount) {
            // New merchant -> proceed to shop details onboarding
            onClose();
            if (onOpenOnboarding) {
              onOpenOnboarding();
            }
            return;
          } else {
            // Existing merchant -> switch to merchant dashboard
            await refreshAccountStatus();
            switchPortal('merchant');
            onClose();
            return;
          }
        }

        // Customer entry flow: prompt for profile if new or incomplete
        const hasCompletedProfile = Boolean(
          status.hasCustomerAccount &&
          status.profile?.fullName &&
          status.profile.fullName.trim() !== '' &&
          status.profile.fullName !== 'Shopper'
        );

        if (!hasCompletedProfile) {
          // If customer already filled out the profile form before OTP verification, save it immediately!
          if (fullName.trim()) {
            const rawPhone = phone.replace(/\D/g, '');
            const finalPhone = rawPhone.length >= 10
              ? `${countryCode}${rawPhone.slice(-10)}`
              : (user.phone || '');

            const profile = await upsertProfile(user.id, {
              fullName: fullName.trim(),
              email: email.trim() || user.email || '',
              phone: finalPhone,
              role: 'customer',
            });

            const cleanLocation = city.trim() && !city.toLowerCase().includes('live location')
              ? city.trim()
              : !userLocation.name.toLowerCase().includes('live location')
              ? userLocation.name
              : 'Current Area';

            await upsertCustomerRecord(user.id, {
              mobile: finalPhone,
              defaultLocationName: cleanLocation,
            });

            await refreshAccountStatus();
            switchPortal('customer');
            await finalizeLogin(user, profile);
            showToast(`🎉 Welcome to ShopMitra, ${fullName.trim()}! Your customer profile is ready.`, 'success');
          } else {
            // Customer profile not yet filled -> open profile form with prefilled phone/email
            if (user.email && !email) setEmail(user.email);
            if (user.phone && !phone) setPhone(user.phone.replace(/^\+91/, ''));
            setStep('collect-profile');
            if (!isGpsPinned) handleDetectGps();
          }
        } else {
          // Existing customer with complete profile -> switch to customer portal and load profile
          await refreshAccountStatus();
          switchPortal('customer');
          await finalizeLogin(user, status.profile);
        }
      } else {
        setError(result.error || 'Incorrect code. Please try again.');
        if (result.expired) {
          // Auto-go back to allow resend
          setOtp('');
        }
      }
    } finally {
      setIsVerifying(false);
    }
  };

  // ── Save new profile ──────────────────────────────────────────────────────────

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || fullName.trim().length < 2) {
      setError('Please enter your full name (at least 2 characters).');
      return;
    }

    const rawPhone = phone.replace(/\D/g, '');
    if (!rawPhone || rawPhone.length < 10) {
      setError('Please enter a valid 10-digit mobile phone number.');
      return;
    }

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }

    setError('');
    const fullPhone = `${countryCode}${rawPhone.slice(-10)}`;

    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        // Customer is not logged in yet -> Send OTP to verify phone or email and create account
        setIsSending(true);
        if (verifyVia === 'email') {
          setMethod('email');
          const result = await sendEmailOtp(email.trim());
          if (result.success) {
            setStep('enter-otp');
            setOtp('');
            startResendCountdown();
            showToast(`📧 6-digit verification code sent to ${email.trim()}`, 'info');
          } else {
            setError(result.error || 'Failed to send verification email. Please check your email address.');
          }
        } else {
          setMethod('phone');
          const result = await sendPhoneOtp(fullPhone);
          if (result.success) {
            setStep('enter-otp');
            setOtp('');
            startResendCountdown();
            showToast(`📲 6-digit verification code sent to ${fullPhone}`, 'info');
          } else {
            setError(result.error || 'Failed to send verification code. Please verify your phone number.');
          }
        }
        return;
      }

      // Customer is already authenticated with Supabase -> save profile and activate account
      setIsSavingProfile(true);

      // Upsert profile with name, email, phone
      const profile = await upsertProfile(user.id, {
        fullName: fullName.trim(),
        email: email.trim() || user.email || '',
        phone: fullPhone,
        role: 'customer',
      });

      const cleanLocation = city.trim() && !city.toLowerCase().includes('live location')
        ? city.trim()
        : address.trim() || (!userLocation.name.toLowerCase().includes('live location') ? userLocation.name : 'Current Area');

      // Upsert customer record into Supabase customers table
      await upsertCustomerRecord(user.id, {
        mobile: fullPhone,
        defaultLocationName: cleanLocation,
      });

      await refreshAccountStatus();
      switchPortal('customer');

      // If user was editing their existing profile (already logged in), stay in modal on dashboard
      if (customerUser?.isLoggedIn) {
        loginCustomer({
          name: fullName.trim(),
          mobile: fullPhone,
          email: email.trim() || user.email || '',
          city: city.trim() || userLocation.name.split(',')[0].trim() || '',
          address: address.trim(),
          lat,
          lng,
          supabaseUserId: user.id,
        });
        setStep('logged-in');
        showToast(`✅ Profile updated successfully!`, 'success');
      } else {
        await finalizeLogin(user, profile);
        showToast(`🎉 Welcome to ShopMitra, ${fullName.trim()}! Your profile is ready.`, 'success');
      }
    } finally {
      setIsSending(false);
      setIsSavingProfile(false);
    }
  };

  // ── Finalize login (update AppContext) ────────────────────────────────────────

  const finalizeLogin = async (user: any, profile: any) => {
    loginCustomer({
      name: (profile?.fullName && profile.fullName !== 'Shopper')
        ? profile.fullName
        : (user.user_metadata?.full_name && user.user_metadata.full_name !== 'Shopper')
        ? user.user_metadata.full_name
        : (user.phone || (user.email ? user.email.split('@')[0] : 'Customer')),
      mobile: profile?.phone || user.phone || '',
      email: profile?.email || user.email || '',
      city: city.trim() || userLocation.name.split(',')[0].trim() || '',
      address: address.trim(),
      lat,
      lng,
      supabaseUserId: user.id,
    });
    await refreshAccountStatus();
    onClose();
  };

  // ── GPS detection ─────────────────────────────────────────────────────────────

  const handleDetectGps = async () => {
    setIsLocatingGps(true);
    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          setLat(pos.coords.latitude);
          setLng(pos.coords.longitude);
          setIsGpsPinned(true);
          try {
            const geo = await reverseGeocodeCoordinates(pos.coords.latitude, pos.coords.longitude);
            const detectedLoc = geo.name;
            if (detectedLoc) setCity(detectedLoc);
            showToast(`📍 Exact location detected: ${detectedLoc}!`);
          } catch {}
          setIsLocatingGps(false);
        },
        async () => {
          try {
            const res = await fetch('https://ipwho.is/');
            if (res.ok) {
              const d = await res.json();
              if (d?.success) {
                setLat(d.latitude);
                setLng(d.longitude);
                const locName = `${d.city || ''}, ${d.region_code || d.region || ''}`.replace(/^,\s*|,\s*$/g, '') || d.city || 'Detected Area';
                if (locName) setCity(locName);
                setIsGpsPinned(true);
                showToast(`📍 Located via network: ${locName}!`);
              }
            }
          } catch {}
          setIsLocatingGps(false);
        },
        { enableHighAccuracy: true, timeout: 6000, maximumAge: 30000 }
      );
    } else {
      setIsLocatingGps(false);
    }
  };

  // ── Resend OTP ────────────────────────────────────────────────────────────────

  const handleResend = async () => {
    if (resendCountdown > 0) return;
    setOtp('');
    setError('');
    setIsSending(true);

    try {
      let result;
      if (method === 'phone') {
        const fullPhone = `${countryCode}${phone.replace(/\D/g, '')}`;
        result = await sendPhoneOtp(fullPhone);
      } else {
        result = await sendEmailOtp(email);
      }

      if (result.success) {
        startResendCountdown();
        showToast('📲 New verification code sent!', 'info');
      } else {
        setError(result.error || 'Failed to resend code.');
      }
    } finally {
      setIsSending(false);
    }
  };

  // ── Logout ────────────────────────────────────────────────────────────────────

  const handleLogout = () => {
    logoutCustomer();
    onClose();
  };

  // ── Contact display ───────────────────────────────────────────────────────────

  const maskedContact =
    method === 'phone'
      ? maskPhone(`${countryCode}${phone.replace(/\D/g, '')}`)
      : maskEmail(email);

  // =============================================================================
  // RENDER
  // =============================================================================

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-200 relative animate-in zoom-in-95 duration-150 overflow-hidden max-h-[92vh] flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors z-10 shrink-0"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="overflow-y-auto flex-1">
          {/* ── STATE: Logged In Dashboard ── */}
          {customerUser?.isLoggedIn && step !== 'collect-profile' ? (
            <div className="space-y-6">
              {/* Header & Avatar */}
              <div className="flex items-center space-x-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-600 to-emerald-500 flex items-center justify-center text-white text-xl font-black shadow-md shadow-brand-600/20">
                  {(customerUser.name || 'S').charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center space-x-1.5">
                    <h3 className="text-lg font-black text-slate-900">{customerUser.name}</h3>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded-full flex items-center space-x-0.5">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      <span>Verified</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setFullName(customerUser.name && customerUser.name !== 'Customer' ? customerUser.name : '');
                        setCity(customerUser.city || '');
                        setStep('collect-profile');
                      }}
                      className="text-[11px] font-bold text-brand-600 hover:text-brand-700 underline ml-1 cursor-pointer"
                    >
                      Edit
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 font-semibold flex items-center space-x-1 mt-0.5">
                    {customerUser.mobile && (
                      <>
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{customerUser.mobile}</span>
                      </>
                    )}
                    {customerUser.email && !customerUser.mobile && (
                      <>
                        <Mail className="w-3 h-3 text-slate-400" />
                        <span>{customerUser.email}</span>
                      </>
                    )}
                    {customerUser.city && (
                      <>
                        <span>•</span>
                        <MapPin className="w-3 h-3 text-brand-500" />
                        <span>{customerUser.city}</span>
                      </>
                    )}
                  </p>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => { onClose(); if (onOpenWishlist) onOpenWishlist(); }}
                  className="bg-rose-50 hover:bg-rose-100/80 p-3 rounded-2xl border border-rose-100 text-center transition-colors"
                >
                  <Heart className="w-4 h-4 text-rose-500 mx-auto mb-1 fill-rose-500" />
                  <span className="text-base font-black text-rose-900 block">{wishlist.length}</span>
                  <span className="text-[10px] font-bold text-rose-700">Saved</span>
                </button>
                <button
                  onClick={() => { onClose(); if (onOpenHolds) onOpenHolds(); }}
                  className="bg-emerald-50 hover:bg-emerald-100/80 p-3 rounded-2xl border border-emerald-100 text-center transition-colors"
                >
                  <ShoppingBag className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
                  <span className="text-base font-black text-emerald-900 block">{activeHoldsCount}</span>
                  <span className="text-[10px] font-bold text-emerald-700">Holds</span>
                </button>
                <button
                  onClick={() => { onClose(); if (onOpenAlerts) onOpenAlerts(); }}
                  className="bg-amber-50 hover:bg-amber-100/80 p-3 rounded-2xl border border-amber-100 text-center transition-colors"
                >
                  <Bell className="w-4 h-4 text-amber-600 mx-auto mb-1" />
                  <span className="text-base font-black text-amber-900 block">{priceAlerts.length}</span>
                  <span className="text-[10px] font-bold text-amber-700">Alerts</span>
                </button>
              </div>

              {/* Visited Stores */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-black text-slate-900">
                  <span className="flex items-center gap-1.5">
                    <Store className="w-3.5 h-3.5 text-merchant-600" />
                    <span>Your Contacted & Visited Stores</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-bold">{visitedStores.length} stores</span>
                </div>
                {visitedStores.length === 0 ? (
                  <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl text-center text-slate-400 text-xs">
                    No stores contacted yet. Explore nearby shops to call or chat!
                  </div>
                ) : (
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {visitedStores.map((item) => (
                      <div key={item.shopId} className="p-2.5 bg-slate-50 hover:bg-white rounded-2xl border border-slate-200 transition-all flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <h5 className="text-xs font-bold text-slate-900 truncate">{item.shopName}</h5>
                          <p className="text-[10px] text-slate-500 flex items-center gap-1">
                            <span>{item.type === 'call' ? '📞 Called' : item.type === 'whatsapp' ? '💬 WhatsApp' : item.type === 'direction' ? '🗺️ Directions' : '👁️ Visited'}</span>
                            {item.shopCity && <span>• {item.shopCity}</span>}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {item.shopPhone && (
                            <a href={`tel:${item.shopPhone}`} className="p-1.5 bg-white hover:bg-emerald-50 text-emerald-700 rounded-xl border border-slate-200" title="Call">
                              <Phone className="w-3 h-3" />
                            </a>
                          )}
                          {(item.shopWhatsapp || item.shopPhone) && (
                            <a href={`https://wa.me/91${item.shopWhatsapp || item.shopPhone}`} target="_blank" rel="noreferrer" className="p-1.5 bg-white hover:bg-brand-50 text-brand-700 rounded-xl border border-slate-200" title="WhatsApp">
                              <MessageCircle className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Account Status & Portal Switching */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-600">Your Connected Accounts:</span>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                      hasCustomerAccount
                        ? 'bg-brand-100 text-brand-800 border-brand-200'
                        : 'bg-slate-100 text-slate-400 border-slate-200'
                    }`}>
                      🛍️ Customer: {hasCustomerAccount ? 'Active' : 'None'}
                    </span>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                      (hasMerchantAccount || (registeredShops && registeredShops.length > 0))
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                        : 'bg-slate-100 text-slate-400 border-slate-200'
                    }`}>
                      🏪 Merchant: {(hasMerchantAccount || (registeredShops && registeredShops.length > 0)) ? 'Active' : 'None'}
                    </span>
                  </div>
                </div>

                {/* Context Switcher when merchant account exists */}
                {(hasMerchantAccount || (registeredShops && registeredShops.length > 0)) && (
                  <div className="pt-2 border-t border-slate-200">
                    <span className="text-[11px] font-bold text-slate-500 block mb-1.5">
                      Current View: <strong className="text-slate-900 capitalize">{role} Mode</strong>
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => {
                          switchPortal('customer');
                          onClose();
                        }}
                        className={`py-2 px-3 rounded-xl text-xs font-black border transition-all flex items-center justify-center gap-1.5 ${
                          role === 'customer'
                            ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                            : 'bg-white hover:bg-brand-50 text-slate-700 border-slate-200'
                        }`}
                      >
                        <span>🛍️ Customer View</span>
                      </button>
                      <button
                        onClick={() => {
                          switchPortal('merchant');
                          onClose();
                        }}
                        className={`py-2 px-3 rounded-xl text-xs font-black border transition-all flex items-center justify-center gap-1.5 ${
                          role === 'merchant'
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                            : 'bg-white hover:bg-emerald-50 text-slate-700 border-slate-200'
                        }`}
                      >
                        <span>🏪 Merchant View</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Become a Merchant CTA (when user is customer only) */}
              {!(hasMerchantAccount || (registeredShops && registeredShops.length > 0)) && (
                <div className="p-3.5 bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-200 rounded-2xl flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-black text-emerald-950">
                      <Store className="w-4 h-4 text-emerald-600" />
                      <span>Become a Merchant</span>
                    </div>
                    <p className="text-[11px] text-emerald-800 mt-0.5 leading-relaxed">
                      List your physical store, update counter rates & reach customers.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      onClose();
                      if (onOpenOnboarding) onOpenOnboarding();
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black px-3.5 py-2 rounded-xl shadow-sm whitespace-nowrap shrink-0 transition-colors active:scale-95"
                  >
                    List Shop
                  </button>
                </div>
              )}

              {/* Activate Customer Account CTA (when user is merchant only) */}
              {hasMerchantAccount && !hasCustomerAccount && (
                <div className="p-3.5 bg-gradient-to-r from-brand-50 to-amber-50 border-2 border-brand-200 rounded-2xl flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-black text-brand-950">
                      <ShoppingBag className="w-4 h-4 text-brand-600" />
                      <span>Shop as Customer</span>
                    </div>
                    <p className="text-[11px] text-brand-800 mt-0.5 leading-relaxed">
                      Save favorite items & place counter holds at local stores.
                    </p>
                  </div>
                  <button
                    onClick={async () => {
                      await createCustomerAccountAction({
                        fullName: (customerUser?.name && customerUser.name !== 'Shopper') ? customerUser.name : (customerUser?.mobile || 'Customer'),
                        mobile: customerUser?.mobile || '',
                        defaultLocationName: userLocation.name,
                      });
                      onClose();
                    }}
                    className="bg-brand-600 hover:bg-brand-700 text-white text-xs font-black px-3.5 py-2 rounded-xl shadow-sm whitespace-nowrap shrink-0 transition-colors active:scale-95"
                  >
                    Activate Account
                  </button>
                </div>
              )}

              {/* Perks */}
              <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200 text-xs space-y-2">
                <div className="flex items-center space-x-2 text-slate-700 font-semibold">
                  <Sparkles className="w-4 h-4 text-brand-600 shrink-0" />
                  <span>Zero spam • Direct counter walk-in discounts unlocked</span>
                </div>
                <div className="flex items-center space-x-2 text-slate-700 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Real-time counter prices & stock verified</span>
                </div>
              </div>

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="w-full py-2.5 rounded-xl border border-rose-200 hover:bg-rose-50 text-rose-700 text-xs font-black flex items-center justify-center space-x-1.5 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>

          ) : (
            /* ── Auth Flow ── */
            <div>
              {/* ── STEP: Choose Method ── */}
              {step === 'choose-method' && (
                <div className="space-y-6">
                  <div className="text-center">
                    <div className="w-14 h-14 rounded-2xl bg-brand-50 border border-brand-200 flex items-center justify-center mx-auto mb-4">
                      {initialRole === 'merchant' ? (
                        <Store className="w-7 h-7 text-emerald-600" />
                      ) : (
                        <ShieldCheck className="w-7 h-7 text-brand-600" />
                      )}
                    </div>
                    <h3 className="text-xl font-black text-slate-900">
                      {initialRole === 'merchant' ? 'Merchant Portal' : 'Customer Account'}
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">
                      {initialRole === 'merchant'
                        ? 'Sign in or register your physical shop via OTP'
                        : 'Sign in or create your customer account via OTP'}
                    </p>
                  </div>

                  <div className="space-y-3">
                    <button
                      onClick={() => { setMethod('phone'); setStep('enter-contact'); setError(''); }}
                      className="w-full py-4 px-5 rounded-2xl border-2 border-slate-200 hover:border-brand-400 hover:bg-brand-50 flex items-center space-x-4 transition-all group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 group-hover:bg-emerald-200 transition-colors">
                        <Phone className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <span className="text-sm font-black text-slate-900 block">Continue with Phone</span>
                        <span className="text-xs text-slate-500">Receive OTP via SMS</span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-400 ml-auto group-hover:text-brand-600 transition-colors" />
                    </button>

                    <button
                      onClick={() => { setMethod('email'); setStep('enter-contact'); setError(''); }}
                      className="w-full py-4 px-5 rounded-2xl border-2 border-slate-200 hover:border-brand-400 hover:bg-brand-50 flex items-center space-x-4 transition-all group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 group-hover:bg-blue-200 transition-colors">
                        <Mail className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <span className="text-sm font-black text-slate-900 block">Continue with Email</span>
                        <span className="text-xs text-slate-500">Receive OTP via email</span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-400 ml-auto group-hover:text-brand-600 transition-colors" />
                    </button>
                  </div>

                  {initialRole === 'customer' && (
                    <div className="pt-2 text-center border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => {
                          setStep('collect-profile');
                          setError('');
                          if (!isGpsPinned) handleDetectGps();
                        }}
                        className="text-xs font-bold text-slate-500 hover:text-brand-600 transition-colors"
                      >
                        New customer? <span className="text-brand-600 underline font-black">Create Profile with GPS</span>
                      </button>
                    </div>
                  )}

                  <p className="text-[11px] text-slate-400 text-center">
                    No password required • No spam • Secure OTP verification
                  </p>
                </div>
              )}

              {/* ── STEP: Enter Contact ── */}
              {step === 'enter-contact' && (
                <form onSubmit={handleSendOtp} className="space-y-5">
                  <div className="flex items-center space-x-3">
                    <button
                      type="button"
                      onClick={() => { setStep('choose-method'); setError(''); }}
                      className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div>
                      <h3 className="text-lg font-black text-slate-900">
                        {method === 'phone' ? 'Enter Phone Number' : 'Enter Email Address'}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        We'll send a 6-digit verification code
                      </p>
                    </div>
                  </div>

                  {method === 'phone' ? (
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1.5">
                        Phone Number *
                      </label>
                      <div className="flex items-center space-x-2">
                        <select
                          value={countryCode}
                          onChange={(e) => setCountryCode(e.target.value)}
                          className="text-xs font-black bg-slate-100 border border-slate-200 px-2 py-3 rounded-xl text-slate-700 outline-none focus:border-brand-500 min-w-[72px]"
                        >
                          <option value="+91">🇮🇳 +91</option>
                          <option value="+1">🇺🇸 +1</option>
                          <option value="+44">🇬🇧 +44</option>
                          <option value="+971">🇦🇪 +971</option>
                          <option value="+65">🇸🇬 +65</option>
                          <option value="+60">🇲🇾 +60</option>
                          <option value="+61">🇦🇺 +61</option>
                          <option value="+49">🇩🇪 +49</option>
                          <option value="+33">🇫🇷 +33</option>
                          <option value="+81">🇯🇵 +81</option>
                        </select>
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 12))}
                          placeholder="98765 43210"
                          className="flex-1 text-sm font-bold p-3 rounded-xl border border-slate-200 focus:border-brand-500 outline-none"
                          required
                          autoFocus
                        />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1.5">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your@email.com"
                        className="w-full text-sm font-bold p-3 rounded-xl border border-slate-200 focus:border-brand-500 outline-none"
                        required
                        autoFocus
                      />
                    </div>
                  )}

                  {/* Real-time Account Detection Badge */}
                  {dbDetection && (
                    <div className={`p-2.5 rounded-xl border text-[11px] font-semibold flex items-center space-x-2 animate-in fade-in duration-200 ${
                      dbDetection.exists
                        ? 'bg-blue-50 border-blue-200 text-blue-800'
                        : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    }`}>
                      <ShieldCheck className="w-4 h-4 shrink-0 text-brand-600" />
                      <span>{dbDetection.message}</span>
                    </div>
                  )}

                  {error && (
                    <div className="flex items-start space-x-2 p-3 bg-red-50 rounded-xl border border-red-200">
                      <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                      <p className="text-xs text-red-700 font-medium">{error}</p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSending}
                    className="w-full py-3 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:bg-brand-400 text-white text-sm font-black flex items-center justify-center space-x-2 shadow-md shadow-brand-600/25 transition-all"
                  >
                    {isSending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Sending Code...</span>
                      </>
                    ) : (
                      <>
                        <span>
                          {dbDetection?.exists 
                            ? 'Sign In via Verification Code' 
                            : 'Send Verification Code'}
                        </span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* ── STEP: Enter OTP ── */}
              {step === 'enter-otp' && (
                <div className="space-y-6">
                  <div className="text-center">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto mb-4">
                      {method === 'phone' ? (
                        <Phone className="w-7 h-7 text-emerald-600" />
                      ) : (
                        <Mail className="w-7 h-7 text-emerald-600" />
                      )}
                    </div>
                    <h3 className="text-xl font-black text-slate-900">
                      {method === 'phone' ? 'Enter Verification Code' : 'Check Your Email'}
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">
                      {method === 'phone' ? (
                        <>Code sent to <span className="font-bold text-slate-700">{maskedContact}</span></>
                      ) : (
                        <>Magic link sent to <span className="font-bold text-slate-700">{maskedContact}</span></>
                      )}
                    </p>
                  </div>

                  {method === 'email' && (
                    <div className="bg-blue-50/80 border border-blue-200/80 rounded-2xl p-4 text-center space-y-2">
                      <p className="text-xs text-blue-900 font-bold">
                        👉 Click the &ldquo;Sign in&rdquo; button in the email on this device to log in automatically!
                      </p>
                      <p className="text-[11px] text-blue-600">
                        (If your email contains a 6-digit code instead, you can enter it below)
                      </p>
                    </div>
                  )}

                  <OtpInput
                    value={otp}
                    onChange={setOtp}
                    length={6}
                    disabled={isVerifying}
                    hasError={!!error}
                    autoFocus={method === 'phone'}
                  />

                  {error && (
                    <div className="flex items-start space-x-2 p-3 bg-red-50 rounded-xl border border-red-200">
                      <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                      <p className="text-xs text-red-700 font-medium">{error}</p>
                    </div>
                  )}

                  <button
                    onClick={handleVerifyOtp}
                    disabled={isVerifying || otp.length < 6}
                    className="w-full py-3 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:bg-brand-400 disabled:opacity-60 text-white text-sm font-black flex items-center justify-center space-x-2 shadow-md shadow-brand-600/25 transition-all"
                  >
                    {isVerifying ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Verifying...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Verify & Sign In</span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center justify-between text-xs">
                    <button
                      onClick={() => { setStep('enter-contact'); setOtp(''); setError(''); }}
                      className="text-slate-500 hover:text-slate-900 font-semibold flex items-center space-x-1"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Change {method === 'phone' ? 'phone' : 'email'}</span>
                    </button>

                    {resendCountdown > 0 ? (
                      <span className="text-slate-400 font-semibold">
                        Resend in {resendCountdown}s
                      </span>
                    ) : (
                      <button
                        onClick={handleResend}
                        disabled={isSending}
                        className="text-brand-600 hover:text-brand-800 font-bold flex items-center space-x-1 disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isSending ? 'animate-spin' : ''}`} />
                        <span>Resend Code</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* ── STEP: Collect Profile (New Users & Profile Creation / Profile Edit) ── */}
              {step === 'collect-profile' && (
                <form onSubmit={handleSaveProfile} className="space-y-4">
                  <div className="text-center relative">
                    {/* Back button for logged-in users editing their profile */}
                    {customerUser?.isLoggedIn && (
                      <button
                        type="button"
                        onClick={() => { setStep('logged-in'); setError(''); }}
                        className="absolute left-0 top-0 p-1.5 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors"
                      >
                        <ArrowLeft className="w-4 h-4" />
                      </button>
                    )}
                    <div className="w-14 h-14 rounded-2xl bg-brand-50 border border-brand-200 flex items-center justify-center mx-auto mb-3">
                      <User className="w-7 h-7 text-brand-600" />
                    </div>
                    <h3 className="text-xl font-black text-slate-900">
                      {customerUser?.isLoggedIn ? 'Edit Your Profile' : 'Create Customer Profile'}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {customerUser?.isLoggedIn
                        ? 'Update your name, city and contact details'
                        : 'Enter your details to start exploring live counter rates & walking discounts'}
                    </p>
                  </div>

                  {/* 1. Full Name */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Full Name *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <User className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="e.g. Rahul Sharma"
                        className="w-full text-sm font-bold pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 focus:border-brand-500 outline-none transition-colors"
                        required
                        autoFocus
                      />
                    </div>
                  </div>

                  {/* 2. Phone Number */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Phone Number *
                    </label>
                    <div className="flex items-center space-x-2">
                      <select
                        value={countryCode}
                        onChange={(e) => setCountryCode(e.target.value)}
                        className="text-xs font-black bg-slate-100 border border-slate-200 px-2 py-2.5 rounded-xl text-slate-700 outline-none focus:border-brand-500 min-w-[70px]"
                      >
                        <option value="+91">🇮🇳 +91</option>
                        <option value="+1">🇺🇸 +1</option>
                        <option value="+44">🇬🇧 +44</option>
                        <option value="+971">🇦🇪 +971</option>
                        <option value="+65">🇸🇬 +65</option>
                      </select>
                      <div className="relative flex-1">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                          <Phone className="w-4 h-4" />
                        </div>
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                          placeholder="98765 43210"
                          className="w-full text-sm font-bold pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:border-brand-500 outline-none transition-colors"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* 3. Email Address */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Email Address *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Mail className="w-4 h-4" />
                      </div>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="rahul@example.com"
                        className="w-full text-sm font-bold pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 focus:border-brand-500 outline-none transition-colors"
                        required
                      />
                    </div>
                  </div>

                  {/* Real-time Phone & Email Database Detection Badge */}
                  {dbDetection && (
                    <div className={`p-2.5 rounded-xl border text-[11px] font-semibold flex items-center space-x-2 animate-in fade-in duration-200 ${
                      dbDetection.exists
                        ? 'bg-blue-50 border-blue-200 text-blue-800'
                        : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    }`}>
                      <ShieldCheck className="w-4 h-4 shrink-0 text-brand-600" />
                      <span>{dbDetection.message}</span>
                    </div>
                  )}

                  {/* Option to receive OTP via Phone or Email */}
                  {!authUser && (
                    <div className="space-y-1.5 bg-slate-50/70 p-3 rounded-2xl border border-slate-200/80">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-black text-slate-700">
                          Receive Verification Code Via:
                        </label>
                        <span className="text-[10px] font-bold text-slate-400">Both Options Supported</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 pt-0.5">
                        <button
                          type="button"
                          onClick={() => setVerifyVia('phone')}
                          className={`py-2 px-3 rounded-xl border text-xs font-black flex items-center justify-center space-x-1.5 transition-all ${
                            verifyVia === 'phone'
                              ? 'border-brand-600 bg-white text-brand-700 shadow-sm ring-2 ring-brand-600/20'
                              : 'border-slate-200 bg-white/60 text-slate-600 hover:bg-white'
                          }`}
                        >
                          <Phone className="w-3.5 h-3.5 text-brand-600" />
                          <span>Phone SMS</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setVerifyVia('email')}
                          className={`py-2 px-3 rounded-xl border text-xs font-black flex items-center justify-center space-x-1.5 transition-all ${
                            verifyVia === 'email'
                              ? 'border-brand-600 bg-white text-brand-700 shadow-sm ring-2 ring-brand-600/20'
                              : 'border-slate-200 bg-white/60 text-slate-600 hover:bg-white'
                          }`}
                        >
                          <Mail className="w-3.5 h-3.5 text-brand-600" />
                          <span>Email OTP</span>
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-500 font-medium">
                        {verifyVia === 'phone'
                          ? `📲 6-digit code will be sent to ${countryCode} ${phone || 'your phone number'}`
                          : `📧 6-digit code will be sent to ${email || 'your email address'}`}
                      </p>
                    </div>
                  )}

                  {/* 4. Auto-Detection Location */}
                  <div className="p-3 bg-slate-50 border border-slate-200/90 rounded-2xl space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5">
                        <MapPin className={`w-4 h-4 text-brand-600 ${isLocatingGps ? 'animate-bounce' : ''}`} />
                        <span className="text-xs font-black text-slate-800">Auto Detection Location</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleDetectGps}
                        disabled={isLocatingGps}
                        className="bg-brand-600 hover:bg-brand-700 text-white text-[11px] font-black px-3 py-1.5 rounded-xl transition-all disabled:opacity-50 flex items-center space-x-1 shadow-sm active:scale-95"
                      >
                        <Navigation className={`w-3 h-3 ${isLocatingGps ? 'animate-spin' : ''}`} />
                        <span>{isLocatingGps ? 'Detecting...' : isGpsPinned ? 'Re-detect' : 'Auto-Detect'}</span>
                      </button>
                    </div>

                    {isGpsPinned ? (
                      <div className="text-[11px] text-emerald-800 font-bold flex items-center space-x-1.5 bg-emerald-50 p-2 rounded-xl border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="truncate">
                          📍 Auto-Detected: {city || 'Current Area'} ({lat.toFixed(4)}, {lng.toFixed(4)})
                        </span>
                      </div>
                    ) : isLocatingGps ? (
                      <div className="text-[11px] text-brand-700 font-semibold flex items-center space-x-1.5 bg-brand-50 p-2 rounded-xl border border-brand-200 animate-pulse">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-600" />
                        <span>Auto-detecting your location coordinates...</span>
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-500">
                        📍 Click Auto-Detect to automatically pin your live GPS location for nearest shops.
                      </p>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">
                          City / District
                        </label>
                        <input
                          type="text"
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          placeholder="e.g. Lucknow"
                          className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 focus:border-brand-500 outline-none bg-white"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">
                          Locality / Area
                        </label>
                        <input
                          type="text"
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          placeholder="e.g. Hazratganj"
                          className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 focus:border-brand-500 outline-none bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  {error && (
                    <div className="flex items-start space-x-2 p-3 bg-red-50 rounded-xl border border-red-200">
                      <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                      <p className="text-xs text-red-700 font-medium">{error}</p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSavingProfile || isSending}
                    className="w-full py-3.5 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:bg-brand-400 text-white text-sm font-black flex items-center justify-center space-x-2 shadow-md shadow-brand-600/25 transition-all active:scale-[0.99]"
                  >
                    {isSavingProfile || isSending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>{isSending ? 'Sending Verification Code...' : 'Saving Profile...'}</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>{customerUser?.isLoggedIn ? 'Save Profile' : authUser ? 'Save & Activate Customer Account' : 'Verify & Create Account'}</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  {/* Only show Sign In link for new/unauthenticated users */}
                  {!customerUser?.isLoggedIn && (
                    <div className="pt-2 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          setStep('choose-method');
                          setError('');
                        }}
                        className="text-xs font-bold text-slate-500 hover:text-brand-600 transition-colors"
                      >
                        Already have an account? <span className="text-brand-600 underline">Sign In with OTP</span>
                      </button>
                    </div>
                  )}
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

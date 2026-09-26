// ==============================================================================
// src/components/merchant/MerchantOnboardingModal.tsx
// Merchant Registration — Step 0: OTP Auth, Steps 1-3: Shop Details
// NO passwords. Uses Supabase Auth OTP (Phone or Email) first.
// ==============================================================================

'use client';

import React, { useState, useRef } from 'react';
import { useApp } from '@/components/common/AppContext';
import { becomeMerchantAction } from '@/server/actions/merchant.actions';
import { createClient } from '@/lib/supabase/client';
import { SEED_CATEGORIES } from '@/lib/data/store';
import { reverseGeocodeCoordinates } from '@/lib/geo';
import {
  sendPhoneOtp,
  sendEmailOtp,
  verifyPhoneOtp,
  verifyEmailOtp,
  maskPhone,
  maskEmail,
} from '@/lib/supabase/auth';
import { OtpInput } from '@/components/auth/OtpInput';
import { uploadShopImageAction } from '@/server/actions/upload.actions';
import {
  X,
  Store,
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  Navigation,
  Loader2,
  Camera,
  Upload,
  Phone,
  Mail,
  AlertCircle,
  RefreshCw,
  Lock,
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

type AuthMethod = 'phone' | 'email';
type OtpStep = 'choose-method' | 'enter-contact' | 'enter-otp';

const RESEND_COOLDOWN = 60;
const TOTAL_STEPS = 4; // Step 0 (OTP) + Steps 1, 2, 3

export function MerchantOnboardingModal({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const { 
    userLocation, 
    showToast, 
    registerNewShop, 
    loginCustomer, 
    customerUser, 
    authUser, 
    setRole,
    switchPortal,
    setActiveMerchantShopId,
    refreshAccountStatus,
  } = useApp();
  const isAlreadyLoggedIn = Boolean(customerUser?.isLoggedIn || authUser);

  // ── Step navigation: 0 = OTP auth, 1-3 = shop details ──────────────────────
  const [step, setStep] = useState(0);

  // ── OTP auth state ──────────────────────────────────────────────────────────
  const [otpStep, setOtpStep] = useState<OtpStep>('choose-method');
  const [method, setMethod] = useState<AuthMethod>('phone');
  const [countryCode, setCountryCode] = useState('+91');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [authError, setAuthError] = useState('');
  const [resendCountdown, setResendCountdown] = useState(0);
  const [isOtpVerified, setIsOtpVerified] = useState(false);
  const [supabaseUserId, setSupabaseUserId] = useState('');
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Shop form state ─────────────────────────────────────────────────────────
  const detectedCity = React.useMemo(() => {
    if (!userLocation?.name) return 'Lucknow';
    const first = userLocation.name.split(',')[0].trim();
    return first.replace(/ Market| Central| IT Hub| Shopping Hub/gi, '').trim() || 'Lucknow';
  }, [userLocation?.name]);

  const [form, setForm] = useState({
    ownerName: '',
    businessName: '',
    shopName: '',
    contactPhone: '',
    category: SEED_CATEGORIES[0]?.id || 'electronics',
    address: '',
    landmark: '',
    city: detectedCity,
    lat: userLocation.lat,
    lng: userLocation.lng,
    openingHours: '10:00 AM - 9:00 PM',
    photoUrl: '',
  });

  const [isPinningGps, setIsPinningGps] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);

  // ── Effects ─────────────────────────────────────────────────────────────────
  React.useEffect(() => {
    if (isOpen) {
      if (isAlreadyLoggedIn) {
        setIsOtpVerified(true);
        setSupabaseUserId(authUser?.id || customerUser?.id || '');
        if (customerUser?.mobile) {
          setPhone(customerUser.mobile);
          setMethod('phone');
        } else if (authUser?.email || customerUser?.email) {
          setEmail(authUser?.email || customerUser?.email || '');
          setMethod('email');
        }
        setForm((prev) => ({
          ...prev,
          ownerName: prev.ownerName || (customerUser?.name && customerUser.name !== 'Shopper' ? customerUser.name : ''),
          contactPhone: prev.contactPhone || customerUser?.mobile || phone || '',
          city: prev.city && prev.city !== 'Delhi' ? prev.city : detectedCity,
          lat: userLocation.lat,
          lng: userLocation.lng,
        }));
        setStep((prev) => (prev === 0 ? 1 : prev));
      } else {
        setForm((prev) => ({
          ...prev,
          city: prev.city && prev.city !== 'Delhi' ? prev.city : detectedCity,
          lat: userLocation.lat,
          lng: userLocation.lng,
        }));
      }
    }
  }, [isOpen, isAlreadyLoggedIn, authUser, customerUser, userLocation, detectedCity]);

  React.useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  if (!isOpen) return null;

  // ── Countdown ────────────────────────────────────────────────────────────────
  const startResendCountdown = () => {
    setResendCountdown(RESEND_COOLDOWN);
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setResendCountdown((prev) => {
        if (prev <= 1) { clearInterval(countdownRef.current!); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  // ── Send OTP ─────────────────────────────────────────────────────────────────
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setIsSending(true);
    try {
      let result;
      if (method === 'phone') {
        if (!phone || phone.replace(/\D/g, '').length < 7) {
          setAuthError('Please enter a valid phone number.');
          return;
        }
        result = await sendPhoneOtp(`${countryCode}${phone.replace(/\D/g, '')}`);
      } else {
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          setAuthError('Please enter a valid email address.');
          return;
        }
        result = await sendEmailOtp(email);
      }

      if (result.success) {
        setOtpStep('enter-otp');
        setOtp('');
        startResendCountdown();
        showToast(
          method === 'phone'
            ? `📲 OTP sent to ${countryCode} ${phone}`
            : `📧 OTP sent to ${email}`,
          'info'
        );
      } else {
        setAuthError(result.error || 'Failed to send OTP. Please try again.');
      }
    } finally {
      setIsSending(false);
    }
  };

  // ── Verify OTP ────────────────────────────────────────────────────────────────
  const handleVerifyOtp = async () => {
    if (otp.length < 6) { setAuthError('Please enter all 6 digits.'); return; }
    setAuthError('');
    setIsVerifying(true);
    try {
      let result;
      if (method === 'phone') {
        result = await verifyPhoneOtp(`${countryCode}${phone.replace(/\D/g, '')}`, otp);
      } else {
        result = await verifyEmailOtp(email, otp);
      }

      if (result.success) {
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          setAuthError('Session not found after verification. Please try again.');
          return;
        }

        setSupabaseUserId(user.id);
        setIsOtpVerified(true);

        // Check if user is an existing merchant with a registered store
        const { getMerchantByProfileId, getMerchantShops } = await import('@/lib/supabase/profile');
        const merchantRecord = await getMerchantByProfileId(user.id);
        const shops = await getMerchantShops(user.id);

        if (merchantRecord && shops && shops.length > 0) {
          // Existing merchant — redirect directly to merchant dashboard
          switchPortal('merchant');
          loginCustomer({
            name: merchantRecord.ownerName || 'Merchant',
            mobile: merchantRecord.mobile || phone,
            email: email || user.email || '',
            supabaseUserId: user.id,
          });
          showToast(`👋 Welcome back, ${merchantRecord.ownerName}! Opening your Merchant Dashboard.`);
          if (onSuccess) onSuccess();
          else onClose();
          return;
        }

        // First-time merchant — move to shop setup
        showToast('✅ Phone/Email verified! Now let\'s set up your store.', 'info');
        setStep(1); // Move to merchant info step
      } else {
        setAuthError(result.error || 'Incorrect OTP. Please try again.');
        if (result.expired) setOtp('');
      }
    } finally {
      setIsVerifying(false);
    }
  };

  // ── Resend OTP ────────────────────────────────────────────────────────────────
  const handleResend = async () => {
    if (resendCountdown > 0) return;
    setOtp('');
    setAuthError('');
    setIsSending(true);
    try {
      let result;
      if (method === 'phone') {
        result = await sendPhoneOtp(`${countryCode}${phone.replace(/\D/g, '')}`);
      } else {
        result = await sendEmailOtp(email);
      }
      if (result.success) {
        startResendCountdown();
        showToast('📲 New OTP sent!', 'info');
      } else {
        setAuthError(result.error || 'Failed to resend OTP.');
      }
    } finally {
      setIsSending(false);
    }
  };

  // ── Photo handling (Supabase Storage: Max 5MB, JPEG/PNG/WebP) ───────────────
  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast('Image size exceeds 5 MB limit. Please select a smaller photo.', 'error');
      return;
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      showToast('Invalid format. Allowed formats are JPEG, PNG, and WebP.', 'error');
      return;
    }

    try {
      showToast('Uploading storefront photo...', 'info');
      const formData = new FormData();
      formData.append('file', file);
      const res = await uploadShopImageAction(formData);

      if (!res.success || !res.url) {
        showToast(res.error || 'Failed to upload photo', 'error');
        return;
      }

      setForm((prev) => ({ ...prev, photoUrl: res.url || '' }));
      showToast('📸 Storefront photo uploaded successfully!');
    } catch (err: any) {
      showToast(err.message || 'Error processing photo', 'error');
    }
  };

  // ── GPS Pin ───────────────────────────────────────────────────────────────────
  const handleGpsPin = async () => {
    setIsPinningGps(true);
    showToast('📡 Detecting exact shop counter coordinates...', 'info');
    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          let exactLocation = form.city;
          try {
            const geo = await reverseGeocodeCoordinates(pos.coords.latitude, pos.coords.longitude);
            exactLocation = geo.name;
          } catch {}
          setForm((prev) => ({ ...prev, lat: pos.coords.latitude, lng: pos.coords.longitude, city: exactLocation || prev.city }));
          setIsPinningGps(false);
          showToast(`📍 Pinned at ${exactLocation}!`);
        },
        async () => {
          try {
            const res = await fetch('https://ipwho.is/');
            if (res.ok) {
              const d = await res.json();
              if (d?.success) {
                const locName = `${d.city || ''}, ${d.region_code || d.region || ''}`.replace(/^,\s*|,\s*$/g, '') || d.city;
                setForm((prev) => ({ ...prev, lat: d.latitude, lng: d.longitude, city: locName || prev.city }));
                showToast(`📍 Pinned via network at ${locName || 'local area'}!`);
              }
            }
          } catch {}
          setIsPinningGps(false);
        },
        { enableHighAccuracy: true, timeout: 6000, maximumAge: 30000 }
      );
    } else { setIsPinningGps(false); }
  };

  // ── Final submission ──────────────────────────────────────────────────────────
  const handleFinish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOtpVerified && !isAlreadyLoggedIn) {
      showToast('Please verify your phone/email first.', 'error');
      setStep(0);
      return;
    }
    setIsSubmitting(true);

    try {
      const activeUserId = supabaseUserId || authUser?.id || customerUser?.id || '';
      const rawMobile = form.contactPhone || phone || customerUser?.mobile || '9876543210';
      const cleanMobile = rawMobile.replace(/\D/g, '').slice(-10) || '9876543210';
      const userEmail = email || authUser?.email || customerUser?.email || '';

      // Invoke server-side atomic onboarding via becomeMerchantAction
      // Identity derived server-side or backed by verified activeUserId
      const res = await becomeMerchantAction({
        userId: activeUserId || undefined,
        ownerName: form.ownerName.trim(),
        mobile: cleanMobile,
        businessName: form.businessName.trim() || form.shopName.trim(),
        shopName: form.shopName.trim(),
        phone: cleanMobile,
        address: form.address.trim(),
        landmark: form.landmark?.trim() || undefined,
        city: form.city || 'Delhi',
        lat: form.lat,
        lng: form.lng,
        openingHours: form.openingHours,
        logoUrl: form.photoUrl || undefined,
        photos: form.photoUrl ? [form.photoUrl] : [],
      });

      if (!res.success || !res.shopId) {
        showToast(res.error || 'Failed to complete registration. Please check your details.', 'error');
        setIsSubmitting(false);
        return;
      }

      const registeredShopObj = {
        id: res.shopId,
        businessId: res.businessId || '',
        name: form.shopName,
        slug: res.shopSlug || form.shopName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        phone: cleanMobile,
        whatsapp: cleanMobile,
        address: form.address,
        landmark: form.landmark || '',
        city: form.city,
        lat: form.lat,
        lng: form.lng,
        openingHours: form.openingHours,
        weeklyHolidays: [],
        isOpen: true,
        isVerified: false,
        verificationBadge: 'Verified Store',
        photos: form.photoUrl ? [form.photoUrl] : [],
        rating: 5.0,
        reviewCount: 0,
        isActive: true,
        createdAt: new Date().toISOString(),
      };

      registerNewShop(registeredShopObj);
      setActiveMerchantShopId(registeredShopObj.id);

      // Update local customer/merchant state in AppContext
      loginCustomer({
        name: form.ownerName,
        mobile: cleanMobile,
        email: userEmail,
        city: form.city,
        address: form.address,
        lat: form.lat,
        lng: form.lng,
        supabaseUserId: activeUserId,
      });

      switchPortal('merchant');

      // Refresh multi-account capability status (merchants table presence)
      await refreshAccountStatus();

      showToast('🎉 Store registered in database! Welcome to ShopMitra Merchant Portal.');
      if (onSuccess) onSuccess();
      else onClose();
    } catch (err: any) {
      showToast(err.message || 'Network error while registering shop', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Step display label ────────────────────────────────────────────────────────
  const stepLabel = step === 0
    ? 'Verify Identity'
    : step === 1 ? 'Owner & Business Info'
    : step === 2 ? 'Store & GPS Location'
    : 'Hours & Photos';

  const maskedContact = method === 'phone'
    ? maskPhone(`${countryCode}${phone.replace(/\D/g, '')}`)
    : maskEmail(email);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
    >
      <div className="bg-white rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl border border-slate-100 max-h-[92vh] flex flex-col my-auto">
        {/* Header & Progress */}
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-merchant-100 text-merchant-600 rounded-2xl">
                <Store className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Merchant Registration</h3>
                <p className="text-xs text-slate-500">
                  Step {step + 1} of {TOTAL_STEPS}: {stepLabel}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="w-full bg-slate-200 h-1.5 rounded-full mt-4 overflow-hidden">
            <div
              className="bg-merchant-600 h-full transition-all duration-300"
              style={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">

          {/* ── STEP 0: OTP Verification ── */}
          {step === 0 && (
            <div>
              {/* Choose Method */}
              {otpStep === 'choose-method' && (
                <div className="space-y-5">
                  <div className="text-center">
                    <div className="w-14 h-14 rounded-2xl bg-merchant-50 border border-merchant-200 flex items-center justify-center mx-auto mb-3">
                      <ShieldCheck className="w-7 h-7 text-merchant-600" />
                    </div>
                    <h4 className="text-lg font-black text-slate-900">Verify Your Identity</h4>
                    <p className="text-xs text-slate-500 mt-1">We'll send a one-time verification code</p>
                  </div>

                  <div className="space-y-3">
                    <button
                      onClick={() => { setMethod('phone'); setOtpStep('enter-contact'); setAuthError(''); }}
                      className="w-full py-4 px-5 rounded-2xl border-2 border-slate-200 hover:border-merchant-400 hover:bg-merchant-50 flex items-center space-x-4 transition-all group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                        <Phone className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <span className="text-sm font-black text-slate-900 block">Continue with Phone</span>
                        <span className="text-xs text-slate-500">OTP via SMS</span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-400 ml-auto" />
                    </button>

                    <button
                      onClick={() => { setMethod('email'); setOtpStep('enter-contact'); setAuthError(''); }}
                      className="w-full py-4 px-5 rounded-2xl border-2 border-slate-200 hover:border-merchant-400 hover:bg-merchant-50 flex items-center space-x-4 transition-all group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                        <Mail className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <span className="text-sm font-black text-slate-900 block">Continue with Email</span>
                        <span className="text-xs text-slate-500">OTP via email</span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-400 ml-auto" />
                    </button>
                  </div>

                  <div className="bg-merchant-50 p-4 rounded-2xl border border-merchant-200/80 text-xs text-merchant-900 flex items-start space-x-2">
                    <Lock className="w-4 h-4 text-merchant-600 shrink-0 mt-0.5" />
                    <p>OTP verification confirms your identity. Your business verification (for the verified badge) is a separate process done by our team.</p>
                  </div>
                </div>
              )}

              {/* Enter Contact */}
              {otpStep === 'enter-contact' && (
                <form onSubmit={handleSendOtp} className="space-y-5">
                  <div className="flex items-center space-x-3">
                    <button type="button" onClick={() => { setOtpStep('choose-method'); setAuthError(''); }} className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500">
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div>
                      <h4 className="text-base font-black text-slate-900">
                        {method === 'phone' ? 'Enter Phone Number' : 'Enter Email Address'}
                      </h4>
                      <p className="text-xs text-slate-500">6-digit verification code will be sent</p>
                    </div>
                  </div>

                  {method === 'phone' ? (
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1.5">Phone Number *</label>
                      <div className="flex space-x-2">
                        <select
                          value={countryCode}
                          onChange={(e) => setCountryCode(e.target.value)}
                          className="text-xs font-black bg-slate-100 border border-slate-200 px-2 py-3 rounded-xl text-slate-700 outline-none focus:border-merchant-500 min-w-[72px]"
                        >
                          <option value="+91">🇮🇳 +91</option>
                          <option value="+1">🇺🇸 +1</option>
                          <option value="+44">🇬🇧 +44</option>
                          <option value="+971">🇦🇪 +971</option>
                          <option value="+65">🇸🇬 +65</option>
                          <option value="+60">🇲🇾 +60</option>
                          <option value="+61">🇦🇺 +61</option>
                        </select>
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 12))}
                          placeholder="98765 43210"
                          className="flex-1 text-sm font-bold p-3 rounded-xl border border-slate-200 focus:border-merchant-500 outline-none"
                          required
                          autoFocus
                        />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1.5">Email Address *</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your@business.com"
                        className="w-full text-sm font-bold p-3 rounded-xl border border-slate-200 focus:border-merchant-500 outline-none"
                        required
                        autoFocus
                      />
                    </div>
                  )}

                  {authError && (
                    <div className="flex items-start space-x-2 p-3 bg-red-50 rounded-xl border border-red-200">
                      <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                      <p className="text-xs text-red-700 font-medium">{authError}</p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSending}
                    className="w-full py-3 rounded-xl bg-merchant-600 hover:bg-merchant-700 disabled:bg-merchant-400 text-white text-sm font-black flex items-center justify-center space-x-2 transition-all"
                  >
                    {isSending ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /><span>Sending OTP...</span></>
                    ) : (
                      <><span>Send Verification Code</span><ArrowRight className="w-4 h-4" /></>
                    )}
                  </button>
                </form>
              )}

              {/* Enter OTP */}
              {otpStep === 'enter-otp' && (
                <div className="space-y-6">
                  <div className="text-center">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto mb-3">
                      <ShieldCheck className="w-7 h-7 text-emerald-600" />
                    </div>
                    <h4 className="text-base font-black text-slate-900">
                      {method === 'phone' ? 'Enter Verification Code' : 'Check Your Email'}
                    </h4>
                    <p className="text-xs text-slate-500 mt-1">
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
                    hasError={!!authError}
                  />

                  {authError && (
                    <div className="flex items-start space-x-2 p-3 bg-red-50 rounded-xl border border-red-200">
                      <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                      <p className="text-xs text-red-700 font-medium">{authError}</p>
                    </div>
                  )}

                  <button
                    onClick={handleVerifyOtp}
                    disabled={isVerifying || otp.length < 6}
                    className="w-full py-3 rounded-xl bg-merchant-600 hover:bg-merchant-700 disabled:opacity-60 text-white text-sm font-black flex items-center justify-center space-x-2 transition-all"
                  >
                    {isVerifying ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /><span>Verifying...</span></>
                    ) : (
                      <><CheckCircle2 className="w-4 h-4" /><span>Verify & Continue</span></>
                    )}
                  </button>

                  <div className="flex items-center justify-between text-xs">
                    <button
                      onClick={() => { setOtpStep('enter-contact'); setOtp(''); setAuthError(''); }}
                      className="text-slate-500 hover:text-slate-900 font-semibold flex items-center space-x-1"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Change {method === 'phone' ? 'phone' : 'email'}</span>
                    </button>
                    {resendCountdown > 0 ? (
                      <span className="text-slate-400 font-semibold">Resend in {resendCountdown}s</span>
                    ) : (
                      <button
                        onClick={handleResend}
                        disabled={isSending}
                        className="text-merchant-600 hover:text-merchant-800 font-bold flex items-center space-x-1 disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isSending ? 'animate-spin' : ''}`} />
                        <span>Resend OTP</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 1: Owner & Business Info ── */}
          {step === 1 && (
            <div className="space-y-4">
              {isOtpVerified && (
                <div className="flex items-center space-x-2 text-xs font-bold text-emerald-800 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{method === 'phone' ? `Phone ${maskPhone(`${countryCode}${phone.replace(/\D/g, '')}`)}` : `Email ${maskEmail(email)}`} verified ✓</span>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Owner Full Name *</label>
                <input
                  type="text"
                  value={form.ownerName}
                  onChange={(e) => setForm({ ...form, ownerName: e.target.value })}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full text-xs font-bold p-3 rounded-xl border border-slate-200 focus:border-merchant-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Legal Business Name *</label>
                <input
                  type="text"
                  value={form.businessName}
                  onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                  placeholder="e.g. Ramesh Enterprises Pvt Ltd"
                  className="w-full text-xs font-bold p-3 rounded-xl border border-slate-200 focus:border-merchant-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Shop Contact / WhatsApp Number *</label>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-black bg-slate-100 border border-slate-200 px-3 py-3 rounded-xl text-slate-700">
                    🇮🇳 +91
                  </span>
                  <input
                    type="tel"
                    value={form.contactPhone}
                    onChange={(e) => setForm({ ...form, contactPhone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                    placeholder="9876543210"
                    className="flex-1 text-xs font-bold p-3 rounded-xl border border-slate-200 focus:border-merchant-500 outline-none"
                    required
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Customers in your area will use this 10-digit number to call or WhatsApp your shop counter.
                </p>
              </div>

              <div className="bg-merchant-50 p-4 rounded-2xl border border-merchant-200/80 text-xs text-merchant-900 flex items-start space-x-2">
                <ShieldCheck className="w-4 h-4 text-merchant-600 shrink-0 mt-0.5" />
                <p>Zero platform commissions. Walk-in customers in your neighbourhood will call or WhatsApp your shop counter directly.</p>
              </div>
            </div>
          )}

          {/* ── STEP 2: Store & GPS ── */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Shop / Outlet Name *</label>
                <input
                  type="text"
                  value={form.shopName}
                  onChange={(e) => setForm({ ...form, shopName: e.target.value })}
                  placeholder="e.g. Krishna Mobile & Electronics"
                  className="w-full text-xs font-bold p-3 rounded-xl border border-slate-200 focus:border-merchant-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Primary Business Category *</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full text-xs font-bold p-3 rounded-xl border border-slate-200 focus:border-merchant-500 outline-none bg-white"
                >
                  {SEED_CATEGORIES.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">City / District *</label>
                  <input
                    type="text"
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    placeholder="e.g. Lucknow, Kanpur"
                    className="w-full text-xs font-bold p-3 rounded-xl border border-slate-200 focus:border-merchant-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Landmark / Area</label>
                  <input
                    type="text"
                    value={form.landmark}
                    onChange={(e) => setForm({ ...form, landmark: e.target.value })}
                    placeholder="e.g. Hazratganj / Metro Gate"
                    className="w-full text-xs font-bold p-3 rounded-xl border border-slate-200 focus:border-merchant-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Full Shop Address *</label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="e.g. Shop 12, Main Market Road"
                  className="w-full text-xs font-bold p-3 rounded-xl border border-slate-200 focus:border-merchant-500 outline-none"
                  required
                />
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-xs font-black text-slate-900 block">GPS Store Counter Pin</span>
                  <span className="text-[11px] text-slate-400 font-semibold">
                    Lat: {form.lat.toFixed(4)}, Lng: {form.lng.toFixed(4)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleGpsPin}
                  disabled={isPinningGps}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold px-3.5 py-1.5 rounded-xl flex items-center space-x-1.5 transition-colors disabled:opacity-50"
                >
                  <Navigation className={`w-3.5 h-3.5 text-merchant-600 ${isPinningGps ? 'animate-spin' : ''}`} />
                  <span>{isPinningGps ? 'Detecting...' : 'Pin Current Counter'}</span>
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 3: Hours & Photos ── */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Daily Operating Hours</label>
                <input
                  type="text"
                  value={form.openingHours}
                  onChange={(e) => setForm({ ...form, openingHours: e.target.value })}
                  placeholder="e.g. 10:00 AM - 9:30 PM"
                  className="w-full text-xs font-bold p-3 rounded-xl border border-slate-200 focus:border-merchant-500 outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-merchant-600" />
                    <span>Storefront Photo (दुकान की फोटो)</span>
                  </label>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    ✏️ Editable anytime later
                  </span>
                </div>

                <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handlePhotoSelect} className="hidden" />
                <input ref={galleryInputRef} type="file" accept="image/*" onChange={handlePhotoSelect} className="hidden" />

                {!form.photoUrl ? (
                  <div className="border-2 border-dashed border-slate-200 hover:border-merchant-400 rounded-2xl p-5 bg-slate-50/70 text-center space-y-3 transition-colors">
                    <div className="w-12 h-12 rounded-2xl bg-merchant-50 border border-merchant-200 text-merchant-600 flex items-center justify-center mx-auto">
                      <Camera className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-800">Add Storefront Photo</h4>
                      <p className="text-[11px] text-slate-500 max-w-xs mx-auto mt-0.5">
                        Capture your shop entrance & signboard so nearby customers recognize your shop.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                      <button type="button" onClick={() => cameraInputRef.current?.click()} className="px-4 py-2.5 bg-merchant-600 hover:bg-merchant-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition-all active:scale-95">
                        <Camera className="w-3.5 h-3.5" /><span>Take Photo</span>
                      </button>
                      <button type="button" onClick={() => galleryInputRef.current?.click()} className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95">
                        <Upload className="w-3.5 h-3.5 text-merchant-600" /><span>Upload from Gallery</span>
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-400">(Optional — You can add or change this anytime later)</p>
                    <div className="pt-2 border-t border-slate-200/60 flex items-center justify-center gap-2 text-[11px] text-slate-500">
                      <span>Prefer pasting a link?</span>
                      <button type="button" onClick={() => setShowUrlInput(!showUrlInput)} className="text-merchant-600 font-bold hover:underline">
                        {showUrlInput ? 'Hide' : 'Paste image URL'}
                      </button>
                    </div>
                    {showUrlInput && (
                      <input
                        type="text"
                        value={form.photoUrl}
                        onChange={(e) => setForm({ ...form, photoUrl: e.target.value })}
                        placeholder="https://..."
                        className="w-full text-xs font-medium p-2.5 rounded-xl border border-slate-200 focus:border-merchant-500 outline-none bg-white mt-2"
                      />
                    )}
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-2xl p-3 bg-slate-50 flex items-center gap-3">
                    <div className="w-20 h-20 rounded-xl overflow-hidden bg-slate-200 shrink-0 border border-slate-300">
                      <img src={form.photoUrl} alt="Storefront Preview" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 text-emerald-600 text-xs font-bold mb-1">
                        <CheckCircle2 className="w-4 h-4 shrink-0" /><span>Photo Attached</span>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <button type="button" onClick={() => cameraInputRef.current?.click()} className="text-xs font-bold text-merchant-600 hover:underline flex items-center gap-1">
                          <Camera className="w-3 h-3" /><span>Retake</span>
                        </button>
                        <span className="text-slate-300">•</span>
                        <button type="button" onClick={() => galleryInputRef.current?.click()} className="text-xs font-bold text-slate-600 hover:underline flex items-center gap-1">
                          <Upload className="w-3 h-3" /><span>Gallery</span>
                        </button>
                        <span className="text-slate-300">•</span>
                        <button type="button" onClick={() => setForm((prev) => ({ ...prev, photoUrl: '' }))} className="text-xs font-bold text-rose-500 hover:underline">
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-200 text-xs text-emerald-900">
                <div className="flex items-center space-x-2 font-black mb-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /><span>Ready to Go Live!</span>
                </div>
                <p className="text-emerald-700 font-medium">
                  Your store will be instantly discoverable on the nearby map. Verification badge will be issued after our team reviews your business.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="p-4 px-6 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          {step > 0 && !(isAlreadyLoggedIn && step === 1) ? (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center space-x-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" /><span>Back</span>
            </button>
          ) : <div />}

          {step === 0 ? (
            // On step 0, navigation is handled inside the OTP flow
            <div />
          ) : step < 3 ? (
            <button
              type="button"
              onClick={() => {
                if (step === 1) {
                  if (!form.ownerName.trim()) { showToast('Please enter owner name', 'error'); return; }
                  const digits = form.contactPhone.replace(/\D/g, '');
                  if (!digits || digits.length < 10) { showToast('Please enter a valid 10-digit shop mobile number', 'error'); return; }
                }
                if (step === 2 && !form.shopName.trim()) { showToast('Please enter shop name', 'error'); return; }
                if (step === 2 && !form.address.trim()) { showToast('Please enter shop address', 'error'); return; }
                setStep(step + 1);
              }}
              className="bg-merchant-600 hover:bg-merchant-700 text-white text-xs font-black px-5 py-2.5 rounded-xl flex items-center space-x-1.5 shadow-sm transition-all"
            >
              <span>Continue</span><ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinish}
              disabled={isSubmitting}
              className="bg-brand-600 hover:bg-brand-700 text-white text-xs font-black px-6 py-2.5 rounded-xl flex items-center space-x-1.5 shadow-md shadow-brand-600/25 transition-all disabled:opacity-60"
            >
              {isSubmitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /><span>Activating Store...</span></>
              ) : (
                <><span>Activate Store & Open Dashboard</span><CheckCircle2 className="w-4 h-4" /></>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

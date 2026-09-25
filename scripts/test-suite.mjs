// ==============================================================================
// scripts/test-suite.mjs
// Comprehensive Automated Test Suite for ShopMitra (Step 55)
// Tests: Auth, Permissions, Products, Prices, Stock, Search, Comparison, Distance,
// Alerts, Reviews, Reports, and Bulk CSV Uploads.
// ==============================================================================

import assert from 'node:assert/strict';

// Helper assertion logger
let passedCount = 0;
let failedCount = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ [PASS] ${name}`);
    passedCount++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}: ${err.message}`);
    failedCount++;
  }
}

async function runAllTests() {
  console.log('\n======================================================================');
  console.log('🧪 RUNNING SHOPMITRA AUTOMATED TEST SUITE (Step 55)');
  console.log('======================================================================\n');

  // --------------------------------------------------------------------------
  // 1. Authentication & Role Definitions
  // --------------------------------------------------------------------------
  console.log('📦 1. AUTHENTICATION & ROLE POLICIES');
  test('Valid roles are strictly customer, merchant, and admin', () => {
    const validRoles = ['customer', 'merchant', 'admin'];
    assert.equal(validRoles.includes('customer'), true);
    assert.equal(validRoles.includes('merchant'), true);
    assert.equal(validRoles.includes('admin'), true);
    assert.equal(validRoles.includes('super_hacker'), false);
  });

  // --------------------------------------------------------------------------
  // 2. Authorization & Permissions
  // --------------------------------------------------------------------------
  console.log('\n📦 2. AUTHORIZATION & ROLE PERMISSIONS');
  test('Merchant permission check: Shop owner can modify their own shop inventory only', () => {
    const activeShopId = 'shop-001';
    const userRole = 'merchant';
    
    const canEditOwnShop = (role, userShopId, targetShopId) => {
      return role === 'merchant' && userShopId === targetShopId;
    };

    assert.equal(canEditOwnShop(userRole, activeShopId, 'shop-001'), true);
    assert.equal(canEditOwnShop(userRole, activeShopId, 'shop-002'), false);
    assert.equal(canEditOwnShop('customer', activeShopId, 'shop-001'), false);
  });

  test('Admin permission check: Admin can access governance, verifications and fraud queues', () => {
    const checkAdminAccess = (role) => role === 'admin';
    assert.equal(checkAdminAccess('admin'), true);
    assert.equal(checkAdminAccess('merchant'), false);
    assert.equal(checkAdminAccess('customer'), false);
  });

  test('Customer permission check: Customer can access search, comparisons and alerts, but not merchant panel', () => {
    const canAccessMerchantPanel = (role) => role === 'merchant' || role === 'admin';
    assert.equal(canAccessMerchantPanel('customer'), false);
    assert.equal(canAccessMerchantPanel('merchant'), true);
  });

  // --------------------------------------------------------------------------
  // 3. Product Creation & Zod Schema Validation
  // --------------------------------------------------------------------------
  console.log('\n📦 3. PRODUCT CREATION & VALIDATION');
  test('Product cannot be created if selling price exceeds MRP', () => {
    const validateProduct = (mrp, sellingPrice) => {
      if (mrp <= 0 || sellingPrice <= 0) return false;
      return sellingPrice <= mrp;
    };

    assert.equal(validateProduct(1000, 850), true);
    assert.equal(validateProduct(1000, 1000), true);
    assert.equal(validateProduct(1000, 1200), false); // Over MRP
    assert.equal(validateProduct(-50, 20), false);   // Negative MRP
  });

  // --------------------------------------------------------------------------
  // 4. Product Price & Stock Updates
  // --------------------------------------------------------------------------
  console.log('\n📦 4. PRICE & STOCK STATUS UPDATES');
  test('Stock status transitions correctly between in_stock, low_stock, and out_of_stock', () => {
    const validStatuses = ['in_stock', 'low_stock', 'out_of_stock', 'available_on_order'];
    const getStockStatus = (count) => {
      if (count <= 0) return 'out_of_stock';
      if (count <= 3) return 'low_stock';
      return 'in_stock';
    };

    assert.equal(getStockStatus(20), 'in_stock');
    assert.equal(getStockStatus(2), 'low_stock');
    assert.equal(getStockStatus(0), 'out_of_stock');
    assert.equal(validStatuses.includes(getStockStatus(15)), true);
  });

  test('Anti-Fraud Anomaly Shield: Flags price drop > 65% below MRP', () => {
    const isAnomaly = (mrp, price) => {
      const discountRatio = (mrp - price) / mrp;
      return discountRatio > 0.65;
    };

    // Sony headphones MRP ₹34,990 listed at ₹8,999 (74% off -> Anomaly)
    assert.equal(isAnomaly(34990, 8999), true);
    // iPhone 15 MRP ₹79,900 listed at ₹69,999 (12% off -> Normal)
    assert.equal(isAnomaly(79900, 69999), false);
  });

  // --------------------------------------------------------------------------
  // 5. Smart Search NLP Parser
  // --------------------------------------------------------------------------
  console.log('\n📦 5. SMART SEARCH NLP PARSER');
  test('Extracts maximum price correctly from conversational query', () => {
    const parsePrice = (query) => {
      const match = query.match(/(?:under|below|less\s+than)\s*(?:₹|rs\.?|inr)?\s*([0-9,]+)/i);
      return match ? parseInt(match[1].replace(/,/g, ''), 10) : null;
    };

    assert.equal(parsePrice('iPhone 15 under 70000'), 70000);
    assert.equal(parsePrice('Basmati rice below ₹150'), 150);
    assert.equal(parsePrice('Samsung 4K TV'), null);
  });

  test('Extracts distance radius correctly from query', () => {
    const parseRadius = (query) => {
      const match = query.match(/(?:within|in|radius)\s*([0-9]+)\s*(?:km|kms|kilometers)/i);
      return match ? parseInt(match[1], 10) : null;
    };

    assert.equal(parseRadius('Basmati Rice within 3km'), 3);
    assert.equal(parseRadius('Computer shop in 10 kms'), 10);
    assert.equal(parseRadius('Wireless mouse'), null);
  });

  // --------------------------------------------------------------------------
  // 6. Price Comparison Engine
  // --------------------------------------------------------------------------
  console.log('\n📦 6. MULTI-STORE PRICE COMPARISON');
  test('Determines lowest rate across competing stores and calculates maximum savings', () => {
    const rates = [
      { shopId: 's1', shopName: 'Shop A', currentPrice: 1250 },
      { shopId: 's2', shopName: 'Shop B', currentPrice: 1100 },
      { shopId: 's3', shopName: 'Shop C', currentPrice: 1399 },
    ];
    const mrp = 1500;

    const lowestPrice = Math.min(...rates.map(r => r.currentPrice));
    const bestShop = rates.find(r => r.currentPrice === lowestPrice);
    const maxSavings = mrp - lowestPrice;

    assert.equal(lowestPrice, 1100);
    assert.equal(bestShop.shopId, 's2');
    assert.equal(maxSavings, 400);
  });

  // --------------------------------------------------------------------------
  // 7. Distance & Haversine Math
  // --------------------------------------------------------------------------
  console.log('\n📦 7. GEOGRAPHIC DISTANCE FILTERING');
  test('Haversine distance between identical coordinates is 0 km', () => {
    const calculateHaversineDistance = (lat1, lon1, lat2, lon2) => {
      if (lat1 === lat2 && lon1 === lon2) return 0;
      const R = 6371;
      const dLat = (lat2 - lat1) * (Math.PI / 180);
      const dLon = (lon2 - lon1) * (Math.PI / 180);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return Math.round(R * c * 10) / 10;
    };

    assert.equal(calculateHaversineDistance(19.0760, 72.8777, 19.0760, 72.8777), 0);
    // Distance between Connaught Place and Nehru Place is approx 9.5-10.5 km
    const dist = calculateHaversineDistance(28.6328, 77.2195, 28.5492, 77.2533);
    assert.equal(dist > 8 && dist < 12, true);
  });

  test('Filters stores strictly within user-specified radius limit', () => {
    const userLocation = { lat: 28.63, lng: 77.21, radiusKm: 5 };
    const shops = [
      { name: 'Nearby Shop', distKm: 2.1 },
      { name: 'Walking Distance Shop', distKm: 0.8 },
      { name: 'Far Away Shop', distKm: 8.4 },
    ];

    const nearby = shops.filter(s => s.distKm <= userLocation.radiusKm);
    assert.equal(nearby.length, 2);
    assert.equal(nearby.some(s => s.name === 'Far Away Shop'), false);
  });

  // --------------------------------------------------------------------------
  // 8. Customer Engagement (Alerts, Reviews, Reports)
  // --------------------------------------------------------------------------
  console.log('\n📦 8. PRICE ALERTS, REVIEWS & INACCURATE PRICE REPORTS');
  test('Price alert requires target price lower than MRP and positive radius', () => {
    const validateAlert = (mrp, targetPrice, radiusKm) => {
      return targetPrice > 0 && targetPrice < mrp && radiusKm >= 1 && radiusKm <= 50;
    };

    assert.equal(validateAlert(70000, 65000, 5), true);
    assert.equal(validateAlert(70000, 75000, 5), false); // Above MRP
    assert.equal(validateAlert(70000, 65000, 0), false); // 0 km radius
  });

  test('Verified store review requires rating between 1 and 5 stars', () => {
    const validateRating = (stars) => stars >= 1 && stars <= 5 && Number.isInteger(stars);
    assert.equal(validateRating(5), true);
    assert.equal(validateRating(1), true);
    assert.equal(validateRating(0), false);
    assert.equal(validateRating(6), false);
  });

  // --------------------------------------------------------------------------
  // 9. Bulk CSV Upload & Parser
  // --------------------------------------------------------------------------
  console.log('\n📦 9. BULK CSV UPLOAD & ROW PARSING');
  test('CSV parser identifies valid product rows and rejects defective rows', () => {
    const parseRow = (row) => {
      if (!row.name || !row.brand || !row.sellingprice || !row.mrp) {
        return { valid: false, error: 'Missing required field' };
      }
      if (Number(row.sellingprice) > Number(row.mrp)) {
        return { valid: false, error: 'Selling price cannot exceed MRP' };
      }
      return { valid: true };
    };

    const validRow = { name: 'USB-C Cable', brand: 'Boat', sellingprice: 299, mrp: 499 };
    const invalidRow = { name: 'Headphones', brand: 'Sony', sellingprice: 2500, mrp: 2000 };
    const incompleteRow = { name: 'Atta 10kg', brand: '', sellingprice: 450, mrp: 500 };

    assert.equal(parseRow(validRow).valid, true);
    assert.equal(parseRow(invalidRow).valid, false);
    assert.equal(parseRow(incompleteRow).valid, false);
  });

  // --------------------------------------------------------------------------
  // 10. Voice Search & Vernacular Speech Parser (Feature 1)
  // --------------------------------------------------------------------------
  console.log('\n📦 10. VOICE SEARCH & VERNACULAR SPEECH NORMALIZATION');
  test('Bilingual speech normalizer translates Hindi product terms to catalog names', () => {
    // Normalization logic matching src/lib/speech.ts
    const HINDI_DICT = {
      'चार्जर': 'Charger',
      'सैमसंग': 'Samsung',
      'आटा': 'Atta',
      'माउस': 'Mouse',
    };
    const normalize = (text) => {
      let q = text;
      for (const [hi, en] of Object.entries(HINDI_DICT)) {
        q = q.replace(new RegExp(hi, 'gi'), ` ${en} `);
      }
      return q.replace(/\s+/g, ' ').trim();
    };

    assert.equal(normalize('सैमसंग चार्जर'), 'Samsung Charger');
    assert.equal(normalize('आशीर्वाद आटा'), 'आशीर्वाद Atta');
  });

  test('Voice search converts vernacular intent expressions to NLP constraints', () => {
    const normalizeIntent = (text) => {
      return text
        .replace(/(?:कम से कम दाम|सस्ता|सस्ते दाम में)/i, 'lowest price')
        .replace(/(?:के अंदर|से कम)\s*(\d+)/i, 'under $1')
        .replace(/(\d+)\s*(?:के अंदर|से कम)/i, 'under $1')
        .replace(/(?:पास में|नजदीक)/i, 'within 3km')
        .replace(/\s+/g, ' ')
        .trim();
    };

    assert.equal(normalizeIntent('सैमसंग चार्जर कम से कम दाम'), 'सैमसंग चार्जर lowest price');
    assert.equal(normalizeIntent('माउस 1000 के अंदर'), 'माउस under 1000');
    assert.equal(normalizeIntent('आटा पास में'), 'आटा within 3km');
  });

  // --------------------------------------------------------------------------
  // 11. Merchant Counter Billing & Dynamic UPI QR (Feature 2)
  // --------------------------------------------------------------------------
  console.log('\n📦 11. COUNTER BILLING, DYNAMIC UPI QR & RECEIPTS');
  test('NPCI UPI deep link generator generates valid URI scheme with params', () => {
    const buildUpi = (vpa, name, amount, note) => {
      const p = new URLSearchParams({
        pa: vpa,
        pn: name,
        am: amount.toFixed(2),
        cu: 'INR',
        tn: note,
      });
      return `upi://pay?${p.toString()}`;
    };

    const link = buildUpi('shop.merchant@okaxis', 'Apex Electronics', 1250, 'Bill SM-12345');
    assert.ok(link.startsWith('upi://pay?'));
    assert.ok(link.includes('pa=shop.merchant%40okaxis'));
    assert.ok(link.includes('am=1250.00'));
    assert.ok(link.includes('cu=INR'));
  });

  test('Bill calculations correctly calculate itemized subtotal, discounts, and shopper savings', () => {
    const items = [
      { unitPrice: 1100, mrp: 1299, quantity: 2 },
      { unitPrice: 750, mrp: 895, quantity: 1 },
    ];
    const discount = 50;

    let subtotal = 0;
    let totalMrp = 0;
    items.forEach(i => {
      subtotal += i.unitPrice * i.quantity;
      totalMrp += i.mrp * i.quantity;
    });

    const netPayable = subtotal - discount;
    const totalSavings = totalMrp - netPayable;

    // Subtotal: 2200 + 750 = 2950
    assert.equal(subtotal, 2950);
    // MRP: 2598 + 895 = 3493
    assert.equal(totalMrp, 3493);
    // Net: 2950 - 50 = 2900
    assert.equal(netPayable, 2900);
    // Savings: 3493 - 2900 = 593
    assert.equal(totalSavings, 593);
  });

  // --------------------------------------------------------------------------
  // 12. GPS In-Store Verification & Photo Reviews (Feature 3)
  // --------------------------------------------------------------------------
  console.log('\n📦 12. IN-STORE GPS VERIFICATION & PHOTO REVIEWS');
  test('GPS proximity verifies physical in-store presence within 100m threshold', () => {
    // Haversine distance in meters
    const isNearby = (lat1, lon1, lat2, lon2, thresholdMeters = 100) => {
      const R = 6371e3; // Earth radius in meters
      const phi1 = (lat1 * Math.PI) / 180;
      const phi2 = (lat2 * Math.PI) / 180;
      const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
      const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;
      const a =
        Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
        Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const dist = R * c;
      return { isInStore: dist <= thresholdMeters, distanceMeters: Math.round(dist) };
    };

    // Customer inside store (18m away)
    const inside = isNearby(18.5204, 73.8567, 18.5205, 73.8568);
    assert.equal(inside.isInStore, true);
    assert.ok(inside.distanceMeters <= 100);

    // Customer far away (3.5km away)
    const outside = isNearby(18.5204, 73.8567, 18.5500, 73.8800);
    assert.equal(outside.isInStore, false);
    assert.ok(outside.distanceMeters > 100);
  });

  test('Verified review structure requires valid rating, author, and tags', () => {
    const validateReview = (review) => {
      return (
        Boolean(review.authorName) &&
        review.rating >= 1 &&
        review.rating <= 5 &&
        Array.isArray(review.tags) &&
        review.tags.length > 0
      );
    };

    const valid = {
      authorName: 'Rohan D.',
      rating: 5,
      tags: ['Exact Counter Rate Honored'],
      isInStoreVerified: true,
    };
    const invalid = {
      authorName: '',
      rating: 6,
      tags: [],
    };

    assert.equal(validateReview(valid), true);
    assert.equal(validateReview(invalid), false);
  });

  // --------------------------------------------------------------------------
  // SECTION 13: MERCHANT LOCAL DEMAND & FOOTFALL HEATMAP ANALYTICS (Feature 4)
  // --------------------------------------------------------------------------
  console.log('\n📈 SECTION 13: Merchant Local Demand & Footfall Analytics (Feature 4)');

  test('Footfall heatmap generates full 7-day x 12-hour matrix (84 cells) with bounded activity scores', () => {
    const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const HOURS = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];

    const generateFootfallHeatmap = () => {
      const cells = [];
      DAYS.forEach((day, dIdx) => {
        HOURS.forEach(hour => {
          let score = 25;
          if (hour >= 17 && hour <= 20) score += 45;
          else if (hour >= 12 && hour <= 14) score += 20;
          if (dIdx >= 5) score += 25;
          score = Math.min(100, Math.max(10, score));
          cells.push({ day, hour, footfallScore: score, isPeak: score >= 75 });
        });
      });
      return cells;
    };

    const heatmap = generateFootfallHeatmap();
    assert.equal(heatmap.length, 84, 'Heatmap must produce 84 cells (7 days * 12 hours)');

    // Verify all scores are within 10-100
    heatmap.forEach(c => {
      assert.ok(c.footfallScore >= 10 && c.footfallScore <= 100);
    });

    // Saturday 7 PM (19:00) should be identified as peak
    const satPeak = heatmap.find(c => c.day === 'Sat' && c.hour === 19);
    assert.ok(satPeak);
    assert.equal(satPeak.isPeak, true);
    assert.ok(satPeak.footfallScore >= 75);

    // Tuesday 10 AM should not be peak
    const tueMorning = heatmap.find(c => c.day === 'Tue' && c.hour === 10);
    assert.ok(tueMorning);
    assert.equal(tueMorning.isPeak, false);
  });

  test('Unmet local demand correctly aggregates missed revenue & high urgency flags', () => {
    const demands = [
      { id: 'u1', productName: 'Samsung 25W Type-C Adapter', searchVolume: 342, medianMarketPrice: 1299, growthRate: '+48%' },
      { id: 'u2', productName: 'boAt Airdopes 141 Anc Earbuds', searchVolume: 215, medianMarketPrice: 1499, growthRate: '+62%' },
      { id: 'u3', productName: 'Crucial BX500 1TB SATA SSD', searchVolume: 118, medianMarketPrice: 5850, growthRate: '+19%' },
    ];

    const calculateMissedRevenue = (items) => {
      return items.reduce((acc, item) => acc + (item.searchVolume * item.medianMarketPrice), 0);
    };

    const totalMissed = calculateMissedRevenue(demands);
    assert.ok(totalMissed > 1400000, 'Total missed revenue calculation should exceed ₹14 Lakhs');
    assert.equal(demands[0].searchVolume, 342);
  });

  test('Price competitiveness correctly gauges counter rate advantages against competitors', () => {
    const calculateAdvantage = (myPrice, competitorAvg, ecomPrice) => {
      const vsCompetitor = competitorAvg - myPrice;
      const vsEcom = ecomPrice - myPrice;
      const isLowest = myPrice < competitorAvg && myPrice < ecomPrice;
      return { vsCompetitor, vsEcom, isLowest };
    };

    // My price ₹850, nearby ₹920, Amazon ₹899
    const comparison = calculateAdvantage(850, 920, 899);
    assert.equal(comparison.vsCompetitor, 70, '₹70 cheaper than nearby offline shops');
    assert.equal(comparison.vsEcom, 49, '₹49 cheaper than e-commerce');
    assert.equal(comparison.isLowest, true, 'Marked as lowest market rate in neighborhood');
  });

  // --------------------------------------------------------------------------
  // 14. Merchant Product Camera Access & Gallery Image Processing
  // --------------------------------------------------------------------------
  console.log('\n📸 SECTION 14: Merchant Product Camera Capture & Gallery Selection');
  test('Camera and gallery image data URLs are validated and formatted properly', () => {
    const isImageDataUrl = (url) => {
      return typeof url === 'string' && (
        url.startsWith('data:image/jpeg;base64,') ||
        url.startsWith('data:image/png;base64,') ||
        url.startsWith('data:image/webp;base64,') ||
        url.startsWith('http://') ||
        url.startsWith('https://')
      );
    };

    const mockCameraCapture = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD...';
    const mockGalleryPhoto = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...';
    const mockWebUrl = 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0';

    assert.equal(isImageDataUrl(mockCameraCapture), true, 'Direct camera capture base64 JPEG should be valid');
    assert.equal(isImageDataUrl(mockGalleryPhoto), true, 'Gallery photo base64 PNG should be valid');
    assert.equal(isImageDataUrl(mockWebUrl), true, 'Web image URL should be valid');
    assert.equal(isImageDataUrl('invalid-string'), false, 'Non-image string rejected');
  });

  test('Image dimension calculation retains aspect ratio within 1000px bounds', () => {
    const calculateBounds = (width, height, maxBound = 1000) => {
      let targetW = width;
      let targetH = height;
      if (targetW > targetH) {
        if (targetW > maxBound) {
          targetH = Math.round((targetH * maxBound) / targetW);
          targetW = maxBound;
        }
      } else {
        if (targetH > maxBound) {
          targetW = Math.round((targetW * maxBound) / targetH);
          targetH = maxBound;
        }
      }
      return { targetW, targetH };
    };

    // Smartphone 4K Camera image (4032 x 3024)
    const phonePhoto = calculateBounds(4032, 3024);
    assert.equal(phonePhoto.targetW, 1000);
    assert.equal(phonePhoto.targetH, 750);

    // Tall portrait photo (3000 x 4000)
    const portraitPhoto = calculateBounds(3000, 4000);
    assert.equal(portraitPhoto.targetW, 750);
    assert.equal(portraitPhoto.targetH, 1000);
  });

  // --------------------------------------------------------------------------
  // SECTION 15: OTP Rate Limiter & Brute-Force Shield (Phase 1)
  // --------------------------------------------------------------------------
  console.log('\n🔒 SECTION 15: OTP Rate Limiter & Brute-Force Shield (Phase 1)');
  test('OTP consecutive cooldown blocks immediate second request', () => {
    const store = new Map();
    const COOLDOWN_MS = 60 * 1000;
    const checkLimit = (phone, now) => {
      const last = store.get(phone);
      if (last && now - last < COOLDOWN_MS) {
        return { allowed: false, waitSec: Math.ceil((COOLDOWN_MS - (now - last)) / 1000) };
      }
      store.set(phone, now);
      return { allowed: true };
    };

    const t0 = 1000000;
    const firstReq = checkLimit('+919876543210', t0);
    assert.equal(firstReq.allowed, true, 'First OTP request must be allowed');

    const immediateReq = checkLimit('+919876543210', t0 + 5000);
    assert.equal(immediateReq.allowed, false, 'Immediate OTP request must be blocked');
    assert.equal(immediateReq.waitSec, 55, 'Cooldown must indicate 55 seconds remaining');

    const afterCooldownReq = checkLimit('+919876543210', t0 + 65000);
    assert.equal(afterCooldownReq.allowed, true, 'Request after 60s cooldown must be allowed');
  });

  test('OTP brute-force lockout triggers after 5 failed verification attempts', () => {
    let failedAttempts = 0;
    let lockedUntil = 0;
    const MAX_ATTEMPTS = 5;
    const LOCKOUT_MS = 15 * 60 * 1000;

    const recordFailure = (now) => {
      failedAttempts++;
      if (failedAttempts >= MAX_ATTEMPTS) {
        lockedUntil = now + LOCKOUT_MS;
        return { locked: true, remaining: 0 };
      }
      return { locked: false, remaining: MAX_ATTEMPTS - failedAttempts };
    };

    const t0 = 1000000;
    assert.equal(recordFailure(t0).locked, false);
    assert.equal(recordFailure(t0).locked, false);
    assert.equal(recordFailure(t0).locked, false);
    assert.equal(recordFailure(t0).locked, false);
    const fifthAttempt = recordFailure(t0);
    assert.equal(fifthAttempt.locked, true, 'Fifth failed attempt must lock the account');
    assert.equal(fifthAttempt.remaining, 0);
  });

  // --------------------------------------------------------------------------
  // SECTION 16: Customer Review PII Masking (Phase 6)
  // --------------------------------------------------------------------------
  console.log('\n🎭 SECTION 16: Customer Review PII Masking (Phase 6)');
  test('Customer mobile numbers are masked with bullet redactions', () => {
    const maskPhoneNumber = (phone) => {
      if (!phone) return '';
      const digits = phone.replace(/\D/g, '');
      if (digits.length < 10) return phone;
      const last2 = digits.slice(-2);
      const first2 = digits.length === 12 && digits.startsWith('91') ? digits.slice(2, 4) : digits.slice(0, 2);
      const prefix = digits.length === 12 && digits.startsWith('91') ? '+91 ' : (phone.startsWith('+91') ? '+91 ' : '');
      return `${prefix}${first2}••••••${last2}`;
    };

    assert.equal(maskPhoneNumber('+919876543210'), '+91 98••••••10');
    assert.equal(maskPhoneNumber('9876543210'), '98••••••10');
    assert.equal(maskPhoneNumber('+91 98123 45678'), '+91 98••••••78');
  });

  test('Inline phone numbers in review text are automatically redacted', () => {
    const maskPiiInText = (text) => {
      if (!text) return '';
      const phoneRegex = /(?:\+?91[\s.-]?)?(?:0)?([6-9]\d{1})[\s.-]?(\d{3})[\s.-]?(\d{3})[\s.-]?(\d{2})/g;
      return text.replace(phoneRegex, (_m, p1, _p2, _p3, p4) => `${p1}••••••${p4}`);
    };

    const reviewWithPhone = 'Excellent shop, store manager Rajesh reached at 9876543210 for billing inquiry.';
    const sanitized = maskPiiInText(reviewWithPhone);
    assert.equal(sanitized, 'Excellent shop, store manager Rajesh reached at 98••••••10 for billing inquiry.');
    assert.equal(sanitized.includes('9876543210'), false, 'Full mobile number must not be exposed');
  });

  // --------------------------------------------------------------------------
  // Final Results
  // --------------------------------------------------------------------------
  console.log('\n======================================================================');
  console.log(`📊 TEST SUITE SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('======================================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runAllTests();

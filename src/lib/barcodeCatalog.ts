// ==============================================================================
// src/lib/barcodeCatalog.ts
// Real-world Retail Barcode Directory (EAN-13, UPC-A, QR) & Auto-Fill Engine
// ==============================================================================

import { MasterProduct } from '@/types';

export interface BarcodeProductInfo {
  barcode: string;
  name: string;
  brand: string;
  categoryId: string;
  variantName: string;
  mrp: number;
  defaultRate: number;
  imageUrl: string;
  description: string;
  sku: string;
}

export const RETAIL_BARCODE_CATALOG: BarcodeProductInfo[] = [
  {
    barcode: '8806091234567',
    name: 'Samsung 25W Type-C Super Fast Charger',
    brand: 'Samsung',
    categoryId: 'c1000000-0000-0000-0000-000000000001',
    variantName: 'White / 25W PD',
    mrp: 1299,
    defaultRate: 699,
    imageUrl: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=800&auto=format&fit=crop&q=80',
    description: 'Official Samsung Power Delivery 3.0 Type-C travel wall adapter for Galaxy smartphones. Delivers 25W Super Fast Charging.',
    sku: 'SAM-25W-WHT',
  },
  {
    barcode: '0649528900000',
    name: 'Crucial P3 1TB PCIe 3.0 NVMe M.2 SSD',
    brand: 'Crucial',
    categoryId: 'c1000000-0000-0000-0000-000000000002',
    variantName: '1TB M.2 2280',
    mrp: 7500,
    defaultRate: 5299,
    imageUrl: 'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=800&auto=format&fit=crop&q=80',
    description: 'High performance NVMe solid state drive with up to 3500MB/s read speeds, perfect for gaming and laptops.',
    sku: 'CRU-P3-1TB',
  },
  {
    barcode: '097855123456',
    name: 'Logitech B170 Wireless Optical Mouse',
    brand: 'Logitech',
    categoryId: 'c1000000-0000-0000-0000-000000000002',
    variantName: 'Black / 2.4GHz',
    mrp: 895,
    defaultRate: 599,
    imageUrl: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=800&auto=format&fit=crop&q=80',
    description: 'Reliable 2.4 GHz wireless mouse with 10m range, 12-month battery life, and universal USB nano receiver.',
    sku: 'LOG-B170-BLK',
  },
  {
    barcode: '8901030384102',
    name: 'Aashirvaad Shudh Chakki Whole Wheat Atta 5kg',
    brand: 'Aashirvaad',
    categoryId: 'c1000000-0000-0000-0000-000000000003',
    variantName: '5kg Bag',
    mrp: 275,
    defaultRate: 235,
    imageUrl: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=800&auto=format&fit=crop&q=80',
    description: '100% pure whole wheat grain flour with zero maida. Extra water absorption makes rotis softer for longer.',
    sku: 'AASH-ATTA-5KG',
  },
  {
    barcode: '8901262010052',
    name: 'Amul Pasteurised Salted Butter 500g',
    brand: 'Amul',
    categoryId: 'c1000000-0000-0000-0000-000000000003',
    variantName: '500g Block',
    mrp: 285,
    defaultRate: 275,
    imageUrl: 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=800&auto=format&fit=crop&q=80',
    description: 'The Taste of India. Pure dairy butter prepared from wholesome fresh milk cream.',
    sku: 'AMUL-BTR-500G',
  },
  {
    barcode: '8901057010015',
    name: 'Godrej Nav-Tal 7 Levers Brass Padlock with 3 Keys',
    brand: 'Godrej',
    categoryId: 'c1000000-0000-0000-0000-000000000004',
    variantName: '7 Levers / Brass',
    mrp: 680,
    defaultRate: 540,
    imageUrl: 'https://images.unsplash.com/photo-1582139329536-e7284fece509?w=800&auto=format&fit=crop&q=80',
    description: 'Solid brass lock body with hardened steel electroplated shackle resistant to hacksaws and force attacks.',
    sku: 'GDJ-NVTL-7L',
  },
  {
    barcode: '195949038245',
    name: 'Apple iPhone 15 (128GB, Black)',
    brand: 'Apple',
    categoryId: 'c1000000-0000-0000-0000-000000000001',
    variantName: '128GB Black',
    mrp: 79900,
    defaultRate: 67999,
    imageUrl: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&auto=format&fit=crop&q=80',
    description: 'Dynamic Island, 48MP main camera, USB-C, and A16 Bionic chip in an aluminum and color-infused glass design.',
    sku: 'APL-IP15-128',
  },
  {
    barcode: '8905645000012',
    name: 'boAt Airdopes 141 Bluetooth Wireless Earbuds',
    brand: 'boAt',
    categoryId: 'c1000000-0000-0000-0000-000000000001',
    variantName: 'Active Black',
    mrp: 4490,
    defaultRate: 1299,
    imageUrl: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800&auto=format&fit=crop&q=80',
    description: '42 hours total playback, ENx noise cancelling mic, ASAP fast charge, and IPX4 sweat resistance.',
    sku: 'BOAT-AD141-BLK',
  },
  {
    barcode: '8901058852300',
    name: 'Maggi 2-Minute Masala Instant Noodles 70g',
    brand: 'Nestle Maggi',
    categoryId: 'c1000000-0000-0000-0000-000000000003',
    variantName: '70g Single Pack',
    mrp: 14,
    defaultRate: 13,
    imageUrl: 'https://images.unsplash.com/photo-1612927601601-6638404737ce?w=800&auto=format&fit=crop&q=80',
    description: 'Authentic Indian masala taste made with finest spices and wheat noodle cakes. Fast and delicious.',
    sku: 'MAG-NDL-70G',
  },
  {
    barcode: '8904043901005',
    name: 'Tata Salt Vacuum Evaporated Iodised Salt 1kg',
    brand: 'Tata Salt',
    categoryId: 'c1000000-0000-0000-0000-000000000003',
    variantName: '1kg Pouch',
    mrp: 28,
    defaultRate: 26,
    imageUrl: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=800&auto=format&fit=crop&q=80',
    description: 'Desh Ka Namak. Pure vacuum evaporated iodised salt ensuring healthy mental and physical development.',
    sku: 'TATA-SLT-1KG',
  },
  {
    barcode: '8901396387006',
    name: 'Dettol Original Germ Protection Bathing Soap 125g',
    brand: 'Dettol',
    categoryId: 'c1000000-0000-0000-0000-000000000003',
    variantName: '125g Bar',
    mrp: 58,
    defaultRate: 52,
    imageUrl: 'https://images.unsplash.com/photo-1607006314594-c70500be8e5f?w=800&auto=format&fit=crop&q=80',
    description: 'Trusted 99.9% germ protection soap infused with natural moisturizers for healthy, clean skin.',
    sku: 'DET-SOP-125G',
  },
  {
    barcode: '8901314010529',
    name: 'Colgate Strong Teeth Dental Cream Toothpaste 200g',
    brand: 'Colgate',
    categoryId: 'c1000000-0000-0000-0000-000000000003',
    variantName: '200g Tube',
    mrp: 125,
    defaultRate: 110,
    imageUrl: 'https://images.unsplash.com/photo-1559591937-e1032b2a60b9?w=800&auto=format&fit=crop&q=80',
    description: 'Amino Shakti formula adds natural calcium to strengthen tooth enamel and guard against cavities.',
    sku: 'COL-ST-200G',
  }
];

/**
 * Searches retail catalog and existing master products by barcode, SKU, or product ID.
 */
export function lookupBarcode(
  queryCode: string,
  existingProducts: MasterProduct[] = []
): BarcodeProductInfo | null {
  const clean = queryCode.trim().toLowerCase();
  if (!clean) return null;

  // 1. Direct match in retail catalog
  const catalogMatch = RETAIL_BARCODE_CATALOG.find(
    item => item.barcode.toLowerCase() === clean ||
            item.sku.toLowerCase() === clean ||
            item.barcode.endsWith(clean) ||
            clean.endsWith(item.barcode)
  );
  if (catalogMatch) return catalogMatch;

  // 2. Check existing master products
  const masterMatch = existingProducts.find(
    p => (p.barcode && p.barcode.toLowerCase() === clean) ||
         p.id.toLowerCase() === clean ||
         p.slug.toLowerCase().includes(clean)
  );
  if (masterMatch) {
    return {
      barcode: masterMatch.barcode || queryCode.trim(),
      name: masterMatch.name,
      brand: masterMatch.brand,
      categoryId: masterMatch.categoryId,
      variantName: 'Standard',
      mrp: masterMatch.mrp,
      defaultRate: Math.round(masterMatch.mrp * 0.85),
      imageUrl: masterMatch.imageUrl,
      description: masterMatch.description || '',
      sku: `SKU-${queryCode.slice(-4)}`,
    };
  }

  // 3. Substring fuzzy match in retail catalog names if query is partially alphanumeric
  const fuzzyMatch = RETAIL_BARCODE_CATALOG.find(
    item => item.name.toLowerCase().includes(clean) || item.brand.toLowerCase().includes(clean)
  );
  if (fuzzyMatch) return fuzzyMatch;

  return null;
}

/**
 * Plays a classic supermarket / retail POS scanner beep tone via Web Audio API.
 */
export function playBeepSound() {
  try {
    const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1760, ctx.currentTime); // High pitch retail beep (A6)
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  } catch {
    // Ignore audio permission or un-interacted policy errors
  }
}

/**
 * Emits a sharp haptic vibration pulse on mobile devices.
 */
export function triggerHapticFeedback() {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([70, 30, 70]);
    }
  } catch {
    // Ignore
  }
}

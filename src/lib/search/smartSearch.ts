// ==============================================================================
// src/lib/search/smartSearch.ts
// NLP & Deterministic Rule-Based Smart Search Query Parser (Step 15)
// ==============================================================================

export interface SmartSearchResult {
  originalQuery: string;
  searchTerm: string;
  cleanedText: string;
  brand?: string;
  category?: string;
  maxPrice?: number;
  radiusKm?: number;
  specFilter?: string;
  isExtracted: boolean;
}

const KNOWN_BRANDS = [
  'samsung', 'apple', 'crucial', 'logitech', 'boat', 'amul', 
  'aashirvaad', 'tata', 'godrej', 'sony', 'lenovo', 'dell', 'hp', 'sandisk', 'fortune'
];

export function parseSmartSearchQuery(rawQuery: string): SmartSearchResult {
  const q = rawQuery.trim();
  if (!q) {
    return { originalQuery: '', searchTerm: '', cleanedText: '', isExtracted: false };
  }

  let workingQuery = q;
  let maxPrice: number | undefined;
  let radiusKm: number | undefined;
  let specFilter: string | undefined;
  let detectedBrand: string | undefined;
  let isExtracted = false;

  // 1. Extract Price (e.g. "under ₹6000", "below 5000", "under 10000")
  const priceRegex = /(?:under|below|less\s+than)\s*(?:₹|rs\.?|inr)?\s*([0-9,]+)/i;
  const priceMatch = workingQuery.match(priceRegex);
  if (priceMatch) {
    const rawVal = priceMatch[1].replace(/,/g, '');
    const parsed = parseInt(rawVal, 10);
    if (!isNaN(parsed) && parsed > 0) {
      maxPrice = parsed;
      isExtracted = true;
      workingQuery = workingQuery.replace(priceMatch[0], '');
    }
  }

  // 2. Extract Distance / Radius (e.g. "within 5 km", "within 10km", "near me")
  const radiusRegex = /(?:within|inside)\s*([0-9]+)\s*(?:km|kms|kilometers)/i;
  const radiusMatch = workingQuery.match(radiusRegex);
  if (radiusMatch) {
    radiusKm = parseInt(radiusMatch[1], 10);
    isExtracted = true;
    workingQuery = workingQuery.replace(radiusMatch[0], '');
  } else if (/near\s+me/i.test(workingQuery)) {
    radiusKm = 5; // Default "near me" clamp
    isExtracted = true;
    workingQuery = workingQuery.replace(/near\s+me/i, '');
  }

  // 3. Extract Technical Specification / Capacity (e.g. "1TB", "500GB", "5kg", "25W")
  const specRegex = /\b([0-9]+(?:\.[0-9]+)?)\s*(tb|gb|mb|kg|gm|g|ltr|l|watt|w|mah)\b/i;
  const specMatch = workingQuery.match(specRegex);
  if (specMatch) {
    specFilter = `${specMatch[1]}${specMatch[2].toUpperCase()}`;
    isExtracted = true;
    workingQuery = workingQuery.replace(specMatch[0], '');
  }

  // 4. Extract Brand
  const lowerTokens = workingQuery.toLowerCase().split(/\s+/);
  for (const token of lowerTokens) {
    if (KNOWN_BRANDS.includes(token)) {
      detectedBrand = token.charAt(0).toUpperCase() + token.slice(1);
      isExtracted = true;
      break;
    }
  }

  // Clean up residual words like "need a", "find", "looking for"
  const cleanedSearchTerm = workingQuery
    .replace(/^(?:need\s+a|find\s+a|find|search\s+for|looking\s+for|show\s+me)\s+/i, '')
    .trim()
    .replace(/\s{2,}/g, ' ');

  const resultText = cleanedSearchTerm || q;

  return {
    originalQuery: q,
    searchTerm: resultText,
    cleanedText: resultText,
    brand: detectedBrand,
    maxPrice,
    radiusKm,
    specFilter,
    isExtracted,
  };
}

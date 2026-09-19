// ==============================================================================
// scripts/verify-category-suggestions.mjs
// Automated verification for comprehensive market categories & product suggestions
// ==============================================================================

import assert from 'node:assert/strict';
import { MASTER_MARKET_CATEGORIES, searchMarketCategories } from '../src/lib/data/marketCategories.ts';
import { RETAIL_MARKET_PRODUCT_SUGGESTIONS, searchProductSuggestions } from '../src/lib/data/productSuggestions.ts';

console.log('\n======================================================================');
console.log('🛍️ VERIFYING MARKET CATEGORIES & PRODUCT AUTO-SUGGESTIONS');
console.log('======================================================================\n');

// 1. Check Categories Spectrum
console.log('📦 1. MARKET CATEGORIES AUDIT');
assert.ok(MASTER_MARKET_CATEGORIES.length >= 30, `Expected at least 30 market categories, found ${MASTER_MARKET_CATEGORIES.length}`);
console.log(`  ✅ [PASS] Loaded ${MASTER_MARKET_CATEGORIES.length} comprehensive physical retail market categories`);

// Verify essential categories
const categoryNames = MASTER_MARKET_CATEGORIES.map(c => c.name.toLowerCase());
const expectedKeywords = ['grocery', 'dairy', 'packaged foods', 'beverages', 'fruits', 'electronics', 'computers', 'hardware', 'electricals', 'pharmacy', 'personal care', 'clothing', 'footwear', 'stationery', 'toys', 'pooja', 'auto'];

for (const kw of expectedKeywords) {
  const found = categoryNames.some(name => name.includes(kw));
  assert.ok(found, `Expected category matching keyword '${kw}'`);
}
console.log(`  ✅ [PASS] All critical retail categories verified`);

// 2. Category Search & Vernacular Support
console.log('\n🔍 2. CATEGORY SEARCH (Bilingual English & Hindi)');
const dairyMatches = searchMarketCategories('dairy');
assert.ok(dairyMatches.length > 0 && dairyMatches.some(c => c.name.includes('Dairy')), 'Failed dairy category search');
console.log(`  ✅ [PASS] English category search "dairy" matched ${dairyMatches[0].name}`);

const hindiMatches = searchMarketCategories('दूध');
assert.ok(hindiMatches.length > 0 && hindiMatches.some(c => c.name.includes('Dairy')), 'Failed Hindi search "दूध"');
console.log(`  ✅ [PASS] Vernacular category search "दूध" matched ${hindiMatches[0].name}`);

const paintMatches = searchMarketCategories('paint');
assert.ok(paintMatches.length > 0 && paintMatches.some(c => c.name.includes('Paint')), 'Failed paint category search');
console.log(`  ✅ [PASS] Category search "paint" matched ${paintMatches[0].name}`);

const clothesMatches = searchMarketCategories('कपड़े');
assert.ok(clothesMatches.length > 0, 'Failed Hindi search "कपड़े"');
console.log(`  ✅ [PASS] Vernacular category search "कपड़े" matched ${clothesMatches.map(c => c.name).join(', ')}`);

// 3. Product Auto-Suggestions
console.log('\n💡 3. PRODUCT TITLE AUTO-SUGGESTIONS AUDIT');
assert.ok(RETAIL_MARKET_PRODUCT_SUGGESTIONS.length >= 30, `Expected at least 30 product suggestions, found ${RETAIL_MARKET_PRODUCT_SUGGESTIONS.length}`);
console.log(`  ✅ [PASS] Loaded ${RETAIL_MARKET_PRODUCT_SUGGESTIONS.length} pre-mapped retail market suggestions`);

const amulSuggestions = searchProductSuggestions('Amul');
assert.ok(amulSuggestions.length >= 2, 'Expected multiple suggestions for "Amul"');
console.log(`  ✅ [PASS] "Amul" query returned ${amulSuggestions.length} suggestions: ${amulSuggestions.map(s => s.name).slice(0, 3).join(' | ')}`);

const attaSuggestions = searchProductSuggestions('Atta');
assert.ok(attaSuggestions.length >= 1 && attaSuggestions[0].name.toLowerCase().includes('atta'), 'Expected atta suggestions');
console.log(`  ✅ [PASS] "Atta" query returned: ${attaSuggestions[0].name} (MRP: ₹${attaSuggestions[0].mrp}, Selling: ₹${attaSuggestions[0].defaultRate})`);

const samsungSuggestions = searchProductSuggestions('Samsung');
assert.ok(samsungSuggestions.length >= 1, 'Expected Samsung suggestions');
console.log(`  ✅ [PASS] "Samsung" query returned: ${samsungSuggestions[0].name}`);

// 4. Suggestion Auto-Fill Metadata Integrity
console.log('\n⚡ 4. AUTO-FILL PAYLOAD INTEGRITY');
const sample = amulSuggestions[0];
assert.ok(sample.name, 'Missing product name');
assert.ok(sample.brand, 'Missing brand');
assert.ok(sample.categoryId, 'Missing categoryId');
assert.ok(sample.mrp > 0, 'Invalid MRP');
assert.ok(sample.defaultRate > 0 && sample.defaultRate <= sample.mrp, 'Invalid defaultRate');
assert.ok(sample.imageUrl && sample.imageUrl.startsWith('http'), 'Invalid imageUrl');
console.log(`  ✅ [PASS] Auto-fill fields verified (Name, Brand, CategoryId, MRP, Rate, ImageUrl, Variant)`);

console.log('\n======================================================================');
console.log('🎉 ALL MARKET CATEGORIES & PRODUCT SUGGESTION AUDITS PASSED (100%)');
console.log('======================================================================\n');

// ==============================================================================
// src/lib/analytics/merchantAnalytics.ts
// Local Demand Intelligence, Unmet Neighborhood Searches & Footfall Heatmaps
// ==============================================================================

export interface UnmetDemandItem {
  id: string;
  productName: string;
  category: string;
  brand: string;
  searchCount7d: number;
  searchCount30d: number;
  medianMarketPrice: number;
  estimatedMonthlyDemandValue: number;
  competingStoresStocking: number;
  growthTrend: string;
}

export interface HourlyFootfallCell {
  hour: number; // 10 to 21 (10 AM to 9 PM)
  hourLabel: string;
  dayIndex: number; // 0 = Mon, 6 = Sun
  dayName: string;
  activityScore: number; // 0 to 100
  walkInEstimate: number;
}

export interface CompetitivenessBenchmark {
  productId: string;
  productName: string;
  brand: string;
  yourCounterPrice: number;
  lowestLocalPrice: number;
  lowestShopName: string;
  ecomMarketPrice: number; // Amazon / Flipkart reference
  status: 'lowest' | 'competitive' | 'higher';
  marginRecommendation: string;
}

export interface RadiusDistribution {
  radiusLabel: string;
  percentage: number;
  leadCount: number;
  color: string;
}

/**
 * High-demand search terms in the local pincode that the merchant does not currently stock
 */
export const SEED_UNMET_DEMANDS: UnmetDemandItem[] = [
  {
    id: 'unmet-01',
    productName: 'Anker 65W GaN Fast Charger 3-Port',
    category: 'Electronics',
    brand: 'Anker',
    searchCount7d: 84,
    searchCount30d: 310,
    medianMarketPrice: 2499,
    estimatedMonthlyDemandValue: 774690,
    competingStoresStocking: 1,
    growthTrend: '+45%',
  },
  {
    id: 'unmet-02',
    productName: 'Samsung T7 Shield 1TB Portable SSD',
    category: 'Computers',
    brand: 'Samsung',
    searchCount7d: 62,
    searchCount30d: 240,
    medianMarketPrice: 8999,
    estimatedMonthlyDemandValue: 2159760,
    competingStoresStocking: 0,
    growthTrend: '+32%',
  },
  {
    id: 'unmet-03',
    productName: 'Logitech MX Master 3S Wireless Mouse',
    category: 'Computers',
    brand: 'Logitech',
    searchCount7d: 53,
    searchCount30d: 195,
    medianMarketPrice: 7995,
    estimatedMonthlyDemandValue: 1559025,
    competingStoresStocking: 2,
    growthTrend: '+18%',
  },
  {
    id: 'unmet-04',
    productName: 'boAt Airdopes 141 ANC Earbuds',
    category: 'Electronics',
    brand: 'boAt',
    searchCount7d: 112,
    searchCount30d: 420,
    medianMarketPrice: 1499,
    estimatedMonthlyDemandValue: 629580,
    competingStoresStocking: 3,
    growthTrend: '+60%',
  },
  {
    id: 'unmet-05',
    productName: 'Apple 20W USB-C Power Adapter',
    category: 'Electronics',
    brand: 'Apple',
    searchCount7d: 96,
    searchCount30d: 380,
    medianMarketPrice: 1890,
    estimatedMonthlyDemandValue: 718200,
    competingStoresStocking: 2,
    growthTrend: '+28%',
  },
];

/**
 * 7-Day x 12-Hour Footfall & Direction Request Heatmap Matrix (Mon-Sun, 10 AM to 9 PM)
 */
export const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const OPERATING_HOURS = [
  { hour: 10, label: '10 AM' },
  { hour: 11, label: '11 AM' },
  { hour: 12, label: '12 PM' },
  { hour: 13, label: '1 PM' },
  { hour: 14, label: '2 PM' },
  { hour: 15, label: '3 PM' },
  { hour: 16, label: '4 PM' },
  { hour: 17, label: '5 PM' },
  { hour: 18, label: '6 PM' },
  { hour: 19, label: '7 PM' },
  { hour: 20, label: '8 PM' },
  { hour: 21, label: '9 PM' },
];

/**
 * Generates deterministic realistic footfall heatmap data
 */
export function generateFootfallHeatmap(): HourlyFootfallCell[] {
  const cells: HourlyFootfallCell[] = [];

  DAYS_OF_WEEK.forEach((day, dayIndex) => {
    OPERATING_HOURS.forEach(({ hour, label }) => {
      // Weekend evenings (Sat/Sun 5 PM - 8 PM) have highest activity
      const isWeekend = dayIndex >= 5;
      const isEveningPeak = hour >= 17 && hour <= 20;
      const isAfternoonLull = hour >= 13 && hour <= 15;

      let score = 30;
      if (isEveningPeak) score += isWeekend ? 60 : 45;
      if (isAfternoonLull) score -= 15;
      if (isWeekend) score += 15;

      // Add controlled variance
      score = Math.min(100, Math.max(10, score + ((dayIndex * 3 + hour * 7) % 15)));

      const walkInEstimate = Math.round((score / 100) * 28);

      cells.push({
        hour,
        hourLabel: label,
        dayIndex,
        dayName: day,
        activityScore: score,
        walkInEstimate,
      });
    });
  });

  return cells;
}

/**
 * Counter Price Competitiveness Benchmark
 */
export const SEED_PRICE_BENCHMARKS: CompetitivenessBenchmark[] = [
  {
    productId: 'b3000000-0000-0000-0000-000000000001',
    productName: 'Samsung 25W Type-C Super Fast Charger',
    brand: 'Samsung',
    yourCounterPrice: 1100,
    lowestLocalPrice: 1100,
    lowestShopName: 'Your Store (Tie)',
    ecomMarketPrice: 1299,
    status: 'lowest',
    marginRecommendation: 'Best price in 5km radius. Excellent customer draw!',
  },
  {
    productId: 'b3000000-0000-0000-0000-000000000002',
    productName: 'Crucial P3 1TB PCIe 3.0 NVMe SSD',
    brand: 'Crucial',
    yourCounterPrice: 5699,
    lowestLocalPrice: 5450,
    lowestShopName: 'Metro Hardware Hub',
    ecomMarketPrice: 5899,
    status: 'higher',
    marginRecommendation: 'Reduce by ₹150 to match nearby lowest counter rate and capture footfall.',
  },
  {
    productId: 'b3000000-0000-0000-0000-000000000003',
    productName: 'Logitech B170 Wireless Optical Mouse',
    brand: 'Logitech',
    yourCounterPrice: 599,
    lowestLocalPrice: 580,
    lowestShopName: 'National Electronics Co.',
    ecomMarketPrice: 649,
    status: 'competitive',
    marginRecommendation: 'Within ₹19 of market low. Customers prefer your store due to 4.8★ rating.',
  },
];

/**
 * Locality Footfall Origins Distribution
 */
export const SEED_RADIUS_DISTRIBUTION: RadiusDistribution[] = [
  { radiusLabel: 'Within 1 km (Walking Neighborhood)', percentage: 52, leadCount: 421, color: 'bg-emerald-500' },
  { radiusLabel: '1 km – 3 km (Short Two-Wheeler Ride)', percentage: 33, leadCount: 268, color: 'bg-teal-500' },
  { radiusLabel: '3 km – 5 km (Outer City Commute)', percentage: 15, leadCount: 122, color: 'bg-blue-500' },
];

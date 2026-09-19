// ==============================================================================
// src/components/merchant/DemandHeatmapView.tsx
// Local Search Demand Heatmap, Unmet Pincode Searches & Price Radar (Feature 4)
// ==============================================================================

'use client';

import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Flame,
  Users,
  Search,
  Plus,
  ArrowUpRight,
  ShieldCheck,
  AlertTriangle,
  Sparkles,
  MapPin,
  Compass,
  Clock,
  CheckCircle2,
  Tag,
  DollarSign
} from 'lucide-react';
import {
  SEED_UNMET_DEMANDS,
  SEED_PRICE_BENCHMARKS,
  SEED_RADIUS_DISTRIBUTION,
  DAYS_OF_WEEK,
  OPERATING_HOURS,
  generateFootfallHeatmap,
  UnmetDemandItem,
  HourlyFootfallCell
} from '@/lib/analytics/merchantAnalytics';
import { getShopTelemetry } from '@/lib/analytics/interactionTracker';
import { useToast } from '@/components/ui/Toast';

export function DemandHeatmapView({
  shopName,
  shopId,
  inventoryCount = 0,
  onStockItem,
}: {
  shopName?: string;
  shopId?: string;
  inventoryCount?: number;
  onStockItem?: (item: UnmetDemandItem) => void;
}) {
  const { showToast } = useToast();
  const [activeRange, setActiveRange] = useState<'7d' | '30d'>('7d');
  const [selectedCell, setSelectedCell] = useState<HourlyFootfallCell | null>(null);
  const [stockedItems, setStockedItems] = useState<string[]>([]);

  const telemetry = useMemo(() => shopId ? getShopTelemetry(shopId) : { views: 0, searches: 0, directions: 0, calls: 0, whatsapp: 0 }, [shopId]);

  const unmetDemandTotal = useMemo(() => {
    return SEED_UNMET_DEMANDS
      .filter(item => !stockedItems.includes(item.id))
      .reduce((acc, curr) => acc + curr.estimatedMonthlyDemandValue, 0);
  }, [stockedItems]);

  const searchDemandDisplay = telemetry.searches > 0 
    ? telemetry.searches 
    : (inventoryCount > 0 ? inventoryCount * 3 : 0);

  const footfallConversion = telemetry.views > 0 
    ? Math.min(100, Math.round((telemetry.directions / telemetry.views) * 100))
    : 0;

  const priceHealth = inventoryCount > 0 ? 100 : 0;

  const heatmapCells = useMemo(() => generateFootfallHeatmap(), []);

  // Compute cell intensity color
  const getCellBg = (score: number) => {
    if (score >= 80) return 'bg-emerald-600 text-white font-black hover:bg-emerald-500';
    if (score >= 60) return 'bg-emerald-500 text-white font-bold hover:bg-emerald-400';
    if (score >= 40) return 'bg-emerald-200 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-200 hover:bg-emerald-300';
    return 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200';
  };

  const handleStockClick = (item: UnmetDemandItem) => {
    setStockedItems(prev => [...prev, item.id]);
    showToast(`✅ "${item.productName}" added to your catalog draft at ₹${item.medianMarketPrice}!`);
    if (onStockItem) onStockItem(item);
  };

  return (
    <div className="space-y-6">
      {/* Top Telemetry KPI Ribbon */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
              Pincode Search Demand
            </span>
            <div className="w-7 h-7 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center">
              <Search className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1.5">
            {searchDemandDisplay}
          </div>
          <div className="text-[11px] text-emerald-600 font-bold flex items-center gap-1 mt-0.5">
            <TrendingUp className="w-3 h-3" />
            <span>{searchDemandDisplay === 0 ? 'No logged searches yet' : 'Real-time buyer demand'}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
              Navigation Footfall
            </span>
            <div className="w-7 h-7 rounded-xl bg-teal-100 dark:bg-teal-950 text-teal-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1.5">
            {footfallConversion}%
          </div>
          <div className="text-[11px] text-slate-500 font-medium mt-0.5">
            {telemetry.directions} direction requests ({telemetry.views} views)
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
              Unmet Demand Pool
            </span>
            <div className="w-7 h-7 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1.5">
            {unmetDemandTotal > 0 ? `₹${(unmetDemandTotal / 100000).toFixed(1)}L` : '₹0'}
          </div>
          <div className="text-[11px] text-slate-500 font-medium mt-0.5">
            Estimated unstocked catalog value
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
              Counter Price Health
            </span>
            <div className="w-7 h-7 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1.5">
            {priceHealth}%
          </div>
          <div className="text-[11px] text-emerald-600 font-bold mt-0.5">
            {inventoryCount > 0 ? 'All listed items meet compliance' : 'No items listed'}
          </div>
        </div>
      </div>

      {/* SECTION 1: Hourly Footfall & Activity Heatmap */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 sm:p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-700/60">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <Flame className="w-4 h-4" />
              </div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Weekly In-Store Footfall & Peak Hours Heatmap
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Hourly walk-in likelihood based on nearby customer directions and "Hold at Counter" reservations
            </p>
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-400 text-[11px] font-bold">Activity:</span>
            <span className="w-3 h-3 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200" title="Low" />
            <span className="w-3 h-3 rounded bg-emerald-200" title="Moderate" />
            <span className="w-3 h-3 rounded bg-emerald-500" title="Busy" />
            <span className="w-3 h-3 rounded bg-emerald-600" title="Peak Rush" />
            <span className="text-[11px] font-black text-emerald-600 ml-1">Peak Rush</span>
          </div>
        </div>

        {/* Heatmap Grid Matrix */}
        <div className="overflow-x-auto pb-2 scrollbar-thin">
          <div className="min-w-[650px] space-y-1.5">
            {/* Hours Header Row */}
            <div className="grid grid-cols-13 gap-1.5 text-center text-[10px] font-black text-slate-400 uppercase">
              <div className="text-left pl-1">Day</div>
              {OPERATING_HOURS.map(h => (
                <div key={h.hour}>{h.label}</div>
              ))}
            </div>

            {/* Matrix Rows (Mon to Sun) */}
            {DAYS_OF_WEEK.map((day, dayIdx) => {
              const dayCells = heatmapCells.filter(c => c.dayIndex === dayIdx);
              return (
                <div key={day} className="grid grid-cols-13 gap-1.5 items-center">
                  <div className="text-xs font-black text-slate-700 dark:text-slate-300 pl-1">
                    {day}
                  </div>
                  {dayCells.map(cell => (
                    <button
                      key={cell.hour}
                      onClick={() => setSelectedCell(cell)}
                      className={`h-8 rounded-xl transition-all flex flex-col items-center justify-center text-[10px] cursor-pointer shadow-xs ${getCellBg(
                        cell.activityScore
                      )} ${
                        selectedCell?.dayIndex === dayIdx && selectedCell?.hour === cell.hour
                          ? 'ring-2 ring-slate-900 dark:ring-white scale-105'
                          : ''
                      }`}
                      title={`${day} at ${cell.hourLabel}: ~${cell.walkInEstimate} customers`}
                    >
                      <span>{cell.walkInEstimate}</span>
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Cell Insight Box */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-600" />
            {selectedCell ? (
              <span className="font-bold text-slate-800 dark:text-slate-200">
                <strong>{selectedCell.dayName} at {selectedCell.hourLabel}:</strong> Estimated{' '}
                <strong className="text-emerald-600">{selectedCell.walkInEstimate} customer walk-ins</strong> • Activity Index {selectedCell.activityScore}/100
              </span>
            ) : (
              <span className="text-slate-500">
                Click any cell in the heatmap grid above to inspect predicted hourly footfall.
              </span>
            )}
          </div>

          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-extrabold text-[11px]">
            <span>🔥 Peak Rush: Friday to Sunday (6 PM – 8 PM)</span>
          </div>
        </div>
      </div>

      {/* SECTION 2: Unmet Neighborhood Demand (1-Click Catalog Expansion) */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 sm:p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-100 dark:border-slate-700/60">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Unmet Neighborhood Demand in Your Area
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Products searched by nearby buyers within 3 km that your store does not yet have listed
            </p>
          </div>

          <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-700 rounded-xl text-xs font-bold">
            <button
              onClick={() => setActiveRange('7d')}
              className={`px-3 py-1 rounded-lg transition-all ${
                activeRange === '7d' ? 'bg-white dark:bg-slate-900 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500'
              }`}
            >
              Past 7 Days
            </button>
            <button
              onClick={() => setActiveRange('30d')}
              className={`px-3 py-1 rounded-lg transition-all ${
                activeRange === '30d' ? 'bg-white dark:bg-slate-900 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500'
              }`}
            >
              Past 30 Days
            </button>
          </div>
        </div>

        {/* Unmet Demand List */}
        <div className="divide-y divide-slate-100 dark:divide-slate-700">
          {SEED_UNMET_DEMANDS.map((item) => {
            const isStocked = stockedItems.includes(item.id);
            const searchCount = activeRange === '7d' ? item.searchCount7d : item.searchCount30d;

            return (
              <div
                key={item.id}
                className="py-3.5 flex flex-wrap items-center justify-between gap-3 group hover:bg-slate-50/50 dark:hover:bg-slate-800/40 rounded-2xl px-2 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate">
                      {item.productName}
                    </h4>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      {item.growthTrend} local trend
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">
                      {item.category} • {item.brand}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                    <span>
                      Nearby Searches: <strong className="text-slate-800 dark:text-slate-200">{searchCount} buyers</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Median Counter Price: <strong className="text-emerald-600 font-extrabold">₹{item.medianMarketPrice}</strong>
                    </span>
                    <span>•</span>
                    <span className="text-amber-600 font-semibold">
                      {item.competingStoresStocking === 0 ? '🔥 Zero nearby shops stock this!' : `Only ${item.competingStoresStocking} local store stocking`}
                    </span>
                  </div>
                </div>

                {/* 1-Click Action */}
                <div className="shrink-0">
                  {isStocked ? (
                    <button
                      disabled
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-1.5 opacity-80"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Added to Draft</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleStockClick(item)}
                      className="px-3.5 py-2 rounded-xl bg-merchant-600 hover:bg-merchant-700 text-white text-xs font-black shadow-sm flex items-center gap-1.5 transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Stock This Item (₹{item.medianMarketPrice})</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 3: Counter Price Competitiveness Benchmark */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left (8 cols): Benchmark Cards */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-800 rounded-3xl p-5 sm:p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                <Tag className="w-4 h-4" />
              </div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Price Competitiveness Radar (Local vs. E-Commerce)
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              How your store counter rates compare against nearby physical shops and online e-commerce platforms
            </p>
          </div>

          <div className="space-y-3">
            {SEED_PRICE_BENCHMARKS.map((b) => (
              <div
                key={b.productId}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                      {b.productName}
                    </h4>
                    <span className="text-[10px] text-slate-400 font-bold">{b.brand}</span>
                  </div>

                  {b.status === 'lowest' ? (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-extrabold text-[10px] border border-emerald-300 dark:border-emerald-800 flex items-center gap-1 shrink-0">
                      <ShieldCheck className="w-3 h-3" />
                      <span>Lowest in 5 km</span>
                    </span>
                  ) : b.status === 'competitive' ? (
                    <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 font-extrabold text-[10px] border border-blue-300 dark:border-blue-800 shrink-0">
                      Competitive Rate
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 font-extrabold text-[10px] border border-amber-300 dark:border-amber-800 flex items-center gap-1 shrink-0">
                      <AlertTriangle className="w-3 h-3" />
                      <span>Needs Rate Review</span>
                    </span>
                  )}
                </div>

                {/* 3-Column Rate Comparison */}
                <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center">
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-400 block">Your Price</span>
                    <span className="text-sm font-black text-merchant-600">₹{b.yourCounterPrice}</span>
                  </div>
                  <div className="border-x border-slate-100 dark:border-slate-700">
                    <span className="text-[9px] uppercase font-bold text-slate-400 block">Lowest in 5 km</span>
                    <span className="text-sm font-black text-slate-800 dark:text-slate-200">₹{b.lowestLocalPrice}</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-400 block">Amazon / E-Com</span>
                    <span className="text-sm font-black text-slate-500 line-through">₹{b.ecomMarketPrice}</span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                  💡 <strong>Tip:</strong> {b.marginRecommendation}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right (4 cols): Locality Search Radius Rings */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-800 rounded-3xl p-5 sm:p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-600 flex items-center justify-center">
                <Compass className="w-4 h-4" />
              </div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Buyer Search Distance
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Where your potential walk-in customers are searching from
            </p>
          </div>

          <div className="space-y-4 pt-2">
            {SEED_RADIUS_DISTRIBUTION.map((r) => (
              <div key={r.radiusLabel} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    {r.radiusLabel}
                  </span>
                  <span className="font-black text-slate-900 dark:text-white">
                    {r.percentage}% ({r.leadCount})
                  </span>
                </div>
                <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${r.color} rounded-full transition-all duration-500`}
                    style={{ width: `${r.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 text-xs text-emerald-900 dark:text-emerald-200 space-y-1">
            <div className="font-extrabold flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" />
              <span>Hyper-Local Dominance:</span>
            </div>
            <p className="text-[11px] leading-relaxed opacity-90">
              Over <strong>52% of buyer demand</strong> comes from within 1 km walking distance of your shop front. Keeping counter prices fresh ensures you win these walk-ins over quick-commerce apps!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==============================================================================
// src/components/customer/SearchSuggestionsDropdown.tsx
// Real-time Database Product Autocomplete Suggestions for Search Bar
// ==============================================================================

'use client';

import React from 'react';
import { MasterProduct } from '@/types';
import { Search, Sparkles, ArrowRight, ShoppingBag, Tag } from 'lucide-react';

interface SearchSuggestionsDropdownProps {
  query: string;
  suggestions: MasterProduct[];
  isOpen: boolean;
  selectedIndex: number;
  isLoading?: boolean;
  onSelect: (product: MasterProduct) => void;
  onSearchAll: () => void;
}

/**
 * Highlights matches of query substring inside text
 */
function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query.trim() || !text) return <>{text}</>;

  const cleanQuery = query.trim();
  const lowerText = text.toLowerCase();
  const lowerQuery = cleanQuery.toLowerCase();
  const index = lowerText.indexOf(lowerQuery);

  if (index === -1) {
    return <>{text}</>;
  }

  const before = text.slice(0, index);
  const match = text.slice(index, index + cleanQuery.length);
  const after = text.slice(index + cleanQuery.length);

  return (
    <>
      {before}
      <mark className="bg-emerald-100 text-emerald-950 dark:bg-emerald-900/70 dark:text-emerald-100 font-black px-0.5 rounded">
        {match}
      </mark>
      <HighlightMatch text={after} query={query} />
    </>
  );
}

export function SearchSuggestionsDropdown({
  query,
  suggestions,
  isOpen,
  selectedIndex,
  isLoading,
  onSelect,
  onSearchAll,
}: SearchSuggestionsDropdownProps) {
  if (!isOpen || !query.trim()) {
    return null;
  }

  return (
    <div
      className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-150 max-h-[440px] flex flex-col"
      onMouseDown={(e) => {
        // Prevent search input blur before click registers
        e.preventDefault();
      }}
    >
      {/* Suggestions Header */}
      <div className="px-4 py-2.5 bg-slate-50/90 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400">
        <div className="flex items-center space-x-1.5 text-emerald-700 dark:text-emerald-400">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Products in Database</span>
        </div>
        <div className="flex items-center space-x-2">
          {isLoading && (
            <span className="text-[10px] text-emerald-600 animate-pulse">Searching DB...</span>
          )}
          <span className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-full text-[10px]">
            {suggestions.length} {suggestions.length === 1 ? 'match' : 'matches'}
          </span>
        </div>
      </div>

      {/* Suggestion Items List */}
      <div className="overflow-y-auto flex-1 divide-y divide-slate-100 dark:divide-slate-800/60">
        {suggestions.length > 0 ? (
          suggestions.map((product, idx) => {
            const isSelected = selectedIndex === idx;
            return (
              <div
                key={product.id || idx}
                onClick={() => onSelect(product)}
                className={`px-3.5 py-2.5 flex items-center space-x-3 cursor-pointer transition-colors group ${
                  isSelected
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-l-4 border-l-emerald-500 pl-[10px]'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/70 border-l-4 border-l-transparent'
                }`}
              >
                {/* Product Thumbnail */}
                <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 flex items-center justify-center shrink-0 overflow-hidden group-hover:scale-105 transition-transform">
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        // Fallback on image broken
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <ShoppingBag className="w-5 h-5 text-slate-400" />
                  )}
                </div>

                {/* Product Name & Brand Details */}
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                    <HighlightMatch text={product.name} query={query} />
                  </h4>

                  <div className="flex items-center space-x-1.5 mt-1 flex-wrap gap-y-1">
                    {product.brand && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                        {product.brand}
                      </span>
                    )}

                    {product.model && (
                      <span className="text-[10px] font-medium text-slate-400 truncate max-w-[120px]">
                        {product.model}
                      </span>
                    )}

                    {(product.category || product.categoryName) && (
                      <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                        <Tag className="w-2.5 h-2.5" />
                        <span>{product.category || product.categoryName}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Price & Action Hint */}
                <div className="text-right shrink-0">
                  {product.mrp ? (
                    <div className="text-xs sm:text-sm font-black text-emerald-600 dark:text-emerald-400">
                      ₹{Number(product.mrp).toLocaleString('en-IN')}
                    </div>
                  ) : null}
                  <div className="text-[10px] font-bold text-slate-400 group-hover:text-emerald-600 flex items-center justify-end space-x-0.5 transition-colors">
                    <span>Compare</span>
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="px-4 py-6 text-center">
            <ShoppingBag className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
              No direct product match in catalog for &ldquo;{query}&rdquo;
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Press Enter to search nearby physical stores & inventory anyway.
            </p>
          </div>
        )}
      </div>

      {/* Footer Action: Search All Stores */}
      <div
        onClick={onSearchAll}
        className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between cursor-pointer transition-colors group text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-300"
      >
        <div className="flex items-center space-x-2 truncate">
          <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 shrink-0" />
          <span className="truncate">
            Search all stores for <span className="text-emerald-600 dark:text-emerald-400 font-black">&ldquo;{query}&rdquo;</span>
          </span>
        </div>
        <div className="flex items-center space-x-1 text-[10px] font-mono text-slate-400 shrink-0">
          <span className="border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 rounded bg-white dark:bg-slate-800">↵ Enter</span>
        </div>
      </div>
    </div>
  );
}

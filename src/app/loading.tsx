import React from 'react';

export default function Loading() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Banner Skeleton */}
      <div className="w-full bg-amber-500/10 border-b border-amber-200/50 py-2.5 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="h-4 w-48 bg-amber-200/60 rounded animate-pulse" />
          <div className="h-4 w-32 bg-amber-200/60 rounded animate-pulse hidden sm:block" />
        </div>
      </div>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
        {/* Hero / Banner Skeleton */}
        <div className="w-full h-44 sm:h-56 bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 rounded-2xl animate-pulse shadow-sm flex flex-col justify-center px-8 space-y-4">
          <div className="h-8 w-3/4 max-w-md bg-slate-300/80 rounded-lg animate-pulse" />
          <div className="h-4 w-1/2 max-w-xs bg-slate-300/60 rounded animate-pulse" />
          <div className="flex gap-3 pt-2">
            <div className="h-10 w-32 bg-slate-300/80 rounded-xl animate-pulse" />
            <div className="h-10 w-28 bg-slate-300/60 rounded-xl animate-pulse" />
          </div>
        </div>

        {/* Categories Bar Skeleton */}
        <div className="space-y-3">
          <div className="h-6 w-40 bg-slate-200 rounded-md animate-pulse" />
          <div className="flex gap-3 overflow-x-hidden pb-2">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="flex-shrink-0 flex items-center gap-2.5 px-4 py-3 bg-white border border-slate-200 rounded-xl shadow-xs animate-pulse"
              >
                <div className="w-6 h-6 rounded-full bg-slate-200" />
                <div className="w-20 h-4 bg-slate-200 rounded" />
              </div>
            ))}
          </div>
        </div>

        {/* Product Grid Skeleton */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="h-7 w-52 bg-slate-200 rounded-lg animate-pulse" />
            <div className="h-5 w-24 bg-slate-200 rounded animate-pulse" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-4 animate-pulse flex flex-col justify-between"
              >
                <div className="w-full h-44 bg-slate-100 rounded-xl flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-slate-200/80" />
                </div>
                <div className="space-y-2">
                  <div className="h-3 w-16 bg-amber-100 rounded" />
                  <div className="h-5 w-3/4 bg-slate-200 rounded" />
                  <div className="h-3 w-1/2 bg-slate-100 rounded" />
                </div>
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="h-3 w-12 bg-slate-100 rounded" />
                    <div className="h-6 w-20 bg-slate-200 rounded" />
                  </div>
                  <div className="h-9 w-24 bg-slate-200 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

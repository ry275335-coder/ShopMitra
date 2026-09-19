// ==============================================================================
// src/components/customer/MapView.tsx
// Interactive Leaflet Map with Live Walking Routes & In-Store Navigation (Option 2)
// ==============================================================================

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '@/components/common/AppContext';
import { Shop } from '@/types';
import { 
  formatDistance, 
  getDirectionsUrl, 
  getWalkingDirectionsUrl, 
  getWalkingTimeEstimate, 
  getDriveTimeEstimate 
} from '@/lib/geo';
import { 
  Navigation, 
  Footprints, 
  Compass, 
  Store, 
  Phone, 
  MessageSquare, 
  X, 
  ExternalLink,
  ShieldCheck,
  Clock,
  Car
} from 'lucide-react';

export function MapView({
  shops,
  onOpenShop,
  onSelectShop,
  userLocation: propUserLocation,
  radiusKm: propRadiusKm,
}: {
  shops: Shop[];
  onOpenShop?: (shopId: string) => void;
  onSelectShop?: (shopId: string) => void;
  userLocation?: any;
  radiusKm?: number;
}) {
  const appContext = useApp();
  const userLocation = propUserLocation || appContext.userLocation;
  const radiusKm = propRadiusKm || appContext.searchRadiusKm;
  const handleOpenShop = onSelectShop || onOpenShop || (() => {});
  
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const routeLayerRef = useRef<any>(null);

  const [selectedShopId, setSelectedShopId] = useState<string | null>(null);
  const [navMode, setNavMode] = useState<'walk' | 'drive'>('walk');

  const selectedShop = shops.find(s => s.id === selectedShopId) || null;

  useEffect(() => {
    if (!mapContainerRef.current) return;

    let isMounted = true;

    // Dynamically import Leaflet strictly on client
    import('leaflet').then(L => {
      if (!isMounted || !mapContainerRef.current) return;

      if (!mapInstanceRef.current) {
        const map = L.map(mapContainerRef.current, {
          zoomControl: true,
          scrollWheelZoom: true,
        }).setView(
          [userLocation.lat, userLocation.lng],
          14
        );

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
        }).addTo(map);

        mapInstanceRef.current = map;
      }

      const map = mapInstanceRef.current;

      // Clear existing markers & circles & route line
      map.eachLayer((layer: any) => {
        if (layer instanceof L.Marker || layer instanceof L.Circle || layer instanceof L.Polyline) {
          map.removeLayer(layer);
        }
      });

      // 1. User Pin (Blue Pinpoint with Radar Pulse)
      const userPinIcon = L.divIcon({
        className: 'user-pin',
        html: `
          <div style="background-color: #2563eb; color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 0 6px rgba(37,99,235,0.25); border: 2px solid white; font-size: 14px;">
            📍
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      L.marker([userLocation.lat, userLocation.lng], { icon: userPinIcon })
        .addTo(map)
        .bindPopup(`<b>Your Active Location</b><br/>${userLocation.name}`);

      // 2. User Search Radius Circle
      const activeRadiusMeters = (userLocation.radiusKm || radiusKm || 5) * 1000;
      L.circle([userLocation.lat, userLocation.lng], {
        color: '#16a34a',
        fillColor: '#16a34a',
        fillOpacity: 0.06,
        weight: 1.5,
        radius: activeRadiusMeters,
      }).addTo(map);

      // 3. Shop Pins
      shops.forEach(shop => {
        const isSelected = shop.id === selectedShopId;
        const shopPinIcon = L.divIcon({
          className: 'shop-pin',
          html: `
            <div style="background-color: ${isSelected ? '#047857' : (shop.isVerified ? '#16a34a' : '#ea580c')}; color: white; width: ${isSelected ? '40px' : '34px'}; height: ${isSelected ? '40px' : '34px'}; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: ${isSelected ? '20px' : '16px'}; box-shadow: ${isSelected ? '0 0 0 6px rgba(16,185,129,0.35), 0 6px 14px rgba(0,0,0,0.4)' : '0 4px 10px rgba(0,0,0,0.25)'}; border: 2.5px solid white; cursor: pointer; transition: all 0.2s;">
              🏪
            </div>
          `,
          iconSize: isSelected ? [40, 40] : [34, 34],
          iconAnchor: isSelected ? [20, 20] : [17, 17],
          popupAnchor: [0, -20],
        });

        const marker = L.marker([shop.lat, shop.lng], { icon: shopPinIcon }).addTo(map);

        marker.on('click', () => {
          setSelectedShopId(shop.id);
        });

        const walkEstimate = getWalkingTimeEstimate(shop.distanceKm || 1.0);
        const directionsLink = getWalkingDirectionsUrl(
          shop.lat, 
          shop.lng, 
          userLocation.lat, 
          userLocation.lng
        );

        const popupHtml = `
          <div style="font-family: inherit; min-width: 210px; padding: 2px;">
            <div style="display: flex; align-items: center; gap: 4px; margin-bottom: 2px;">
              <span style="font-size: 10px; font-weight: 800; background: #ecfdf5; color: #047857; padding: 2px 6px; border-radius: 4px;">
                🚶 ${walkEstimate.label}
              </span>
              ${shop.isVerified ? '<span style="color: #10b981; font-weight: 800; font-size: 11px;">✓ Verified</span>' : ''}
            </div>
            <h4 style="font-weight: 800; margin: 2px 0 4px 0; font-size: 14px; color: #0f172a;">${shop.name}</h4>
            <p style="margin: 0 0 6px 0; font-size: 11px; color: #64748b;">
              📍 <b>${formatDistance(shop.distanceKm || 1.0)}</b> away • ${shop.address}
            </p>
            <div style="display: flex; gap: 6px; margin-top: 8px;">
              <a href="${directionsLink}" target="_blank" rel="noopener noreferrer" style="background: #059669; color: white; padding: 6px 10px; border-radius: 8px; text-decoration: none; font-size: 11px; font-weight: bold; display: inline-flex; align-items: center; gap: 4px;">
                Walk There 🚶
              </a>
              <a href="tel:${shop.phone}" style="background: #f1f5f9; color: #334155; padding: 6px 10px; border-radius: 8px; text-decoration: none; font-size: 11px; font-weight: bold;">
                Call 📞
              </a>
            </div>
          </div>
        `;

        marker.bindPopup(popupHtml);
      });

      // 4. Live Walking Route Line if a shop is selected
      if (selectedShop) {
        const routeLine = L.polyline([
          [userLocation.lat, userLocation.lng],
          [selectedShop.lat, selectedShop.lng]
        ], {
          color: '#059669',
          weight: 4.5,
          dashArray: '7, 9',
          opacity: 0.95,
          lineCap: 'round',
        }).addTo(map);

        routeLayerRef.current = routeLine;

        // Fit map bounds comfortably around the user and target store
        const routeBounds = L.latLngBounds([
          [userLocation.lat, userLocation.lng],
          [selectedShop.lat, selectedShop.lng]
        ]);
        map.fitBounds(routeBounds, { padding: [60, 60], maxZoom: 16 });
      } else if (shops.length > 0) {
        // Fit general bounds
        const bounds = L.latLngBounds([[userLocation.lat, userLocation.lng]]);
        shops.forEach(s => {
          if (s.lat && s.lng) bounds.extend([s.lat, s.lng]);
        });
        map.fitBounds(bounds, { padding: [45, 45], maxZoom: 15 });
      } else {
        map.setView([userLocation.lat, userLocation.lng], 14);
      }

      // Invalidate map size to prevent gray tiles on tab toggle or resize
      setTimeout(() => {
        if (isMounted && mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 150);
    });

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [userLocation, shops, radiusKm, selectedShopId]);

  const handleRecenter = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([userLocation.lat, userLocation.lng], 15);
      setSelectedShopId(null);
    }
  };

  const walkInfo = selectedShop ? getWalkingTimeEstimate(selectedShop.distanceKm || 1.0) : null;
  const driveInfo = selectedShop ? getDriveTimeEstimate(selectedShop.distanceKm || 1.0) : null;

  const currentNavUrl = selectedShop 
    ? (navMode === 'walk' 
        ? getWalkingDirectionsUrl(selectedShop.lat, selectedShop.lng, userLocation.lat, userLocation.lng)
        : getDirectionsUrl(selectedShop.lat, selectedShop.lng, selectedShop.name, userLocation.lat, userLocation.lng))
    : '#';

  return (
    <div className="w-full relative rounded-3xl overflow-hidden shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col">
      {/* Map Surface */}
      <div className="w-full h-[480px] sm:h-[530px] relative">
        <div ref={mapContainerRef} className="w-full h-full" />

        {/* Top-Right Floating Legend & Recenter Button */}
        <div className="absolute top-3 right-3 z-[1000] flex flex-col items-end gap-2">
          <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-3 py-1.5 rounded-2xl shadow-md border border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2.5">
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" />
              <span>Verified</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block" />
              <span>Local</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" />
              <span>You</span>
            </div>
          </div>

          <button
            onClick={handleRecenter}
            className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 px-3 py-1.5 rounded-xl shadow-md border border-slate-200 dark:border-slate-800 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5"
            title="Recenter Map to My GPS"
          >
            <Compass className="w-3.5 h-3.5 text-blue-600" />
            <span>My GPS</span>
          </button>
        </div>

        {/* Top-Left Mode Indicator when Route is Active */}
        {selectedShop && (
          <div className="absolute top-3 left-3 z-[1000] bg-emerald-900/90 text-white backdrop-blur-md px-3 py-1.5 rounded-2xl shadow-lg border border-emerald-700/60 text-xs font-bold flex items-center gap-2 animate-in fade-in">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
            <span>Live Route Active</span>
            <button
              onClick={() => setSelectedShopId(null)}
              className="ml-1 p-0.5 hover:bg-emerald-800 rounded-full"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Active Route HUD Card (Floats over bottom of map) */}
        {selectedShop && (
          <div className="absolute bottom-3 left-3 right-3 sm:left-4 sm:right-auto sm:max-w-md z-[1000] animate-in fade-in slide-in-from-bottom-3 duration-200">
            <div className="bg-white/98 dark:bg-slate-900/98 backdrop-blur-md rounded-2xl p-4 shadow-2xl border border-emerald-300 dark:border-emerald-800 space-y-3">
              
              {/* Header: Shop & Close */}
              <div className="flex items-start justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                      {selectedShop.name}
                    </span>
                    {selectedShop.isVerified && (
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {selectedShop.address}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedShopId(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Mode Selector & Live Distance Metrics */}
              <div className="flex items-center justify-between gap-2">
                {/* Walk vs Drive Tabs */}
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                  <button
                    onClick={() => setNavMode('walk')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      navMode === 'walk'
                        ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                        : 'text-slate-500'
                    }`}
                  >
                    <Footprints className="w-3.5 h-3.5" />
                    <span>Walk</span>
                  </button>
                  <button
                    onClick={() => setNavMode('drive')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      navMode === 'drive'
                        ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                        : 'text-slate-500'
                    }`}
                  >
                    <Car className="w-3.5 h-3.5" />
                    <span>Drive</span>
                  </button>
                </div>

                {/* Metric Badge */}
                <div className="text-right">
                  <div className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                    {navMode === 'walk' ? walkInfo?.label : driveInfo?.label}
                  </div>
                  <div className="text-[10px] text-slate-400 font-semibold">
                    {formatDistance(selectedShop.distanceKm || 1.0)} {navMode === 'walk' ? `• ~${walkInfo?.steps} steps` : 'drive'}
                  </div>
                </div>
              </div>

              {/* Quick Action Buttons */}
              <div className="flex items-center gap-2 pt-1">
                <a
                  href={currentNavUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2 px-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Start Live Turn-by-Turn</span>
                </a>

                <button
                  onClick={() => handleOpenShop(selectedShop.id)}
                  className="py-2 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl transition-colors flex items-center gap-1"
                >
                  <Store className="w-3.5 h-3.5" />
                  <span>Store</span>
                </button>
              </div>

            </div>
          </div>
        )}
      </div>

      {/* Quick Store Selector Carousel below Map */}
      <div className="bg-slate-50 dark:bg-slate-950 p-3 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
            <Store className="w-3.5 h-3.5 text-emerald-600" />
            <span>Nearby Counters ({shops.length})</span>
          </span>
          <span className="text-[11px] text-slate-400">Tap to draw walking route</span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-none">
          {shops.map(shop => {
            const isSelected = shop.id === selectedShopId;
            const walk = getWalkingTimeEstimate(shop.distanceKm || 1.0);

            return (
              <button
                key={shop.id}
                onClick={() => setSelectedShopId(shop.id)}
                className={`p-2.5 rounded-2xl text-left shrink-0 transition-all border ${
                  isSelected
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-900 dark:text-emerald-200 shadow-sm ring-1 ring-emerald-500/30'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 text-slate-800 dark:text-slate-200'
                }`}
                style={{ width: '210px' }}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="font-extrabold text-xs truncate">
                    {shop.name}
                  </span>
                  {shop.isVerified && (
                    <ShieldCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                  )}
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                  <span className="font-bold text-emerald-700 dark:text-emerald-400">
                    🚶 {walk.label}
                  </span>
                  <span>{formatDistance(shop.distanceKm || 1.0)}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

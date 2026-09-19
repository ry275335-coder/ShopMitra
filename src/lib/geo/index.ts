// ==============================================================================
// src/lib/geo/index.ts
// Geographic and Distance Utilities
// ==============================================================================

import { UserLocation } from '@/types';

export const DEFAULT_USER_LOCATION: UserLocation = {
  lat: 28.6289,
  lng: 77.2155,
  name: 'Connaught Place, Central Market',
  radiusKm: 5,
};

export const POPULAR_MARKET_PRESETS = [
  // Lucknow & Uttar Pradesh
  { name: 'Hazratganj Central Market, Lucknow', city: 'Lucknow', lat: 26.8467, lng: 80.9462 },
  { name: 'Naka Hindola IT Hub, Lucknow', city: 'Lucknow', lat: 26.8373, lng: 80.9165 },
  { name: 'Aminabad Retail Bazaar, Lucknow', city: 'Lucknow', lat: 26.8441, lng: 80.9248 },
  { name: 'Gomti Nagar Commercial Hub, Lucknow', city: 'Lucknow', lat: 26.8530, lng: 80.9984 },
  { name: 'Naveen Market, Kanpur', city: 'Kanpur', lat: 26.4670, lng: 80.3498 },
  { name: 'Sector 18 Atta Market, Noida', city: 'Noida', lat: 28.5708, lng: 77.3261 },

  // Delhi NCR
  { name: 'Nehru Place IT Market, Delhi', city: 'Delhi', lat: 28.5492, lng: 77.2533 },
  { name: 'Karol Bagh Electronics Hub, Delhi', city: 'Delhi', lat: 28.6515, lng: 77.1906 },
  { name: 'Connaught Place Central Market, Delhi', city: 'Delhi', lat: 28.6328, lng: 77.2195 },
  { name: 'Lajpat Nagar Central Market, Delhi', city: 'Delhi', lat: 28.5700, lng: 77.2400 },
  { name: 'Chandni Chowk Wholesale Market, Delhi', city: 'Delhi', lat: 28.6506, lng: 77.2303 },
  
  // Mumbai
  { name: 'Lamington Road IT Hub, Mumbai', city: 'Mumbai', lat: 18.9634, lng: 72.8184 },
  { name: 'Bandra Linking Road, Mumbai', city: 'Mumbai', lat: 19.0600, lng: 72.8333 },
  { name: 'Crawford Market, Mumbai', city: 'Mumbai', lat: 18.9482, lng: 72.8344 },
  { name: 'Vashi APMC Wholesale Market, Navi Mumbai', city: 'Mumbai', lat: 19.0771, lng: 73.0039 },

  // Bengaluru
  { name: 'SP Road Electronics Market, Bengaluru', city: 'Bengaluru', lat: 12.9647, lng: 77.5847 },
  { name: 'Indiranagar 100ft Road, Bengaluru', city: 'Bengaluru', lat: 12.9784, lng: 77.6408 },
  { name: 'Jayanagar 4th Block Complex, Bengaluru', city: 'Bengaluru', lat: 12.9299, lng: 77.5838 },

  // Pune
  { name: 'FC Road Shopping Hub, Pune', city: 'Pune', lat: 18.5204, lng: 73.8415 },
  { name: 'Budhwar Peth Wholesale Market, Pune', city: 'Pune', lat: 18.5173, lng: 73.8567 },

  // Hyderabad
  { name: 'Koti Electronics Market, Hyderabad', city: 'Hyderabad', lat: 17.3850, lng: 78.4867 },
  { name: 'Madhapur Retail Corridor, Hyderabad', city: 'Hyderabad', lat: 17.4483, lng: 78.3915 },

  // Chennai
  { name: 'Ritchie Street Electronics Hub, Chennai', city: 'Chennai', lat: 13.0674, lng: 80.2707 },
  { name: 'T. Nagar Commercial Market, Chennai', city: 'Chennai', lat: 13.0418, lng: 80.2341 },

  // Kolkata
  { name: 'Chandni Chowk IT Market, Kolkata', city: 'Kolkata', lat: 22.5697, lng: 88.3540 },
  { name: 'Burrabazar Trading District, Kolkata', city: 'Kolkata', lat: 22.5855, lng: 88.3524 },

  // Ahmedabad
  { name: 'Relief Road Electronics Market, Ahmedabad', city: 'Ahmedabad', lat: 23.0270, lng: 72.5873 },
];

/**
 * Calculates straight-line distance in kilometers using the Haversine formula
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;

  const R = 6371; // Earth's radius in kilometers
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance * 10) / 10;
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Formats a distance into human-friendly representation
 */
export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    const meters = Math.round(distanceKm * 1000);
    return `${meters} m`;
  }
  return `${distanceKm.toFixed(1)} km`;
}

export const calculateDistance = calculateHaversineDistance;

/**
 * Builds a direct Google Maps navigation URL
 */
export function getDirectionsUrl(
  lat: number, 
  lng: number, 
  destinationName?: string,
  originLat?: number,
  originLng?: number
): string {
  // Direct Google Maps navigation URL with exact shop coordinates
  let url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  if (originLat && originLng) {
    url += `&origin=${originLat},${originLng}`;
  }
  return url;
}

/**
 * Calculates walking estimate (assuming ~4.5 km/h avg pace)
 */
export function getWalkingTimeEstimate(distanceKm: number): { minutes: number; label: string; steps: number } {
  const minutes = Math.max(1, Math.round((distanceKm / 4.5) * 60));
  const steps = Math.round((distanceKm * 1000) / 0.75);
  const label = minutes < 60 ? `${minutes} min${minutes > 1 ? 's' : ''} walk` : `${Math.floor(minutes / 60)}h ${minutes % 60}m walk`;
  return { minutes, label, steps };
}

/**
 * Calculates vehicle / bike ride estimate (assuming ~22 km/h in city traffic)
 */
export function getDriveTimeEstimate(distanceKm: number): { minutes: number; label: string } {
  const minutes = Math.max(1, Math.round((distanceKm / 22) * 60));
  const label = minutes < 60 ? `${minutes} min${minutes > 1 ? 's' : ''} ride` : `${Math.floor(minutes / 60)}h ${minutes % 60}m ride`;
  return { minutes, label };
}

/**
 * Builds walking-specific Google Maps navigation URL
 */
export function getWalkingDirectionsUrl(
  lat: number,
  lng: number,
  originLat?: number,
  originLng?: number
): string {
  let url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=walking`;
  if (originLat && originLng) {
    url += `&origin=${originLat},${originLng}`;
  }
  return url;
}

/**
 * Parse PostGIS EWKB (hex string) or WKT Point into { lat, lng }
 * Safe for browser and server runtimes without Buffer dependency
 */
export function parsePostGisPoint(location: any): { lat: number; lng: number } {
  if (!location) return { lat: 28.6328, lng: 77.2195 };
  if (typeof location === 'object' && typeof location.lat === 'number' && typeof location.lng === 'number') {
    return { lat: location.lat, lng: location.lng };
  }
  if (typeof location === 'string') {
    // 1. WKT format: POINT(lng lat)
    if (location.includes('POINT') || location.includes('(')) {
      try {
        const parts = location.replace(/POINT|\(|\)/gi, '').trim().split(/\s+/);
        if (parts.length >= 2) {
          const lng = parseFloat(parts[0]);
          const lat = parseFloat(parts[1]);
          if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
        }
      } catch {}
    }

    // 2. EWKB hex format e.g. 0101000020E6100000<8-byte lng><8-byte lat>
    if (/^[0-9A-Fa-f]{42,}$/.test(location)) {
      try {
        const hex = location;
        const isLittleEndian = hex.substring(0, 2) === '01';
        const flagByte = parseInt(hex.substring(2, 4), 16);
        const hasSrid = (flagByte & 0x20) !== 0;
        const coordOffset = hasSrid ? 18 : 10;

        const xHex = hex.substring(coordOffset, coordOffset + 16);
        const yHex = hex.substring(coordOffset + 16, coordOffset + 32);

        const hexToDouble = (h: string, le: boolean): number => {
          const bytes = new Uint8Array(8);
          for (let i = 0; i < 8; i++) {
            bytes[i] = parseInt(h.substring(i * 2, i * 2 + 2), 16);
          }
          const view = new DataView(bytes.buffer);
          return view.getFloat64(0, le);
        };

        const lng = hexToDouble(xHex, isLittleEndian);
        const lat = hexToDouble(yHex, isLittleEndian);
        if (!isNaN(lat) && !isNaN(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
          return { lat, lng };
        }
      } catch {}
    }
  }
  return { lat: 28.6328, lng: 77.2195 };
}


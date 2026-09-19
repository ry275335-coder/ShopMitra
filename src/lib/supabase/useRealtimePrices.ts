// ==============================================================================
// src/lib/supabase/useRealtimePrices.ts
// Real-Time Price Broadcast & Supabase Websocket Sync Engine (Option 4)
// ==============================================================================

'use client';

import { useEffect, useState } from 'react';
import { createClient, isSupabaseConfigured } from './client';
import { checkAndTriggerPriceAlerts } from '@/lib/notifications';

export type RealtimeStatus = 'connected' | 'connecting' | 'local_mode';

export function useRealtimePrices(onPriceUpdate?: (update: { productId: string; newPrice: number; shopId?: string }) => void) {
  const [status, setStatus] = useState<RealtimeStatus>('local_mode');
  const [lastUpdate, setLastUpdate] = useState<any>(null);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setStatus('local_mode');
      
      // Listen to cross-tab local price updates
      const handleLocalUpdate = (e: any) => {
        if (e.detail) {
          setLastUpdate(e.detail);
          if (onPriceUpdate) onPriceUpdate(e.detail);
          checkAndTriggerPriceAlerts(e.detail.productId, e.detail.newPrice, e.detail.shopName || 'Local Store');
        }
      };

      window.addEventListener('shopmitra:local_price_update', handleLocalUpdate);
      return () => {
        window.removeEventListener('shopmitra:local_price_update', handleLocalUpdate);
      };
    }

    // When Supabase is configured with live credentials:
    setStatus('connecting');
    const supabase = createClient();

    const channel = supabase
      .channel('public:shop_inventory_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shop_inventory' },
        (payload: any) => {
          const newRecord = payload.new;
          if (newRecord && newRecord.product_id && newRecord.price) {
            const updateData = {
              productId: newRecord.product_id,
              newPrice: Number(newRecord.price),
              shopId: newRecord.shop_id,
            };

            setLastUpdate(updateData);
            if (onPriceUpdate) onPriceUpdate(updateData);
            checkAndTriggerPriceAlerts(newRecord.product_id, Number(newRecord.price), 'Verified Partner Store');
          }
        }
      )
      .subscribe((subscribeStatus) => {
        if (subscribeStatus === 'SUBSCRIBED') {
          setStatus('connected');
        } else {
          setStatus('local_mode');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { status, lastUpdate };
}

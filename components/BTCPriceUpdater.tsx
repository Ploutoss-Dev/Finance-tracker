'use client';

/**
 * BTCPriceUpdater
 *
 * Invisible component mounted once in the root layout.
 * Every `intervalMs` it calls GET /api/bitcoin/price (our server-side
 * CoinGecko proxy with DB caching). When the price actually changes it
 * dispatches a "btc-price-updated" CustomEvent so dashboard/bitcoin pages
 * can react without page reloads.
 *
 * Architecture:
 *   Browser → /api/bitcoin/price → (if stale) CoinGecko → SQLite cache
 *
 * The server route owns the rate-limit logic; multiple browser tabs just
 * hit our own backend, not CoinGecko directly.
 */

import { useEffect, useRef } from 'react';

export const BTC_PRICE_EVENT = 'btc-price-updated';

interface PricePayload {
  price: number;
  updatedAt: string | null;
  cached: boolean;
  fetchError?: string;
}

const DEFAULT_INTERVAL_MS = 5 * 60 * 1000; // 5 min

export default function BTCPriceUpdater() {
  const lastPriceRef = useRef<number | null>(null);

  useEffect(() => {
    let intervalMs = DEFAULT_INTERVAL_MS;
    let timerId: ReturnType<typeof setTimeout>;

    async function fetchPrice() {
      try {
        const res = await fetch('/api/bitcoin/price', { cache: 'no-store' });
        if (!res.ok) return;
        const data: PricePayload = await res.json();

        // Dispatch event if price changed (or on first load)
        if (data.price !== lastPriceRef.current) {
          lastPriceRef.current = data.price;
          window.dispatchEvent(
            new CustomEvent<PricePayload>(BTC_PRICE_EVENT, { detail: data })
          );
        }
      } catch {
        // Network error — silently ignore, keep last known price
      }

      // Schedule next poll
      timerId = setTimeout(fetchPrice, intervalMs);
    }

    // Read the user-configured interval from settings, then start polling
    fetch('/api/settings', { cache: 'no-store' })
      .then((r) => r.json())
      .then((s) => {
        const mins = Number(s.btc_price_interval);
        if (mins >= 1) intervalMs = mins * 60 * 1000;
      })
      .catch(() => {})
      .finally(() => {
        fetchPrice(); // first fetch immediately
      });

    return () => clearTimeout(timerId);
  }, []);

  return null;
}

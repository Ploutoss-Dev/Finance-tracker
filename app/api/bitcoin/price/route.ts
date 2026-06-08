import { NextResponse } from 'next/server';
import db from '@/lib/db';

// CoinGecko free public API — no key required, ~10-50 req/min limit
const COINGECKO_URL =
  'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=';

// Map app currencies to CoinGecko vs_currency codes (all lowercase)
const SUPPORTED_VS = new Set([
  'eur', 'usd', 'gbp', 'chf', 'cad', 'aud', 'jpy',
]);

function getSetting(key: string): string {
  const row = db
    .prepare('SELECT value FROM settings WHERE key = ?')
    .get(key) as { value: string } | undefined;
  return row?.value ?? '';
}

function upsertSetting(key: string, value: string) {
  db.prepare(
    "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))"
  ).run(key, value);
}

export async function GET() {
  // BTC price is always fetched in the crypto currency (USD by default),
  // keeping it consistent with the crypto portfolio.
  const currency = getSetting('crypto_currency') || 'USD';
  const intervalMinutes = Math.max(1, Number(getSetting('btc_price_interval') || '5'));
  const autoFetch = getSetting('btc_price_auto_fetch') !== 'false';
  const lastUpdatedRaw = getSetting('btc_price_updated_at');
  const cachedPrice = Number(getSetting('btc_current_price') || '0');

  const lastUpdatedMs = lastUpdatedRaw ? new Date(lastUpdatedRaw).getTime() : 0;
  const staleCutoffMs = intervalMinutes * 60 * 1000;
  const isStale = Date.now() - lastUpdatedMs > staleCutoffMs;

  // Return cached value if still fresh or auto-fetch disabled
  if (!isStale || !autoFetch) {
    return NextResponse.json({
      price: cachedPrice,
      currency,
      updatedAt: lastUpdatedRaw || null,
      cached: true,
      autoFetch,
    });
  }

  // Try to fetch live price from CoinGecko
  const vsCode = SUPPORTED_VS.has(currency.toLowerCase())
    ? currency.toLowerCase()
    : 'usd';

  try {
    const res = await fetch(`${COINGECKO_URL}${vsCode}`, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8000), // 8 s timeout
    });

    if (!res.ok) {
      throw new Error(`CoinGecko HTTP ${res.status}`);
    }

    const data = await res.json();
    const price = data?.bitcoin?.[vsCode];

    if (typeof price !== 'number') {
      throw new Error('Unexpected CoinGecko response shape');
    }

    const now = new Date().toISOString();
    upsertSetting('btc_current_price', String(price));
    upsertSetting('btc_price_updated_at', now);

    return NextResponse.json({
      price,
      currency,
      updatedAt: now,
      cached: false,
      autoFetch,
    });
  } catch (err) {
    // Graceful fallback: return last known price, flag the error
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      {
        price: cachedPrice,
        currency,
        updatedAt: lastUpdatedRaw || null,
        cached: true,
        autoFetch,
        fetchError: `Live price unavailable: ${message}. Showing last cached value.`,
      },
      { status: 200 } // still 200 so UI doesn't break
    );
  }
}

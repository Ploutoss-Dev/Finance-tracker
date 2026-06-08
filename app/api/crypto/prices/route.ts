import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { coingeckoId } from '@/lib/cryptoIds';

const CACHE_MINUTES = 5;

function getSetting(key: string): string {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
  return row?.value ?? '';
}

/** Return all cached prices from DB. */
export async function GET(req: NextRequest) {
  const force = new URL(req.url).searchParams.get('force') === 'true';
  const currency = (getSetting('crypto_currency') || 'USD').toLowerCase();

  // Collect unique symbols that have a known CoinGecko ID
  const symbols = (
    db.prepare('SELECT DISTINCT UPPER(symbol) as symbol FROM crypto_assets').all() as { symbol: string }[]
  ).map((r) => r.symbol);

  if (symbols.length === 0) {
    return NextResponse.json({ prices: {}, updated_at: null, currency });
  }

  const inClause = symbols.map(() => '?').join(',');

  // Check cache freshness (use the oldest entry as the watermark)
  if (!force) {
    const oldest = db
      .prepare(`SELECT MIN(updated_at) as t FROM crypto_prices WHERE symbol IN (${inClause})`)
      .get(...symbols) as { t: string | null };

    if (oldest?.t) {
      const ageMs = Date.now() - new Date(oldest.t).getTime();
      if (ageMs < CACHE_MINUTES * 60 * 1000) {
        const rows = db
          .prepare(`SELECT * FROM crypto_prices WHERE symbol IN (${inClause})`)
          .all(...symbols) as { symbol: string; price: number; updated_at: string }[];
        const prices = Object.fromEntries(rows.map((r) => [r.symbol, r.price]));
        return NextResponse.json({ prices, updated_at: oldest.t, currency, cached: true });
      }
    }
  }

  // Map symbols → CoinGecko IDs
  const idMap: Record<string, string> = {}; // cgId → symbol
  for (const sym of symbols) {
    const cgId = coingeckoId(sym);
    if (cgId) idMap[cgId] = sym;
  }

  const ids = Object.keys(idMap);
  if (ids.length === 0) {
    return NextResponse.json({ prices: {}, updated_at: null, currency, cached: false, note: 'No mappable symbols' });
  }

  try {
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(',')}&vs_currencies=${currency}`;
    const res = await fetch(url, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) throw new Error(`CoinGecko HTTP ${res.status}`);
    const data = await res.json();

    const upsert = db.prepare(
      "INSERT OR REPLACE INTO crypto_prices (symbol, coingecko_id, price, updated_at) VALUES (?, ?, ?, datetime('now'))"
    );
    const now = new Date().toISOString();

    for (const [cgId, sym] of Object.entries(idMap)) {
      const price = data[cgId]?.[currency];
      if (typeof price === 'number') {
        upsert.run(sym, cgId, price);
      }
    }

    const rows = db
      .prepare(`SELECT * FROM crypto_prices WHERE symbol IN (${inClause})`)
      .all(...symbols) as { symbol: string; price: number }[];
    const prices = Object.fromEntries(rows.map((r) => [r.symbol, r.price]));
    return NextResponse.json({ prices, updated_at: now, currency, cached: false });
  } catch (err) {
    // Return whatever we have in cache as fallback
    const rows = db
      .prepare(`SELECT * FROM crypto_prices WHERE symbol IN (${inClause})`)
      .all(...symbols) as { symbol: string; price: number; updated_at: string }[];
    const prices = Object.fromEntries(rows.map((r) => [r.symbol, r.price]));
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({
      prices,
      updated_at: null,
      currency,
      cached: true,
      fetchError: `Price fetch failed: ${message}. Showing last cached values.`,
    });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { all, get, run } from '@/lib/query';
import { initDB } from '@/lib/db';
import { coingeckoId } from '@/lib/cryptoIds';

const CACHE_MINUTES = 5;

export async function GET(req: NextRequest) {
  await initDB();
  const force = new URL(req.url).searchParams.get('force') === 'true';
  const currencyRow = await get<{ value: string }>('SELECT value FROM settings WHERE key = ?', ['crypto_currency']);
  const currency = (currencyRow?.value || 'USD').toLowerCase();

  const symbolRows = await all<{ symbol: string }>('SELECT DISTINCT UPPER(symbol) as symbol FROM crypto_assets');
  const symbols = symbolRows.map((r) => r.symbol);

  if (symbols.length === 0) return NextResponse.json({ prices: {}, updated_at: null, currency });

  if (!force) {
    const oldest = await get<{ t: string | null }>(`SELECT MIN(updated_at) as t FROM crypto_prices WHERE symbol IN (${symbols.map(() => '?').join(',')})`, symbols);
    if (oldest?.t && Date.now() - new Date(oldest.t).getTime() < CACHE_MINUTES * 60 * 1000) {
      const rows = await all<{ symbol: string; price: number; updated_at: string }>(`SELECT * FROM crypto_prices WHERE symbol IN (${symbols.map(() => '?').join(',')})`, symbols);
      return NextResponse.json({ prices: Object.fromEntries(rows.map((r) => [r.symbol, r.price])), updated_at: oldest.t, currency, cached: true });
    }
  }

  const idMap: Record<string, string> = {};
  for (const sym of symbols) { const cgId = coingeckoId(sym); if (cgId) idMap[cgId] = sym; }
  const ids = Object.keys(idMap);
  if (ids.length === 0) return NextResponse.json({ prices: {}, updated_at: null, currency, cached: false });

  try {
    const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(',')}&vs_currencies=${currency}`, { cache: 'no-store', headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`CoinGecko HTTP ${res.status}`);
    const data = await res.json();
    const now = new Date().toISOString();
    for (const [cgId, sym] of Object.entries(idMap)) {
      const price = data[cgId]?.[currency];
      if (typeof price === 'number') await run("INSERT OR REPLACE INTO crypto_prices (symbol, coingecko_id, price, updated_at) VALUES (?, ?, ?, datetime('now'))", [sym, cgId, price]);
    }
    const rows = await all<{ symbol: string; price: number }>(`SELECT * FROM crypto_prices WHERE symbol IN (${symbols.map(() => '?').join(',')})`, symbols);
    return NextResponse.json({ prices: Object.fromEntries(rows.map((r) => [r.symbol, r.price])), updated_at: now, currency, cached: false });
  } catch (err) {
    const rows = await all<{ symbol: string; price: number; updated_at: string }>(`SELECT * FROM crypto_prices WHERE symbol IN (${symbols.map(() => '?').join(',')})`, symbols);
    return NextResponse.json({ prices: Object.fromEntries(rows.map((r) => [r.symbol, r.price])), updated_at: null, currency, cached: true, fetchError: `Price fetch failed: ${err instanceof Error ? err.message : 'Unknown'}` });
  }
}

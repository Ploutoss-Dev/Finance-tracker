import { NextResponse } from 'next/server';
import { get, run } from '@/lib/query';
import { initDB } from '@/lib/db';

const COINGECKO_URL = 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=';
const SUPPORTED_VS = new Set(['eur','usd','gbp','chf','cad','aud','jpy']);

async function getSetting(key: string): Promise<string> {
  const row = await get<{ value: string }>('SELECT value FROM settings WHERE key = ?', [key]);
  return row?.value ?? '';
}

async function upsertSetting(key: string, value: string) {
  await run("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))", [key, value]);
}

export async function GET() {
  await initDB();
  const currency = await getSetting('crypto_currency') || 'USD';
  const intervalMinutes = Math.max(1, Number(await getSetting('btc_price_interval') || '5'));
  const autoFetch = await getSetting('btc_price_auto_fetch') !== 'false';
  const lastUpdatedRaw = await getSetting('btc_price_updated_at');
  const cachedPrice = Number(await getSetting('btc_current_price') || '0');
  const isStale = Date.now() - (lastUpdatedRaw ? new Date(lastUpdatedRaw).getTime() : 0) > intervalMinutes * 60 * 1000;

  if (!isStale || !autoFetch) {
    return NextResponse.json({ price: cachedPrice, currency, updatedAt: lastUpdatedRaw || null, cached: true, autoFetch });
  }

  const vsCode = SUPPORTED_VS.has(currency.toLowerCase()) ? currency.toLowerCase() : 'usd';
  try {
    const res = await fetch(`${COINGECKO_URL}${vsCode}`, { cache: 'no-store', headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`CoinGecko HTTP ${res.status}`);
    const data = await res.json();
    const price = data?.bitcoin?.[vsCode];
    if (typeof price !== 'number') throw new Error('Unexpected response');
    const now = new Date().toISOString();
    await upsertSetting('btc_current_price', String(price));
    await upsertSetting('btc_price_updated_at', now);
    return NextResponse.json({ price, currency, updatedAt: now, cached: false, autoFetch });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ price: cachedPrice, currency, updatedAt: lastUpdatedRaw || null, cached: true, autoFetch, fetchError: `Live price unavailable: ${message}` }, { status: 200 });
  }
}

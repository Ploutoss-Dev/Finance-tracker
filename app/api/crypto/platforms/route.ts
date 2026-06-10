import { NextRequest, NextResponse } from 'next/server';
import { all, get, run } from '@/lib/query';
import { initDB } from '@/lib/db';

export async function GET() {
  await initDB();
  const platforms = await all<{ id: number; name: string; created_at: string }>('SELECT * FROM crypto_platforms ORDER BY name ASC');
  const result = await Promise.all(platforms.map(async (p) => {
    const assets = await all<Record<string, unknown>>(`
      SELECT ca.*, cp.price AS fetched_price
      FROM crypto_assets ca
      LEFT JOIN crypto_prices cp ON UPPER(ca.symbol) = UPPER(cp.symbol)
      WHERE ca.platform_id = ?
      ORDER BY ca.amount * COALESCE(ca.manual_price, cp.price, 0) DESC
    `, [p.id]);
    const enriched = assets.map((row) => {
      const price = (row.manual_price as number) ?? (row.fetched_price as number) ?? 0;
      const value = (row.amount as number) * price;
      const profit_loss = row.invested_amount !== null ? value - (row.invested_amount as number) : null;
      const profit_loss_pct = profit_loss !== null && (row.invested_amount as number) > 0 ? (profit_loss / (row.invested_amount as number)) * 100 : null;
      return { ...row, price, value, has_live_price: row.fetched_price !== null, profit_loss, profit_loss_pct };
    });
    return { ...p, assets: enriched, total_value: enriched.reduce((s, a) => s + (a.value as number), 0) };
  }));
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  await initDB();
  const { name } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: 'name is required' }, { status: 400 });
  try {
    const id = await run('INSERT INTO crypto_platforms (name) VALUES (?)', [name.trim()]);
    const row = await get('SELECT * FROM crypto_platforms WHERE id = ?', [id]);
    return NextResponse.json({ ...row, assets: [], total_value: 0 }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Platform name already exists' }, { status: 409 });
  }
}

export async function DELETE(req: NextRequest) {
  await initDB();
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  await run('DELETE FROM crypto_platforms WHERE id = ?', [Number(id)]);
  return NextResponse.json({ success: true });
}

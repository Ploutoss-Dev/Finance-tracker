import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import type { CryptoPlatformWithAssets, CryptoAsset } from '@/lib/types';

type AssetRow = {
  id: number; platform_id: number; name: string; symbol: string;
  amount: number; manual_price: number | null; invested_amount: number | null;
  notes: string; created_at: string; fetched_price: number | null;
};

function buildAsset(row: AssetRow): CryptoAsset {
  const price = row.manual_price ?? row.fetched_price ?? 0;
  const value = row.amount * price;
  const profit_loss = row.invested_amount !== null ? value - row.invested_amount : null;
  const profit_loss_pct =
    profit_loss !== null && row.invested_amount !== null && row.invested_amount > 0
      ? (profit_loss / row.invested_amount) * 100
      : null;
  return {
    ...row,
    price,
    value,
    has_live_price: row.fetched_price !== null,
    profit_loss,
    profit_loss_pct,
  };
}

/** Fetch all platforms with their assets and computed values. */
export async function GET() {
  const platforms = db
    .prepare('SELECT * FROM crypto_platforms ORDER BY name ASC')
    .all() as { id: number; name: string; created_at: string }[];

  const getAssets = db.prepare<[number], AssetRow>(`
    SELECT ca.*,
           cp.price AS fetched_price
    FROM   crypto_assets ca
    LEFT JOIN crypto_prices cp ON UPPER(ca.symbol) = UPPER(cp.symbol)
    WHERE  ca.platform_id = ?
    ORDER BY ca.amount * COALESCE(ca.manual_price, cp.price, 0) DESC
  `);

  const result: CryptoPlatformWithAssets[] = platforms.map((p) => {
    const assets = getAssets.all(p.id).map(buildAsset);
    const total_value = assets.reduce((s, a) => s + a.value, 0);
    return { ...p, assets, total_value };
  });

  return NextResponse.json(result);
}

/** Create a new platform. */
export async function POST(req: NextRequest) {
  const { name } = await req.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }
  try {
    const r = db
      .prepare('INSERT INTO crypto_platforms (name) VALUES (?)')
      .run(name.trim());
    const row = db.prepare('SELECT * FROM crypto_platforms WHERE id = ?').get(r.lastInsertRowid);
    return NextResponse.json({ ...(row as object), assets: [], total_value: 0 }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Platform name already exists' }, { status: 409 });
  }
}

/** Delete a platform (cascades to its assets). */
export async function DELETE(req: NextRequest) {
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  db.prepare('DELETE FROM crypto_platforms WHERE id = ?').run(Number(id));
  return NextResponse.json({ success: true });
}

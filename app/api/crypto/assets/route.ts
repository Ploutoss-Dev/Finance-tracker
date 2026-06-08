import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    platform_id,
    name,
    symbol,
    amount,
    manual_price = null,
    invested_amount = null,
    notes = '',
  } = body;

  if (!platform_id || !name || !symbol || amount === undefined) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const r = db
    .prepare(
      `INSERT INTO crypto_assets (platform_id, name, symbol, amount, manual_price, invested_amount, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      Number(platform_id),
      name.trim(),
      symbol.trim().toUpperCase(),
      Number(amount),
      manual_price !== null ? Number(manual_price) : null,
      invested_amount !== null ? Number(invested_amount) : null,
      notes
    );

  const row = db.prepare('SELECT * FROM crypto_assets WHERE id = ?').get(r.lastInsertRowid);
  return NextResponse.json(row, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, amount, manual_price, invested_amount, notes } = body;
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const fields: string[] = [];
  const values: (number | string | null)[] = [];

  if (amount !== undefined) { fields.push('amount = ?'); values.push(Number(amount)); }
  if (manual_price !== undefined) { fields.push('manual_price = ?'); values.push(manual_price !== null ? Number(manual_price) : null); }
  if (invested_amount !== undefined) { fields.push('invested_amount = ?'); values.push(invested_amount !== null ? Number(invested_amount) : null); }
  if (notes !== undefined) { fields.push('notes = ?'); values.push(notes); }

  if (fields.length === 0) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  values.push(Number(id));

  db.prepare(`UPDATE crypto_assets SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  const row = db.prepare('SELECT * FROM crypto_assets WHERE id = ?').get(Number(id));
  return NextResponse.json(row);
}

export async function DELETE(req: NextRequest) {
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  db.prepare('DELETE FROM crypto_assets WHERE id = ?').run(Number(id));
  return NextResponse.json({ success: true });
}

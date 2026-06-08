import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
  const entries = db.prepare('SELECT * FROM bitcoin_entries ORDER BY date ASC').all();
  return NextResponse.json(entries);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { date, price_per_btc, amount_invested, btc_amount, notes = '' } = body;

  // Must have either amount_invested OR btc_amount (and price)
  if (!date || !price_per_btc) {
    return NextResponse.json({ error: 'date and price_per_btc are required' }, { status: 400 });
  }

  let finalBtcAmount = Number(btc_amount);
  let finalAmountInvested = Number(amount_invested);

  if (amount_invested && !btc_amount) {
    finalBtcAmount = finalAmountInvested / Number(price_per_btc);
  } else if (btc_amount && !amount_invested) {
    finalAmountInvested = finalBtcAmount * Number(price_per_btc);
  } else if (!amount_invested && !btc_amount) {
    return NextResponse.json({ error: 'Provide amount_invested or btc_amount' }, { status: 400 });
  }

  const result = db
    .prepare('INSERT INTO bitcoin_entries (date, price_per_btc, amount_invested, btc_amount, notes) VALUES (?, ?, ?, ?, ?)')
    .run(date, Number(price_per_btc), finalAmountInvested, finalBtcAmount, notes);

  const row = db.prepare('SELECT * FROM bitcoin_entries WHERE id = ?').get(result.lastInsertRowid);
  return NextResponse.json(row, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  db.prepare('DELETE FROM bitcoin_entries WHERE id = ?').run(Number(id));
  return NextResponse.json({ success: true });
}

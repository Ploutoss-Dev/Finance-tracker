import { NextRequest, NextResponse } from 'next/server';
import { all, get, run } from '@/lib/query';
import { initDB } from '@/lib/db';

export async function GET() {
  await initDB();
  const entries = await all('SELECT * FROM bitcoin_entries ORDER BY date ASC');
  return NextResponse.json(entries);
}

export async function POST(req: NextRequest) {
  await initDB();
  const body = await req.json();
  const { date, price_per_btc, amount_invested, btc_amount, notes = '' } = body;
  if (!date || !price_per_btc) {
    return NextResponse.json({ error: 'date and price_per_btc are required' }, { status: 400 });
  }
  let finalBtcAmount = Number(btc_amount);
  let finalAmountInvested = Number(amount_invested);
  if (amount_invested && !btc_amount) finalBtcAmount = finalAmountInvested / Number(price_per_btc);
  else if (btc_amount && !amount_invested) finalAmountInvested = finalBtcAmount * Number(price_per_btc);
  else if (!amount_invested && !btc_amount) return NextResponse.json({ error: 'Provide amount_invested or btc_amount' }, { status: 400 });
  const id = await run('INSERT INTO bitcoin_entries (date, price_per_btc, amount_invested, btc_amount, notes) VALUES (?, ?, ?, ?, ?)', [date, Number(price_per_btc), finalAmountInvested, finalBtcAmount, notes]);
  const row = await get('SELECT * FROM bitcoin_entries WHERE id = ?', [id]);
  return NextResponse.json(row, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  await initDB();
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  await run('DELETE FROM bitcoin_entries WHERE id = ?', [Number(id)]);
  return NextResponse.json({ success: true });
}

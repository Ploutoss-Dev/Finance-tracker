import { NextRequest, NextResponse } from 'next/server';
import { all, get, run } from '@/lib/query';
import { initDB } from '@/lib/db';

export async function GET() {
  await initDB();
  const rows = await all('SELECT * FROM income ORDER BY date DESC, created_at DESC');
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  await initDB();
  const body = await req.json();
  const { amount, source, category, date, notes = '' } = body;
  if (!amount || !source || !category || !date) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }
  const id = await run('INSERT INTO income (amount, source, category, date, notes) VALUES (?, ?, ?, ?, ?)', [Number(amount), source, category, date, notes]);
  const row = await get('SELECT * FROM income WHERE id = ?', [id]);
  return NextResponse.json(row, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  await initDB();
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  await run('DELETE FROM income WHERE id = ?', [Number(id)]);
  return NextResponse.json({ success: true });
}

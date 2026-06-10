import { NextRequest, NextResponse } from 'next/server';
import { all, get, run } from '@/lib/query';
import { initDB } from '@/lib/db';

export async function GET() {
  await initDB();
  const rows = await all('SELECT * FROM expenses ORDER BY date DESC, created_at DESC');
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  await initDB();
  const body = await req.json();
  const { amount, category, description, date, notes = '' } = body;
  if (!amount || !category || !description || !date) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }
  const id = await run('INSERT INTO expenses (amount, category, description, date, notes) VALUES (?, ?, ?, ?, ?)', [Number(amount), category, description, date, notes]);
  const row = await get('SELECT * FROM expenses WHERE id = ?', [id]);
  return NextResponse.json(row, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  await initDB();
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  await run('DELETE FROM expenses WHERE id = ?', [Number(id)]);
  return NextResponse.json({ success: true });
}

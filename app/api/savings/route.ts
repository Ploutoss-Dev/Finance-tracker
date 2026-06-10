import { NextRequest, NextResponse } from 'next/server';
import { all, get, run } from '@/lib/query';
import { initDB } from '@/lib/db';

export async function GET() {
  await initDB();
  const setting = await get<{ value: string }>('SELECT value FROM settings WHERE key = ?', ['current_savings']);
  const history = await all('SELECT * FROM savings_history ORDER BY date DESC, created_at DESC LIMIT 50');
  return NextResponse.json({ current: Number(setting?.value ?? 0), history });
}

export async function POST(req: NextRequest) {
  await initDB();
  const body = await req.json();
  const { balance, note = '', date } = body;
  if (balance === undefined || balance === null) {
    return NextResponse.json({ error: 'Missing balance' }, { status: 400 });
  }
  const entryDate = date || new Date().toISOString().split('T')[0];
  const newBalance = Number(balance);
  await run("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('current_savings', ?, datetime('now'))", [String(newBalance)]);
  const id = await run('INSERT INTO savings_history (balance, note, date) VALUES (?, ?, ?)', [newBalance, note, entryDate]);
  const row = await get('SELECT * FROM savings_history WHERE id = ?', [id]);
  return NextResponse.json({ current: newBalance, entry: row }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  await initDB();
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  await run('DELETE FROM savings_history WHERE id = ?', [Number(id)]);
  return NextResponse.json({ success: true });
}

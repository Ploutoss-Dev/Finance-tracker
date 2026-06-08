import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
  const currentSetting = db.prepare("SELECT value FROM settings WHERE key = 'current_savings'").get() as { value: string } | undefined;
  const history = db.prepare('SELECT * FROM savings_history ORDER BY date DESC, created_at DESC LIMIT 50').all();
  return NextResponse.json({
    current: Number(currentSetting?.value ?? 0),
    history,
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { balance, note = '', date } = body;

  if (balance === undefined || balance === null) {
    return NextResponse.json({ error: 'Missing balance' }, { status: 400 });
  }

  const entryDate = date || new Date().toISOString().split('T')[0];
  const newBalance = Number(balance);

  // Update current savings in settings
  db.prepare("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('current_savings', ?, datetime('now'))").run(String(newBalance));

  // Record in history
  const result = db
    .prepare('INSERT INTO savings_history (balance, note, date) VALUES (?, ?, ?)')
    .run(newBalance, note, entryDate);

  const row = db.prepare('SELECT * FROM savings_history WHERE id = ?').get(result.lastInsertRowid);
  return NextResponse.json({ current: newBalance, entry: row }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  db.prepare('DELETE FROM savings_history WHERE id = ?').run(Number(id));
  return NextResponse.json({ success: true });
}

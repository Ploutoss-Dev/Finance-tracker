import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
  const rows = db.prepare('SELECT * FROM expenses ORDER BY date DESC, created_at DESC').all();
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { amount, category, description, date, notes = '' } = body;

  if (!amount || !category || !description || !date) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const result = db
    .prepare('INSERT INTO expenses (amount, category, description, date, notes) VALUES (?, ?, ?, ?, ?)')
    .run(Number(amount), category, description, date, notes);

  const row = db.prepare('SELECT * FROM expenses WHERE id = ?').get(result.lastInsertRowid);
  return NextResponse.json(row, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  db.prepare('DELETE FROM expenses WHERE id = ?').run(Number(id));
  return NextResponse.json({ success: true });
}

import { NextRequest, NextResponse } from 'next/server';
import { all, get, run } from '@/lib/query';
import { initDB } from '@/lib/db';

export async function GET() {
  await initDB();
  const rows = await all('SELECT * FROM loans ORDER BY created_at DESC');
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  await initDB();
  const body = await req.json();
  const { name, lender = '', principal, current_balance, interest_rate, loan_type = 'personal', start_date, end_date = '', notes = '' } = body;
  if (!name || principal === undefined || current_balance === undefined || !interest_rate || !start_date) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }
  const id = await run('INSERT INTO loans (name, lender, principal, current_balance, interest_rate, loan_type, start_date, end_date, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [name, lender, Number(principal), Number(current_balance), Number(interest_rate), loan_type, start_date, end_date, notes]);
  const row = await get('SELECT * FROM loans WHERE id = ?', [id]);
  return NextResponse.json(row, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  await initDB();
  const body = await req.json();
  const { id, current_balance } = body;
  if (!id || current_balance === undefined) {
    return NextResponse.json({ error: 'id and current_balance required' }, { status: 400 });
  }
  await run('UPDATE loans SET current_balance = ? WHERE id = ?', [Number(current_balance), Number(id)]);
  const row = await get('SELECT * FROM loans WHERE id = ?', [Number(id)]);
  return NextResponse.json(row);
}

export async function DELETE(req: NextRequest) {
  await initDB();
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  await run('DELETE FROM loans WHERE id = ?', [Number(id)]);
  return NextResponse.json({ success: true });
}

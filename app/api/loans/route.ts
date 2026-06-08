import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
  const rows = db
    .prepare('SELECT * FROM loans ORDER BY created_at DESC')
    .all();
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    name,
    lender = '',
    principal,
    current_balance,
    interest_rate,
    loan_type = 'personal',
    start_date,
    end_date = '',
    notes = '',
  } = body;

  if (!name || principal === undefined || current_balance === undefined || !interest_rate || !start_date) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const result = db
    .prepare(
      `INSERT INTO loans
        (name, lender, principal, current_balance, interest_rate, loan_type, start_date, end_date, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      name,
      lender,
      Number(principal),
      Number(current_balance),
      Number(interest_rate),
      loan_type,
      start_date,
      end_date,
      notes
    );

  const row = db.prepare('SELECT * FROM loans WHERE id = ?').get(result.lastInsertRowid);
  return NextResponse.json(row, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  // Allow updating the current_balance of a loan (payment made)
  const body = await req.json();
  const { id, current_balance } = body;
  if (!id || current_balance === undefined) {
    return NextResponse.json({ error: 'id and current_balance required' }, { status: 400 });
  }
  db.prepare('UPDATE loans SET current_balance = ? WHERE id = ?').run(
    Number(current_balance),
    Number(id)
  );
  const row = db.prepare('SELECT * FROM loans WHERE id = ?').get(Number(id));
  return NextResponse.json(row);
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  db.prepare('DELETE FROM loans WHERE id = ?').run(Number(id));
  return NextResponse.json({ success: true });
}

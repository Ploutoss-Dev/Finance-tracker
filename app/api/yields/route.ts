import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

/** Compute effective annual yield rate for a given APR and compounding type. */
function effectiveAnnualRate(apr: number, compounding: string): number {
  const r = apr / 100;
  switch (compounding) {
    case 'daily':
      return Math.pow(1 + r / 365, 365) - 1;
    case 'monthly':
      return Math.pow(1 + r / 12, 12) - 1;
    case 'yearly':
      return r;
    case 'none':
    default:
      return r; // simple interest
  }
}

function attachYields(row: Record<string, unknown>) {
  const apr = Number(row.apr);
  const principal = Number(row.principal);
  const compounding = String(row.compounding);
  const ear = effectiveAnnualRate(apr, compounding);
  const yearly_yield = principal * ear;
  return {
    ...row,
    yearly_yield,
    monthly_yield: yearly_yield / 12,
    daily_yield: yearly_yield / 365,
  };
}

export async function GET() {
  const rows = db
    .prepare('SELECT * FROM yields ORDER BY created_at DESC')
    .all() as Record<string, unknown>[];
  return NextResponse.json(rows.map(attachYields));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    name,
    asset,
    principal,
    apr,
    compounding = 'daily',
    start_date,
    notes = '',
  } = body;

  if (!name || !asset || principal === undefined || apr === undefined || !start_date) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const result = db
    .prepare(
      `INSERT INTO yields (name, asset, principal, apr, compounding, start_date, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(name, asset, Number(principal), Number(apr), compounding, start_date, notes);

  const row = db
    .prepare('SELECT * FROM yields WHERE id = ?')
    .get(result.lastInsertRowid) as Record<string, unknown>;
  return NextResponse.json(attachYields(row), { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  db.prepare('DELETE FROM yields WHERE id = ?').run(Number(id));
  return NextResponse.json({ success: true });
}

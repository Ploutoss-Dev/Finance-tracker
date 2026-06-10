import { NextRequest, NextResponse } from 'next/server';
import { all, get, run } from '@/lib/query';
import { initDB } from '@/lib/db';

function effectiveAnnualRate(apr: number, compounding: string): number {
  const r = apr / 100;
  switch (compounding) {
    case 'daily': return Math.pow(1 + r / 365, 365) - 1;
    case 'monthly': return Math.pow(1 + r / 12, 12) - 1;
    case 'yearly': return r;
    default: return r;
  }
}

function attachYields(row: Record<string, unknown>) {
  const ear = effectiveAnnualRate(Number(row.apr), String(row.compounding));
  const yearly_yield = Number(row.principal) * ear;
  return { ...row, yearly_yield, monthly_yield: yearly_yield / 12, daily_yield: yearly_yield / 365 };
}

export async function GET() {
  await initDB();
  const rows = await all('SELECT * FROM yields ORDER BY created_at DESC');
  return NextResponse.json(rows.map(attachYields));
}

export async function POST(req: NextRequest) {
  await initDB();
  const body = await req.json();
  const { name, asset, principal, apr, compounding = 'daily', start_date, notes = '' } = body;
  if (!name || !asset || principal === undefined || apr === undefined || !start_date) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }
  const id = await run('INSERT INTO yields (name, asset, principal, apr, compounding, start_date, notes) VALUES (?, ?, ?, ?, ?, ?, ?)', [name, asset, Number(principal), Number(apr), compounding, start_date, notes]);
  const row = await get('SELECT * FROM yields WHERE id = ?', [id]);
  return NextResponse.json(attachYields(row as Record<string, unknown>), { status: 201 });
}

export async function DELETE(req: NextRequest) {
  await initDB();
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  await run('DELETE FROM yields WHERE id = ?', [Number(id)]);
  return NextResponse.json({ success: true });
}

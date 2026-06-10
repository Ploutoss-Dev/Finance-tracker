import { NextRequest, NextResponse } from 'next/server';
import { all, run } from '@/lib/query';
import { initDB } from '@/lib/db';

export async function GET() {
  await initDB();
  const rows = await all<{ key: string; value: string }>('SELECT key, value FROM settings');
  const settings: Record<string, string> = {};
  for (const row of rows) settings[row.key] = row.value;
  return NextResponse.json(settings);
}

export async function POST(req: NextRequest) {
  await initDB();
  const body = await req.json();
  for (const [key, value] of Object.entries(body)) {
    await run("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))", [key, String(value)]);
  }
  const rows = await all<{ key: string; value: string }>('SELECT key, value FROM settings');
  const settings: Record<string, string> = {};
  for (const row of rows) settings[row.key] = row.value;
  return NextResponse.json(settings);
}

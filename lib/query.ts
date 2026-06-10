import db from './db';
import type { InArgs } from '@libsql/client';

export async function all<T = Record<string, unknown>>(sql: string, args: InArgs = []): Promise<T[]> {
  const result = await db.execute({ sql, args });
  return result.rows as unknown as T[];
}

export async function get<T = Record<string, unknown>>(sql: string, args: InArgs = []): Promise<T | null> {
  const result = await db.execute({ sql, args });
  return (result.rows[0] as unknown as T) ?? null;
}

export async function run(sql: string, args: InArgs = []): Promise<number> {
  const result = await db.execute({ sql, args });
  return Number(result.lastInsertRowid ?? 0);
}

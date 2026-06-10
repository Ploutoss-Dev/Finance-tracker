import { createClient } from '@libsql/client';

const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

export async function initDB() {
  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS income (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      amount REAL NOT NULL,
      source TEXT NOT NULL,
      category TEXT NOT NULL,
      date TEXT NOT NULL,
      notes TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      amount REAL NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      date TEXT NOT NULL,
      notes TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS savings_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      balance REAL NOT NULL,
      note TEXT DEFAULT '',
      date TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS bitcoin_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      date TEXT NOT NULL,
      price_per_btc REAL NOT NULL,
      amount_invested REAL NOT NULL,
      btc_amount REAL NOT NULL,
      notes TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS loans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      name TEXT NOT NULL,
      lender TEXT NOT NULL DEFAULT '',
      principal REAL NOT NULL,
      current_balance REAL NOT NULL,
      interest_rate REAL NOT NULL,
      loan_type TEXT NOT NULL DEFAULT 'personal',
      start_date TEXT NOT NULL,
      end_date TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS yields (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      name TEXT NOT NULL,
      asset TEXT NOT NULL,
      principal REAL NOT NULL,
      apr REAL NOT NULL,
      compounding TEXT NOT NULL DEFAULT 'daily',
      start_date TEXT NOT NULL,
      notes TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS crypto_platforms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      name TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS crypto_assets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      platform_id INTEGER NOT NULL REFERENCES crypto_platforms(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      symbol TEXT NOT NULL,
      amount REAL NOT NULL DEFAULT 0,
      manual_price REAL,
      invested_amount REAL,
      notes TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS crypto_prices (
      symbol TEXT PRIMARY KEY,
      coingecko_id TEXT NOT NULL DEFAULT '',
      price REAL NOT NULL DEFAULT 0,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, key)
    );
  `);
}

export default db;

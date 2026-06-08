import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DATA_DIR = path.join(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'finance.db');
const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS income (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    amount REAL NOT NULL,
    source TEXT NOT NULL,
    category TEXT NOT NULL,
    date TEXT NOT NULL,
    notes TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    amount REAL NOT NULL,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    date TEXT NOT NULL,
    notes TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS savings_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    balance REAL NOT NULL,
    note TEXT DEFAULT '',
    date TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS bitcoin_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    price_per_btc REAL NOT NULL,
    amount_invested REAL NOT NULL,
    btc_amount REAL NOT NULL,
    notes TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS loans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
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
    name TEXT NOT NULL UNIQUE,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS crypto_assets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    platform_id INTEGER NOT NULL REFERENCES crypto_platforms(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    symbol TEXT NOT NULL,
    amount REAL NOT NULL DEFAULT 0,
    manual_price REAL,
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
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT DEFAULT (datetime('now'))
  );
`);

// Default settings — INSERT OR IGNORE so existing values are never overwritten
const defaults: [string, string][] = [
  ['btc_current_price', '65000'],
  ['currency', 'EUR'],
  ['tax_rate', '25'],
  ['manual_btc_amount', '0'],
  ['manual_btc_avg_price', '0'],
  ['use_manual_btc', 'false'],
  ['current_savings', '0'],
  ['btc_price_updated_at', ''],
  ['btc_price_interval', '5'],
  ['btc_price_auto_fetch', 'true'],
  ['crypto_currency', 'USD'],
];

const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
for (const [key, value] of defaults) {
  insertSetting.run(key, value);
}

// Migrations — safe to run on every startup
const existingCols = (
  db.prepare('PRAGMA table_info(crypto_assets)').all() as { name: string }[]
).map((c) => c.name);
if (!existingCols.includes('invested_amount')) {
  db.prepare('ALTER TABLE crypto_assets ADD COLUMN invested_amount REAL').run();
}

// Seed default platforms only on first run (empty table)
const platformCount = (
  db.prepare('SELECT COUNT(*) as c FROM crypto_platforms').get() as { c: number }
).c;
if (platformCount === 0) {
  const insertPlatform = db.prepare('INSERT OR IGNORE INTO crypto_platforms (name) VALUES (?)');
  for (const name of ['Nexo', 'Phantom', 'Ledger']) {
    insertPlatform.run(name);
  }
}

export default db;

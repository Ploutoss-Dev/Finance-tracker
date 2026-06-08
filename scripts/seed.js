const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, 'finance.db'));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS income (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    amount REAL NOT NULL, source TEXT NOT NULL, category TEXT NOT NULL,
    date TEXT NOT NULL, notes TEXT DEFAULT '', created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    amount REAL NOT NULL, category TEXT NOT NULL, description TEXT NOT NULL,
    date TEXT NOT NULL, notes TEXT DEFAULT '', created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS savings_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    balance REAL NOT NULL, note TEXT DEFAULT '', date TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS bitcoin_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL, price_per_btc REAL NOT NULL,
    amount_invested REAL NOT NULL, btc_amount REAL NOT NULL,
    notes TEXT DEFAULT '', created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY, value TEXT NOT NULL,
    updated_at TEXT DEFAULT (datetime('now'))
  );
`);

db.exec('DELETE FROM income; DELETE FROM expenses; DELETE FROM savings_history; DELETE FROM bitcoin_entries;');

const upsert = db.prepare("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))");
upsert.run('btc_current_price', '65000');
upsert.run('currency', 'EUR');
upsert.run('tax_rate', '25');
upsert.run('current_savings', '12500');
upsert.run('use_manual_btc', 'false');
upsert.run('manual_btc_amount', '0');
upsert.run('manual_btc_avg_price', '0');

const addIncome = db.prepare('INSERT INTO income (amount, source, category, date, notes) VALUES (?, ?, ?, ?, ?)');
const months = ['2025-05','2025-06','2025-07','2025-08','2025-09','2025-10','2025-11','2025-12','2026-01','2026-02','2026-03','2026-04'];
for (const m of months) {
  addIncome.run(3200, 'Tech Corp GmbH', 'Job', `${m}-01`, 'Monthly salary');
  if (['2025-07','2025-09','2025-12','2026-02'].includes(m))
    addIncome.run(800, 'Freelance Client', 'Freelance', `${m}-15`, 'Web design project');
  if (['2025-10','2026-01','2026-03'].includes(m))
    addIncome.run(250, 'YouTube / Blog', 'Side Income', `${m}-20`, 'Ad revenue');
}

const addExpense = db.prepare('INSERT INTO expenses (amount, category, description, date, notes) VALUES (?, ?, ?, ?, ?)');
for (const m of months) {
  addExpense.run(950, 'Rent', 'Monthly rent', `${m}-01`, '');
  addExpense.run(280, 'Food', 'Groceries & restaurants', `${m}-10`, '');
  addExpense.run(65, 'Transport', 'Public transport', `${m}-05`, '');
  addExpense.run(35, 'Subscriptions', 'Netflix, Spotify', `${m}-03`, '');
  addExpense.run(120, 'Utilities', 'Electricity + internet', `${m}-15`, '');
  if (['2025-07','2025-11','2026-01'].includes(m)) addExpense.run(350, 'Shopping', 'Clothing & misc', `${m}-20`, '');
  if (['2025-09','2026-02'].includes(m)) addExpense.run(180, 'Healthcare', 'Dentist / pharmacy', `${m}-12`, '');
}

const addSavings = db.prepare('INSERT INTO savings_history (balance, note, date) VALUES (?, ?, ?)');
[
  [8000, 'Initial balance', '2025-05-01'],
  [9200, 'After May salary', '2025-06-01'],
  [9800, 'Freelance project added', '2025-07-15'],
  [10500, 'Good savings month', '2025-08-01'],
  [10200, 'Healthcare expense', '2025-09-15'],
  [11100, 'Back on track', '2025-10-01'],
  [11800, 'Year-end bonus', '2025-12-15'],
  [12000, 'Jan update', '2026-01-01'],
  [12500, 'Current balance', '2026-04-01'],
].forEach(([b, n, d]) => addSavings.run(b, n, d));

const addBtc = db.prepare('INSERT INTO bitcoin_entries (date, price_per_btc, amount_invested, btc_amount, notes) VALUES (?, ?, ?, ?, ?)');
[
  ['2025-01-15', 42000, 500],
  ['2025-02-10', 45000, 500],
  ['2025-03-01', 48000, 300],
  ['2025-04-20', 52000, 500],
  ['2025-05-05', 49000, 500],
  ['2025-06-12', 55000, 300],
  ['2025-07-01', 61000, 500],
  ['2025-08-15', 58000, 500],
  ['2025-09-01', 62000, 300],
  ['2025-10-10', 67000, 500],
  ['2025-11-20', 71000, 500],
  ['2025-12-01', 69000, 300],
  ['2026-01-15', 75000, 500],
  ['2026-02-01', 72000, 500],
  ['2026-03-10', 68000, 300],
].forEach(([date, price, invested]) => {
  addBtc.run(date, price, invested, invested / price, 'Kraken DCA');
});

console.log('✓ Sample data seeded successfully!');
db.close();

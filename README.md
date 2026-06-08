# FinanceTracker — Personal Finance App

A complete personal finance tracking application built with Next.js 16, SQLite, Tailwind CSS v4, and Recharts. Dark mode, mobile responsive, fully local — no external services required.

## Features

| Module | What it does |
|---|---|
| **Dashboard** | Net worth, monthly P&L, BTC overview, income vs expenses chart |
| **Income** | Add/delete income entries by source, category, date |
| **Expenses** | Add/delete expenses by category with filtering |
| **Savings** | Set current balance directly (with history log) |
| **Bitcoin DCA** | Log BTC purchases or set manual holdings; shows avg buy price, P&L |
| **Tax Overview** | Yearly income/expense/BTC gains tax estimate with configurable rate |
| **Settings** | BTC price, currency, tax rate, manual BTC toggle |

## Tech Stack

- **Next.js 16** (App Router) + TypeScript
- **better-sqlite3** — synchronous SQLite, all data stored in `data/finance.db`
- **Tailwind CSS v4** — dark theme
- **Recharts** — income/expense bar chart, savings area chart, BTC line chart
- **lucide-react** — icons

## Setup

```bash
cd finance-tracker
npm install

# Seed with 12 months of sample data (optional)
node scripts/seed.js

# Start development server
npm run dev
```

Open **http://localhost:3000**

## Folder Structure

```
finance-tracker/
├── app/
│   ├── api/
│   │   ├── income/route.ts       GET, POST, DELETE
│   │   ├── expenses/route.ts     GET, POST, DELETE
│   │   ├── savings/route.ts      GET, POST, DELETE
│   │   ├── bitcoin/route.ts      GET, POST, DELETE
│   │   ├── settings/route.ts     GET, POST
│   │   └── dashboard/route.ts    GET (aggregated stats)
│   ├── income/page.tsx
│   ├── expenses/page.tsx
│   ├── savings/page.tsx
│   ├── bitcoin/page.tsx
│   ├── tax/page.tsx
│   ├── settings/page.tsx
│   ├── layout.tsx
│   └── page.tsx                  Dashboard
├── components/
│   ├── charts/
│   │   ├── IncomeExpenseChart.tsx
│   │   ├── SavingsChart.tsx
│   │   └── BTCChart.tsx
│   ├── Modal.tsx
│   ├── Sidebar.tsx
│   └── StatCard.tsx
├── lib/
│   ├── db.ts                     SQLite init + defaults
│   └── types.ts                  TypeScript interfaces
├── scripts/
│   └── seed.js                   Sample data seeder
└── data/
    └── finance.db                Auto-created on first run
```

## Bitcoin Tracking

Two modes available:

- **DCA Mode** (default): Log individual purchases with date, price, and amount. App calculates total holdings, average buy price, and P&L automatically.
- **Manual Mode**: Set your current BTC amount and average buy price directly. Useful if you already own BTC or use an external wallet.

Switch between modes in Bitcoin Settings or the Settings page.

## Savings Tracking

The savings balance is a "current state" number — not transaction-based. You set the current balance and the app logs the change history. Useful for manual bank account tracking.

## Data

All data is stored locally in `data/finance.db` (SQLite). No accounts, no cloud, no tracking.

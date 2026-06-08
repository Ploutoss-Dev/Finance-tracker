export interface Income {
  id: number;
  amount: number;
  source: string;
  category: string;
  date: string;
  notes: string;
  created_at: string;
}

export interface Expense {
  id: number;
  amount: number;
  category: string;
  description: string;
  date: string;
  notes: string;
  created_at: string;
}

export interface SavingsHistory {
  id: number;
  balance: number;
  note: string;
  date: string;
  created_at: string;
}

export interface BitcoinEntry {
  id: number;
  date: string;
  price_per_btc: number;
  amount_invested: number;
  btc_amount: number;
  notes: string;
  created_at: string;
}

export interface Loan {
  id: number;
  name: string;
  lender: string;
  principal: number;
  current_balance: number;
  interest_rate: number; // APR %
  loan_type: string;
  start_date: string;
  end_date: string;
  notes: string;
  created_at: string;
}

export interface YieldEntry {
  id: number;
  name: string;
  asset: string;
  principal: number;
  apr: number;
  compounding: 'daily' | 'monthly' | 'yearly' | 'none';
  start_date: string;
  notes: string;
  created_at: string;
  // Computed on the server
  daily_yield?: number;
  monthly_yield?: number;
  yearly_yield?: number;
}

export interface Settings {
  btc_current_price: number;
  currency: string;
  tax_rate: number;
  manual_btc_amount: number;
  manual_btc_avg_price: number;
  use_manual_btc: boolean;
  current_savings: number;
  btc_price_updated_at: string;
  btc_price_interval: number;
  btc_price_auto_fetch: boolean;
}

export interface DashboardData {
  // Net worth
  netWorth: number;
  currentSavings: number;
  totalDebt: number;
  // Monthly
  monthlyIncome: number;
  monthlyExpenses: number;
  netProfitLoss: number;
  // Investments
  totalInvested: number;
  totalInvestmentValue: number;
  investmentProfitLoss: number;
  // BTC
  btcHoldings: number;
  btcAvgPrice: number;
  btcCurrentPrice: number;
  btcCurrentValue: number;
  btcProfitLoss: number;
  btcProfitLossPct: number;
  btcPriceUpdatedAt: string;
  // Loans
  loans: Loan[];
  totalYearlyInterest: number;
  totalMonthlyInterest: number;
  // Yields
  yields: YieldEntry[];
  totalPrincipalInYield: number;
  totalYearlyYield: number;
  totalMonthlyYield: number;
  // Tax
  yearlyIncome: number;
  yearlyExpenses: number;
  taxRate: number;
  estimatedTax: number;
  // Crypto portfolio
  totalCryptoValue: number;
  // Meta
  currency: string;
  // Charts
  incomeByMonth: { month: string; income: number; expenses: number }[];
  savingsHistory: { date: string; balance: number }[];
  btcHistory: { date: string; avgPrice: number; totalBtc: number; invested: number }[];
}

// ── Crypto portfolio ──────────────────────────────────────────────────────────

export interface CryptoPlatform {
  id: number;
  name: string;
  created_at: string;
}

export interface CryptoAsset {
  id: number;
  platform_id: number;
  name: string;
  symbol: string;
  amount: number;
  manual_price: number | null;
  invested_amount: number | null; // what the user paid; null = not set
  notes: string;
  created_at: string;
  // Computed fields (attached server-side)
  price: number;           // effective price (manual_price ?? fetched ?? 0)
  value: number;           // amount * price
  has_live_price: boolean;
  profit_loss: number | null;      // value - invested_amount; null when invested_amount unset
  profit_loss_pct: number | null;  // (profit_loss / invested_amount) * 100
}

export interface CryptoPlatformWithAssets extends CryptoPlatform {
  assets: CryptoAsset[];
  total_value: number;
}

export interface CryptoPrice {
  symbol: string;
  coingecko_id: string;
  price: number;
  updated_at: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

export const INCOME_CATEGORIES = ['Job', 'Freelance', 'Side Income', 'Investments', 'Rental', 'Other'] as const;
export const EXPENSE_CATEGORIES = ['Food', 'Rent', 'Subscriptions', 'Transport', 'Healthcare', 'Entertainment', 'Shopping', 'Utilities', 'Education', 'Other'] as const;
export const LOAN_TYPES = ['Mortgage', 'Personal', 'Auto', 'Student', 'Crypto / Margin', 'Credit Card', 'Other'] as const;
export const COMPOUNDING_TYPES = ['none', 'daily', 'monthly', 'yearly'] as const;

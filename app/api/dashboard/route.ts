import { NextResponse } from 'next/server';
import db from '@/lib/db';
import type { Loan, YieldEntry } from '@/lib/types';

function getSetting(key: string): string {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
  return row?.value ?? '';
}

function effectiveAnnualRate(apr: number, compounding: string): number {
  const r = apr / 100;
  switch (compounding) {
    case 'daily':   return Math.pow(1 + r / 365, 365) - 1;
    case 'monthly': return Math.pow(1 + r / 12, 12) - 1;
    case 'yearly':  return r;
    default:        return r;
  }
}

export async function GET() {
  const currency            = getSetting('currency') || 'EUR';
  const btcCurrentPrice     = Number(getSetting('btc_current_price')) || 0;
  const taxRate             = Number(getSetting('tax_rate')) || 25;
  const currentSavings      = Number(getSetting('current_savings')) || 0;
  const useManualBtc        = getSetting('use_manual_btc') === 'true';
  const manualBtcAmount     = Number(getSetting('manual_btc_amount')) || 0;
  const manualBtcAvgPrice   = Number(getSetting('manual_btc_avg_price')) || 0;
  const btcPriceUpdatedAt   = getSetting('btc_price_updated_at') || '';

  // Current month range
  const now        = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const monthEnd   = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-31`;
  const yearStart  = `${now.getFullYear()}-01-01`;
  const yearEnd    = `${now.getFullYear()}-12-31`;

  // ── Income & Expenses ──────────────────────────────────────────────────────
  const monthlyIncome    = (db.prepare('SELECT COALESCE(SUM(amount),0) t FROM income   WHERE date>=? AND date<=?').get(monthStart, monthEnd) as {t:number}).t;
  const monthlyExpenses  = (db.prepare('SELECT COALESCE(SUM(amount),0) t FROM expenses WHERE date>=? AND date<=?').get(monthStart, monthEnd) as {t:number}).t;
  const yearlyIncome     = (db.prepare('SELECT COALESCE(SUM(amount),0) t FROM income   WHERE date>=? AND date<=?').get(yearStart,  yearEnd)  as {t:number}).t;
  const yearlyExpenses   = (db.prepare('SELECT COALESCE(SUM(amount),0) t FROM expenses WHERE date>=? AND date<=?').get(yearStart,  yearEnd)  as {t:number}).t;

  // ── Bitcoin ────────────────────────────────────────────────────────────────
  const btcEntries = db.prepare('SELECT * FROM bitcoin_entries ORDER BY date ASC').all() as {
    date: string; price_per_btc: number; amount_invested: number; btc_amount: number;
  }[];

  let btcHoldings = 0, totalBtcInvested = 0;
  const btcHistory: { date: string; avgPrice: number; totalBtc: number; invested: number }[] = [];

  if (useManualBtc) {
    btcHoldings     = manualBtcAmount;
    totalBtcInvested = manualBtcAmount * manualBtcAvgPrice;
  } else {
    for (const e of btcEntries) {
      btcHoldings      += e.btc_amount;
      totalBtcInvested += e.amount_invested;
      btcHistory.push({
        date:     e.date,
        avgPrice: btcHoldings > 0 ? totalBtcInvested / btcHoldings : 0,
        totalBtc: btcHoldings,
        invested: totalBtcInvested,
      });
    }
  }

  const btcAvgPrice        = btcHoldings > 0 ? totalBtcInvested / btcHoldings : 0;
  const btcCurrentValue    = btcHoldings * btcCurrentPrice;
  const btcProfitLoss      = btcCurrentValue - totalBtcInvested;
  const btcProfitLossPct   = totalBtcInvested > 0 ? (btcProfitLoss / totalBtcInvested) * 100 : 0;
  const totalInvested      = totalBtcInvested;
  const totalInvestmentValue = btcCurrentValue;
  const investmentProfitLoss = btcProfitLoss;

  // ── Loans ──────────────────────────────────────────────────────────────────
  const loans = db.prepare('SELECT * FROM loans ORDER BY created_at DESC').all() as Loan[];
  const totalDebt = loans.reduce((s, l) => s + l.current_balance, 0);
  const totalYearlyInterest  = loans.reduce((s, l) => s + l.current_balance * (l.interest_rate / 100), 0);
  const totalMonthlyInterest = totalYearlyInterest / 12;

  // ── Yields ─────────────────────────────────────────────────────────────────
  const rawYields = db.prepare('SELECT * FROM yields ORDER BY created_at DESC').all() as (YieldEntry & { compounding: string })[];
  const yields: YieldEntry[] = rawYields.map((y) => {
    const ear          = effectiveAnnualRate(y.apr, y.compounding);
    const yearly_yield = y.principal * ear;
    return { ...y, yearly_yield, monthly_yield: yearly_yield / 12, daily_yield: yearly_yield / 365 };
  });
  const totalPrincipalInYield = yields.reduce((s, y) => s + y.principal, 0);
  const totalYearlyYield      = yields.reduce((s, y) => s + (y.yearly_yield ?? 0), 0);
  const totalMonthlyYield     = totalYearlyYield / 12;

  // ── Crypto Portfolio ──────────────────────────────────────────────────────
  const cryptoTotal = (db.prepare(`
    SELECT COALESCE(SUM(ca.amount * COALESCE(ca.manual_price, cp.price, 0)), 0) AS total
    FROM crypto_assets ca
    LEFT JOIN crypto_prices cp ON UPPER(ca.symbol) = UPPER(cp.symbol)
  `).get() as { total: number }).total;

  // ── Aggregates ─────────────────────────────────────────────────────────────
  // Net worth uses crypto portfolio as the single source of truth for asset values.
  // totalInvestmentValue (BTC DCA) is intentionally excluded — BTC belongs in
  // crypto_assets so it is already captured inside cryptoTotal, preventing
  // double-counting.
  const netWorth      = currentSavings + cryptoTotal - totalDebt;
  const netProfitLoss = monthlyIncome - monthlyExpenses;

  // Tax: on yearly net (income − expenses) + yield income.
  // btcProfitLoss is intentionally excluded: BTC belongs in crypto_assets (the
  // single source of truth for asset values), so adding DCA-derived gains here
  // would be inconsistent with how net worth is calculated.
  const taxableGains = Math.max(0, yearlyIncome - yearlyExpenses + totalYearlyYield);
  const estimatedTax = taxableGains * (taxRate / 100);

  // ── 12-month income/expense chart data ────────────────────────────────────
  const incomeByMonth: { month: string; income: number; expenses: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d  = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y  = d.getFullYear();
    const m  = String(d.getMonth() + 1).padStart(2, '0');
    const s  = `${y}-${m}-01`;
    const e  = `${y}-${m}-31`;
    const inc = (db.prepare('SELECT COALESCE(SUM(amount),0) t FROM income   WHERE date>=? AND date<=?').get(s,e) as {t:number}).t;
    const exp = (db.prepare('SELECT COALESCE(SUM(amount),0) t FROM expenses WHERE date>=? AND date<=?').get(s,e) as {t:number}).t;
    incomeByMonth.push({ month: `${y}-${m}`, income: inc, expenses: exp });
  }

  // ── Savings history ────────────────────────────────────────────────────────
  const savingsHistory = db
    .prepare('SELECT date, balance FROM savings_history ORDER BY date ASC, created_at ASC')
    .all() as { date: string; balance: number }[];

  return NextResponse.json({
    // Net worth
    netWorth,
    currentSavings,
    totalDebt,
    // Monthly
    monthlyIncome,
    monthlyExpenses,
    netProfitLoss,
    // Investments
    totalInvested,
    totalInvestmentValue,
    investmentProfitLoss,
    // BTC
    btcHoldings,
    btcAvgPrice,
    btcCurrentPrice,
    btcCurrentValue,
    btcProfitLoss,
    btcProfitLossPct,
    btcPriceUpdatedAt,
    // Crypto portfolio
    totalCryptoValue: cryptoTotal,
    // Loans
    loans,
    totalDebtSum: totalDebt,
    totalYearlyInterest,
    totalMonthlyInterest,
    // Yields
    yields,
    totalPrincipalInYield,
    totalYearlyYield,
    totalMonthlyYield,
    // Tax
    yearlyIncome,
    yearlyExpenses,
    taxRate,
    estimatedTax,
    // Meta
    currency,
    // Charts
    incomeByMonth,
    savingsHistory,
    btcHistory,
  });
}

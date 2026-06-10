import { NextResponse } from 'next/server';
import { all, get } from '@/lib/query';
import { initDB } from '@/lib/db';
import type { Loan, YieldEntry } from '@/lib/types';

async function getSetting(key: string): Promise<string> {
  const row = await get<{ value: string }>('SELECT value FROM settings WHERE key = ?', [key]);
  return row?.value ?? '';
}

function effectiveAnnualRate(apr: number, compounding: string): number {
  const r = apr / 100;
  switch (compounding) {
    case 'daily': return Math.pow(1 + r / 365, 365) - 1;
    case 'monthly': return Math.pow(1 + r / 12, 12) - 1;
    case 'yearly': return r;
    default: return r;
  }
}

export async function GET() {
  await initDB();
  const currency = await getSetting('currency') || 'EUR';
  const btcCurrentPrice = Number(await getSetting('btc_current_price')) || 0;
  const taxRate = Number(await getSetting('tax_rate')) || 25;
  const currentSavings = Number(await getSetting('current_savings')) || 0;
  const useManualBtc = await getSetting('use_manual_btc') === 'true';
  const manualBtcAmount = Number(await getSetting('manual_btc_amount')) || 0;
  const manualBtcAvgPrice = Number(await getSetting('manual_btc_avg_price')) || 0;
  const btcPriceUpdatedAt = await getSetting('btc_price_updated_at') || '';

  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const monthEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-31`;
  const yearStart = `${now.getFullYear()}-01-01`;
  const yearEnd = `${now.getFullYear()}-12-31`;

  const monthlyIncome = ((await get<{t:number}>('SELECT COALESCE(SUM(amount),0) t FROM income WHERE date>=? AND date<=?', [monthStart, monthEnd]))?.t) ?? 0;
  const monthlyExpenses = ((await get<{t:number}>('SELECT COALESCE(SUM(amount),0) t FROM expenses WHERE date>=? AND date<=?', [monthStart, monthEnd]))?.t) ?? 0;
  const yearlyIncome = ((await get<{t:number}>('SELECT COALESCE(SUM(amount),0) t FROM income WHERE date>=? AND date<=?', [yearStart, yearEnd]))?.t) ?? 0;
  const yearlyExpenses = ((await get<{t:number}>('SELECT COALESCE(SUM(amount),0) t FROM expenses WHERE date>=? AND date<=?', [yearStart, yearEnd]))?.t) ?? 0;

  const btcEntries = await all<{ date: string; price_per_btc: number; amount_invested: number; btc_amount: number }>('SELECT * FROM bitcoin_entries ORDER BY date ASC');
  let btcHoldings = 0, totalBtcInvested = 0;
  const btcHistory: { date: string; avgPrice: number; totalBtc: number; invested: number }[] = [];
  if (useManualBtc) {
    btcHoldings = manualBtcAmount;
    totalBtcInvested = manualBtcAmount * manualBtcAvgPrice;
  } else {
    for (const e of btcEntries) {
      btcHoldings += e.btc_amount;
      totalBtcInvested += e.amount_invested;
      btcHistory.push({ date: e.date, avgPrice: btcHoldings > 0 ? totalBtcInvested / btcHoldings : 0, totalBtc: btcHoldings, invested: totalBtcInvested });
    }
  }

  const btcAvgPrice = btcHoldings > 0 ? totalBtcInvested / btcHoldings : 0;
  const btcCurrentValue = btcHoldings * btcCurrentPrice;
  const btcProfitLoss = btcCurrentValue - totalBtcInvested;
  const btcProfitLossPct = totalBtcInvested > 0 ? (btcProfitLoss / totalBtcInvested) * 100 : 0;

  const loans = await all<Loan>('SELECT * FROM loans ORDER BY created_at DESC');
  const totalDebt = loans.reduce((s, l) => s + l.current_balance, 0);
  const totalYearlyInterest = loans.reduce((s, l) => s + l.current_balance * (l.interest_rate / 100), 0);

  const rawYields = await all<YieldEntry & { compounding: string }>('SELECT * FROM yields ORDER BY created_at DESC');
  const yields: YieldEntry[] = rawYields.map((y) => {
    const ear = effectiveAnnualRate(y.apr, y.compounding);
    const yearly_yield = y.principal * ear;
    return { ...y, yearly_yield, monthly_yield: yearly_yield / 12, daily_yield: yearly_yield / 365 };
  });
  const totalPrincipalInYield = yields.reduce((s, y) => s + y.principal, 0);
  const totalYearlyYield = yields.reduce((s, y) => s + (y.yearly_yield ?? 0), 0);

  const cryptoRow = await get<{ total: number }>('SELECT COALESCE(SUM(ca.amount * COALESCE(ca.manual_price, cp.price, 0)), 0) AS total FROM crypto_assets ca LEFT JOIN crypto_prices cp ON UPPER(ca.symbol) = UPPER(cp.symbol)');
  const cryptoTotal = cryptoRow?.total ?? 0;

  const netWorth = currentSavings + cryptoTotal - totalDebt;
  const taxableGains = Math.max(0, yearlyIncome - yearlyExpenses + totalYearlyYield);

  const incomeByMonth: { month: string; income: number; expenses: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const s = `${y}-${m}-01`, e = `${y}-${m}-31`;
    const inc = ((await get<{t:number}>('SELECT COALESCE(SUM(amount),0) t FROM income WHERE date>=? AND date<=?', [s, e]))?.t) ?? 0;
    const exp = ((await get<{t:number}>('SELECT COALESCE(SUM(amount),0) t FROM expenses WHERE date>=? AND date<=?', [s, e]))?.t) ?? 0;
    incomeByMonth.push({ month: `${y}-${m}`, income: inc, expenses: exp });
  }

  const savingsHistory = await all<{ date: string; balance: number }>('SELECT date, balance FROM savings_history ORDER BY date ASC, created_at ASC');

  return NextResponse.json({
    netWorth, currentSavings, totalDebt,
    monthlyIncome, monthlyExpenses, netProfitLoss: monthlyIncome - monthlyExpenses,
    totalInvested: totalBtcInvested, totalInvestmentValue: btcCurrentValue, investmentProfitLoss: btcProfitLoss,
    btcHoldings, btcAvgPrice, btcCurrentPrice, btcCurrentValue, btcProfitLoss, btcProfitLossPct, btcPriceUpdatedAt,
    totalCryptoValue: cryptoTotal,
    loans, totalDebtSum: totalDebt, totalYearlyInterest, totalMonthlyInterest: totalYearlyInterest / 12,
    yields, totalPrincipalInYield, totalYearlyYield, totalMonthlyYield: totalYearlyYield / 12,
    yearlyIncome, yearlyExpenses, taxRate, estimatedTax: taxableGains * (taxRate / 100),
    currency, incomeByMonth, savingsHistory, btcHistory,
  });
}

'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Bitcoin,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  CreditCard,
  Percent,
  Clock,
  Wifi,
  WifiOff,
  Layers,
} from 'lucide-react';
import StatCard from '@/components/StatCard';
import IncomeExpenseChart from '@/components/charts/IncomeExpenseChart';
import SavingsChart from '@/components/charts/SavingsChart';
import BTCChart from '@/components/charts/BTCChart';
import { BTC_PRICE_EVENT } from '@/components/BTCPriceUpdater';
import { useGreeting } from '@/lib/useGreeting';
import type { DashboardData } from '@/lib/types';

const fmt = (v: number, currency = 'EUR', decimals = 2) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  }).format(v);

const fmtBTC = (v: number) =>
  v.toLocaleString('en-US', { maximumFractionDigits: 8 });

function timeAgo(iso: string | null | undefined): string {
  if (!iso) return 'never';
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  return `${Math.floor(diffHrs / 24)}d ago`;
}

export default function DashboardPage() {
  const greeting = useGreeting();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [priceUpdatedAt, setPriceUpdatedAt] = useState<string | null>(null);
  const [livePrice, setLivePrice] = useState<number | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/dashboard', { cache: 'no-store' });
      const json: DashboardData = await res.json();
      setData(json);
      setPriceUpdatedAt(json.btcPriceUpdatedAt || null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => { load(); }, [load]);

  // Re-fetch dashboard whenever BTCPriceUpdater emits a price change
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as {
        price: number;
        updatedAt: string | null;
        fetchError?: string;
      };
      setLivePrice(detail.price);
      setPriceUpdatedAt(detail.updatedAt);
      setFetchError(detail.fetchError ?? null);
      // Reload dashboard so all BTC calculations update
      load();
    };
    window.addEventListener(BTC_PRICE_EVENT, handler);
    return () => window.removeEventListener(BTC_PRICE_EVENT, handler);
  }, [load]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="animate-spin text-emerald-500" size={28} />
      </div>
    );
  }

  if (!data) return null;

  const c = data.currency;
  const displayPrice = livePrice ?? data.btcCurrentPrice;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-gray-500 text-sm mb-0.5">
            {greeting.emoji} {greeting.text}
          </p>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">Your complete financial overview</p>
        </div>
        <div className="flex items-center gap-3">
          {/* BTC price badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-900 border border-gray-800 rounded-lg text-sm">
            <Bitcoin size={14} className="text-yellow-400" />
            <span className="text-yellow-400 font-semibold">{fmt(displayPrice, c, 0)}</span>
            <span className="text-gray-600">·</span>
            <span className="flex items-center gap-1 text-gray-500 text-xs">
              {fetchError
                ? <WifiOff size={11} className="text-orange-400" />
                : <Wifi size={11} className="text-emerald-400" />}
              <Clock size={10} />
              {timeAgo(priceUpdatedAt)}
            </span>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white text-sm transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* BTC fetch error banner (only shown when there's an error) */}
      {fetchError && (
        <div className="bg-orange-500/5 border border-orange-500/20 rounded-lg px-4 py-2.5 flex items-center gap-2 text-orange-300 text-xs">
          <WifiOff size={13} />
          {fetchError}
        </div>
      )}

      {/* Net Worth Hero */}
      <div className="bg-gradient-to-br from-emerald-500/10 to-blue-500/5 border border-emerald-500/20 rounded-2xl p-6">
        <p className="text-gray-400 text-sm mb-1">Total Net Worth</p>
        <p className="text-5xl font-bold text-white mb-3">
          {fmt(data.netWorth, c, 0)}
        </p>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5 text-sm text-gray-400">
          <span className="flex items-center gap-1.5">
            <PiggyBank size={14} className="text-blue-400" />
            Savings: <span className="text-white font-medium">{fmt(data.currentSavings, c, 0)}</span>
          </span>
          {(data.totalCryptoValue ?? 0) > 0 && (
            <span className="flex items-center gap-1.5">
              <Layers size={14} className="text-purple-400" />
              Crypto: <span className="text-white font-medium">{fmt(data.totalCryptoValue, c, 0)}</span>
            </span>
          )}
          {data.totalDebt > 0 && (
            <span className="flex items-center gap-1.5">
              <CreditCard size={14} className="text-red-400" />
              Debt: <span className="text-red-400 font-medium">−{fmt(data.totalDebt, c, 0)}</span>
            </span>
          )}
          {data.totalYearlyYield > 0 && (
            <span className="flex items-center gap-1.5">
              <Percent size={14} className="text-emerald-400" />
              Yearly yield: <span className="text-emerald-400 font-medium">+{fmt(data.totalYearlyYield, c, 0)}</span>
            </span>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Monthly Income"
          value={fmt(data.monthlyIncome, c, 0)}
          icon={<TrendingUp size={16} />}
          accent="green"
        />
        <StatCard
          title="Monthly Expenses"
          value={fmt(data.monthlyExpenses, c, 0)}
          icon={<TrendingDown size={16} />}
          accent="red"
        />
        <StatCard
          title="Net Profit / Loss"
          value={fmt(data.netProfitLoss, c, 0)}
          subtitle={data.netProfitLoss >= 0 ? 'Positive this month' : 'Negative this month'}
          icon={data.netProfitLoss >= 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
          accent={data.netProfitLoss >= 0 ? 'green' : 'red'}
        />
        <StatCard
          title="Current Savings"
          value={fmt(data.currentSavings, c, 0)}
          icon={<Wallet size={16} />}
          accent="blue"
        />
      </div>

      {/* Loans + Yields row */}
      {(data.totalDebt > 0 || data.totalYearlyYield > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {data.totalDebt > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <CreditCard size={16} className="text-red-400" />
                <h3 className="text-white font-semibold text-sm">Loans & Debt</h3>
              </div>
              <p className="text-3xl font-bold text-red-400">{fmt(data.totalDebt, c, 0)}</p>
              <p className="text-gray-500 text-sm mt-1">
                {data.loans.length} loan{data.loans.length !== 1 ? 's' : ''} ·{' '}
                <span className="text-orange-400">{fmt(data.totalMonthlyInterest, c, 2)}/mo interest</span>
              </p>
            </div>
          )}
          {data.totalYearlyYield > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Percent size={16} className="text-emerald-400" />
                <h3 className="text-white font-semibold text-sm">Passive Yield</h3>
              </div>
              <p className="text-3xl font-bold text-emerald-400">{fmt(data.totalYearlyYield, c, 2)}/yr</p>
              <p className="text-gray-500 text-sm mt-1">
                {data.yields.length} position{data.yields.length !== 1 ? 's' : ''} ·{' '}
                <span className="text-emerald-400">{fmt(data.totalMonthlyYield, c, 2)}/mo</span>
              </p>
            </div>
          )}
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="text-white font-semibold mb-4">Income vs Expenses (12 months)</h3>
          <IncomeExpenseChart data={data.incomeByMonth} currency={c} />
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="text-white font-semibold mb-4">Savings Balance History</h3>
          <SavingsChart data={data.savingsHistory} currency={c} />
        </div>
      </div>

      {/* Bitcoin Section */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Bitcoin size={20} className="text-yellow-400" />
            <div>
              <h3 className="text-white font-semibold">Bitcoin DCA Tracker</h3>
              <p className="text-gray-500 text-xs">Cost-basis analysis — BTC value is counted under Crypto Portfolio</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            {fetchError
              ? <WifiOff size={12} className="text-orange-400" />
              : <Wifi size={12} className="text-emerald-400" />}
            Price updated: <span className="text-gray-400">{timeAgo(priceUpdatedAt)}</span>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-5">
          {[
            { label: 'Holdings',       value: `${fmtBTC(data.btcHoldings)} BTC`, cls: 'text-white' },
            { label: 'Avg Buy Price',  value: fmt(data.btcAvgPrice, c, 0),       cls: 'text-white' },
            { label: 'Current Price',  value: fmt(displayPrice, c, 0),            cls: 'text-yellow-400' },
            { label: 'Total Invested', value: fmt(data.totalInvested, c, 0),      cls: 'text-white' },
            { label: 'Current Value',  value: fmt(data.btcCurrentValue, c, 0),    cls: 'text-white' },
            {
              label: 'Profit / Loss',
              value: `${data.btcProfitLoss >= 0 ? '+' : ''}${fmt(data.btcProfitLoss, c, 0)}`,
              sub:   `${data.btcProfitLossPct >= 0 ? '+' : ''}${data.btcProfitLossPct.toFixed(1)}%`,
              cls:   data.btcProfitLoss >= 0 ? 'text-emerald-400' : 'text-red-400',
            },
          ].map((s) => (
            <div key={s.label}>
              <p className="text-gray-500 text-xs mb-1">{s.label}</p>
              <p className={`font-bold text-sm ${s.cls}`}>{s.value}</p>
              {s.sub && <p className={`text-xs mt-0.5 ${s.cls} opacity-70`}>{s.sub}</p>}
            </div>
          ))}
        </div>
        <BTCChart data={data.btcHistory} currency={c} />
      </div>

      {/* Tax Estimate Banner */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h3 className="text-white font-semibold mb-1">Tax Overview (Estimate)</h3>
            <p className="text-gray-500 text-sm">Based on {data.taxRate}% rate on yearly net gains</p>
          </div>
          <div className="text-right">
            <p className="text-gray-500 text-xs mb-0.5">Yearly Income</p>
            <p className="text-white font-semibold">{fmt(data.yearlyIncome, c, 0)}</p>
          </div>
          <div className="text-right">
            <p className="text-gray-500 text-xs mb-0.5">Yearly Expenses</p>
            <p className="text-white font-semibold">{fmt(data.yearlyExpenses, c, 0)}</p>
          </div>
          {data.totalYearlyYield > 0 && (
            <div className="text-right">
              <p className="text-gray-500 text-xs mb-0.5">Yield Income</p>
              <p className="text-emerald-400 font-semibold">{fmt(data.totalYearlyYield, c, 0)}</p>
            </div>
          )}
          <div className="text-right">
            <p className="text-gray-500 text-xs mb-0.5">Est. Tax Due</p>
            <p className="text-red-400 font-bold text-lg">{fmt(data.estimatedTax, c, 0)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

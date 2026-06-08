'use client';

import { useEffect, useState } from 'react';
import { Receipt, RefreshCw, AlertCircle, TrendingUp, TrendingDown } from 'lucide-react';

const fmt = (v: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR' }).format(v);

interface TaxData {
  yearlyIncome: number;
  yearlyExpenses: number;
  btcProfitLoss: number;
  btcCurrentPrice: number;
  taxRate: number;
  estimatedTax: number;
  currency: string;
  monthlyIncome: number;
  monthlyExpenses: number;
}

export default function TaxPage() {
  const [data, setData] = useState<TaxData | null>(null);
  const [loading, setLoading] = useState(true);
  const [taxRate, setTaxRate] = useState(25);
  const [customRate, setCustomRate] = useState(false);

  const load = async () => {
    setLoading(true);
    const res = await fetch('/api/dashboard');
    const json = await res.json();
    setData(json);
    setTaxRate(json.taxRate);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const saveTaxRate = async () => {
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tax_rate: String(taxRate) }),
    });
    load();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="animate-spin text-orange-500" size={28} />
      </div>
    );
  }

  if (!data) return null;

  const yearlyNet = data.yearlyIncome - data.yearlyExpenses;
  const btcGains = Math.max(0, data.btcProfitLoss);
  const totalTaxable = Math.max(0, yearlyNet + btcGains);
  const estimatedTax = totalTaxable * (taxRate / 100);
  const effectiveTax = data.yearlyIncome > 0 ? (estimatedTax / data.yearlyIncome) * 100 : 0;
  const netAfterTax = data.yearlyIncome - estimatedTax;
  const monthlyAfterTax = netAfterTax / 12;

  const brackets = [
    { label: 'Up to €10,000', rate: 0, note: 'Tax-free (example)' },
    { label: '€10,001 – €25,000', rate: 20, note: 'Low bracket' },
    { label: '€25,001 – €60,000', rate: 30, note: 'Mid bracket' },
    { label: 'Above €60,000', rate: 40, note: 'High bracket' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Tax Overview</h1>
          <p className="text-gray-500 text-sm mt-0.5">Estimated tax liability for {new Date().getFullYear()}</p>
        </div>
        <button onClick={load} className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-500 hover:text-white transition-colors">
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Disclaimer */}
      <div className="bg-orange-500/5 border border-orange-500/20 rounded-lg p-4 flex gap-3">
        <AlertCircle size={18} className="text-orange-400 shrink-0 mt-0.5" />
        <p className="text-orange-300 text-sm">
          This is a simplified estimate only. Tax rules vary by country, income type, and individual situation. Consult a tax professional for accurate advice.
        </p>
      </div>

      {/* Tax Rate Config */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h3 className="text-white font-semibold mb-4">Tax Rate Configuration</h3>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-gray-400 text-sm">Tax Rate:</label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.5"
              value={taxRate}
              onChange={(e) => { setTaxRate(Number(e.target.value)); setCustomRate(true); }}
              className="w-20 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-orange-500"
            />
            <span className="text-gray-400 text-sm">%</span>
          </div>
          {customRate && (
            <button
              onClick={() => { saveTaxRate(); setCustomRate(false); }}
              className="px-3 py-1.5 bg-orange-500 hover:bg-orange-400 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Save Rate
            </button>
          )}
          <div className="flex gap-2 ml-auto">
            {[15, 20, 25, 30, 40].map((r) => (
              <button
                key={r}
                onClick={() => { setTaxRate(r); setCustomRate(true); }}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  taxRate === r ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 'bg-gray-800 text-gray-500 hover:text-white'
                }`}
              >
                {r}%
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-gray-400 text-sm mb-1">Yearly Income</p>
          <p className="text-2xl font-bold text-emerald-400">{fmt(data.yearlyIncome)}</p>
          <p className="text-gray-600 text-xs mt-1">All income sources</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-gray-400 text-sm mb-1">Yearly Expenses</p>
          <p className="text-2xl font-bold text-red-400">{fmt(data.yearlyExpenses)}</p>
          <p className="text-gray-600 text-xs mt-1">Deductible expenses</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-gray-400 text-sm mb-1">BTC Capital Gains</p>
          <p className={`text-2xl font-bold ${data.btcProfitLoss >= 0 ? 'text-yellow-400' : 'text-gray-400'}`}>
            {fmt(Math.max(0, data.btcProfitLoss))}
          </p>
          <p className="text-gray-600 text-xs mt-1">Unrealized profit</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-gray-400 text-sm mb-1">Est. Tax Due</p>
          <p className="text-2xl font-bold text-orange-400">{fmt(estimatedTax)}</p>
          <p className="text-gray-600 text-xs mt-1">At {taxRate}% rate</p>
        </div>
      </div>

      {/* Detailed Breakdown */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h3 className="text-white font-semibold mb-4">Tax Calculation Breakdown</h3>
        <div className="space-y-3">
          {[
            { label: 'Total Income', value: data.yearlyIncome, color: 'text-emerald-400', prefix: '' },
            { label: '− Expenses (deductions)', value: -data.yearlyExpenses, color: 'text-red-400', prefix: '−' },
            { label: '= Net Income', value: yearlyNet, color: 'text-white', prefix: '' },
            { label: '+ BTC Capital Gains', value: btcGains, color: 'text-yellow-400', prefix: '+' },
            { label: '= Taxable Base', value: totalTaxable, color: 'text-white font-bold', prefix: '' },
          ].map(({ label, value, color, prefix }) => (
            <div key={label} className={`flex justify-between py-2 ${label.startsWith('=') ? 'border-t border-gray-700' : ''}`}>
              <span className="text-gray-400 text-sm">{label}</span>
              <span className={`text-sm font-medium ${color}`}>{prefix}{fmt(Math.abs(value))}</span>
            </div>
          ))}
          <div className="border-t-2 border-gray-700 pt-3 flex justify-between">
            <span className="text-gray-400 text-sm">Tax ({taxRate}% of taxable base)</span>
            <span className="text-orange-400 font-bold text-lg">{fmt(estimatedTax)}</span>
          </div>
        </div>
      </div>

      {/* Net income after tax */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-gray-400 text-sm mb-1">Effective Tax Rate</p>
          <p className="text-2xl font-bold text-white">{effectiveTax.toFixed(1)}%</p>
          <p className="text-gray-600 text-xs mt-1">Of gross income</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-gray-400 text-sm mb-1">Net After Tax (Yearly)</p>
          <p className="text-2xl font-bold text-white">{fmt(netAfterTax)}</p>
          <div className="flex items-center gap-1 mt-1">
            {netAfterTax >= 0 ? <TrendingUp size={12} className="text-emerald-400" /> : <TrendingDown size={12} className="text-red-400" />}
            <p className="text-gray-600 text-xs">After estimated taxes</p>
          </div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-gray-400 text-sm mb-1">Monthly Take-Home</p>
          <p className="text-2xl font-bold text-white">{fmt(monthlyAfterTax)}</p>
          <p className="text-gray-600 text-xs mt-1">÷ 12 months</p>
        </div>
      </div>

      {/* Reference Brackets */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h3 className="text-white font-semibold mb-4">Reference Tax Brackets</h3>
        <p className="text-gray-600 text-xs mb-3">Example brackets — configure your actual rate above.</p>
        <div className="space-y-2">
          {brackets.map((b) => (
            <div key={b.label} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
              <div>
                <p className="text-white text-sm">{b.label}</p>
                <p className="text-gray-600 text-xs">{b.note}</p>
              </div>
              <span className="text-orange-400 font-semibold text-sm">{b.rate}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

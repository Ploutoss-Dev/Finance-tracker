'use client';

import { useEffect, useState } from 'react';
import { Bitcoin, Plus, Trash2, RefreshCw, Settings2, TrendingUp, TrendingDown } from 'lucide-react';
import Modal from '@/components/Modal';
import BTCChart from '@/components/charts/BTCChart';
import type { BitcoinEntry } from '@/lib/types';

const fmt = (v: number, currency = 'USD', decimals = 2) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: decimals }).format(v);

const fmtBTC = (v: number) => v.toLocaleString('en-US', { maximumFractionDigits: 8 });

interface Settings {
  btc_current_price: string;
  use_manual_btc: string;
  manual_btc_amount: string;
  manual_btc_avg_price: string;
  crypto_currency: string;
}

export default function BitcoinPage() {
  const [entries, setEntries] = useState<BitcoinEntry[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    amount_invested: '',
    btc_amount: '',
    notes: '',
  });
  const [settingsForm, setSettingsForm] = useState({
    btc_current_price: '',
    use_manual_btc: false,
    manual_btc_amount: '',
    manual_btc_avg_price: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    const [entriesRes, settingsRes] = await Promise.all([
      fetch('/api/bitcoin'),
      fetch('/api/settings'),
    ]);
    const e = await entriesRes.json();
    const s = await settingsRes.json();
    setEntries(e);
    setSettings(s);
    setSettingsForm({
      btc_current_price: s.btc_current_price || '65000',
      use_manual_btc: s.use_manual_btc === 'true',
      manual_btc_amount: s.manual_btc_amount || '0',
      manual_btc_avg_price: s.manual_btc_avg_price || '0',
    });
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const submitEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const invested = Number(form.amount_invested);
    const btc      = Number(form.btc_amount);
    // Derive the effective rate from what was actually paid vs received.
    // This reflects the real exchange rate including fees.
    const price_per_btc = btc > 0 ? invested / btc : 0;
    await fetch('/api/bitcoin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: form.date,
        price_per_btc,
        amount_invested: invested,
        btc_amount: btc,
        notes: form.notes,
      }),
    });
    setSubmitting(false);
    setShowModal(false);
    setForm({ date: new Date().toISOString().split('T')[0], amount_invested: '', btc_amount: '', notes: '' });
    load();
  };

  const submitSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        btc_current_price: String(settingsForm.btc_current_price),
        use_manual_btc: String(settingsForm.use_manual_btc),
        manual_btc_amount: String(settingsForm.manual_btc_amount),
        manual_btc_avg_price: String(settingsForm.manual_btc_avg_price),
      }),
    });
    setShowSettingsModal(false);
    load();
  };

  const remove = async (id: number) => {
    if (!confirm('Delete this BTC entry?')) return;
    await fetch(`/api/bitcoin?id=${id}`, { method: 'DELETE' });
    load();
  };

  // Calculate DCA stats from entries
  const useManual = settings?.use_manual_btc === 'true';
  const currentPrice = Number(settings?.btc_current_price ?? 0);
  const currency = settings?.crypto_currency ?? 'USD';
  // Shorthand that closes over the live currency value
  const $ = (v: number, decimals = 2) => fmt(v, currency, decimals);

  let totalBtc = 0;
  let totalInvested = 0;
  const btcHistory: { date: string; avgPrice: number; totalBtc: number; invested: number }[] = [];

  if (useManual) {
    totalBtc = Number(settings?.manual_btc_amount ?? 0);
    totalInvested = totalBtc * Number(settings?.manual_btc_avg_price ?? 0);
  } else {
    for (const e of entries) {
      totalBtc += e.btc_amount;
      totalInvested += e.amount_invested;
      btcHistory.push({
        date: e.date,
        avgPrice: totalBtc > 0 ? totalInvested / totalBtc : 0,
        totalBtc,
        invested: totalInvested,
      });
    }
  }

  const avgBuyPrice = totalBtc > 0 ? totalInvested / totalBtc : 0;
  const currentValue = totalBtc * currentPrice;
  const profitLoss = currentValue - totalInvested;
  const profitLossPct = totalInvested > 0 ? (profitLoss / totalInvested) * 100 : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="animate-spin text-yellow-500" size={28} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Bitcoin DCA</h1>
          <p className="text-gray-500 text-sm mt-0.5">Track your Bitcoin holdings and DCA strategy</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowSettingsModal(true)}
            className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded-lg text-sm transition-colors"
          >
            <Settings2 size={15} /> BTC Settings
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-black rounded-lg font-medium text-sm transition-colors"
          >
            <Plus size={16} /> Add Buy
          </button>
        </div>
      </div>

      {/* Mode indicator */}
      {useManual && (
        <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-3 text-sm text-yellow-300 flex items-center gap-2">
          <Settings2 size={14} />
          Manual holdings mode active — DCA entries are ignored. Showing manual BTC amount.
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'BTC Holdings', value: `${fmtBTC(totalBtc)} BTC`, color: 'text-yellow-400' },
          { label: 'Avg Buy Price', value: $(avgBuyPrice, 0), color: 'text-white' },
          { label: 'Current Price', value: $(currentPrice, 0), color: 'text-yellow-400' },
          { label: 'Total Invested', value: $(totalInvested, 0), color: 'text-white' },
          { label: 'Current Value', value: $(currentValue, 0), color: 'text-white' },
          {
            label: 'Profit / Loss',
            value: `${profitLoss >= 0 ? '+' : ''}${$(profitLoss, 0)}`,
            sub: `${profitLossPct >= 0 ? '+' : ''}${profitLossPct.toFixed(1)}%`,
            color: profitLoss >= 0 ? 'text-emerald-400' : 'text-red-400',
          },
        ].map((s) => (
          <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-gray-500 text-xs mb-1">{s.label}</p>
            <p className={`font-bold text-sm ${s.color}`}>{s.value}</p>
            {s.sub && <p className={`text-xs mt-0.5 ${s.color} opacity-70`}>{s.sub}</p>}
          </div>
        ))}
      </div>

      {/* Visual P&L bar */}
      {totalInvested > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-semibold">Performance</h3>
            <div className="flex items-center gap-1.5 text-sm">
              {profitLoss >= 0
                ? <TrendingUp size={16} className="text-emerald-400" />
                : <TrendingDown size={16} className="text-red-400" />}
              <span className={profitLoss >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                {profitLossPct >= 0 ? '+' : ''}{profitLossPct.toFixed(2)}% ROI
              </span>
            </div>
          </div>
          <div className="flex gap-2 text-xs text-gray-500 mb-2">
            <span>Invested: {$(totalInvested, 0)}</span>
            <span>→</span>
            <span>Value: {$(currentValue, 0)}</span>
          </div>
          <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
            <div
              className={`h-3 rounded-full transition-all ${profitLoss >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`}
              style={{ width: `${Math.min(100, Math.abs(profitLossPct))}%` }}
            />
          </div>
          <BTCChart data={btcHistory} currency={currency} />
        </div>
      )}

      {/* DCA Entries Table */}
      {!useManual && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-gray-800 flex items-center justify-between">
            <h3 className="text-white font-semibold">DCA Purchase History ({entries.length})</h3>
            <button onClick={load} className="text-gray-500 hover:text-white transition-colors">
              <RefreshCw size={14} />
            </button>
          </div>
          {entries.length === 0 ? (
            <div className="p-8 text-center">
              <Bitcoin size={32} className="text-gray-700 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">No BTC purchases yet. Add your first buy!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800">
                    {['Date', 'Buy Price', 'Invested', 'BTC Amount', 'Notes', ''].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {[...entries].reverse().map((e) => {
                    const currentVal = e.btc_amount * currentPrice;
                    const pl = currentVal - e.amount_invested;
                    return (
                      <tr key={e.id} className="hover:bg-gray-800/50 transition-colors">
                        <td className="px-4 py-3 text-gray-400 text-sm">{e.date}</td>
                        <td className="px-4 py-3 text-white text-sm">{$(e.price_per_btc, 0)}</td>
                        <td className="px-4 py-3 text-white text-sm">{$(e.amount_invested, 2)}</td>
                        <td className="px-4 py-3">
                          <span className="text-yellow-400 font-medium text-sm">{fmtBTC(e.btc_amount)}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-sm">{e.notes || '—'}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs ${pl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                              {pl >= 0 ? '+' : ''}{$(pl, 0)}
                            </span>
                            <button
                              onClick={() => remove(e.id)}
                              className="text-gray-600 hover:text-red-400 transition-colors"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-700 bg-gray-800/30">
                    <td colSpan={2} className="px-4 py-3 text-gray-400 text-sm font-semibold">TOTAL</td>
                    <td className="px-4 py-3 text-white font-bold">{$(totalInvested, 2)}</td>
                    <td className="px-4 py-3 text-yellow-400 font-bold">{fmtBTC(totalBtc)}</td>
                    <td />
                    <td className="px-4 py-3">
                      <span className={`text-sm font-bold ${profitLoss >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {profitLoss >= 0 ? '+' : ''}{$(profitLoss, 0)}
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Add Buy Modal */}
      {showModal && (
        <Modal title="Add BTC Purchase" onClose={() => setShowModal(false)}>
          <form onSubmit={submitEntry} className="space-y-4">
            <div>
              <label className="block text-gray-400 text-sm mb-1.5">Date</label>
              <input
                type="date"
                required
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-yellow-500"
              />
            </div>

            <div>
              <label className="block text-gray-400 text-sm mb-1.5">Amount Invested ({currency})</label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                autoFocus
                value={form.amount_invested}
                onChange={(e) => setForm({ ...form, amount_invested: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-yellow-500"
                placeholder="e.g. 500"
              />
            </div>

            <div>
              <label className="block text-gray-400 text-sm mb-1.5">
                BTC Received
                <span className="text-gray-600 ml-1.5 text-xs">— exact amount from your exchange</span>
              </label>
              <input
                type="number"
                step="0.00000001"
                min="0"
                required
                value={form.btc_amount}
                onChange={(e) => setForm({ ...form, btc_amount: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-yellow-500"
                placeholder="e.g. 0.00482631"
              />
            </div>

            {/* Effective rate preview */}
            {form.amount_invested && form.btc_amount && Number(form.btc_amount) > 0 && (
              <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg px-3 py-2.5 text-xs text-gray-400 flex items-center justify-between">
                <span>Effective rate</span>
                <span className="text-yellow-400 font-semibold">
                  {$(Number(form.amount_invested) / Number(form.btc_amount), 0)} / BTC
                </span>
              </div>
            )}

            <div>
              <label className="block text-gray-400 text-sm mb-1.5">Notes (optional)</label>
              <input
                type="text"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-yellow-500"
                placeholder="e.g. Kraken DCA"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm font-medium transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={submitting} className="flex-1 px-4 py-2.5 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-black rounded-lg text-sm font-bold transition-colors">
                {submitting ? 'Saving...' : 'Add Purchase'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <Modal title="Bitcoin Settings" onClose={() => setShowSettingsModal(false)}>
          <form onSubmit={submitSettings} className="space-y-4">
            <div>
              <label className="block text-gray-400 text-sm mb-1.5">Current BTC Price (€)</label>
              <input
                type="number"
                step="1"
                min="0"
                value={settingsForm.btc_current_price}
                onChange={(e) => setSettingsForm({ ...settingsForm, btc_current_price: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-yellow-500"
              />
            </div>

            <div className="border-t border-gray-800 pt-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settingsForm.use_manual_btc}
                  onChange={(e) => setSettingsForm({ ...settingsForm, use_manual_btc: e.target.checked })}
                  className="w-4 h-4 accent-yellow-500"
                />
                <span className="text-white text-sm font-medium">Use manual holdings (ignore DCA entries)</span>
              </label>
              <p className="text-gray-600 text-xs mt-1 ml-6">Use this if you already own BTC and don't want to enter each purchase.</p>
            </div>

            {settingsForm.use_manual_btc && (
              <>
                <div>
                  <label className="block text-gray-400 text-sm mb-1.5">Manual BTC Amount</label>
                  <input
                    type="number"
                    step="0.00000001"
                    min="0"
                    value={settingsForm.manual_btc_amount}
                    onChange={(e) => setSettingsForm({ ...settingsForm, manual_btc_amount: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-yellow-500"
                    placeholder="e.g. 0.5"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-1.5">Average Buy Price (€)</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={settingsForm.manual_btc_avg_price}
                    onChange={(e) => setSettingsForm({ ...settingsForm, manual_btc_avg_price: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-yellow-500"
                    placeholder="e.g. 42000"
                  />
                </div>
              </>
            )}

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowSettingsModal(false)} className="flex-1 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm font-medium transition-colors">
                Cancel
              </button>
              <button type="submit" className="flex-1 px-4 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-black rounded-lg text-sm font-bold transition-colors">
                Save Settings
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

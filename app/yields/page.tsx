'use client';

import { useEffect, useState } from 'react';
import { Percent, Plus, Trash2, RefreshCw, TrendingUp } from 'lucide-react';
import Modal from '@/components/Modal';
import type { YieldEntry } from '@/lib/types';
import { COMPOUNDING_TYPES } from '@/lib/types';

const fmt = (v: number, dec = 2) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: dec,
  }).format(v);

const compoundingLabel: Record<string, string> = {
  none:    'Simple (no compounding)',
  daily:   'Daily compounding',
  monthly: 'Monthly compounding',
  yearly:  'Yearly compounding',
};

const emptyForm = {
  name: '',
  asset: '',
  principal: '',
  apr: '',
  compounding: 'daily',
  start_date: new Date().toISOString().split('T')[0],
  notes: '',
};

export default function YieldsPage() {
  const [entries, setEntries] = useState<YieldEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    const res = await fetch('/api/yields');
    setEntries(await res.json());
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    await fetch('/api/yields', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        principal: Number(form.principal),
        apr:       Number(form.apr),
      }),
    });
    setSubmitting(false);
    setShowModal(false);
    setForm(emptyForm);
    load();
  };

  const remove = async (id: number) => {
    if (!confirm('Delete this yield entry?')) return;
    await fetch(`/api/yields?id=${id}`, { method: 'DELETE' });
    load();
  };

  const totalPrincipal   = entries.reduce((s, e) => s + e.principal, 0);
  const totalYearlyYield = entries.reduce((s, e) => s + (e.yearly_yield ?? 0), 0);
  const avgAPR           = entries.length > 0
    ? entries.reduce((s, e) => s + e.apr, 0) / entries.length
    : 0;

  // Preview calculation in modal
  const previewYearly = (() => {
    if (!form.principal || !form.apr) return null;
    const p = Number(form.principal);
    const r = Number(form.apr) / 100;
    let ear = r;
    if (form.compounding === 'daily')   ear = Math.pow(1 + r / 365, 365) - 1;
    if (form.compounding === 'monthly') ear = Math.pow(1 + r / 12, 12) - 1;
    return p * ear;
  })();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">APR / Passive Yield</h1>
          <p className="text-gray-500 text-sm mt-0.5">Track staking rewards, savings rates, and lending yields</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white rounded-lg font-medium text-sm transition-colors"
        >
          <Plus size={16} /> Add Yield
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-gray-400 text-sm mb-1">Total Principal in Yield</p>
          <p className="text-3xl font-bold text-white">{fmt(totalPrincipal, 0)}</p>
          <p className="text-gray-600 text-xs mt-1">{entries.length} position{entries.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-gray-400 text-sm mb-1">Yearly Yield (est.)</p>
          <p className="text-3xl font-bold text-emerald-400">{fmt(totalYearlyYield, 2)}</p>
          <p className="text-gray-500 text-xs mt-1">{fmt(totalYearlyYield / 12, 2)} / month</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-gray-400 text-sm mb-1">Avg APR</p>
          <p className="text-3xl font-bold text-blue-400">{avgAPR.toFixed(2)}%</p>
          <p className="text-gray-600 text-xs mt-1">Across all positions</p>
        </div>
      </div>

      {/* Monthly yield banner */}
      {totalYearlyYield > 0 && (
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-emerald-300 text-sm font-medium">Passive income breakdown</p>
            <p className="text-gray-500 text-xs">Based on current principal and APR</p>
          </div>
          <div className="flex gap-6 text-sm">
            <div className="text-right">
              <p className="text-gray-500 text-xs">Daily</p>
              <p className="text-emerald-400 font-semibold">{fmt(totalYearlyYield / 365, 2)}</p>
            </div>
            <div className="text-right">
              <p className="text-gray-500 text-xs">Monthly</p>
              <p className="text-emerald-400 font-semibold">{fmt(totalYearlyYield / 12, 2)}</p>
            </div>
            <div className="text-right">
              <p className="text-gray-500 text-xs">Yearly</p>
              <p className="text-emerald-400 font-bold text-base">{fmt(totalYearlyYield, 2)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <h3 className="text-white font-semibold">Yield Positions</h3>
          <button onClick={load} className="text-gray-500 hover:text-white transition-colors">
            <RefreshCw size={14} />
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center"><RefreshCw className="animate-spin text-gray-600 mx-auto" /></div>
        ) : entries.length === 0 ? (
          <div className="p-8 text-center">
            <Percent size={32} className="text-gray-700 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">No yield positions yet. Add a staking position, savings account, or lending yield.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  {['Name', 'Asset', 'Principal', 'APR', 'Compounding', 'Daily', 'Monthly', 'Yearly', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {entries.map((e) => (
                  <tr key={e.id} className="hover:bg-gray-800/40 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-white text-sm font-medium">{e.name}</p>
                      {e.notes && <p className="text-gray-600 text-xs">{e.notes}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 text-xs font-medium">{e.asset}</span>
                    </td>
                    <td className="px-4 py-3 text-white text-sm font-medium">{fmt(e.principal, 0)}</td>
                    <td className="px-4 py-3 text-emerald-400 font-semibold text-sm">{e.apr}%</td>
                    <td className="px-4 py-3 text-gray-400 text-sm capitalize">{e.compounding}</td>
                    <td className="px-4 py-3 text-gray-300 text-sm">{fmt(e.daily_yield ?? 0, 4)}</td>
                    <td className="px-4 py-3 text-gray-300 text-sm">{fmt(e.monthly_yield ?? 0, 2)}</td>
                    <td className="px-4 py-3 text-emerald-400 font-semibold text-sm">{fmt(e.yearly_yield ?? 0, 2)}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => remove(e.id)} className="text-gray-600 hover:text-red-400 transition-colors">
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-700 bg-gray-800/30">
                  <td colSpan={2} className="px-4 py-3 text-gray-400 text-sm font-semibold">TOTAL</td>
                  <td className="px-4 py-3 text-white font-bold">{fmt(totalPrincipal, 0)}</td>
                  <td className="px-4 py-3 text-emerald-400 font-bold">{avgAPR.toFixed(2)}% avg</td>
                  <td />
                  <td className="px-4 py-3 text-gray-300 font-bold">{fmt(totalYearlyYield / 365, 4)}</td>
                  <td className="px-4 py-3 text-gray-300 font-bold">{fmt(totalYearlyYield / 12, 2)}</td>
                  <td className="px-4 py-3 text-emerald-400 font-bold">{fmt(totalYearlyYield, 2)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Example assets reference */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp size={16} className="text-emerald-400" />
          <h3 className="text-white font-semibold text-sm">Common Yield Sources</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'ETH Staking',      apr: '~3–5%',  compound: 'daily'   },
            { label: 'USDC Lending',     apr: '~5–12%', compound: 'daily'   },
            { label: 'BTC Yield',        apr: '~1–3%',  compound: 'monthly' },
            { label: 'EUR Savings Acct', apr: '~2–4%',  compound: 'yearly'  },
          ].map((s) => (
            <div key={s.label} className="bg-gray-800 rounded-lg p-3">
              <p className="text-white text-sm font-medium">{s.label}</p>
              <p className="text-emerald-400 text-xs">{s.apr} APR</p>
              <p className="text-gray-600 text-xs capitalize">{s.compound} compounding</p>
            </div>
          ))}
        </div>
      </div>

      {/* Add Yield Modal */}
      {showModal && (
        <Modal title="Add Yield Position" onClose={() => setShowModal(false)}>
          <form onSubmit={submit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-gray-400 text-sm mb-1">Position Name</label>
                <input type="text" required value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
                  placeholder="e.g. Kraken ETH Staking, Nexo USDC"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1">Asset / Token</label>
                <input type="text" required value={form.asset}
                  onChange={(e) => setForm({ ...form, asset: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
                  placeholder="e.g. ETH, USDC, EUR"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1">Principal (€)</label>
                <input type="number" step="0.01" min="0" required value={form.principal}
                  onChange={(e) => setForm({ ...form, principal: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
                  placeholder="Amount deposited"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1">APR (%)</label>
                <input type="number" step="0.01" min="0" max="1000" required value={form.apr}
                  onChange={(e) => setForm({ ...form, apr: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
                  placeholder="e.g. 4.5"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1">Compounding</label>
                <select value={form.compounding}
                  onChange={(e) => setForm({ ...form, compounding: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
                >
                  {COMPOUNDING_TYPES.map((t) => (
                    <option key={t} value={t}>{compoundingLabel[t] ?? t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1">Start Date</label>
                <input type="date" required value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-gray-400 text-sm mb-1">Notes (optional)</label>
                <input type="text" value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Live preview */}
            {previewYearly !== null && (
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-3">
                <p className="text-emerald-300 text-xs font-medium mb-1.5">Estimated yield</p>
                <div className="flex gap-4 text-sm">
                  <span className="text-gray-400">Daily: <span className="text-white font-medium">{fmt(previewYearly / 365, 4)}</span></span>
                  <span className="text-gray-400">Monthly: <span className="text-white font-medium">{fmt(previewYearly / 12, 2)}</span></span>
                  <span className="text-gray-400">Yearly: <span className="text-emerald-400 font-bold">{fmt(previewYearly, 2)}</span></span>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm font-medium transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={submitting}
                className="flex-1 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
                {submitting ? 'Saving...' : 'Add Position'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

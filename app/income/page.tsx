'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2, TrendingUp, RefreshCw } from 'lucide-react';
import Modal from '@/components/Modal';
import type { Income } from '@/lib/types';
import { INCOME_CATEGORIES } from '@/lib/types';

const fmt = (v: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR' }).format(v);

const catColors: Record<string, string> = {
  Job: 'bg-blue-500/10 text-blue-400',
  Freelance: 'bg-purple-500/10 text-purple-400',
  'Side Income': 'bg-emerald-500/10 text-emerald-400',
  Investments: 'bg-yellow-500/10 text-yellow-400',
  Rental: 'bg-orange-500/10 text-orange-400',
  Other: 'bg-gray-500/10 text-gray-400',
};

export default function IncomePage() {
  const [entries, setEntries] = useState<Income[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    amount: '',
    source: '',
    category: 'Job',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    const res = await fetch('/api/income');
    setEntries(await res.json());
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    await fetch('/api/income', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, amount: Number(form.amount) }),
    });
    setSubmitting(false);
    setShowModal(false);
    setForm({ amount: '', source: '', category: 'Job', date: new Date().toISOString().split('T')[0], notes: '' });
    load();
  };

  const remove = async (id: number) => {
    if (!confirm('Delete this income entry?')) return;
    await fetch(`/api/income?id=${id}`, { method: 'DELETE' });
    load();
  };

  const total = entries.reduce((s, e) => s + e.amount, 0);

  // Group by category
  const byCategory: Record<string, number> = {};
  for (const e of entries) {
    byCategory[e.category] = (byCategory[e.category] || 0) + e.amount;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Income</h1>
          <p className="text-gray-500 text-sm mt-0.5">Track all your income sources</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white rounded-lg font-medium text-sm transition-colors"
        >
          <Plus size={16} /> Add Income
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 sm:col-span-1">
          <p className="text-gray-400 text-sm mb-1">Total Income (all time)</p>
          <p className="text-3xl font-bold text-emerald-400">{fmt(total)}</p>
          <p className="text-gray-600 text-xs mt-1">{entries.length} entries</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 sm:col-span-2">
          <p className="text-gray-400 text-sm mb-3">By Category</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(byCategory).map(([cat, amt]) => (
              <div key={cat} className={`px-3 py-1.5 rounded-lg text-sm ${catColors[cat] || catColors.Other}`}>
                {cat}: <span className="font-semibold">{fmt(amt)}</span>
              </div>
            ))}
            {Object.keys(byCategory).length === 0 && (
              <p className="text-gray-600 text-sm">No income recorded yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <h3 className="text-white font-semibold">All Income Entries</h3>
          <button onClick={load} className="text-gray-500 hover:text-white transition-colors">
            <RefreshCw size={14} />
          </button>
        </div>
        {loading ? (
          <div className="p-8 text-center"><RefreshCw className="animate-spin text-gray-600 mx-auto" /></div>
        ) : entries.length === 0 ? (
          <div className="p-8 text-center">
            <TrendingUp size={32} className="text-gray-700 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">No income entries yet. Add your first one!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  {['Date', 'Source', 'Category', 'Amount', 'Notes', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {entries.map((e) => (
                  <tr key={e.id} className="hover:bg-gray-800/50 transition-colors">
                    <td className="px-4 py-3 text-gray-400 text-sm">{e.date}</td>
                    <td className="px-4 py-3 text-white text-sm font-medium">{e.source}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${catColors[e.category] || catColors.Other}`}>
                        {e.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-emerald-400 font-semibold">{fmt(e.amount)}</td>
                    <td className="px-4 py-3 text-gray-500 text-sm">{e.notes || '—'}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => remove(e.id)}
                        className="text-gray-600 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <Modal title="Add Income" onClose={() => setShowModal(false)}>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-gray-400 text-sm mb-1.5">Amount (€)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-1.5">Source</label>
              <input
                type="text"
                required
                value={form.source}
                onChange={(e) => setForm({ ...form, source: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500"
                placeholder="e.g. Employer, Client name..."
              />
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-1.5">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500"
              >
                {INCOME_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-1.5">Date</label>
              <input
                type="date"
                required
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-1.5">Notes (optional)</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500 resize-none"
                rows={2}
                placeholder="Optional notes..."
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {submitting ? 'Saving...' : 'Add Income'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2, TrendingDown, RefreshCw } from 'lucide-react';
import Modal from '@/components/Modal';
import type { Expense } from '@/lib/types';
import { EXPENSE_CATEGORIES } from '@/lib/types';

const fmt = (v: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR' }).format(v);

const catColors: Record<string, string> = {
  Food: 'bg-orange-500/10 text-orange-400',
  Rent: 'bg-red-500/10 text-red-400',
  Subscriptions: 'bg-purple-500/10 text-purple-400',
  Transport: 'bg-blue-500/10 text-blue-400',
  Healthcare: 'bg-pink-500/10 text-pink-400',
  Entertainment: 'bg-yellow-500/10 text-yellow-400',
  Shopping: 'bg-indigo-500/10 text-indigo-400',
  Utilities: 'bg-cyan-500/10 text-cyan-400',
  Education: 'bg-teal-500/10 text-teal-400',
  Other: 'bg-gray-500/10 text-gray-400',
};

export default function ExpensesPage() {
  const [entries, setEntries] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filterCat, setFilterCat] = useState('All');
  const [form, setForm] = useState({
    amount: '',
    category: 'Food',
    description: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    const res = await fetch('/api/expenses');
    setEntries(await res.json());
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    await fetch('/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, amount: Number(form.amount) }),
    });
    setSubmitting(false);
    setShowModal(false);
    setForm({ amount: '', category: 'Food', description: '', date: new Date().toISOString().split('T')[0], notes: '' });
    load();
  };

  const remove = async (id: number) => {
    if (!confirm('Delete this expense?')) return;
    await fetch(`/api/expenses?id=${id}`, { method: 'DELETE' });
    load();
  };

  const total = entries.reduce((s, e) => s + e.amount, 0);

  const byCategory: Record<string, number> = {};
  for (const e of entries) {
    byCategory[e.category] = (byCategory[e.category] || 0) + e.amount;
  }

  const filtered = filterCat === 'All' ? entries : entries.filter((e) => e.category === filterCat);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Expenses</h1>
          <p className="text-gray-500 text-sm mt-0.5">Track and categorize your spending</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-400 text-white rounded-lg font-medium text-sm transition-colors"
        >
          <Plus size={16} /> Add Expense
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-gray-400 text-sm mb-1">Total Expenses (all time)</p>
          <p className="text-3xl font-bold text-red-400">{fmt(total)}</p>
          <p className="text-gray-600 text-xs mt-1">{entries.length} entries</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 sm:col-span-2">
          <p className="text-gray-400 text-sm mb-3">Top Categories</p>
          <div className="space-y-1.5">
            {Object.entries(byCategory)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 4)
              .map(([cat, amt]) => (
                <div key={cat} className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-800 rounded-full h-1.5">
                    <div
                      className="bg-red-500 h-1.5 rounded-full"
                      style={{ width: `${Math.min(100, (amt / total) * 100)}%` }}
                    />
                  </div>
                  <span className="text-gray-400 text-xs w-24 text-right">{cat}: {fmt(amt)}</span>
                </div>
              ))}
            {Object.keys(byCategory).length === 0 && (
              <p className="text-gray-600 text-sm">No expenses recorded yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 flex-wrap">
        {['All', ...EXPENSE_CATEGORIES].map((cat) => (
          <button
            key={cat}
            onClick={() => setFilterCat(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filterCat === cat
                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                : 'bg-gray-800 text-gray-500 hover:text-white border border-transparent'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <h3 className="text-white font-semibold">
            {filterCat === 'All' ? 'All Expenses' : filterCat} ({filtered.length})
          </h3>
          <button onClick={load} className="text-gray-500 hover:text-white transition-colors">
            <RefreshCw size={14} />
          </button>
        </div>
        {loading ? (
          <div className="p-8 text-center"><RefreshCw className="animate-spin text-gray-600 mx-auto" /></div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center">
            <TrendingDown size={32} className="text-gray-700 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">No expense entries yet. Add your first one!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  {['Date', 'Description', 'Category', 'Amount', 'Notes', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {filtered.map((e) => (
                  <tr key={e.id} className="hover:bg-gray-800/50 transition-colors">
                    <td className="px-4 py-3 text-gray-400 text-sm">{e.date}</td>
                    <td className="px-4 py-3 text-white text-sm font-medium">{e.description}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${catColors[e.category] || catColors.Other}`}>
                        {e.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-red-400 font-semibold">{fmt(e.amount)}</td>
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

      {showModal && (
        <Modal title="Add Expense" onClose={() => setShowModal(false)}>
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
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-red-500"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-1.5">Description</label>
              <input
                type="text"
                required
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-red-500"
                placeholder="e.g. Netflix, Grocery run..."
              />
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-1.5">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-red-500"
              >
                {EXPENSE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-1.5">Date</label>
              <input
                type="date"
                required
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-red-500"
              />
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-1.5">Notes (optional)</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-red-500 resize-none"
                rows={2}
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
                className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-400 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {submitting ? 'Saving...' : 'Add Expense'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

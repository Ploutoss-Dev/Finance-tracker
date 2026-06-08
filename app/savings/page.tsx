'use client';

import { useEffect, useState } from 'react';
import { PiggyBank, RefreshCw, Plus, Trash2, Edit3, Check } from 'lucide-react';
import SavingsChart from '@/components/charts/SavingsChart';
import Modal from '@/components/Modal';

const fmt = (v: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR' }).format(v);

interface SavingsData {
  current: number;
  history: { id: number; balance: number; note: string; date: string }[];
}

export default function SavingsPage() {
  const [data, setData] = useState<SavingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBalance, setEditingBalance] = useState(false);
  const [quickBalance, setQuickBalance] = useState('');
  const [form, setForm] = useState({
    balance: '',
    note: '',
    date: new Date().toISOString().split('T')[0],
  });
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    const res = await fetch('/api/savings');
    const json = await res.json();
    setData(json);
    setQuickBalance(String(json.current));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    await fetch('/api/savings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, balance: Number(form.balance) }),
    });
    setSubmitting(false);
    setShowModal(false);
    setForm({ balance: '', note: '', date: new Date().toISOString().split('T')[0] });
    load();
  };

  const quickUpdate = async () => {
    const bal = Number(quickBalance);
    if (isNaN(bal)) return;
    await fetch('/api/savings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        balance: bal,
        note: 'Quick update',
        date: new Date().toISOString().split('T')[0],
      }),
    });
    setEditingBalance(false);
    load();
  };

  const remove = async (id: number) => {
    if (!confirm('Delete this history entry?')) return;
    await fetch(`/api/savings?id=${id}`, { method: 'DELETE' });
    load();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="animate-spin text-blue-500" size={28} />
      </div>
    );
  }

  const history = data?.history ?? [];
  const current = data?.current ?? 0;

  // Delta from previous balance
  const lastTwo = [...history].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const delta = lastTwo.length >= 2 ? lastTwo[0].balance - lastTwo[1].balance : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Savings</h1>
          <p className="text-gray-500 text-sm mt-0.5">Manage your current savings balance</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-400 text-white rounded-lg font-medium text-sm transition-colors"
        >
          <Plus size={16} /> Update Balance
        </button>
      </div>

      {/* Current Balance Hero */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-gray-400 text-sm mb-2">Current Savings Balance</p>
            {editingBalance ? (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.01"
                  value={quickBalance}
                  onChange={(e) => setQuickBalance(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') quickUpdate(); if (e.key === 'Escape') setEditingBalance(false); }}
                  className="bg-gray-800 border border-blue-500 rounded-lg px-3 py-1.5 text-white text-3xl font-bold w-48 focus:outline-none"
                  autoFocus
                />
                <button
                  onClick={quickUpdate}
                  className="p-2 rounded-lg bg-blue-500 text-white hover:bg-blue-400"
                >
                  <Check size={18} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <p className="text-5xl font-bold text-white">{fmt(current)}</p>
                <button
                  onClick={() => { setEditingBalance(true); setQuickBalance(String(current)); }}
                  className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-gray-800 transition-colors"
                >
                  <Edit3 size={18} />
                </button>
              </div>
            )}
            {delta !== 0 && (
              <p className={`text-sm mt-2 ${delta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {delta >= 0 ? '+' : ''}{fmt(delta)} since last update
              </p>
            )}
          </div>
          <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
            <PiggyBank size={24} className="text-blue-400" />
          </div>
        </div>

        <div className="mt-4 text-sm text-gray-500">
          Click the pencil icon to quickly update your balance, or use <span className="text-blue-400">Update Balance</span> to log with a note.
        </div>
      </div>

      {/* Chart */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h3 className="text-white font-semibold mb-4">Balance History</h3>
        <SavingsChart
          data={[...history].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())}
          currency="EUR"
        />
      </div>

      {/* History Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <h3 className="text-white font-semibold">Update History</h3>
          <button onClick={load} className="text-gray-500 hover:text-white transition-colors">
            <RefreshCw size={14} />
          </button>
        </div>
        {history.length === 0 ? (
          <div className="p-8 text-center">
            <PiggyBank size={32} className="text-gray-700 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">No savings history yet. Update your balance to start tracking.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  {['Date', 'Balance', 'Note', 'Change', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {[...history]
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map((e, i, arr) => {
                    const prev = arr[i + 1];
                    const change = prev ? e.balance - prev.balance : null;
                    return (
                      <tr key={e.id} className="hover:bg-gray-800/50 transition-colors">
                        <td className="px-4 py-3 text-gray-400 text-sm">{e.date}</td>
                        <td className="px-4 py-3 text-white font-semibold">{fmt(e.balance)}</td>
                        <td className="px-4 py-3 text-gray-500 text-sm">{e.note || '—'}</td>
                        <td className="px-4 py-3">
                          {change !== null ? (
                            <span className={`text-sm font-medium ${change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                              {change >= 0 ? '+' : ''}{fmt(change)}
                            </span>
                          ) : <span className="text-gray-600 text-sm">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => remove(e.id)}
                            className="text-gray-600 hover:text-red-400 transition-colors"
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <Modal title="Update Savings Balance" onClose={() => setShowModal(false)}>
          <form onSubmit={submit} className="space-y-4">
            <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-3 text-sm text-blue-300">
              Enter your <strong>current total savings balance</strong>. This replaces the previous value and logs the change.
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-1.5">New Balance (€)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={form.balance}
                onChange={(e) => setForm({ ...form, balance: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
                placeholder={`Current: ${fmt(current)}`}
                autoFocus
              />
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-1.5">Note (optional)</label>
              <input
                type="text"
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
                placeholder="e.g. Monthly salary deposited"
              />
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-1.5">Date</label>
              <input
                type="date"
                required
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
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
                className="flex-1 px-4 py-2.5 bg-blue-500 hover:bg-blue-400 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {submitting ? 'Saving...' : 'Update Balance'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

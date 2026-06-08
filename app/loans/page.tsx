'use client';

import { useEffect, useState } from 'react';
import { CreditCard, Plus, Trash2, RefreshCw, Edit3, Check, X } from 'lucide-react';
import Modal from '@/components/Modal';
import type { Loan } from '@/lib/types';
import { LOAN_TYPES } from '@/lib/types';

const fmt = (v: number, dec = 2) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: dec,
  }).format(v);

const typeColors: Record<string, string> = {
  Mortgage:         'bg-blue-500/10 text-blue-400',
  Personal:         'bg-purple-500/10 text-purple-400',
  Auto:             'bg-orange-500/10 text-orange-400',
  Student:          'bg-teal-500/10 text-teal-400',
  'Crypto / Margin':'bg-yellow-500/10 text-yellow-400',
  'Credit Card':    'bg-red-500/10 text-red-400',
  Other:            'bg-gray-500/10 text-gray-400',
};

const emptyForm = {
  name: '',
  lender: '',
  principal: '',
  current_balance: '',
  interest_rate: '',
  loan_type: 'Personal',
  start_date: new Date().toISOString().split('T')[0],
  end_date: '',
  notes: '',
};

export default function LoansPage() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  // Inline balance editor
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editBalance, setEditBalance] = useState('');

  const load = async () => {
    setLoading(true);
    const res = await fetch('/api/loans');
    setLoans(await res.json());
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    await fetch('/api/loans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        principal:       Number(form.principal),
        current_balance: Number(form.current_balance),
        interest_rate:   Number(form.interest_rate),
      }),
    });
    setSubmitting(false);
    setShowModal(false);
    setForm(emptyForm);
    load();
  };

  const remove = async (id: number) => {
    if (!confirm('Delete this loan?')) return;
    await fetch(`/api/loans?id=${id}`, { method: 'DELETE' });
    load();
  };

  const saveBalance = async (id: number) => {
    await fetch('/api/loans', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, current_balance: Number(editBalance) }),
    });
    setEditingId(null);
    load();
  };

  const totalDebt     = loans.reduce((s, l) => s + l.current_balance, 0);
  const totalOriginal = loans.reduce((s, l) => s + l.principal, 0);
  const totalPaid     = totalOriginal - totalDebt;
  const totalYearlyInterest = loans.reduce(
    (s, l) => s + l.current_balance * (l.interest_rate / 100), 0
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Loans & Borrowing</h1>
          <p className="text-gray-500 text-sm mt-0.5">Track all debt and leverage positions</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-400 text-white rounded-lg font-medium text-sm transition-colors"
        >
          <Plus size={16} /> Add Loan
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Debt',          value: fmt(totalDebt, 0),           color: 'text-red-400' },
          { label: 'Original Borrowed',   value: fmt(totalOriginal, 0),        color: 'text-white' },
          { label: 'Total Paid Back',     value: fmt(Math.max(0, totalPaid), 0), color: 'text-emerald-400' },
          { label: 'Yearly Interest Cost',value: fmt(totalYearlyInterest, 0),  color: 'text-orange-400' },
        ].map((s) => (
          <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <p className="text-gray-400 text-sm mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Monthly interest cost banner */}
      {totalDebt > 0 && (
        <div className="bg-orange-500/5 border border-orange-500/20 rounded-xl p-4 flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-orange-300 text-sm font-medium">Monthly interest burden</p>
            <p className="text-gray-500 text-xs">Cost of carrying your current debt</p>
          </div>
          <p className="text-orange-400 font-bold text-2xl">{fmt(totalYearlyInterest / 12, 2)}<span className="text-sm font-normal text-gray-500"> / mo</span></p>
        </div>
      )}

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <h3 className="text-white font-semibold">Active Loans ({loans.length})</h3>
          <button onClick={load} className="text-gray-500 hover:text-white transition-colors">
            <RefreshCw size={14} />
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center"><RefreshCw className="animate-spin text-gray-600 mx-auto" /></div>
        ) : loans.length === 0 ? (
          <div className="p-8 text-center">
            <CreditCard size={32} className="text-gray-700 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">No loans tracked. Add one to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  {['Name / Lender', 'Type', 'Original', 'Balance', 'APR', 'Mo. Interest', 'End Date', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {loans.map((l) => {
                  const monthlyInterest = l.current_balance * (l.interest_rate / 100) / 12;
                  const paidPct = l.principal > 0 ? ((l.principal - l.current_balance) / l.principal) * 100 : 0;
                  return (
                    <tr key={l.id} className="hover:bg-gray-800/40 transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-white text-sm font-medium">{l.name}</p>
                        {l.lender && <p className="text-gray-500 text-xs">{l.lender}</p>}
                        {/* Progress bar */}
                        <div className="mt-1 h-1 bg-gray-800 rounded-full w-24">
                          <div
                            className="h-1 rounded-full bg-emerald-500"
                            style={{ width: `${Math.min(100, paidPct)}%` }}
                          />
                        </div>
                        <p className="text-gray-600 text-xs mt-0.5">{paidPct.toFixed(0)}% paid</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${typeColors[l.loan_type] ?? typeColors.Other}`}>
                          {l.loan_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-sm">{fmt(l.principal, 0)}</td>
                      <td className="px-4 py-3">
                        {editingId === l.id ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              value={editBalance}
                              onChange={(e) => setEditBalance(e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Enter') saveBalance(l.id); if (e.key === 'Escape') setEditingId(null); }}
                              className="w-24 bg-gray-800 border border-red-500 rounded px-2 py-1 text-white text-sm focus:outline-none"
                              autoFocus
                            />
                            <button onClick={() => saveBalance(l.id)} className="text-emerald-400 hover:text-emerald-300"><Check size={14} /></button>
                            <button onClick={() => setEditingId(null)} className="text-gray-500 hover:text-white"><X size={14} /></button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="text-red-400 font-semibold text-sm">{fmt(l.current_balance, 0)}</span>
                            <button
                              onClick={() => { setEditingId(l.id); setEditBalance(String(l.current_balance)); }}
                              className="text-gray-600 hover:text-white transition-colors"
                            ><Edit3 size={12} /></button>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-orange-400 text-sm font-medium">{l.interest_rate}%</td>
                      <td className="px-4 py-3 text-orange-400 text-sm">{fmt(monthlyInterest, 2)}</td>
                      <td className="px-4 py-3 text-gray-500 text-sm">{l.end_date || '—'}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => remove(l.id)} className="text-gray-600 hover:text-red-400 transition-colors">
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-700 bg-gray-800/30">
                  <td colSpan={3} className="px-4 py-3 text-gray-400 text-sm font-semibold">TOTAL</td>
                  <td className="px-4 py-3 text-red-400 font-bold">{fmt(totalDebt, 0)}</td>
                  <td />
                  <td className="px-4 py-3 text-orange-400 font-bold">{fmt(totalYearlyInterest / 12, 2)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Add Loan Modal */}
      {showModal && (
        <Modal title="Add Loan" onClose={() => setShowModal(false)}>
          <form onSubmit={submit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-gray-400 text-sm mb-1">Loan Name</label>
                <input type="text" required value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-red-500"
                  placeholder="e.g. Home Mortgage, Student Loan"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1">Lender</label>
                <input type="text" value={form.lender}
                  onChange={(e) => setForm({ ...form, lender: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-red-500"
                  placeholder="Bank name"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1">Type</label>
                <select value={form.loan_type}
                  onChange={(e) => setForm({ ...form, loan_type: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-red-500"
                >
                  {LOAN_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1">Original Principal (€)</label>
                <input type="number" step="0.01" min="0" required value={form.principal}
                  onChange={(e) => setForm({ ...form, principal: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-red-500"
                  placeholder="e.g. 200000"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1">Current Balance (€)</label>
                <input type="number" step="0.01" min="0" required value={form.current_balance}
                  onChange={(e) => setForm({ ...form, current_balance: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-red-500"
                  placeholder="What you owe now"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1">Interest Rate (APR %)</label>
                <input type="number" step="0.01" min="0" max="100" required value={form.interest_rate}
                  onChange={(e) => setForm({ ...form, interest_rate: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-red-500"
                  placeholder="e.g. 3.5"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1">Start Date</label>
                <input type="date" required value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-red-500"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1">End Date (optional)</label>
                <input type="date" value={form.end_date}
                  onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-red-500"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-gray-400 text-sm mb-1">Notes</label>
                <input type="text" value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-red-500"
                />
              </div>
            </div>
            {/* Preview */}
            {form.current_balance && form.interest_rate && (
              <div className="bg-gray-800 rounded-lg p-3 text-sm">
                <p className="text-gray-400">Monthly interest: <span className="text-orange-400 font-medium">
                  {fmt(Number(form.current_balance) * (Number(form.interest_rate) / 100) / 12, 2)}
                </span></p>
              </div>
            )}
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm font-medium transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={submitting}
                className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-400 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
                {submitting ? 'Saving...' : 'Add Loan'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

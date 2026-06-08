'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface DataPoint {
  month: string;
  income: number;
  expenses: number;
}

interface Props {
  data: DataPoint[];
  currency?: string;
}

const fmt = (v: number, currency = 'EUR') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(v);

export default function IncomeExpenseChart({ data, currency = 'EUR' }: Props) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
        <XAxis
          dataKey="month"
          tick={{ fill: '#6b7280', fontSize: 11 }}
          axisLine={{ stroke: '#1f2937' }}
          tickLine={false}
          tickFormatter={(v) => v.slice(5)}
        />
        <YAxis
          tick={{ fill: '#6b7280', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
          width={40}
        />
        <Tooltip
          contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: '8px', color: '#f9fafb' }}
          formatter={(v, name) => [fmt(Number(v), currency), String(name).charAt(0).toUpperCase() + String(name).slice(1)]}
          labelStyle={{ color: '#9ca3af' }}
        />
        <Legend wrapperStyle={{ color: '#9ca3af', fontSize: 12 }} />
        <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} name="Income" />
        <Bar dataKey="expenses" fill="#ef4444" radius={[4, 4, 0, 0]} name="Expenses" />
      </BarChart>
    </ResponsiveContainer>
  );
}

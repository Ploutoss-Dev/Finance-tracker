'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface DataPoint {
  date: string;
  balance: number;
}

interface Props {
  data: DataPoint[];
  currency?: string;
}

const fmt = (v: number, currency = 'EUR') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(v);

export default function SavingsChart({ data, currency = 'EUR' }: Props) {
  if (!data || data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-gray-600 text-sm">
        No savings history yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <defs>
          <linearGradient id="savingsGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
        <XAxis
          dataKey="date"
          tick={{ fill: '#6b7280', fontSize: 11 }}
          axisLine={{ stroke: '#1f2937' }}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: '#6b7280', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={50}
          tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
        />
        <Tooltip
          contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: '8px', color: '#f9fafb' }}
          formatter={(v) => [fmt(Number(v), currency), 'Balance']}
          labelStyle={{ color: '#9ca3af' }}
        />
        <Area
          type="monotone"
          dataKey="balance"
          stroke="#3b82f6"
          strokeWidth={2}
          fill="url(#savingsGrad)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

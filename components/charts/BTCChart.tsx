'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface DataPoint {
  date: string;
  avgPrice: number;
  totalBtc: number;
  invested: number;
}

interface Props {
  data: DataPoint[];
  currentPrice?: number;
  currency?: string;
}

const fmt = (v: number, currency = 'EUR') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(v);

export default function BTCChart({ data, currency = 'EUR' }: Props) {
  if (!data || data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-gray-600 text-sm">
        No BTC purchase history yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
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
          width={55}
          tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
        />
        <Tooltip
          contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: '8px', color: '#f9fafb' }}
          formatter={(v, name) => [fmt(Number(v), currency), String(name)]}
          labelStyle={{ color: '#9ca3af' }}
        />
        <Legend wrapperStyle={{ color: '#9ca3af', fontSize: 12 }} />
        <Line
          type="monotone"
          dataKey="avgPrice"
          stroke="#f59e0b"
          strokeWidth={2}
          dot={{ fill: '#f59e0b', r: 3 }}
          name="Avg Buy Price"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { money } from '@/lib/format';

export default function RevenueChart({
  data,
}: {
  data: { date: string; total: number }[];
}) {
  const formatted = data.map((d) => ({
    ...d,
    label: new Date(d.date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }),
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={formatted}>
        <defs>
          <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#C8202F" stopOpacity={0.25} />
            <stop offset="100%" stopColor="#C8202F" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="#E6E8EA" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: '#6B7480' }}
          axisLine={false}
          tickLine={false}
          interval={Math.max(0, Math.floor(formatted.length / 6) - 1)}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#6B7480' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `$${v}`}
        />
        <Tooltip formatter={(v: number) => money(v)} />
        <Area
          type="monotone"
          dataKey="total"
          stroke="#C8202F"
          fill="url(#rev)"
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

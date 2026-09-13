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
  data: { label: string; total: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#C8202F" stopOpacity={0.25} />
            <stop offset="100%" stopColor="#C8202F" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="#2A2D33" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: '#8A93A0' }}
          axisLine={false}
          tickLine={false}
          interval={Math.max(0, Math.floor(data.length / 6) - 1)}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#8A93A0' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `$${v}`}
        />
        <Tooltip
          formatter={(v: number) => money(v)}
          contentStyle={{
            background: '#16181C',
            border: '1px solid #2A2D33',
            borderRadius: 8,
            color: '#EDEEF0',
          }}
          labelStyle={{ color: '#EDEEF0' }}
          itemStyle={{ color: '#EDEEF0' }}
        />
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

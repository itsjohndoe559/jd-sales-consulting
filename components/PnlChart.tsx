'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { money } from '@/lib/format';

export default function PnlChart({
  data,
}: {
  data: { label: string; revenue: number; profit: number | null }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data}>
        <CartesianGrid vertical={false} stroke="#E6E8EA" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: '#6B7480' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#6B7480' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `$${v}`}
        />
        <Tooltip formatter={(v: number) => money(v)} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="revenue" name="Revenue" fill="#C8202F" radius={[3, 3, 0, 0]} />
        <Bar dataKey="profit" name="Profit" fill="#146B4C" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

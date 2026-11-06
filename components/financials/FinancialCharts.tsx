'use client';

import {
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { money } from '@/lib/format';
import { ACCOUNT_COLORS, LEDGER_ACCOUNTS } from '@/lib/financials';

const tooltip = {
  formatter: (v: number) => money(v),
  contentStyle: {
    background: '#16181C',
    border: '1px solid #2A2D33',
    borderRadius: 8,
    color: '#EDEEF0',
  },
  labelStyle: { color: '#EDEEF0' },
  itemStyle: { color: '#EDEEF0' },
};
const axis = { tick: { fontSize: 11, fill: '#8A93A0' }, axisLine: false, tickLine: false };
const yMoney = (v: number) => `$${Math.round(v).toLocaleString('en-US')}`;
const legend = { wrapperStyle: { fontSize: 11, color: '#8A93A0' } };

type Point = Record<string, number | string>;

export function AccountBalancesChart({ data }: { data: Point[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data}>
        <CartesianGrid vertical={false} stroke="#2A2D33" />
        <XAxis dataKey="label" {...axis} minTickGap={20} />
        <YAxis {...axis} tickFormatter={yMoney} width={70} />
        <Tooltip {...tooltip} />
        <Legend {...legend} />
        {LEDGER_ACCOUNTS.map((a) => (
          <Line
            key={a}
            type="stepAfter"
            dataKey={a}
            stroke={ACCOUNT_COLORS[a]}
            strokeWidth={2}
            dot={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

export function CashOnHandChart({ data }: { data: Point[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="cashOnHand" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1FAE74" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#1FAE74" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="#2A2D33" />
        <XAxis dataKey="label" {...axis} minTickGap={20} />
        <YAxis {...axis} tickFormatter={yMoney} width={70} />
        <Tooltip {...tooltip} />
        <Area
          type="stepAfter"
          dataKey="total"
          name="Cash on hand"
          stroke="#1FAE74"
          fill="url(#cashOnHand)"
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// Keyed by name, never array position (see CONTEXT.md - colors shifted when a slice was $0).
const MIX_COLORS: Record<string, string> = {
  Cash: '#1FAE74',
  Digital: '#6FA8DC',
  Other: '#F28C28',
};

export function SalesMixChart({ cash, digital, other }: { cash: number; digital: number; other: number }) {
  const data = [
    { name: 'Cash', value: cash },
    { name: 'Digital', value: digital },
    { name: 'Other', value: other },
  ].filter((d) => d.value > 0);
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
          {data.map((d) => (
            <Cell key={d.name} fill={MIX_COLORS[d.name]} stroke="none" />
          ))}
        </Pie>
        <Tooltip {...tooltip} />
        <Legend {...legend} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function WeeklyBreakdownChart({ data }: { data: Point[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data}>
        <CartesianGrid vertical={false} stroke="#2A2D33" />
        <XAxis dataKey="label" {...axis} />
        <YAxis {...axis} tickFormatter={yMoney} width={70} />
        <Tooltip {...tooltip} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
        <Legend {...legend} />
        <Bar dataKey="revenue" name="Revenue" fill="#C8202F" radius={[3, 3, 0, 0]} />
        <Bar dataKey="actualSales" name="Actual Sales" fill="#6FA8DC" radius={[3, 3, 0, 0]} />
        <Bar dataKey="netProfit" name="Net Profit" fill="#1FAE74" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

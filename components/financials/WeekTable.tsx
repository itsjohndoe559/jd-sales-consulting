'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { money } from '@/lib/format';
import { mdy, type DayRow, type WeekSummary } from '@/lib/financials';

type Row = {
  label: string;
  key: keyof DayRow;
  kind: 'money' | 'count';
  strong?: boolean;
};

// Same rows, same order as the sheet's weekly tabs.
const ROWS: Row[] = [
  { label: 'Revenue', key: 'revenue', kind: 'money', strong: true },
  { label: 'Actual Sales', key: 'actualSales', kind: 'money' },
  { label: 'Cash Sales', key: 'cash', kind: 'money' },
  { label: 'Digital Sales', key: 'digital', kind: 'money' },
  { label: 'Other Sales', key: 'other', kind: 'money' },
  { label: 'Cost of Goods', key: 'cogs', kind: 'money' },
  { label: 'Net Profit', key: 'netProfit', kind: 'money', strong: true },
  { label: 'Taxes', key: 'taxes', kind: 'money' },
  { label: 'Bank', key: 'bank', kind: 'money' },
  { label: 'Voided', key: 'voided', kind: 'money' },
  { label: 'Total', key: 'total', kind: 'money', strong: true },
  { label: 'Transactions', key: 'transactions', kind: 'count' },
  { label: 'Voided', key: 'voidedCount', kind: 'count' },
  { label: 'Units on Hand', key: 'unitsOnHand', kind: 'count' },
];

function VoidedInput({ day, value }: { day: string; value: number }) {
  const router = useRouter();
  const [v, setV] = useState(String(value));
  const [state, setState] = useState<'idle' | 'saving' | 'error'>('idle');

  async function save() {
    const n = Number(v);
    if (!Number.isInteger(n) || n < 0) {
      setV(String(value));
      return;
    }
    if (n === value) return;
    setState('saving');
    const res = await fetch('/api/financials/manual', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ day, voided_count: n }),
    });
    setState(res.ok ? 'idle' : 'error');
    if (res.ok) router.refresh();
  }

  return (
    <input
      value={v}
      inputMode="numeric"
      onChange={(e) => setV(e.target.value.replace(/[^0-9]/g, ''))}
      onBlur={save}
      onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
      className={`w-14 text-right bg-paper border rounded px-1.5 py-0.5 ${
        state === 'error' ? 'border-jdred' : 'border-line'
      } ${state === 'saving' ? 'opacity-50' : ''}`}
    />
  );
}

export default function WeekTable({ summary }: { summary: WeekSummary }) {
  const { week, days, totals, deposit } = summary;
  const fmt = (r: Row, v: number) => (r.kind === 'money' ? money(v) : v.toLocaleString('en-US'));

  const depositRows: [string, number][] = [
    ['Revenue', deposit.revenue],
    ['Actual Rev', deposit.actualRev],
    ['Digital Sales', deposit.digitalSales],
    ['Other Sales', deposit.otherSales],
    ['Digital Total', deposit.digitalTotal],
    ['Taxes Deposit', deposit.taxesDeposit],
    ['Cash Deposit', deposit.cashDeposit],
    ['Voided', deposit.voided],
  ];

  return (
    <div className="space-y-6">
      <div>
        <div className="text-[11px] tracking-wide text-slate uppercase">Week</div>
        <h1 className="text-2xl font-bold">{week.label}</h1>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm tabular whitespace-nowrap">
          <thead>
            <tr className="text-[11px] uppercase tracking-wide text-slate border-b border-line">
              <th className="text-left p-3 sticky left-0 bg-[#16181C]"></th>
              {days.map((d) => (
                <th key={d.date} className="text-right p-3">{mdy(d.date)}</th>
              ))}
              <th className="text-right p-3 text-white border-l border-line">Week</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r.label + r.key} className="border-b border-line last:border-0">
                <td className="p-3 sticky left-0 bg-[#16181C]">
                  <div className={r.strong ? 'font-semibold' : ''}>{r.label}</div>
                </td>
                {days.map((d) => (
                  <td key={d.date} className={`p-3 text-right ${r.strong ? 'font-semibold' : ''}`}>
                    {r.key === 'voidedCount' ? (
                      <VoidedInput key={`${d.date}-${d.voidedCount}`} day={d.date} value={d.voidedCount} />
                    ) : (
                      fmt(r, d[r.key] as number)
                    )}
                  </td>
                ))}
                <td className="p-3 text-right font-semibold border-l border-line">
                  {fmt(r, totals[r.key] as number)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="card p-4 border-t-2 border-t-jdred">
          <div className="text-[11px] tracking-wide text-slate uppercase">Void Value</div>
          <div className="text-3xl font-bold mt-1 tabular">{money(summary.voidValue)}</div>
        </div>

        <div className="card md:col-span-2 overflow-hidden">
          <div className="px-4 pt-4 pb-2 text-sm font-semibold">Weekly Summary</div>
          <table className="w-full text-sm tabular">
            <tbody>
              {depositRows.map(([label, value]) => (
                <tr key={label} className="border-t border-line">
                  <td className="px-4 py-2">
                    {label}
                  </td>
                  <td className="px-4 py-2 text-right font-semibold">{money(value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

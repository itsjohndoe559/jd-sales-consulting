'use client';

import { useMemo, useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { money, businessWeekday, channelFor } from '@/lib/format';
import PnlChart from './PnlChart';
import type { Product, Transaction } from '@/lib/types';

const TABS = ['By Product', 'By Day of Week', 'By Sales Channel'] as const;
type Tab = (typeof TABS)[number];

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

type ProductRow = {
  sku: string;
  name: string;
  units: number;
  revenue: number;
  cogs: number | null;
  profit: number | null;
  margin: number | null; // percent
};

type SortKey = 'name' | 'units' | 'revenue' | 'cogs' | 'profit' | 'margin';

function computeByProduct(transactions: Transaction[], products: Product[]): ProductRow[] {
  const costBySku = new Map(products.map((p) => [p.sku, p.cost]));
  const bySku = new Map<string, { name: string; units: number; revenue: number }>();

  for (const t of transactions) {
    if (t.voided) continue;
    for (const item of t.items) {
      const existing = bySku.get(item.sku) ?? { name: item.name, units: 0, revenue: 0 };
      existing.units += item.qty;
      existing.revenue += item.price * item.qty;
      bySku.set(item.sku, existing);
    }
  }

  return Array.from(bySku.entries()).map(([sku, v]) => {
    const cost = costBySku.get(sku);
    const known = cost !== null && cost !== undefined;
    const cogs = known ? (cost as number) * v.units : null;
    const profit = known ? v.revenue - (cogs as number) : null;
    const margin = known && v.revenue > 0 ? ((profit as number) / v.revenue) * 100 : null;
    return { sku, name: v.name, units: v.units, revenue: v.revenue, cogs, profit, margin };
  });
}

export default function MarginAnalysis({
  transactions,
  products,
}: {
  transactions: Transaction[];
  products: Product[];
}) {
  const [tab, setTab] = useState<Tab>('By Product');
  const [sortKey, setSortKey] = useState<SortKey>('revenue');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const productRows = useMemo(
    () => computeByProduct(transactions, products),
    [transactions, products]
  );

  const sortedRows = useMemo(() => {
    const rows = [...productRows];
    rows.sort((a, b) => {
      const av = a[sortKey] ?? -Infinity;
      const bv = b[sortKey] ?? -Infinity;
      if (typeof av === 'string' || typeof bv === 'string') {
        return sortDir === 'asc'
          ? String(av).localeCompare(String(bv))
          : String(bv).localeCompare(String(av));
      }
      return sortDir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
    return rows;
  }, [productRows, sortKey, sortDir]);

  const top3MarginSkus = useMemo(() => {
    return new Set(
      [...productRows]
        .filter((r) => r.margin !== null)
        .sort((a, b) => (b.margin as number) - (a.margin as number))
        .slice(0, 3)
        .map((r) => r.sku)
    );
  }, [productRows]);

  const totals = useMemo(() => {
    const units = productRows.reduce((s, r) => s + r.units, 0);
    const revenue = productRows.reduce((s, r) => s + r.revenue, 0);
    const incomplete = productRows.some((r) => r.cogs === null);
    const cogs = incomplete ? null : productRows.reduce((s, r) => s + (r.cogs ?? 0), 0);
    const profit = incomplete ? null : revenue - (cogs ?? 0);
    return { units, revenue, cogs, profit };
  }, [productRows]);

  function sortBy(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  const byWeekday = useMemo(() => {
    const buckets = new Map<string, { revenue: number; cogs: number; incomplete: boolean }>();
    for (const day of WEEKDAYS) buckets.set(day, { revenue: 0, cogs: 0, incomplete: false });
    const costBySku = new Map(products.map((p) => [p.sku, p.cost]));

    for (const t of transactions) {
      if (t.voided) continue;
      const day = businessWeekday(t.created_at);
      const bucket = buckets.get(day)!;
      bucket.revenue += t.total;
      for (const item of t.items) {
        const cost = costBySku.get(item.sku);
        if (cost === null || cost === undefined) bucket.incomplete = true;
        else bucket.cogs += cost * item.qty;
      }
    }

    return WEEKDAYS.map((day) => {
      const b = buckets.get(day)!;
      return {
        label: day.slice(0, 3),
        revenue: b.revenue,
        profit: b.incomplete ? null : b.revenue - b.cogs,
      };
    });
  }, [transactions, products]);

  const bestDay = useMemo(() => {
    const withProfit = byWeekday.filter((d) => d.profit !== null);
    if (withProfit.length === 0) return null;
    return withProfit.reduce((best, d) => ((d.profit ?? 0) > (best.profit ?? 0) ? d : best));
  }, [byWeekday]);

  const byChannel = useMemo(() => {
    const channels = { Cash: { units: 0, revenue: 0, cogs: 0, incomplete: false, count: 0 }, Digital: { units: 0, revenue: 0, cogs: 0, incomplete: false, count: 0 } };
    const costBySku = new Map(products.map((p) => [p.sku, p.cost]));

    for (const t of transactions) {
      if (t.voided) continue;
      const ch = channelFor(t.payment_method);
      const bucket = channels[ch];
      bucket.revenue += t.total;
      bucket.count += 1;
      for (const item of t.items) {
        bucket.units += item.qty;
        const cost = costBySku.get(item.sku);
        if (cost === null || cost === undefined) bucket.incomplete = true;
        else bucket.cogs += cost * item.qty;
      }
    }

    return channels;
  }, [transactions, products]);

  const pieData = [
    { name: 'Cash', value: byChannel.Cash.revenue },
    { name: 'Digital', value: byChannel.Digital.revenue },
  ].filter((d) => d.value > 0);

  const columns: { key: SortKey; label: string; align?: 'right' }[] = [
    { key: 'name', label: 'Product' },
    { key: 'units', label: 'Units', align: 'right' },
    { key: 'revenue', label: 'Revenue', align: 'right' },
    { key: 'cogs', label: 'COGS', align: 'right' },
    { key: 'profit', label: 'Profit', align: 'right' },
    { key: 'margin', label: 'Margin %', align: 'right' },
  ];

  return (
    <div>
      <div className="text-sm font-bold mb-3">Analysis</div>
      <div className="flex gap-2 mb-4 flex-wrap">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-full text-sm ${
              tab === t ? 'bg-ink text-white' : 'bg-line/50 text-ink'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'By Product' && (
        <div className="card p-4 overflow-x-auto">
          {sortedRows.length === 0 ? (
            <div className="text-sm text-slate italic py-4 text-center">
              No sales in this period.
            </div>
          ) : (
            <table className="w-full text-sm min-w-[560px]">
              <thead>
                <tr className="text-[11px] text-slate uppercase text-left border-b border-line">
                  {columns.map((c) => (
                    <th
                      key={c.key}
                      onClick={() => sortBy(c.key)}
                      className={`pb-2 cursor-pointer select-none ${c.align === 'right' ? 'text-right' : ''}`}
                    >
                      {c.label}{' '}
                      {sortKey === c.key ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((r) => (
                  <tr
                    key={r.sku}
                    className={`border-b border-line last:border-0 ${
                      top3MarginSkus.has(r.sku) ? 'bg-jdgreen/10' : ''
                    }`}
                  >
                    <td className="py-2">
                      {r.name} <span className="text-slate text-xs">({r.sku})</span>
                    </td>
                    <td className="py-2 text-right tabular">{r.units}</td>
                    <td className="py-2 text-right tabular">{money(r.revenue)}</td>
                    <td className="py-2 text-right tabular">
                      {r.cogs === null ? '—' : money(r.cogs)}
                    </td>
                    <td className="py-2 text-right tabular">
                      {r.profit === null ? '—' : money(r.profit)}
                    </td>
                    <td className="py-2 text-right tabular">
                      {r.margin === null ? '—' : `${r.margin.toFixed(0)}%`}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-line font-bold">
                  <td className="py-2">Total</td>
                  <td className="py-2 text-right tabular">{totals.units}</td>
                  <td className="py-2 text-right tabular">{money(totals.revenue)}</td>
                  <td className="py-2 text-right tabular">
                    {totals.cogs === null ? '—' : money(totals.cogs)}
                  </td>
                  <td className="py-2 text-right tabular">
                    {totals.profit === null ? '—' : money(totals.profit)}
                  </td>
                  <td className="py-2 text-right tabular">
                    {totals.profit === null || totals.revenue === 0
                      ? '—'
                      : `${Math.round((totals.profit / totals.revenue) * 100)}%`}
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      )}

      {tab === 'By Day of Week' && (
        <div className="card p-4">
          <PnlChart data={byWeekday} />
          <div className="text-sm mt-3">
            {bestDay ? (
              <span>
                Most profitable day: <span className="font-bold">{bestDay.label}</span>
              </span>
            ) : (
              <span className="text-slate italic">
                Not enough cost data yet to identify the most profitable day.
              </span>
            )}
          </div>
        </div>
      )}

      {tab === 'By Sales Channel' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(['Cash', 'Digital'] as const).map((ch) => {
            const c = byChannel[ch];
            const profit = c.incomplete ? null : c.revenue - c.cogs;
            const margin = profit !== null && c.revenue > 0 ? (profit / c.revenue) * 100 : null;
            return (
              <div key={ch} className="card p-4">
                <div className="text-sm font-bold mb-3">{ch}</div>
                {c.count === 0 ? (
                  <div className="text-sm text-slate italic">No sales yet.</div>
                ) : (
                  <div className="flex flex-col gap-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate">Units Sold</span>
                      <span className="tabular">{c.units}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate">Revenue</span>
                      <span className="tabular">{money(c.revenue)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate">COGS</span>
                      <span className="tabular">{c.incomplete ? '—' : money(c.cogs)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate">Profit</span>
                      <span className="tabular">{profit === null ? '—' : money(profit)}</span>
                    </div>
                    <div className="flex justify-between font-medium">
                      <span>Margin</span>
                      <span className="tabular">
                        {margin === null ? '—' : `${margin.toFixed(0)}%`}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          <div className="card p-4 md:col-span-2">
            <div className="text-sm font-bold mb-3">Revenue Split</div>
            {pieData.length === 0 ? (
              <div className="text-sm text-slate italic">No sales yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={80} label>
                    <Cell fill="#C8202F" />
                    <Cell fill="#146B4C" />
                  </Pie>
                  <Tooltip formatter={(v: number) => money(v)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

import Link from 'next/link';
import { getProducts, getTransactions } from '@/lib/data';
import { pnlByWeek, pnlByMonth, pnlYtd, currentMonthStr } from '@/lib/analytics';
import { money } from '@/lib/format';
import PnlChart from '@/components/PnlChart';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

const PERIODS = ['weekly', 'monthly', 'ytd'] as const;

export default async function PnlPage({
  searchParams,
}: {
  searchParams: { period?: string };
}) {
  const period = (searchParams.period ?? 'weekly') as (typeof PERIODS)[number];
  const [products, transactions] = await Promise.all([
    getProducts(),
    getTransactions(),
  ]);

  // Derived in the business's local timezone, not the server's (UTC) clock -
  // otherwise late-evening Pacific sales near a month/year boundary could
  // land in the wrong bucket.
  const monthStr = currentMonthStr();
  const [currentYear] = monthStr.split('-').map(Number);
  const currentMonthIndex = Number(monthStr.split('-')[1]) - 1;

  let buckets;
  if (period === 'weekly') {
    buckets = pnlByWeek(transactions, products, monthStr);
  } else if (period === 'monthly') {
    buckets = pnlByMonth(transactions, products, currentYear, currentMonthIndex);
  } else {
    buckets = [pnlYtd(transactions, products, currentYear)];
  }

  const totalRevenue = buckets.reduce((s, b) => s + b.revenue, 0);
  const incomplete = buckets.some((b) => b.profit === null);
  const totalProfit = incomplete
    ? null
    : buckets.reduce((s, b) => s + (b.profit ?? 0), 0);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">P&amp;L</h1>
      <p className="text-sm text-slate mb-4">
        Computed live from transactions and product cost
      </p>

      <div className="flex gap-2 mb-4">
        {PERIODS.map((p) => (
          <Link
            key={p}
            href={`/pnl?period=${p}`}
            className={`px-3 py-1.5 rounded-full text-sm capitalize ${
              period === p ? 'bg-ink text-white' : 'bg-line/50 text-ink'
            }`}
          >
            {p}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <div className="card p-4">
          <div className="text-[11px] text-slate uppercase">Revenue</div>
          <div className="text-2xl font-bold tabular">{money(totalRevenue)}</div>
        </div>
        <div className="card p-4">
          <div className="text-[11px] text-slate uppercase">Profit</div>
          <div className="text-2xl font-bold tabular">
            {totalProfit === null ? 'Incomplete' : money(totalProfit)}
          </div>
        </div>
        <div className="card p-4">
          <div className="text-[11px] text-slate uppercase">Margin</div>
          <div className="text-2xl font-bold tabular">
            {totalProfit === null || totalRevenue === 0
              ? '—'
              : `${Math.round((totalProfit / totalRevenue) * 100)}%`}
          </div>
        </div>
      </div>

      {incomplete && (
        <div className="card p-3 mb-6 text-sm border-jdred/30 bg-jdred/5">
          Some periods show incomplete profit because a sold SKU is still
          missing cost.{' '}
          <Link href="/inventory" className="underline font-medium">
            Fill in costs
          </Link>
          .
        </div>
      )}

      <div className="card p-4">
        <div className="text-sm font-bold mb-3">Revenue vs. Profit</div>
        <PnlChart
          data={buckets.map((b) => ({
            label: b.label,
            revenue: b.revenue,
            profit: b.profit ?? 0,
          }))}
        />
      </div>
    </div>
  );
}

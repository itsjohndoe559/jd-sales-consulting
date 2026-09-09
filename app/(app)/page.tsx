import Link from 'next/link';
import { getProducts, getTransactions, getOnHand } from '@/lib/data';
import {
  computeKpis,
  monthRangeFor,
  currentMonthStr,
  revenueSeries,
  topProductsRange,
  lowStock,
  type ChartGranularity,
} from '@/lib/analytics';
import { money, shortDate } from '@/lib/format';
import KpiTile from '@/components/KpiTile';
import RevenueChart from '@/components/RevenueChart';
import MonthSelect from '@/components/MonthSelect';
import GranularityTabs from '@/components/GranularityTabs';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { month?: string; chart?: string; top?: string };
}) {
  const month = searchParams.month ?? currentMonthStr();
  const chartGranularity = (searchParams.chart ?? 'daily') as ChartGranularity;
  const topGranularity = (searchParams.top ?? 'monthly') as ChartGranularity;

  const [products, transactions, onHand] = await Promise.all([
    getProducts(),
    getTransactions(),
    getOnHand(),
  ]);

  const { start, end } = monthRangeFor(month);
  const monthTxns = transactions.filter(
    (t) => new Date(t.created_at) >= start && new Date(t.created_at) <= end
  );

  const kpis = computeKpis(monthTxns, products, onHand);
  const chartData = revenueSeries(transactions, month, chartGranularity);
  const top = topProductsRange(transactions, month, topGranularity, 5);
  const low = lowStock(onHand, products, 10);
  const recent = transactions.slice(0, 5);

  return (
    <div>
      <div className="flex justify-between items-start mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
        </div>
        <MonthSelect value={month} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KpiTile
          label="Total Revenue"
          value={money(kpis.totalRevenue)}
          sub={`${kpis.unitsSold} units sold`}
          accent="red"
        />
        <KpiTile
          label="Total Profit"
          value={
            kpis.profit === null
              ? `Incomplete — ${kpis.missingCostSkus.length} SKUs missing cost`
              : money(kpis.profit)
          }
          sub={
            kpis.profit !== null && kpis.totalRevenue > 0
              ? `${Math.round((kpis.profit / kpis.totalRevenue) * 100)}% margin`
              : undefined
          }
          accent="green"
        />
        <KpiTile
          label="Cost of Goods"
          value={kpis.cogs === null ? '—' : money(kpis.cogs)}
          sub={`across ${kpis.skuCount} SKUs`}
        />
        <KpiTile
          label="Inventory On Hand"
          value={`${kpis.inventoryOnHand}`}
          sub="units in stock"
        />
      </div>

      {kpis.profit === null && (
        <div className="card p-3 mb-6 text-sm border-jdred/30 bg-jdred/5">
          Profit is incomplete until every sold SKU has a cost.{' '}
          <Link href="/inventory" className="underline font-medium">
            Fill in costs on the Inventory page
          </Link>
          .
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="card p-4 lg:col-span-2">
          <div className="flex justify-between items-start gap-3 flex-wrap mb-2">
            <div>
              <div className="text-sm font-bold">Revenue</div>
              <div className="text-xs text-slate">Cash + digital sales</div>
            </div>
            <GranularityTabs paramName="chart" value={chartGranularity} />
          </div>
          <RevenueChart data={chartData} />
        </div>

        <div className="card p-4">
          <div className="flex justify-between items-start gap-2 flex-wrap mb-1">
            <div className="text-sm font-bold">Top Products</div>
          </div>
          <div className="mb-3">
            <GranularityTabs paramName="top" value={topGranularity} />
          </div>
          <div className="flex flex-col gap-3">
            {top.length === 0 && (
              <div className="text-sm text-slate italic">No sales yet.</div>
            )}
            {top.map((p, i) => (
              <div key={p.sku}>
                <div className="flex justify-between text-sm mb-1">
                  <span>{p.name}</span>
                  <span className="tabular font-medium">
                    {money(p.revenue)}
                  </span>
                </div>
                <div className="h-1.5 bg-line rounded-full overflow-hidden">
                  <div
                    className={`h-full ${
                      i % 2 === 0 ? 'bg-jdred' : 'bg-jdgreen'
                    }`}
                    style={{
                      width: `${Math.min(
                        100,
                        (p.revenue / top[0].revenue) * 100
                      )}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-4">
          <div className="text-sm font-bold mb-1">Recent Transactions</div>
          <div className="text-xs text-slate mb-3">Last 5 logged entries</div>
          {recent.length === 0 && (
            <div className="text-sm text-slate italic">
              No transactions logged yet.
            </div>
          )}
          {recent.map((t) => (
            <div
              key={t.id}
              className="flex justify-between text-sm py-2 border-b border-line last:border-0"
            >
              <div>
                <div className="text-xs text-slate">
                  {shortDate(t.created_at)}
                </div>
                <div>
                  {t.items.map((i) => `${i.name} ×${i.qty}`).join(' + ')}
                </div>
              </div>
              <span className="tabular font-medium">{money(t.total)}</span>
            </div>
          ))}
          <Link
            href="/transactions"
            className="text-xs text-jdred font-medium mt-3 inline-block"
          >
            View all →
          </Link>
        </div>

        <div className="card p-4">
          <div className="text-sm font-bold mb-1">Low Stock Alerts</div>
          <div className="text-xs text-slate mb-3">Reorder soon</div>
          {low.length === 0 && (
            <div className="text-sm text-slate italic">
              Nothing low on stock.
            </div>
          )}
          {low.map((p) => (
            <div
              key={p.sku}
              className="flex justify-between text-sm py-2 border-b border-line last:border-0"
            >
              <div>
                {p.name} <span className="text-xs text-slate">({p.sku})</span>
              </div>
              <span className="text-jdred font-medium">
                {p.onHand} left
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

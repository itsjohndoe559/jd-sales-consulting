import Link from 'next/link';
import { getLedger, getWeekSummaries } from '@/lib/financialsData';
import {
  ACCOUNT_COLORS,
  accountSummaries,
  balanceHistory,
  mdy,
  pct,
  quickStats,
  salesTotals,
  type LedgerAccount,
  type LedgerEntry,
} from '@/lib/financials';
import { money } from '@/lib/format';
import KpiTile from '@/components/KpiTile';
import {
  AccountBalancesChart,
  CashOnHandChart,
  SalesMixChart,
  WeeklyBreakdownChart,
} from '@/components/financials/FinancialCharts';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export default async function FinancialsDashboard() {
  let ledger: LedgerEntry[] = [];
  let ledgerError = '';
  try {
    ledger = await getLedger();
  } catch (e) {
    ledgerError = e instanceof Error ? e.message : String(e);
  }
  const weeks = await getWeekSummaries();

  const accounts = accountSummaries(ledger);
  const history = balanceHistory(ledger);
  const stats = quickStats(ledger);
  const sales = salesTotals(weeks);
  const lastEntry = accounts[accounts.length - 1].lastActivity;
  const weeklyChart = weeks.map((w) => ({
    label: w.week.label,
    revenue: w.totals.revenue,
    actualSales: w.totals.actualSales,
    netProfit: w.totals.netProfit,
  }));

  return (
    <div className="space-y-8">
      <div>
        <div className="text-[11px] tracking-wide text-slate uppercase">JD Sales and Consulting L.L.C.</div>
        <h1 className="text-2xl font-bold">Official Ledger</h1>
        <div className="text-sm text-slate mt-1">Last entry: {lastEntry ? mdy(lastEntry) : 'none yet'}</div>
      </div>

      {ledgerError && (
        <div className="card border-jdred p-4 text-sm">
          Couldn&apos;t load the ledger ({ledgerError}). If this is the first time, run{' '}
          <code className="text-jdred">supabase/financials.sql</code> in the Supabase SQL Editor.
        </div>
      )}

      {/* Account Balances */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Account Balances</h2>
        <div className="card overflow-x-auto">
          <table className="w-full text-sm tabular">
            <thead>
              <tr className="text-[11px] uppercase tracking-wide text-slate border-b border-line">
                <th className="text-left p-3">Account</th>
                <th className="text-right p-3">Balance</th>
                <th className="text-right p-3">Money In</th>
                <th className="text-right p-3">Money Out</th>
                <th className="text-right p-3">Transactions</th>
                <th className="text-right p-3">Last Activity</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((a) => {
                const total = a.account === 'TOTAL';
                return (
                  <tr key={a.account} className={`border-b border-line last:border-0 ${total ? 'font-bold' : ''}`}>
                    <td className="p-3 whitespace-nowrap">
                      {!total && (
                        <span
                          className="inline-block w-2.5 h-2.5 rounded-full mr-2 align-middle"
                          style={{ background: ACCOUNT_COLORS[a.account as LedgerAccount] }}
                        />
                      )}
                      {a.account}
                    </td>
                    <td className="p-3 text-right">{money(a.balance)}</td>
                    <td className="p-3 text-right text-jdgreen">{money(a.moneyIn)}</td>
                    <td className="p-3 text-right text-jdred">{money(a.moneyOut)}</td>
                    <td className="p-3 text-right">{a.transactions}</td>
                    <td className="p-3 text-right">{a.lastActivity ? mdy(a.lastActivity) : '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="grid md:grid-cols-2 gap-4 mt-4">
          <div className="card p-4">
            <div className="text-sm font-semibold mb-2">Account Balances</div>
            <AccountBalancesChart data={history} />
          </div>
          <div className="card p-4">
            <div className="text-sm font-semibold mb-2">Cash on Hand</div>
            <CashOnHandChart data={history} />
          </div>
        </div>
      </section>

      {/* Quick Stats */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Quick Stats</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiTile label="Owner Investment" value={money(stats.ownerInvestment)} />
          <KpiTile label="Taxes Set Aside" value={money(stats.taxesSetAside)} />
          <KpiTile label="Vendor Payments" value={money(stats.vendorPayments)} />
          <KpiTile label="Bank & Check Fees" value={money(stats.fees)} />
        </div>
      </section>

      {/* Sales Dashboard */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Sales Dashboard</h2>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <KpiTile label="Total Revenue" value={money(sales.revenue)} accent="red" />
          <KpiTile label="Actual Sales" value={money(sales.actualSales)} />
          <KpiTile label="Cost of Goods" value={money(sales.cogs)} />
          <KpiTile label="Net Profit" value={money(sales.netProfit)} accent="green" />
          <KpiTile label="Profit Margin" value={pct(sales.margin)} />
          <KpiTile label="Taxes" value={money(sales.taxes)} />
          <KpiTile label="Cash Sales" value={money(sales.cash)} />
          <KpiTile label="Digital Sales" value={money(sales.digital)} />
          <KpiTile label="Other Sales" value={money(sales.other)} />
          <KpiTile label="Transactions" value={String(sales.transactions)} />
          <KpiTile label="Void Value" value={money(sales.voidValue)} />
          <KpiTile label="Avg Revenue" value={money(sales.avgRevenue)} />
        </div>
      </section>

      {/* Weekly Breakdown */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Weekly Breakdown</h2>
        <div className="card overflow-x-auto">
          <table className="w-full text-sm tabular whitespace-nowrap">
            <thead>
              <tr className="text-[11px] uppercase tracking-wide text-slate border-b border-line">
                {['Week', 'Revenue', 'Actual Sales', 'Cash Sales', 'Digital Sales', 'Other Sales', 'Cost of Goods',
                  'Net Profit', 'Taxes', 'Bank', 'Transactions', 'Void Value', 'Margin'].map((h, i) => (
                  <th key={h} className={`p-3 ${i === 0 ? 'text-left' : 'text-right'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {weeks.map((w) => (
                <tr key={w.week.start} className="border-b border-line last:border-0 hover:bg-white/5">
                  <td className="p-3">
                    <Link href={`/financials/week/${w.week.start}`} className="text-jdred hover:underline">
                      {w.week.label}
                    </Link>
                  </td>
                  <td className="p-3 text-right">{money(w.totals.revenue)}</td>
                  <td className="p-3 text-right">{money(w.totals.actualSales)}</td>
                  <td className="p-3 text-right">{money(w.totals.cash)}</td>
                  <td className="p-3 text-right">{money(w.totals.digital)}</td>
                  <td className="p-3 text-right">{money(w.totals.other)}</td>
                  <td className="p-3 text-right">{money(w.totals.cogs)}</td>
                  <td className="p-3 text-right">{money(w.totals.netProfit)}</td>
                  <td className="p-3 text-right">{money(w.totals.taxes)}</td>
                  <td className="p-3 text-right">{money(w.totals.bank)}</td>
                  <td className="p-3 text-right">{w.totals.transactions}</td>
                  <td className="p-3 text-right">{money(w.voidValue)}</td>
                  <td className="p-3 text-right">{pct(w.margin)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="grid md:grid-cols-3 gap-4 mt-4">
          <div className="card p-4">
            <div className="text-sm font-semibold mb-2">Sales Mix</div>
            <SalesMixChart cash={sales.cash} digital={sales.digital} other={sales.other} />
          </div>
          <div className="card p-4 md:col-span-2">
            <div className="text-sm font-semibold mb-2">Weekly Breakdown</div>
            <WeeklyBreakdownChart data={weeklyChart} />
          </div>
        </div>
      </section>
    </div>
  );
}

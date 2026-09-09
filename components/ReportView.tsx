import { money, longDate } from '@/lib/format';
import type { DailyReportData } from '@/lib/types';

export default function ReportView({ data }: { data: DailyReportData }) {
  const incomplete = data.cogs === null;

  return (
    <div className="card p-6 sm:p-8 bg-white w-full max-w-[600px] mx-auto">
      <div className="flex justify-between items-start mb-6">
        <div>
          <div className="text-2xl font-bold leading-none">
            <span className="text-jdred">J</span>
            <span className="text-jdgreen">D</span>
          </div>
          <div className="text-xs text-slate mt-1">
            JD Sales and Consulting L.L.C.
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold">Daily Report</div>
          <div className="text-xs text-slate">{longDate(data.reportDate)}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="border-t-2 border-jdred rounded p-3">
          <div className="text-[10px] text-slate uppercase">Revenue</div>
          <div className="text-lg font-bold tabular">
            {money(data.dailyRevenue)}
          </div>
        </div>
        <div className="border-t-2 border-jdgreen rounded p-3">
          <div className="text-[10px] text-slate uppercase">Profit</div>
          <div className="text-lg font-bold tabular">
            {data.dailyProfit === null ? 'Incomplete' : money(data.dailyProfit)}
          </div>
        </div>
        <div className="border-t-2 border-line rounded p-3">
          <div className="text-[10px] text-slate uppercase">COGS</div>
          <div className="text-lg font-bold tabular">
            {data.cogs === null ? '—' : money(data.cogs)}
          </div>
        </div>
        <div className="border-t-2 border-line rounded p-3">
          <div className="text-[10px] text-slate uppercase">Transactions</div>
          <div className="text-lg font-bold tabular">
            {data.transactionCount}
          </div>
        </div>
      </div>

      {incomplete && (
        <div className="text-xs text-jdred mb-4">
          Profit is incomplete — {data.missingCostSkus.join(', ')} still
          missing cost.
        </div>
      )}

      <div className="mb-6">
        <div className="text-sm font-bold mb-2">Profit &amp; Loss</div>
        <div className="text-sm border-t border-line">
          <div className="flex justify-between py-1.5 border-b border-line">
            <span className="text-slate">Revenue</span>
            <span className="tabular">{money(data.dailyRevenue)}</span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-line">
            <span className="text-slate">COGS</span>
            <span className="tabular">
              {data.cogs === null ? '—' : `-${money(data.cogs)}`}
            </span>
          </div>
          <div className="flex justify-between py-1.5 font-bold">
            <span>Net Profit</span>
            <span className="tabular">
              {data.dailyProfit === null ? 'Incomplete' : money(data.dailyProfit)}
            </span>
          </div>
        </div>
      </div>

      {data.inventoryChanges.length > 0 && (
        <div className="mb-6">
          <div className="text-sm font-bold mb-2">Inventory Changes</div>
          <div className="text-sm">
            <div className="grid grid-cols-4 text-[11px] text-slate uppercase border-b border-line pb-1">
              <div>SKU</div>
              <div className="text-right">In</div>
              <div className="text-right">Out</div>
              <div className="text-right">Net</div>
            </div>
            {data.inventoryChanges.map((c) => (
              <div
                key={c.sku}
                className="grid grid-cols-4 py-1.5 border-b border-line last:border-0"
              >
                <div>
                  {c.name} <span className="text-slate text-xs">({c.sku})</span>
                </div>
                <div className="text-right tabular text-jdgreen">
                  {c.in > 0 ? `+${c.in}` : '—'}
                </div>
                <div className="text-right tabular text-jdred">
                  {c.out > 0 ? `-${c.out}` : '—'}
                </div>
                <div className="text-right tabular font-medium">{c.net}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.lowStock.length > 0 && (
        <div>
          <div className="text-sm font-bold mb-2">Low Stock Alerts</div>
          <div className="text-sm">
            {data.lowStock.map((p) => (
              <div
                key={p.sku}
                className="flex justify-between py-1.5 border-b border-line last:border-0"
              >
                <div>
                  {p.name} <span className="text-slate text-xs">({p.sku})</span>
                </div>
                <span className="text-jdred font-medium">{p.onHand} left</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

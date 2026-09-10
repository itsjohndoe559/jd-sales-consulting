import { supabaseServer } from './supabase';
import { businessDayRange } from './format';
import type { LineItem, InventoryChange, DailyReportData, DailyReport } from './types';

export const EARLIEST_REPORT_DATE = '2026-09-08';

export class ReportError extends Error {
  status: number;
  constructor(message: string, status = 500) {
    super(message);
    this.status = status;
  }
}

export function validateReportDate(reportDate: string | undefined) {
  if (!reportDate || !/^\d{4}-\d{2}-\d{2}$/.test(reportDate)) {
    throw new ReportError('reportDate is required as YYYY-MM-DD', 400);
  }
  if (reportDate < EARLIEST_REPORT_DATE) {
    throw new ReportError(
      `Report date must be on or after ${EARLIEST_REPORT_DATE}.`,
      400
    );
  }
}

/** Computes the full daily report metrics for one calendar (business-tz) day. */
export async function computeDailyReportData(
  reportDate: string
): Promise<DailyReportData> {
  const { start, end } = businessDayRange(reportDate);
  const sb = supabaseServer();

  const [{ data: txns, error: txnError }, { data: products, error: prodError }] =
    await Promise.all([
      sb
        .from('transactions')
        .select('*')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
        .eq('voided', false),
      sb.from('products').select('*'),
    ]);

  if (txnError) throw new ReportError(txnError.message);
  if (prodError) throw new ReportError(prodError.message);

  const costBySku = new Map(
    (products ?? []).map((p) => [p.sku as string, p.cost as number | null])
  );
  const nameBySku = new Map(
    (products ?? []).map((p) => [p.sku as string, p.name as string])
  );

  let dailyRevenue = 0;
  let unitsSold = 0;
  let cogs = 0;
  const missing = new Set<string>();

  for (const t of txns ?? []) {
    dailyRevenue += t.total;
    for (const item of t.items as LineItem[]) {
      unitsSold += item.qty;
      const cost = costBySku.get(item.sku);
      if (cost === null || cost === undefined) {
        missing.add(item.sku);
      } else {
        cogs += cost * item.qty;
      }
    }
  }
  const missingCostSkus = Array.from(missing);
  const complete = missingCostSkus.length === 0;

  const { data: dayAdjustments, error: dayAdjError } = await sb
    .from('inventory_adjustments')
    .select('sku, change')
    .gte('created_at', start.toISOString())
    .lte('created_at', end.toISOString());
  if (dayAdjError) throw new ReportError(dayAdjError.message);

  const changeBySku = new Map<string, { in: number; out: number }>();
  for (const adj of dayAdjustments ?? []) {
    const entry = changeBySku.get(adj.sku) ?? { in: 0, out: 0 };
    if (adj.change > 0) entry.in += adj.change;
    else entry.out += Math.abs(adj.change);
    changeBySku.set(adj.sku, entry);
  }
  const inventoryChanges: InventoryChange[] = Array.from(changeBySku.entries()).map(
    ([sku, v]) => ({
      sku,
      name: nameBySku.get(sku) ?? sku,
      in: v.in,
      out: v.out,
      net: v.in - v.out,
    })
  );

  // Low stock as of the END of this report day, not "now" - so a past
  // report stays accurate even as current stock changes.
  const { data: allAdjustmentsToDate, error: allAdjError } = await sb
    .from('inventory_adjustments')
    .select('sku, change')
    .lte('created_at', end.toISOString());
  if (allAdjError) throw new ReportError(allAdjError.message);

  const onHand: Record<string, number> = {};
  for (const row of allAdjustmentsToDate ?? []) {
    onHand[row.sku] = (onHand[row.sku] ?? 0) + row.change;
  }
  const lowStock = (products ?? [])
    .map((p) => ({ sku: p.sku as string, name: p.name as string, onHand: onHand[p.sku] ?? 0 }))
    .filter((p) => p.onHand < 10)
    .sort((a, b) => a.onHand - b.onHand);

  return {
    reportDate,
    dailyRevenue,
    unitsSold,
    cogs: complete ? cogs : null,
    missingCostSkus,
    dailyProfit: complete ? dailyRevenue - cogs : null,
    transactionCount: (txns ?? []).length,
    inventoryChanges,
    lowStock,
  };
}

/** Computes and upserts a report for the given date, returning the stored row. */
export async function generateAndStoreReport(reportDate: string): Promise<DailyReport> {
  validateReportDate(reportDate);
  const jsonData = await computeDailyReportData(reportDate);

  const sb = supabaseServer();
  const { data: report, error } = await sb
    .from('daily_reports')
    .upsert(
      { report_date: reportDate, json_data: jsonData, generated_at: new Date().toISOString() },
      { onConflict: 'report_date' }
    )
    .select()
    .single();

  if (error) throw new ReportError(error.message);
  return report as DailyReport;
}

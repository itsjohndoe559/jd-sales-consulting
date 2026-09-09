import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { businessDayRange } from '@/lib/format';
import type { LineItem, InventoryChange, DailyReportData } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const EARLIEST_REPORT_DATE = '2026-09-08';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { reportDate } = body as { reportDate?: string };

  if (!reportDate || !/^\d{4}-\d{2}-\d{2}$/.test(reportDate)) {
    return NextResponse.json(
      { error: 'reportDate is required as YYYY-MM-DD' },
      { status: 400 }
    );
  }
  if (reportDate < EARLIEST_REPORT_DATE) {
    return NextResponse.json(
      {
        error: `Report date must be on or after ${EARLIEST_REPORT_DATE}.`,
      },
      { status: 400 }
    );
  }

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

  if (txnError) return NextResponse.json({ error: txnError.message }, { status: 500 });
  if (prodError) return NextResponse.json({ error: prodError.message }, { status: 500 });

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

  // Inventory changes that happened ON this day specifically.
  const { data: dayAdjustments, error: dayAdjError } = await sb
    .from('inventory_adjustments')
    .select('sku, change')
    .gte('created_at', start.toISOString())
    .lte('created_at', end.toISOString());
  if (dayAdjError) {
    return NextResponse.json({ error: dayAdjError.message }, { status: 500 });
  }

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

  // Low stock as of the END of this report day (all adjustments up to then),
  // not "right now" - so a past report always reflects what stock looked
  // like on that day, even if viewed much later.
  const { data: allAdjustmentsToDate, error: allAdjError } = await sb
    .from('inventory_adjustments')
    .select('sku, change')
    .lte('created_at', end.toISOString());
  if (allAdjError) {
    return NextResponse.json({ error: allAdjError.message }, { status: 500 });
  }
  const onHand: Record<string, number> = {};
  for (const row of allAdjustmentsToDate ?? []) {
    onHand[row.sku] = (onHand[row.sku] ?? 0) + row.change;
  }
  const lowStock = (products ?? [])
    .map((p) => ({ sku: p.sku as string, name: p.name as string, onHand: onHand[p.sku] ?? 0 }))
    .filter((p) => p.onHand < 10)
    .sort((a, b) => a.onHand - b.onHand);

  const jsonData: DailyReportData = {
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

  const { data: report, error: upsertError } = await sb
    .from('daily_reports')
    .upsert(
      { report_date: reportDate, json_data: jsonData, generated_at: new Date().toISOString() },
      { onConflict: 'report_date' }
    )
    .select()
    .single();

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, report, metrics: jsonData });
}

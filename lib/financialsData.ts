// FINANCIALS section - server-only data loading. Read-only against the
// existing tables (transactions, products, inventory_adjustments); the only
// tables it writes are its own (ledger_entries, financial_day_manual).

import { supabaseServer } from './supabase';
import { fetchAll } from './fetchAll';
import { getProducts } from './data';
import {
  businessDateStr,
  businessDayRange,
  channelFor3,
  todayInBusinessTz,
} from './format';
import {
  BOOKS_START,
  allWeeks,
  calcDay,
  daysOf,
  round2,
  summarizeWeek,
  type DayInput,
  type LedgerEntry,
  type Week,
  type WeekSummary,
} from './financials';
import type { Transaction } from './types';

export async function getLedger(): Promise<LedgerEntry[]> {
  const sb = supabaseServer();
  const rows = await fetchAll<LedgerEntry>((from, to) =>
    sb
      .from('ledger_entries')
      .select('id, account, reference, amount, entry_date, position, created_at')
      .order('entry_date', { ascending: true })
      .order('position', { ascending: true })
      .order('id', { ascending: true })
      .range(from, to)
  );
  return rows.map((r) => ({ ...r, amount: Number(r.amount), position: Number(r.position) }));
}

/**
 * Builds every week's summary from the site's own data, the same way the
 * sheet's weekly tabs do. Voided (cancelled) transactions are excluded,
 * matching the Daily Reports.
 */
export async function getWeekSummaries(): Promise<WeekSummary[]> {
  const sb = supabaseServer();
  const today = todayInBusinessTz();
  const weeks = allWeeks(today);
  const lastDay = weeks[weeks.length - 1].end;
  const rangeStart = businessDayRange(BOOKS_START).start.toISOString();
  const rangeEnd = businessDayRange(lastDay).end.toISOString();

  const [products, txns, adjustments, manual] = await Promise.all([
    getProducts(),
    fetchAll<Transaction>((from, to) =>
      sb
        .from('transactions')
        .select('*')
        .eq('voided', false)
        .gte('created_at', rangeStart)
        .lte('created_at', rangeEnd)
        .order('created_at', { ascending: true })
        .order('id', { ascending: true })
        .range(from, to)
    ),
    fetchAll<{ change: number; created_at: string }>((from, to) =>
      sb
        .from('inventory_adjustments')
        .select('change, created_at')
        .order('created_at', { ascending: true })
        .order('id', { ascending: true })
        .range(from, to)
    ),
    fetchAll<{ day: string; voided_count: number }>((from, to) =>
      sb
        .from('financial_day_manual')
        .select('day, voided_count')
        .order('day', { ascending: true })
        .range(from, to)
    ),
  ]);

  const costBySku = new Map(products.map((p) => [p.sku, p.cost]));
  const manualByDay = new Map(manual.map((m) => [m.day, m.voided_count]));

  // Per-day sales numbers.
  const byDay = new Map<string, Omit<DayInput, 'unitsOnHand' | 'voidedCount'>>();
  for (const t of txns) {
    const date = businessDateStr(t.created_at);
    const d = byDay.get(date) ?? {
      date,
      revenue: 0,
      cash: 0,
      digital: 0,
      other: 0,
      cogs: 0,
      transactions: 0,
    };
    const total = Number(t.total);
    d.revenue += total;
    const ch = channelFor3(t.payment_method);
    if (ch === 'Cash') d.cash += total;
    else if (ch === 'Other') d.other += total;
    else d.digital += total;
    for (const item of t.items) {
      const cost = costBySku.get(item.sku);
      if (cost !== null && cost !== undefined) d.cogs += Number(cost) * item.qty;
    }
    d.transactions += 1;
    byDay.set(date, d);
  }

  // Units on hand at the end of each day = previous day's count + that day's changes.
  const changeByDay = new Map<string, number>();
  let beforeBooks = 0;
  for (const a of adjustments) {
    const date = businessDateStr(a.created_at);
    if (date < BOOKS_START) beforeBooks += a.change;
    else changeByDay.set(date, (changeByDay.get(date) ?? 0) + a.change);
  }

  let onHand = beforeBooks;
  return weeks.map((week: Week) => {
    const rows = daysOf(week).map((date) => {
      onHand += changeByDay.get(date) ?? 0;
      const s = byDay.get(date);
      return calcDay({
        date,
        revenue: round2(s?.revenue ?? 0),
        cash: round2(s?.cash ?? 0),
        digital: round2(s?.digital ?? 0),
        other: round2(s?.other ?? 0),
        cogs: round2(s?.cogs ?? 0),
        transactions: s?.transactions ?? 0,
        unitsOnHand: onHand,
        voidedCount: manualByDay.get(date) ?? 0,
      });
    });
    return summarizeWeek(week, rows);
  });
}

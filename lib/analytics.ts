import type { Product, Transaction } from './types';
import { businessDayRange, businessDateStr } from './format';

const MONTH_ABBR = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function parseDateStr(s: string) {
  const [y, m, d] = s.split('-').map(Number);
  return { y, m, d };
}

/** Pure calendar-math day count - no timezone involved, just "how many days in this month". */
function daysInMonth(y: number, m: number) {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

function firstOfMonthStr(y: number, m: number) {
  return `${y}-${pad(m)}-01`;
}

function lastOfMonthStr(y: number, m: number) {
  return `${y}-${pad(m)}-${pad(daysInMonth(y, m))}`;
}

/** Adds n days to a 'YYYY-MM-DD' string as pure calendar math (no timezone). */
function addDaysStr(dateStr: string, n: number) {
  const { y, m, d } = parseDateStr(dateStr);
  const t = Date.UTC(y, m - 1, d) + n * 86400000;
  const dt = new Date(t);
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

/**
 * Every function below resolves calendar-day/month/year boundaries via
 * businessDayRange (Pacific-local midnight-to-midnight), never via raw
 * `new Date(y, m, d)` construction. That constructor uses the server's
 * OS timezone, which on Vercel is UTC - so "midnight" there is actually
 * 4-8pm Pacific the previous day, silently shifting evening sales into
 * the wrong day/week/month/year bucket everywhere in this file.
 */

export function monthRangeFor(monthStr: string) {
  const [y, m] = monthStr.split('-').map(Number);
  const { start } = businessDayRange(firstOfMonthStr(y, m));
  const { end } = businessDayRange(lastOfMonthStr(y, m));
  return { start, end };
}

export function monthRange(d = new Date()) {
  return monthRangeFor(businessDateStr(d.toISOString()).slice(0, 7));
}

export function currentMonthStr() {
  return businessDateStr(new Date().toISOString()).slice(0, 7);
}

export function last12Months(): { value: string; label: string }[] {
  const out = [];
  const { y: ny, m: nm } = parseDateStr(businessDateStr(new Date().toISOString()));
  for (let i = 0; i < 12; i++) {
    let year = ny;
    let month = nm - i;
    while (month <= 0) {
      month += 12;
      year -= 1;
    }
    const value = `${year}-${pad(month)}`;
    const label = new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    });
    out.push({ value, label });
  }
  return out;
}

export function inRange(iso: string, start: Date, end: Date) {
  const t = new Date(iso).getTime();
  return t >= start.getTime() && t <= end.getTime();
}

export type Kpis = {
  totalRevenue: number;
  unitsSold: number;
  profit: number | null; // null => incomplete, see missingCostSkus
  missingCostSkus: string[];
  cogs: number | null;
  skuCount: number;
  inventoryOnHand: number;
};

export function computeKpis(
  transactions: Transaction[],
  products: Product[],
  onHand: Record<string, number>
): Kpis {
  const costBySku = new Map(products.map((p) => [p.sku, p.cost]));
  const active = transactions.filter((t) => !t.voided);

  let totalRevenue = 0;
  let unitsSold = 0;
  let cogs = 0;
  const missing = new Set<string>();

  for (const t of active) {
    for (const item of t.items) {
      totalRevenue += item.price * item.qty;
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
  const inventoryOnHand = Object.values(onHand).reduce((s, n) => s + n, 0);

  return {
    totalRevenue,
    unitsSold,
    profit: complete ? totalRevenue - cogs : null,
    cogs: complete ? cogs : null,
    missingCostSkus,
    skuCount: products.length,
    inventoryOnHand,
  };
}

/** Revenue per calendar day (Pacific) for every day in the given month. */
export function dailyRevenue(transactions: Transaction[], monthStr: string) {
  const [y, m] = monthStr.split('-').map(Number);
  const n = daysInMonth(y, m);
  const days: { date: string; total: number }[] = [];

  for (let day = 1; day <= n; day++) {
    const dateStr = `${y}-${pad(m)}-${pad(day)}`;
    const { start, end } = businessDayRange(dateStr);
    const total = transactions
      .filter((t) => !t.voided && inRange(t.created_at, start, end))
      .reduce((s, t) => s + t.total, 0);
    days.push({ date: dateStr, total });
  }

  return days;
}

export function topProducts(transactions: Transaction[], limit = 8) {
  const bySku = new Map<string, { name: string; revenue: number }>();
  for (const t of transactions) {
    if (t.voided) continue;
    for (const item of t.items) {
      const existing = bySku.get(item.sku) ?? { name: item.name, revenue: 0 };
      existing.revenue += item.price * item.qty;
      bySku.set(item.sku, existing);
    }
  }
  return Array.from(bySku.entries())
    .map(([sku, v]) => ({ sku, ...v }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
}

export function topProductsByUnits(transactions: Transaction[], limit = 8) {
  const bySku = new Map<string, { name: string; units: number }>();
  for (const t of transactions) {
    if (t.voided) continue;
    for (const item of t.items) {
      const existing = bySku.get(item.sku) ?? { name: item.name, units: 0 };
      existing.units += item.qty;
      bySku.set(item.sku, existing);
    }
  }
  return Array.from(bySku.entries())
    .map(([sku, v]) => ({ sku, ...v }))
    .sort((a, b) => b.units - a.units)
    .slice(0, limit);
}

export type PnlBucket = { label: string; revenue: number; profit: number | null };

function bucketStats(txns: Transaction[], costBySku: Map<string, number | null>) {
  let revenue = 0;
  let cogs = 0;
  let missing = false;
  for (const t of txns) {
    if (t.voided) continue;
    for (const item of t.items) {
      revenue += item.price * item.qty;
      const cost = costBySku.get(item.sku);
      if (cost === null || cost === undefined) {
        missing = true;
      } else {
        cogs += cost * item.qty;
      }
    }
  }
  return { revenue, profit: missing ? null : revenue - cogs };
}

export function pnlByWeek(
  transactions: Transaction[],
  products: Product[],
  monthStr: string
): PnlBucket[] {
  const costBySku = new Map(products.map((p) => [p.sku, p.cost]));
  const [y, m] = monthStr.split('-').map(Number);
  const lastDay = lastOfMonthStr(y, m);
  const buckets: PnlBucket[] = [];

  let cursor = firstOfMonthStr(y, m);
  let weekNum = 1;
  while (cursor <= lastDay) {
    let weekEnd = addDaysStr(cursor, 6);
    if (weekEnd > lastDay) weekEnd = lastDay;

    const { start } = businessDayRange(cursor);
    const { end } = businessDayRange(weekEnd);
    const txns = transactions.filter((t) => inRange(t.created_at, start, end));
    const stats = bucketStats(txns, costBySku);
    buckets.push({ label: `Week ${weekNum}`, ...stats });

    cursor = addDaysStr(cursor, 7);
    weekNum += 1;
  }

  return buckets;
}

export function pnlByMonth(
  transactions: Transaction[],
  products: Product[],
  year: number,
  throughMonth: number // 0-indexed, inclusive
): PnlBucket[] {
  const costBySku = new Map(products.map((p) => [p.sku, p.cost]));
  const buckets: PnlBucket[] = [];

  for (let mo = 0; mo <= throughMonth; mo++) {
    const monthNum = mo + 1;
    const { start } = businessDayRange(firstOfMonthStr(year, monthNum));
    const { end } = businessDayRange(lastOfMonthStr(year, monthNum));
    const txns = transactions.filter((t) => inRange(t.created_at, start, end));
    const stats = bucketStats(txns, costBySku);
    buckets.push({ label: MONTH_ABBR[mo], ...stats });
  }

  return buckets;
}

export function pnlYtd(
  transactions: Transaction[],
  products: Product[],
  year: number
): PnlBucket {
  const costBySku = new Map(products.map((p) => [p.sku, p.cost]));
  const { start } = businessDayRange(`${year}-01-01`);
  const end = new Date(); // "up to right now" - timezone-agnostic as an instant
  const txns = transactions.filter((t) => inRange(t.created_at, start, end));
  const stats = bucketStats(txns, costBySku);
  return { label: `${year} YTD`, ...stats };
}

export type ChartGranularity = 'daily' | 'weekly' | 'monthly' | 'yearly';

function revenueBetween(transactions: Transaction[], start: Date, end: Date) {
  return transactions
    .filter((t) => !t.voided && inRange(t.created_at, start, end))
    .reduce((s, t) => s + t.total, 0);
}

/** Revenue series for the Dashboard chart, bucketed per the chosen granularity. */
export function revenueSeries(
  transactions: Transaction[],
  monthStr: string,
  granularity: ChartGranularity
): { label: string; total: number }[] {
  const [y, m] = monthStr.split('-').map(Number);

  if (granularity === 'daily') {
    return dailyRevenue(transactions, monthStr).map((d) => {
      const { m: mm, d: dd } = parseDateStr(d.date);
      return { label: `${MONTH_ABBR[mm - 1]} ${dd}`, total: d.total };
    });
  }

  if (granularity === 'weekly') {
    const lastDay = lastOfMonthStr(y, m);
    const buckets: { label: string; total: number }[] = [];
    let cursor = firstOfMonthStr(y, m);
    let n = 1;
    while (cursor <= lastDay) {
      let weekEnd = addDaysStr(cursor, 6);
      if (weekEnd > lastDay) weekEnd = lastDay;
      const { start } = businessDayRange(cursor);
      const { end } = businessDayRange(weekEnd);
      buckets.push({ label: `Week ${n}`, total: revenueBetween(transactions, start, end) });
      cursor = addDaysStr(cursor, 7);
      n += 1;
    }
    return buckets;
  }

  if (granularity === 'monthly') {
    const buckets: { label: string; total: number }[] = [];
    for (let mo = 1; mo <= 12; mo++) {
      const { start } = businessDayRange(firstOfMonthStr(y, mo));
      const { end } = businessDayRange(lastOfMonthStr(y, mo));
      buckets.push({ label: MONTH_ABBR[mo - 1], total: revenueBetween(transactions, start, end) });
    }
    return buckets;
  }

  // yearly
  const years = new Set<number>();
  for (const t of transactions) {
    years.add(Number(businessDateStr(t.created_at).slice(0, 4)));
  }
  years.add(y);
  return Array.from(years)
    .sort()
    .map((year) => {
      const { start } = businessDayRange(`${year}-01-01`);
      const { end } = businessDayRange(`${year}-12-31`);
      return { label: String(year), total: revenueBetween(transactions, start, end) };
    });
}

/** Top products ranked over the range implied by the chosen granularity. */
export function topProductsRange(
  transactions: Transaction[],
  monthStr: string,
  granularity: ChartGranularity,
  limit = 5
) {
  let start: Date;
  let end: Date;
  const todayStr = businessDateStr(new Date().toISOString());

  if (granularity === 'daily') {
    ({ start, end } = businessDayRange(todayStr));
  } else if (granularity === 'weekly') {
    ({ start } = businessDayRange(addDaysStr(todayStr, -6)));
    end = new Date(); // up to right now
  } else if (granularity === 'monthly') {
    ({ start, end } = monthRangeFor(monthStr));
  } else {
    const [y] = monthStr.split('-').map(Number);
    ({ start } = businessDayRange(`${y}-01-01`));
    ({ end } = businessDayRange(`${y}-12-31`));
  }

  const filtered = transactions.filter(
    (t) => !t.voided && inRange(t.created_at, start, end)
  );
  return topProducts(filtered, limit);
}

export function lowStock(
  onHand: Record<string, number>,
  products: Product[],
  threshold = 10
) {
  return products
    .map((p) => ({ ...p, onHand: onHand[p.sku] ?? 0 }))
    .filter((p) => p.onHand <= threshold)
    .sort((a, b) => a.onHand - b.onHand);
}

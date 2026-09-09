import type { Product, Transaction } from './types';

export function monthRange(d = new Date()) {
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
  return { start, end };
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

export function dailyRevenue(
  transactions: Transaction[],
  start: Date,
  end: Date
) {
  const days: { date: string; total: number }[] = [];
  const cursor = new Date(start);
  const byDay = new Map<string, number>();

  for (const t of transactions) {
    if (t.voided) continue;
    if (!inRange(t.created_at, start, end)) continue;
    const key = new Date(t.created_at).toISOString().slice(0, 10);
    byDay.set(key, (byDay.get(key) ?? 0) + t.total);
  }

  while (cursor <= end) {
    const key = cursor.toISOString().slice(0, 10);
    days.push({ date: key, total: byDay.get(key) ?? 0 });
    cursor.setDate(cursor.getDate() + 1);
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
  monthStart: Date,
  monthEnd: Date
): PnlBucket[] {
  const costBySku = new Map(products.map((p) => [p.sku, p.cost]));
  const buckets: PnlBucket[] = [];
  let weekStart = new Date(monthStart);
  let weekNum = 1;

  while (weekStart <= monthEnd) {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    const cappedEnd = weekEnd > monthEnd ? monthEnd : weekEnd;

    const txns = transactions.filter((t) =>
      inRange(t.created_at, weekStart, cappedEnd)
    );
    const stats = bucketStats(txns, costBySku);
    buckets.push({ label: `Week ${weekNum}`, ...stats });

    weekStart = new Date(weekStart);
    weekStart.setDate(weekStart.getDate() + 7);
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

  for (let m = 0; m <= throughMonth; m++) {
    const start = new Date(year, m, 1);
    const end = new Date(year, m + 1, 0, 23, 59, 59);
    const txns = transactions.filter((t) => inRange(t.created_at, start, end));
    const stats = bucketStats(txns, costBySku);
    buckets.push({
      label: start.toLocaleDateString('en-US', { month: 'short' }),
      ...stats,
    });
  }

  return buckets;
}

export function pnlYtd(
  transactions: Transaction[],
  products: Product[],
  year: number
): PnlBucket {
  const costBySku = new Map(products.map((p) => [p.sku, p.cost]));
  const start = new Date(year, 0, 1);
  const end = new Date();
  const txns = transactions.filter((t) => inRange(t.created_at, start, end));
  const stats = bucketStats(txns, costBySku);
  return { label: `${year} YTD`, ...stats };
}

export function monthRangeFor(monthStr: string) {
  const [y, m] = monthStr.split('-').map(Number);
  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m, 0, 23, 59, 59);
  return { start, end };
}

export function currentMonthStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function last12Months(): { value: string; label: string }[] {
  const out = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
    out.push({ value, label });
  }
  return out;
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
    const { start, end } = monthRangeFor(monthStr);
    return dailyRevenue(transactions, start, end).map((d) => ({
      label: new Date(d.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
      total: d.total,
    }));
  }

  if (granularity === 'weekly') {
    const { start: monthStart, end: monthEnd } = monthRangeFor(monthStr);
    const buckets: { label: string; total: number }[] = [];
    let ws = new Date(monthStart);
    let n = 1;
    while (ws <= monthEnd) {
      const we = new Date(ws);
      we.setDate(we.getDate() + 6);
      we.setHours(23, 59, 59, 999);
      const capped = we > monthEnd ? monthEnd : we;
      buckets.push({
        label: `Week ${n}`,
        total: revenueBetween(transactions, ws, capped),
      });
      ws = new Date(ws);
      ws.setDate(ws.getDate() + 7);
      n += 1;
    }
    return buckets;
  }

  if (granularity === 'monthly') {
    const buckets: { label: string; total: number }[] = [];
    for (let mo = 0; mo < 12; mo++) {
      const s = new Date(y, mo, 1);
      const e = new Date(y, mo + 1, 0, 23, 59, 59);
      buckets.push({
        label: s.toLocaleDateString('en-US', { month: 'short' }),
        total: revenueBetween(transactions, s, e),
      });
    }
    return buckets;
  }

  // yearly
  const years = new Set(
    transactions.map((t) => new Date(t.created_at).getFullYear())
  );
  years.add(y);
  return Array.from(years)
    .sort()
    .map((year) => {
      const s = new Date(year, 0, 1);
      const e = new Date(year, 11, 31, 23, 59, 59);
      return { label: String(year), total: revenueBetween(transactions, s, e) };
    });
}

/** Top products ranked over the range implied by the chosen granularity. */
export function topProductsRange(
  transactions: Transaction[],
  monthStr: string,
  granularity: ChartGranularity,
  limit = 5
) {
  const now = new Date();
  let start: Date;
  let end: Date;

  if (granularity === 'daily') {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  } else if (granularity === 'weekly') {
    end = now;
    start = new Date(now);
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);
  } else if (granularity === 'monthly') {
    ({ start, end } = monthRangeFor(monthStr));
  } else {
    const [y] = monthStr.split('-').map(Number);
    start = new Date(y, 0, 1);
    end = new Date(y, 11, 31, 23, 59, 59);
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

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

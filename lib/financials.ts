// FINANCIALS section - pure math, safe to import from client or server.
// Mirrors the Google Sheet's weekly tabs + Dashboard tab exactly, so the
// numbers line up with the sheet the books started on.

import { addDaysToDateStr } from './format';

export const LEDGER_ACCOUNTS = [
  'Tucoemas Checking',
  'Tucoemas Savings',
  'BoFA Checking',
  'Chase Checking',
] as const;
export type LedgerAccount = (typeof LEDGER_ACCOUNTS)[number];

// Same colors as the account chips on the sheet's Ledger tab.
export const ACCOUNT_COLORS: Record<LedgerAccount, string> = {
  'Tucoemas Checking': '#F28C28',
  'Tucoemas Savings': '#F6C08A',
  'BoFA Checking': '#E8828B',
  'Chase Checking': '#6FA8DC',
};

export type LedgerEntry = {
  id: string;
  account: LedgerAccount;
  reference: string;
  amount: number;
  entry_date: string; // 'YYYY-MM-DD'
  position: number;
  created_at: string;
};

/** Ledger rows in book order: by date, then by position within the day. */
export function sortLedger<T extends { entry_date: string; position: number }>(rows: T[]) {
  return [...rows].sort((a, b) =>
    a.entry_date === b.entry_date
      ? a.position - b.position
      : a.entry_date < b.entry_date
      ? -1
      : 1
  );
}

/** Adds the running per-account balance to each row (like the sheet's balance column). */
export function withBalances(rows: LedgerEntry[]) {
  const running: Record<string, number> = {};
  return sortLedger(rows).map((r) => {
    running[r.account] = round2((running[r.account] ?? 0) + Number(r.amount));
    return { ...r, balance: running[r.account] };
  });
}

export type AccountSummary = {
  account: LedgerAccount | 'TOTAL';
  balance: number;
  moneyIn: number;
  moneyOut: number;
  transactions: number;
  lastActivity: string | null;
};

export function accountSummaries(rows: LedgerEntry[]): AccountSummary[] {
  const out: AccountSummary[] = LEDGER_ACCOUNTS.map((account) => {
    const mine = rows.filter((r) => r.account === account);
    const amounts = mine.map((r) => Number(r.amount));
    return {
      account,
      balance: round2(amounts.reduce((s, n) => s + n, 0)),
      moneyIn: round2(amounts.filter((n) => n > 0).reduce((s, n) => s + n, 0)),
      moneyOut: round2(Math.abs(amounts.filter((n) => n < 0).reduce((s, n) => s + n, 0))),
      transactions: mine.length,
      lastActivity: mine.reduce<string | null>(
        (m, r) => (m === null || r.entry_date > m ? r.entry_date : m),
        null
      ),
    };
  });
  out.push({
    account: 'TOTAL',
    balance: round2(out.reduce((s, a) => s + a.balance, 0)),
    moneyIn: round2(out.reduce((s, a) => s + a.moneyIn, 0)),
    moneyOut: round2(out.reduce((s, a) => s + a.moneyOut, 0)),
    transactions: out.reduce((s, a) => s + a.transactions, 0),
    lastActivity: out.reduce<string | null>(
      (m, a) => (a.lastActivity && (m === null || a.lastActivity > m) ? a.lastActivity : m),
      null
    ),
  });
  return out;
}

/** End-of-day balance per account + total, for every date that has ledger activity. */
export function balanceHistory(rows: LedgerEntry[]) {
  const running: Record<string, number> = {};
  const byDate = new Map<string, Record<string, number>>();
  for (const r of sortLedger(rows)) {
    running[r.account] = round2((running[r.account] ?? 0) + Number(r.amount));
    byDate.set(r.entry_date, { ...running });
  }
  return Array.from(byDate.entries()).map(([date, bal]) => {
    const point: Record<string, number | string> = { date, label: mdShort(date) };
    let total = 0;
    for (const a of LEDGER_ACCOUNTS) {
      point[a] = bal[a] ?? 0;
      total += bal[a] ?? 0;
    }
    point.total = round2(total);
    return point;
  });
}

export type QuickStats = {
  ownerInvestment: number;
  taxesSetAside: number;
  vendorPayments: number;
  fees: number;
};

/** Quick Stats, matched off the ledger's reference text like the sheet does. */
export function quickStats(rows: LedgerEntry[]): QuickStats {
  const has = (r: LedgerEntry, s: string) => r.reference.toLowerCase().includes(s);
  const sum = (f: (r: LedgerEntry) => boolean) =>
    round2(rows.filter(f).reduce((s, r) => s + Math.abs(Number(r.amount)), 0));
  return {
    ownerInvestment: sum((r) => has(r, 'owner investment')),
    taxesSetAside: sum(
      (r) => r.account === 'Tucoemas Savings' && has(r, 'tax') && Number(r.amount) > 0
    ),
    vendorPayments: sum((r) => has(r, 'vendor payment')),
    fees: sum((r) => has(r, 'fee')),
  };
}

// ---------------------------------------------------------------------------
// Weeks - same layout as the sheet's tabs: 9/8-9/12 first, then Sun-Sat.
// ---------------------------------------------------------------------------

export const BOOKS_START = '2026-09-08';
const FIRST_FULL_WEEK = '2026-09-13'; // first Sunday

export type Week = { start: string; end: string; label: string };

export function weekFor(start: string): Week {
  const end = start === BOOKS_START ? '2026-09-12' : addDaysToDateStr(start, 6);
  return { start, end, label: `${mdShort(start)}-${mdShort(end)}` };
}

/** Every week from the start of the books through the week containing `today`. */
export function allWeeks(today: string): Week[] {
  const weeks: Week[] = [weekFor(BOOKS_START)];
  for (let s = FIRST_FULL_WEEK; s <= today; s = addDaysToDateStr(s, 7)) {
    weeks.push(weekFor(s));
  }
  return weeks;
}

export function daysOf(week: Week): string[] {
  const days: string[] = [];
  for (let d = week.start; d <= week.end; d = addDaysToDateStr(d, 1)) days.push(d);
  return days;
}

// ---------------------------------------------------------------------------
// Sheet math
// ---------------------------------------------------------------------------

/** What the site provides for one business day (non-voided sales only). */
export type DayInput = {
  date: string;
  revenue: number;
  cash: number;
  digital: number;
  other: number;
  cogs: number;
  transactions: number;
  unitsOnHand: number; // end of day
  voidedCount: number; // manual
};

export type DayRow = DayInput & {
  actualSales: number; // revenue x 0.8
  netProfit: number;   // actual sales - cogs
  taxes: number;       // net profit x 0.08
  bank: number;        // actual sales - taxes
  voided: number;      // revenue x 0.2
  total: number;       // bank + voided
};

export function calcDay(d: DayInput): DayRow {
  const actualSales = round2(d.revenue * 0.8);
  const netProfit = round2(actualSales - d.cogs);
  const taxes = round2(netProfit * 0.08);
  const bank = round2(actualSales - taxes);
  const voided = round2(d.revenue * 0.2);
  return { ...d, actualSales, netProfit, taxes, bank, voided, total: round2(bank + voided) };
}

/** Rounded UP to the nearest $5. */
export function voidValue(voided: number) {
  return Math.ceil(round2(voided) / 5) * 5;
}

export type WeekSummary = {
  week: Week;
  days: DayRow[];
  totals: DayRow; // sums; unitsOnHand = end of week
  voidValue: number;
  margin: number; // net profit / actual sales
  deposit: {
    revenue: number;
    actualRev: number;
    digitalSales: number;
    otherSales: number;
    digitalTotal: number;
    taxesDeposit: number;
    cashDeposit: number;
    voided: number;
  };
};

export function summarizeWeek(week: Week, days: DayRow[]): WeekSummary {
  const sum = (k: keyof DayRow) =>
    round2(days.reduce((s, d) => s + (d[k] as number), 0));
  const totals: DayRow = {
    date: week.start,
    revenue: sum('revenue'),
    cash: sum('cash'),
    digital: sum('digital'),
    other: sum('other'),
    cogs: sum('cogs'),
    transactions: sum('transactions'),
    unitsOnHand: days.length ? days[days.length - 1].unitsOnHand : 0,
    voidedCount: sum('voidedCount'),
    actualSales: sum('actualSales'),
    netProfit: sum('netProfit'),
    taxes: sum('taxes'),
    bank: sum('bank'),
    voided: sum('voided'),
    total: sum('total'),
  };
  const digitalTotal = round2(totals.digital + totals.other);
  return {
    week,
    days,
    totals,
    voidValue: voidValue(totals.voided),
    margin: totals.actualSales ? totals.netProfit / totals.actualSales : 0,
    deposit: {
      revenue: totals.revenue,
      actualRev: totals.actualSales,
      digitalSales: totals.digital,
      otherSales: totals.other,
      digitalTotal,
      taxesDeposit: totals.taxes,
      cashDeposit: round2(totals.actualSales - totals.digital - totals.taxes),
      voided: round2(totals.revenue - totals.actualSales),
    },
  };
}

export type SalesTotals = {
  revenue: number;
  actualSales: number;
  cogs: number;
  netProfit: number;
  margin: number;
  taxes: number;
  cash: number;
  digital: number;
  other: number;
  transactions: number;
  voidValue: number;
  avgRevenue: number; // per week
};

export function salesTotals(weeks: WeekSummary[]): SalesTotals {
  const sum = (f: (w: WeekSummary) => number) => round2(weeks.reduce((s, w) => s + f(w), 0));
  const revenue = sum((w) => w.totals.revenue);
  const actualSales = sum((w) => w.totals.actualSales);
  const netProfit = sum((w) => w.totals.netProfit);
  return {
    revenue,
    actualSales,
    cogs: sum((w) => w.totals.cogs),
    netProfit,
    margin: actualSales ? netProfit / actualSales : 0,
    taxes: sum((w) => w.totals.taxes),
    cash: sum((w) => w.totals.cash),
    digital: sum((w) => w.totals.digital),
    other: sum((w) => w.totals.other),
    transactions: sum((w) => w.totals.transactions),
    voidValue: sum((w) => w.voidValue),
    avgRevenue: weeks.length ? round2(revenue / weeks.length) : 0,
  };
}

// ---------------------------------------------------------------------------

export function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/** '2026-10-25' -> '10/25' */
export function mdShort(dateStr: string) {
  const [, m, d] = dateStr.split('-').map(Number);
  return `${m}/${d}`;
}

/** '2026-10-25' -> '10/25/26' */
export function mdy(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return `${m}/${d}/${String(y).slice(2)}`;
}

export function pct(n: number) {
  return `${(n * 100).toFixed(2)}%`;
}

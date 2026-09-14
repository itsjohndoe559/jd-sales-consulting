import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { getProducts, getTransactions } from '@/lib/data';
import { monthRangeFor, inRange } from '@/lib/analytics';
import { longDate } from '@/lib/format';
import type { Deduction, DeductionCategory, DeductionType } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const CATEGORIES: DeductionCategory[] = [
  'Subscriptions',
  'Services',
  'Equipment',
  'Gas',
  'Other',
];

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function daysInMonth(y: number, m: number) {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export async function GET(req: NextRequest) {
  const year = Number(req.nextUrl.searchParams.get('year'));
  const month = Number(req.nextUrl.searchParams.get('month')); // 1-indexed

  if (!year || !month || month < 1 || month > 12) {
    return NextResponse.json(
      { success: false, error: 'year and month (1-12) are required' },
      { status: 400 }
    );
  }

  const monthStr = `${year}-${pad(month)}`;
  const firstDay = `${monthStr}-01`;
  const lastDay = `${monthStr}-${pad(daysInMonth(year, month))}`;

  const sb = supabaseServer();

  const [{ data: recurringRaw, error: recError }, { data: oneTimeRaw, error: oneError }] =
    await Promise.all([
      sb
        .from('deductions')
        .select('*')
        .eq('type', 'recurring')
        .lte('start_date', lastDay)
        .or(`end_date.is.null,end_date.gte.${firstDay}`)
        .order('day_of_month', { ascending: true }),
      sb
        .from('deductions')
        .select('*')
        .eq('type', 'one-time')
        .gte('start_date', firstDay)
        .lte('start_date', lastDay)
        .order('start_date', { ascending: false }),
    ]);

  if (recError) return NextResponse.json({ error: recError.message }, { status: 500 });
  if (oneError) return NextResponse.json({ error: oneError.message }, { status: 500 });

  // COGS for the month, computed the same way as everywhere else in the
  // app (sum of known product cost x qty sold) - not shown as
  // "Incomplete" here since this page is a supplementary bookkeeping
  // view, not the primary profit figure (that warning already lives on
  // Dashboard/Inventory/P&L).
  const [products, transactions] = await Promise.all([getProducts(), getTransactions()]);
  const { start, end } = monthRangeFor(monthStr);
  const costBySku = new Map(products.map((p) => [p.sku, p.cost]));
  let cogs = 0;
  for (const t of transactions) {
    if (t.voided) continue;
    if (!inRange(t.created_at, start, end)) continue;
    for (const item of t.items) {
      const cost = costBySku.get(item.sku);
      if (cost !== null && cost !== undefined) cogs += cost * item.qty;
    }
  }

  const recurring = (recurringRaw ?? []) as Deduction[];
  const oneTime = (oneTimeRaw ?? []) as Deduction[];
  const recurringTotal = recurring.reduce((s, d) => s + d.amount, 0);
  const oneTimeTotal = oneTime.reduce((s, d) => s + d.amount, 0);

  return NextResponse.json({
    success: true,
    month: longDate(firstDay),
    deductions: { recurring, oneTime, cogs },
    totals: {
      recurring: recurringTotal,
      oneTime: oneTimeTotal,
      cogs,
      total: recurringTotal + oneTimeTotal + cogs,
    },
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    name,
    amount,
    category,
    type,
    dayOfMonth,
    startDate,
    endDate,
  } = body as {
    name?: string;
    amount?: number;
    category?: string;
    type?: string;
    dayOfMonth?: number;
    startDate?: string;
    endDate?: string | null;
  };

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Name is required.' }, { status: 400 });
  }
  if (typeof amount !== 'number' || amount <= 0) {
    return NextResponse.json({ error: 'Amount must be greater than 0.' }, { status: 400 });
  }
  if (!category || !CATEGORIES.includes(category as DeductionCategory)) {
    return NextResponse.json({ error: 'A valid category is required.' }, { status: 400 });
  }
  if (type !== 'one-time' && type !== 'recurring') {
    return NextResponse.json({ error: 'Type must be one-time or recurring.' }, { status: 400 });
  }
  if (!startDate || !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
    return NextResponse.json({ error: 'A valid start date is required.' }, { status: 400 });
  }
  if (type === 'recurring' && (!dayOfMonth || dayOfMonth < 1 || dayOfMonth > 31)) {
    return NextResponse.json(
      { error: 'Day of month (1-31) is required for recurring deductions.' },
      { status: 400 }
    );
  }

  const sb = supabaseServer();
  const { data, error } = await sb
    .from('deductions')
    .insert({
      name: name.trim(),
      amount,
      category,
      type: type as DeductionType,
      day_of_month: type === 'recurring' ? dayOfMonth : null,
      start_date: startDate,
      end_date: type === 'recurring' ? endDate || null : null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true, deduction: data });
}

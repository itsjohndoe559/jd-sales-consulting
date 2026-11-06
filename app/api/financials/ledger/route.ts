import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { getLedger } from '@/lib/financialsData';
import { LEDGER_ACCOUNTS, round2 } from '@/lib/financials';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type RowIn = { account?: string; reference?: string; amount?: number | string; entry_date?: string };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function clean(r: RowIn) {
  const account = String(r.account ?? '').trim();
  const reference = String(r.reference ?? '').trim();
  const amount = Number(String(r.amount ?? '').replace(/[$,\s]/g, ''));
  const entry_date = String(r.entry_date ?? '').trim();
  if (!(LEDGER_ACCOUNTS as readonly string[]).includes(account))
    return { error: `Unknown account "${account}"` };
  if (!reference) return { error: 'Reference is required' };
  if (!Number.isFinite(amount) || amount === 0) return { error: 'Amount must be a non-zero number' };
  if (!DATE_RE.test(entry_date)) return { error: 'Date must be YYYY-MM-DD' };
  return { row: { account, reference, amount: round2(amount), entry_date } };
}

export async function GET() {
  try {
    return NextResponse.json({ entries: await getLedger() });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

/**
 * POST { account, reference, amount, entry_date }  -> adds one row
 * POST { rows: [...] }                              -> bulk import (e.g. pasted from the sheet)
 * New rows go to the end of their date.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });

  const input: RowIn[] = Array.isArray(body.rows) ? body.rows : [body];
  if (input.length === 0) return NextResponse.json({ error: 'No rows' }, { status: 400 });

  const rows = [];
  for (let i = 0; i < input.length; i++) {
    const c = clean(input[i]);
    if ('error' in c) {
      return NextResponse.json(
        { error: input.length > 1 ? `Row ${i + 1}: ${c.error}` : c.error },
        { status: 400 }
      );
    }
    rows.push(c.row);
  }

  const sb = supabaseServer();
  const { data: last, error: lastErr } = await sb
    .from('ledger_entries')
    .select('position')
    .order('position', { ascending: false })
    .limit(1);
  if (lastErr) return NextResponse.json({ error: lastErr.message }, { status: 500 });

  // Positions only need to be increasing - rows are ordered by date first,
  // then position, so a new row always lands at the end of its own date.
  let pos = Number(last?.[0]?.position ?? 0);
  const toInsert = rows.map((r) => ({ ...r, position: ++pos }));

  const { error } = await sb.from('ledger_entries').insert(toInsert);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, inserted: toInsert.length });
}

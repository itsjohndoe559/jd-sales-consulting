import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { LEDGER_ACCOUNTS, round2 } from '@/lib/financials';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * PATCH { account?, reference?, amount?, entry_date? }  -> edit a row
 * PATCH { move: 'up' | 'down' }                         -> swap order with the
 *   neighboring row on the same date
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  const sb = supabaseServer();

  const { data: row, error: rowErr } = await sb
    .from('ledger_entries')
    .select('id, entry_date, position')
    .eq('id', params.id)
    .single();
  if (rowErr || !row) return NextResponse.json({ error: 'Row not found' }, { status: 404 });

  if (body.move === 'up' || body.move === 'down') {
    const up = body.move === 'up';
    const { data: sameDay, error } = await sb
      .from('ledger_entries')
      .select('id, position')
      .eq('entry_date', row.entry_date)
      .order('position', { ascending: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const i = (sameDay ?? []).findIndex((r) => r.id === row.id);
    const j = up ? i - 1 : i + 1;
    if (i < 0 || j < 0 || j >= (sameDay ?? []).length) {
      return NextResponse.json({ success: true }); // already at the edge
    }
    const other = sameDay![j];
    const a = await sb.from('ledger_entries').update({ position: other.position }).eq('id', row.id);
    const b = await sb.from('ledger_entries').update({ position: row.position }).eq('id', other.id);
    if (a.error || b.error)
      return NextResponse.json({ error: (a.error ?? b.error)!.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  const update: Record<string, unknown> = {};
  if (body.account !== undefined) {
    if (!(LEDGER_ACCOUNTS as readonly string[]).includes(body.account))
      return NextResponse.json({ error: 'Unknown account' }, { status: 400 });
    update.account = body.account;
  }
  if (body.reference !== undefined) {
    const ref = String(body.reference).trim();
    if (!ref) return NextResponse.json({ error: 'Reference is required' }, { status: 400 });
    update.reference = ref;
  }
  if (body.amount !== undefined) {
    const amt = Number(String(body.amount).replace(/[$,\s]/g, ''));
    if (!Number.isFinite(amt) || amt === 0)
      return NextResponse.json({ error: 'Amount must be a non-zero number' }, { status: 400 });
    update.amount = round2(amt);
  }
  if (body.entry_date !== undefined) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(body.entry_date))
      return NextResponse.json({ error: 'Date must be YYYY-MM-DD' }, { status: 400 });
    update.entry_date = body.entry_date;
  }
  // Guard: an empty update throws in supabase-js (see CONTEXT.md mistakes list).
  if (Object.keys(update).length === 0) return NextResponse.json({ success: true });
  update.updated_at = new Date().toISOString();

  const { error } = await sb.from('ledger_entries').update(update).eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const sb = supabaseServer();
  const { error } = await sb.from('ledger_entries').delete().eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import type { LineItem } from '@/lib/types';

export async function GET(req: NextRequest) {
  const sb = supabaseServer();
  const { searchParams } = new URL(req.url);
  const limit = Number(searchParams.get('limit') ?? 500);

  const { data, error } = await sb
    .from('transactions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ transactions: data });
}

async function nextInvoiceNumber(sb: ReturnType<typeof supabaseServer>) {
  const { data, error } = await sb
    .from('invoices')
    .select('invoice_number')
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) throw new Error(error.message);

  if (!data || data.length === 0) {
    return 'JD-0100';
  }

  const last = data[0].invoice_number as string; // e.g. 'JD-0148'
  const match = last.match(/(\d+)$/);
  const num = match ? parseInt(match[1], 10) + 1 : 100;
  const padded = String(num).padStart(4, '0');
  return `JD-${padded}`;
}

// The Add Sale flow: inserts the transaction, decrements inventory for each
// line item, and auto-generates a paid invoice.
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { payment_method, items } = body as {
    payment_method: string;
    items: LineItem[];
  };

  if (!payment_method || !items || items.length === 0) {
    return NextResponse.json(
      { error: 'payment_method and at least one item are required' },
      { status: 400 }
    );
  }

  const total = items.reduce((sum, i) => sum + i.price * i.qty, 0);
  const sb = supabaseServer();

  const { data: txn, error: txnError } = await sb
    .from('transactions')
    .insert({ payment_method, items, total })
    .select()
    .single();

  if (txnError) {
    return NextResponse.json({ error: txnError.message }, { status: 500 });
  }

  const adjustments = items.map((i) => ({
    sku: i.sku,
    change: -i.qty,
    reason: 'sale',
    note: `Sale ${txn.id}`,
  }));

  const { error: adjError } = await sb
    .from('inventory_adjustments')
    .insert(adjustments);

  if (adjError) {
    return NextResponse.json({ error: adjError.message }, { status: 500 });
  }

  const invoiceNumber = await nextInvoiceNumber(sb);

  const { data: invoice, error: invError } = await sb
    .from('invoices')
    .insert({
      invoice_number: invoiceNumber,
      transaction_id: txn.id,
      items,
      subtotal: total,
      shipping: 0,
      total,
      payment_method,
      paid_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (invError) {
    return NextResponse.json({ error: invError.message }, { status: 500 });
  }

  return NextResponse.json({ transaction: txn, invoice });
}

// Void a transaction (soft delete) or edit its items/payment method.
// Reverses old inventory adjustments and, if items changed, inserts new ones,
// keeping the linked invoice in sync.
export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, voided, payment_method, items } = body as {
    id: string;
    voided?: boolean;
    payment_method?: string;
    items?: LineItem[];
  };

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  const sb = supabaseServer();

  const { data: existing, error: fetchError } = await sb
    .from('transactions')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json(
      { error: fetchError?.message ?? 'Transaction not found' },
      { status: 404 }
    );
  }

  // Simple void toggle — no item/inventory changes.
  if (voided !== undefined && items === undefined) {
    const { data, error } = await sb
      .from('transactions')
      .update({ voided })
      .eq('id', id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ transaction: data });
  }

  // Editing items: reverse the old inventory adjustments, apply the new ones,
  // recompute total, and keep the linked invoice's items/total in sync.
  if (items) {
    const oldItems = existing.items as LineItem[];
    const reversal = oldItems.map((i) => ({
      sku: i.sku,
      change: i.qty,
      reason: 'manual',
      note: `Edit reversal for ${id}`,
    }));
    const newAdjustments = items.map((i) => ({
      sku: i.sku,
      change: -i.qty,
      reason: 'manual',
      note: `Edit for ${id}`,
    }));

    const { error: adjError } = await sb
      .from('inventory_adjustments')
      .insert([...reversal, ...newAdjustments]);
    if (adjError) {
      return NextResponse.json({ error: adjError.message }, { status: 500 });
    }

    const total = items.reduce((sum, i) => sum + i.price * i.qty, 0);
    const method = payment_method ?? existing.payment_method;

    const { data: updatedTxn, error: txnError } = await sb
      .from('transactions')
      .update({ items, total, payment_method: method })
      .eq('id', id)
      .select()
      .single();

    if (txnError) {
      return NextResponse.json({ error: txnError.message }, { status: 500 });
    }

    await sb
      .from('invoices')
      .update({ items, subtotal: total, total, payment_method: method })
      .eq('transaction_id', id);

    return NextResponse.json({ transaction: updatedTxn });
  }

  return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
}

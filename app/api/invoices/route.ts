import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import type { LineItem } from '@/lib/types';

export async function GET() {
  const sb = supabaseServer();
  const { data, error } = await sb
    .from('invoices')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ invoices: data });
}

async function nextInvoiceNumber(sb: ReturnType<typeof supabaseServer>) {
  const { data, error } = await sb
    .from('invoices')
    .select('invoice_number')
    .order('created_at', { ascending: false })
    .limit(1);
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) return 'JD-0100';
  const match = (data[0].invoice_number as string).match(/(\d+)$/);
  const num = match ? parseInt(match[1], 10) + 1 : 100;
  return `JD-${String(num).padStart(4, '0')}`;
}

// Manual invoice — not tied to a self-logged sale. Stays unpaid (paid_at null)
// until marked paid from the Invoices page.
export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    customer_name,
    customer_contact,
    items,
    shipping,
    payment_method,
  } = body as {
    customer_name?: string;
    customer_contact?: string;
    items: LineItem[];
    shipping?: number;
    payment_method?: string;
  };

  if (!items || items.length === 0) {
    return NextResponse.json(
      { error: 'At least one item is required' },
      { status: 400 }
    );
  }

  const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);
  const ship = shipping ?? 0;
  const total = subtotal + ship;

  const sb = supabaseServer();
  const invoiceNumber = await nextInvoiceNumber(sb);

  const { data, error } = await sb
    .from('invoices')
    .insert({
      invoice_number: invoiceNumber,
      customer_name: customer_name ?? null,
      customer_contact: customer_contact ?? null,
      items,
      subtotal,
      shipping: ship,
      total,
      payment_method: payment_method ?? null,
      paid_at: null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ invoice: data });
}

// Mark an invoice paid or update its customer info.
export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, paid, customer_name, customer_contact } = body as {
    id: string;
    paid?: boolean;
    customer_name?: string;
    customer_contact?: string;
  };

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  const update: Record<string, unknown> = {};
  if (paid !== undefined) update.paid_at = paid ? new Date().toISOString() : null;
  if (customer_name !== undefined) update.customer_name = customer_name;
  if (customer_contact !== undefined) update.customer_contact = customer_contact;

  const sb = supabaseServer();
  const { data, error } = await sb
    .from('invoices')
    .update(update)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ invoice: data });
}

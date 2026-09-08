import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;


// Returns { sku: onHandNumber } computed as sum(change) grouped by sku.
export async function GET() {
  const sb = supabaseServer();
  const { data, error } = await sb
    .from('inventory_adjustments')
    .select('sku, change');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const onHand: Record<string, number> = {};
  for (const row of data ?? []) {
    onHand[row.sku] = (onHand[row.sku] ?? 0) + row.change;
  }

  return NextResponse.json({ onHand });
}

// Add stock ("Add Stock" action on the Inventory page). Also updates the
// product's cost if a unit_cost was provided.
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { sku, quantity, unit_cost, note } = body as {
    sku: string;
    quantity: number;
    unit_cost?: number;
    note?: string;
  };

  if (!sku || !quantity || quantity <= 0) {
    return NextResponse.json(
      { error: 'sku and a positive quantity are required' },
      { status: 400 }
    );
  }

  const sb = supabaseServer();

  const { error: adjError } = await sb.from('inventory_adjustments').insert({
    sku,
    change: quantity,
    reason: 'purchase',
    note: note ?? null,
    unit_cost: unit_cost ?? null,
  });

  if (adjError) {
    return NextResponse.json({ error: adjError.message }, { status: 500 });
  }

  if (unit_cost !== undefined && unit_cost !== null) {
    const { error: costError } = await sb
      .from('products')
      .update({ cost: unit_cost })
      .eq('sku', sku);
    if (costError) {
      return NextResponse.json({ error: costError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}

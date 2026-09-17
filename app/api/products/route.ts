import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;


export async function GET() {
  const sb = supabaseServer();
  const { data, error } = await sb
    .from('products')
    .select('*')
    .order('sku', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ products: data });
}

// Add a brand new SKU to the catalog.
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { sku, name, price, cost } = body as {
    sku: string;
    name: string;
    price: number;
    cost?: number | null;
  };

  if (!sku || !name || price === undefined || price === null) {
    return NextResponse.json(
      { error: 'sku, name, and price are required' },
      { status: 400 }
    );
  }

  const sb = supabaseServer();
  const { data, error } = await sb
    .from('products')
    .insert({
      sku: sku.trim(),
      name: name.trim(),
      price,
      cost: cost ?? null,
    })
    .select()
    .single();

  if (error) {
    const message = error.message.includes('duplicate')
      ? `SKU "${sku}" already exists.`
      : error.message;
    return NextResponse.json({ error: message }, { status: 400 });
  }
  return NextResponse.json({ product: data });
}

// Update a product's price/cost, and/or rename its SKU and/or item name.
// Renaming is the tricky part: inventory_adjustments has a real foreign
// key on sku (handled by an ON UPDATE CASCADE migration - see
// supabase/schema.sql), but transactions.items and invoices.items are
// just JSONB blobs with no live foreign key, so a renamed SKU has to be
// rewritten into every historical record by hand or old sales/invoices
// would silently stop matching the renamed product.
export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { sku, price, cost, newSku, newName } = body as {
    sku: string;
    price?: number;
    cost?: number | null;
    newSku?: string;
    newName?: string;
  };

  if (!sku) {
    return NextResponse.json({ error: 'sku is required' }, { status: 400 });
  }

  const sb = supabaseServer();
  let currentSku = sku;

  const trimmedNewSku = newSku?.trim().toUpperCase();
  const trimmedNewName = newName?.trim();
  const skuChanged = !!trimmedNewSku && trimmedNewSku !== sku;
  const nameChanged = trimmedNewName !== undefined && trimmedNewName !== '';

  if (skuChanged || nameChanged) {
    if (skuChanged) {
      const { data: existing } = await sb
        .from('products')
        .select('sku')
        .eq('sku', trimmedNewSku)
        .maybeSingle();
      if (existing) {
        return NextResponse.json(
          { error: `SKU "${trimmedNewSku}" already exists.` },
          { status: 400 }
        );
      }
    }

    const renameFields: Record<string, unknown> = {};
    if (skuChanged) renameFields.sku = trimmedNewSku;
    if (nameChanged) renameFields.name = trimmedNewName;

    // This UPDATE also cascades to inventory_adjustments.sku at the DB
    // level via the ON UPDATE CASCADE foreign key.
    const { error: renameError } = await sb
      .from('products')
      .update(renameFields)
      .eq('sku', sku);
    if (renameError) {
      return NextResponse.json({ error: renameError.message }, { status: 500 });
    }

    const finalSku = skuChanged ? (trimmedNewSku as string) : sku;
    await relinkHistoricalItems(sb, sku, finalSku, nameChanged ? trimmedNewName : undefined);
    currentSku = finalSku;
  }

  const priceCostUpdate: Record<string, unknown> = {};
  if (price !== undefined) priceCostUpdate.price = price;
  if (cost !== undefined) priceCostUpdate.cost = cost;

  // An empty update payload (e.g. a rename-only request that never touched
  // price/cost) makes PostgREST's UPDATE match nothing to actually set,
  // and .single() then throws "Cannot coerce the result to a single JSON
  // object" - the rename above had already succeeded at that point, but
  // this route still reported failure back to the client. Skip straight
  // to a plain SELECT when there's nothing left to update.
  if (Object.keys(priceCostUpdate).length === 0) {
    const { data, error } = await sb
      .from('products')
      .select()
      .eq('sku', currentSku)
      .single();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ product: data });
  }

  const { data, error } = await sb
    .from('products')
    .update(priceCostUpdate)
    .eq('sku', currentSku)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ product: data });
}

// Rewrites the old sku/name into every historical transaction and invoice
// line item that references it, so past sales stay linked to the renamed
// product instead of silently pointing at a SKU that no longer exists.
// Fetches full tables rather than relying on jsonb containment queries
// (@>'s partial-match semantics for arrays-of-objects are easy to get
// subtly wrong) - fine at this business's scale, and correctness here
// matters more than shaving a query.
async function relinkHistoricalItems(
  sb: ReturnType<typeof supabaseServer>,
  oldSku: string,
  newSku: string,
  newName?: string
) {
  type Item = { sku: string; name: string; price: number; qty: number };

  const { data: txns } = await sb.from('transactions').select('id, items');
  for (const t of txns ?? []) {
    const items = t.items as Item[];
    if (!items.some((i) => i.sku === oldSku)) continue;
    const updated = items.map((i) =>
      i.sku === oldSku ? { ...i, sku: newSku, name: newName ?? i.name } : i
    );
    await sb.from('transactions').update({ items: updated }).eq('id', t.id);
  }

  const { data: invoices } = await sb.from('invoices').select('id, items');
  for (const inv of invoices ?? []) {
    const items = inv.items as Item[];
    if (!items.some((i) => i.sku === oldSku)) continue;
    const updated = items.map((i) =>
      i.sku === oldSku ? { ...i, sku: newSku, name: newName ?? i.name } : i
    );
    await sb.from('invoices').update({ items: updated }).eq('id', inv.id);
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

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

// Update a product's price and/or cost (used from the Inventory page).
export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { sku, price, cost } = body as {
    sku: string;
    price?: number;
    cost?: number | null;
  };

  if (!sku) {
    return NextResponse.json({ error: 'sku is required' }, { status: 400 });
  }

  const update: Record<string, unknown> = {};
  if (price !== undefined) update.price = price;
  if (cost !== undefined) update.cost = cost;

  const sb = supabaseServer();
  const { data, error } = await sb
    .from('products')
    .update(update)
    .eq('sku', sku)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ product: data });
}

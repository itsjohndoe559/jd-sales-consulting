import { supabaseServer } from './supabase';
import { fetchAll } from './fetchAll';
import type { Product, Transaction, Invoice, BusinessFile } from './types';

export async function getProducts(): Promise<Product[]> {
  const sb = supabaseServer();
  const { data, error } = await sb
    .from('products')
    .select('*')
    .order('sku', { ascending: true });
  if (error) throw new Error(error.message);
  return data as Product[];
}

// Returns ALL transactions, newest first (paged - see lib/fetchAll.ts).
// Pass a limit only when you really want just the most recent N.
export async function getTransactions(limit?: number): Promise<Transaction[]> {
  const sb = supabaseServer();
  if (limit !== undefined) {
    const { data, error } = await sb
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);
    return data as Transaction[];
  }
  return fetchAll<Transaction>((from, to) =>
    sb
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .order('id', { ascending: true })
      .range(from, to)
  );
}

// { sku: onHand } = sum(change) over EVERY inventory_adjustments row.
export async function getOnHand(): Promise<Record<string, number>> {
  const sb = supabaseServer();
  const rows = await fetchAll<{ sku: string; change: number }>((from, to) =>
    sb
      .from('inventory_adjustments')
      .select('sku, change')
      .order('id', { ascending: true })
      .range(from, to)
  );
  const onHand: Record<string, number> = {};
  for (const row of rows) {
    onHand[row.sku] = (onHand[row.sku] ?? 0) + row.change;
  }
  return onHand;
}

export async function getInvoices(): Promise<Invoice[]> {
  const sb = supabaseServer();
  return fetchAll<Invoice>((from, to) =>
    sb
      .from('invoices')
      .select('*')
      .order('created_at', { ascending: false })
      .order('id', { ascending: true })
      .range(from, to)
  );
}

export async function getInvoiceById(id: string): Promise<Invoice | null> {
  const sb = supabaseServer();
  const { data, error } = await sb
    .from('invoices')
    .select('*')
    .eq('id', id)
    .single();
  if (error) return null;
  return data as Invoice;
}

export async function getFiles(): Promise<BusinessFile[]> {
  const sb = supabaseServer();
  const { data, error } = await sb
    .from('files')
    .select('*')
    .order('uploaded_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data as BusinessFile[];
}

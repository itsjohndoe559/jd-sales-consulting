import { supabaseServer } from './supabase';
import type { Product, Transaction, Invoice } from './types';

export async function getProducts(): Promise<Product[]> {
  const sb = supabaseServer();
  const { data, error } = await sb
    .from('products')
    .select('*')
    .order('sku', { ascending: true });
  if (error) throw new Error(error.message);
  return data as Product[];
}

export async function getTransactions(limit = 1000): Promise<Transaction[]> {
  const sb = supabaseServer();
  const { data, error } = await sb
    .from('transactions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data as Transaction[];
}

export async function getOnHand(): Promise<Record<string, number>> {
  const sb = supabaseServer();
  const { data, error } = await sb
    .from('inventory_adjustments')
    .select('sku, change');
  if (error) throw new Error(error.message);
  const onHand: Record<string, number> = {};
  for (const row of data ?? []) {
    onHand[row.sku] = (onHand[row.sku] ?? 0) + row.change;
  }
  return onHand;
}

export async function getInvoices(): Promise<Invoice[]> {
  const sb = supabaseServer();
  const { data, error } = await sb
    .from('invoices')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data as Invoice[];
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

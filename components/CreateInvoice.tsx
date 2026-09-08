'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { money } from '@/lib/format';
import type { Product, LineItem } from '@/lib/types';

export default function CreateInvoice() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<LineItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerContact, setCustomerContact] = useState('');
  const [shipping, setShipping] = useState('0');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open && products.length === 0) {
      fetch('/api/products')
        .then((r) => r.json())
        .then((d) => setProducts(d.products ?? []));
    }
  }, [open, products.length]);

  const suggestions =
    query.trim().length === 0
      ? []
      : products
          .filter(
            (p) =>
              p.sku.toLowerCase().includes(query.toLowerCase()) ||
              p.name.toLowerCase().includes(query.toLowerCase())
          )
          .slice(0, 4);

  function addItem(p: Product) {
    setItems((prev) => {
      const existing = prev.find((i) => i.sku === p.sku);
      if (existing) {
        return prev.map((i) =>
          i.sku === p.sku ? { ...i, qty: i.qty + 1 } : i
        );
      }
      return [...prev, { sku: p.sku, name: p.name, price: p.price, qty: 1 }];
    });
    setQuery('');
  }

  function reset() {
    setItems([]);
    setCustomerName('');
    setCustomerContact('');
    setShipping('0');
    setQuery('');
  }

  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);

  async function submit() {
    if (items.length === 0) return;
    setSubmitting(true);
    const res = await fetch('/api/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_name: customerName || undefined,
        customer_contact: customerContact || undefined,
        items,
        shipping: Number(shipping) || 0,
      }),
    });
    setSubmitting(false);
    if (res.ok) {
      reset();
      setOpen(false);
      router.refresh();
    } else {
      alert('Could not create the invoice. Try again.');
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="bg-jdred text-white rounded px-4 py-2 text-sm font-medium"
      >
        Create Invoice
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">Create Invoice</h2>
              <button onClick={() => setOpen(false)} className="text-slate">
                ✕
              </button>
            </div>

            <div className="flex gap-2 mb-3">
              <input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Customer name"
                className="flex-1 border border-line rounded px-3 py-2 text-sm"
              />
              <input
                value={customerContact}
                onChange={(e) => setCustomerContact(e.target.value)}
                placeholder="Instagram / contact"
                className="flex-1 border border-line rounded px-3 py-2 text-sm"
              />
            </div>

            <div className="relative mb-2">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Add item by SKU or name"
                className="w-full border border-line rounded px-3 py-2 text-sm"
              />
              {suggestions.length > 0 && (
                <div className="absolute left-0 right-0 mt-1 card z-10">
                  {suggestions.map((p) => (
                    <button
                      key={p.sku}
                      onClick={() => addItem(p)}
                      className="block w-full text-left px-3 py-2 text-sm hover:bg-paper border-b border-line last:border-0"
                    >
                      {p.sku} — {p.name} ({money(p.price)})
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2 mt-3">
              {items.map((i) => (
                <div
                  key={i.sku}
                  className="flex justify-between text-sm border-b border-line pb-2"
                >
                  <span>
                    {i.name} × {i.qty}
                  </span>
                  <span className="tabular">{money(i.price * i.qty)}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 mt-4">
              <span className="text-sm text-slate">Shipping</span>
              <input
                type="number"
                value={shipping}
                onChange={(e) => setShipping(e.target.value)}
                className="w-20 border border-line rounded px-2 py-1 text-sm"
              />
            </div>

            <div className="flex justify-between items-center mt-4 mb-3">
              <span className="text-sm text-slate">Subtotal</span>
              <span className="text-lg font-bold tabular">
                {money(subtotal)}
              </span>
            </div>

            <button
              onClick={submit}
              disabled={items.length === 0 || submitting}
              className="w-full bg-jdred text-white rounded py-2.5 font-medium disabled:opacity-40"
            >
              {submitting ? 'Creating...' : 'Save Draft'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

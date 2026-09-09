'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { money, dateTime } from '@/lib/format';
import { downloadElementAsPdf } from '@/lib/pdf';
import type { Product, LineItem, PaymentMethod } from '@/lib/types';
import Receipt from './Receipt';

const PAYMENT_METHODS: PaymentMethod[] = [
  'Cash',
  'Zelle',
  'Apple Pay',
  'Cash App',
  'Other',
];

type Result = {
  invoice: {
    invoice_number: string;
    created_at: string;
    items: LineItem[];
    subtotal: number;
    shipping: number;
    total: number;
    payment_method: string;
  };
};

export default function AddSale() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'form' | 'receipt'>('form');
  const [openedAt, setOpenedAt] = useState<Date | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<LineItem[]>([]);
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const receiptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && products.length === 0) {
      fetch('/api/products')
        .then((r) => r.json())
        .then((d) => setProducts(d.products ?? []));
    }
  }, [open, products.length]);

  function launch() {
    setOpen(true);
    setStep('form');
    setOpenedAt(new Date());
    setItems([]);
    setMethod(null);
    setQuery('');
    setResult(null);
  }

  function close() {
    setOpen(false);
  }

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

  function removeItem(sku: string) {
    setItems((prev) => prev.filter((i) => i.sku !== sku));
  }

  const total = items.reduce((sum, i) => sum + i.price * i.qty, 0);
  const canSubmit = method !== null && items.length > 0 && !submitting;

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    const res = await fetch('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payment_method: method, items }),
    });
    setSubmitting(false);
    if (res.ok) {
      const data = await res.json();
      setResult(data);
      setStep('receipt');
      router.refresh();
    } else {
      alert('Something went wrong logging the sale. Try again.');
    }
  }

  async function downloadPdf() {
    if (!receiptRef.current) return;
    await downloadElementAsPdf(
      receiptRef.current,
      `${result?.invoice.invoice_number ?? 'receipt'}.pdf`
    );
  }

  return (
    <>
      <button
        onClick={launch}
        className="fixed bottom-6 right-6 md:bottom-8 md:right-8 bg-jdred text-white rounded-full md:rounded-lg px-5 py-3 font-medium shadow-lg z-40"
      >
        + Add Sale
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md max-h-[90vh] overflow-y-auto p-6">
            {step === 'form' && (
              <>
                <div className="flex justify-between items-center mb-1">
                  <h2 className="text-lg font-bold">Add Sale</h2>
                  <button onClick={close} className="text-slate">
                    ✕
                  </button>
                </div>
                {openedAt && (
                  <div className="text-xs text-slate mb-4">
                    {dateTime(openedAt.toISOString())}
                  </div>
                )}

                <div className="mb-4">
                  <div className="text-xs text-slate uppercase mb-2">
                    Payment method
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {PAYMENT_METHODS.map((m) => (
                      <button
                        key={m}
                        onClick={() => setMethod(m)}
                        className={`px-3 py-1.5 rounded-full text-sm border ${
                          method === m
                            ? 'bg-ink text-white border-ink'
                            : 'border-line text-ink'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mb-2 relative">
                  <div className="text-xs text-slate uppercase mb-2">
                    Add item
                  </div>
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Type a SKU or item name (e.g. FR)"
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

                <div className="mt-4 flex flex-col gap-2">
                  {items.map((i) => (
                    <div
                      key={i.sku}
                      className="flex items-center justify-between text-sm border-b border-line pb-2"
                    >
                      <div>
                        <div className="font-medium">{i.name}</div>
                        <div className="text-xs text-slate">
                          {i.sku} × {i.qty}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="tabular">
                          {money(i.price * i.qty)}
                        </span>
                        <button
                          onClick={() => removeItem(i.sku)}
                          className="text-slate hover:text-jdred"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                  {items.length === 0 && (
                    <div className="text-sm text-slate italic">
                      No items yet.
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center mt-6 mb-3">
                  <span className="text-sm text-slate">Total</span>
                  <span className="text-xl font-bold tabular">
                    {money(total)}
                  </span>
                </div>

                <button
                  onClick={submit}
                  disabled={!canSubmit}
                  className="w-full bg-jdred text-white rounded py-2.5 font-medium disabled:opacity-40"
                >
                  {submitting ? 'Logging...' : 'Log Sale'}
                </button>
              </>
            )}

            {step === 'receipt' && result && (
              <div className="flex flex-col items-center gap-4">
                <div ref={receiptRef}>
                  <Receipt
                    invoiceNumber={result.invoice.invoice_number}
                    createdAt={result.invoice.created_at}
                    items={result.invoice.items}
                    subtotal={result.invoice.subtotal}
                    shipping={result.invoice.shipping}
                    total={result.invoice.total}
                    paymentMethod={result.invoice.payment_method}
                    paid
                  />
                </div>
                <div className="flex gap-3 w-full">
                  <button
                    onClick={downloadPdf}
                    className="flex-1 border border-line rounded py-2.5 font-medium"
                  >
                    Download PDF
                  </button>
                  <button
                    onClick={close}
                    className="flex-1 bg-jdred text-white rounded py-2.5 font-medium"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

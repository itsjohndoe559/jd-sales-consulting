'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AddSkuForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [cost, setCost] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function reset() {
    setSku('');
    setName('');
    setPrice('');
    setCost('');
    setError('');
  }

  async function submit() {
    setError('');
    if (!sku.trim() || !name.trim() || !price) {
      setError('SKU, name, and price are required.');
      return;
    }
    setSaving(true);
    const res = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sku: sku.trim().toUpperCase(),
        name: name.trim(),
        price: Number(price),
        cost: cost ? Number(cost) : undefined,
      }),
    });
    setSaving(false);
    if (res.ok) {
      reset();
      setOpen(false);
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? 'Could not add that SKU.');
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="bg-jdred text-white rounded px-4 py-2 text-sm font-medium"
      >
        + Add SKU
      </button>
    );
  }

  return (
    <div className="card p-4 w-full md:w-auto md:min-w-[420px]">
      <div className="flex justify-between items-center mb-3">
        <div className="text-sm font-bold">New SKU</div>
        <button
          onClick={() => {
            reset();
            setOpen(false);
          }}
          className="text-slate"
        >
          ✕
        </button>
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <input
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            placeholder="SKU (e.g. NB)"
            className="w-28 border border-line rounded px-2 py-1.5 text-sm"
          />
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Item name"
            className="flex-1 border border-line rounded px-2 py-1.5 text-sm"
          />
        </div>
        <div className="flex gap-2">
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="Price"
            className="flex-1 border border-line rounded px-2 py-1.5 text-sm"
          />
          <input
            type="number"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            placeholder="Cost (optional)"
            className="flex-1 border border-line rounded px-2 py-1.5 text-sm"
          />
        </div>
        {error && <div className="text-jdred text-xs">{error}</div>}
        <button
          onClick={submit}
          disabled={saving}
          className="bg-jdred text-white rounded py-2 text-sm font-medium mt-1 disabled:opacity-50"
        >
          {saving ? 'Adding...' : 'Add SKU'}
        </button>
      </div>
    </div>
  );
}

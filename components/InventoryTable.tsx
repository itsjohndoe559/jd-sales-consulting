'use client';

import { Fragment, useState } from 'react';
import { useRouter } from 'next/navigation';
import { money } from '@/lib/format';
import type { Product } from '@/lib/types';

type Row = Product & { onHand: number };

export default function InventoryTable({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const [editingStockSku, setEditingStockSku] = useState<string | null>(null);
  const [qty, setQty] = useState('');
  const [unitCost, setUnitCost] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  async function saveField(sku: string, field: 'price' | 'cost', value: string) {
    const num = value === '' ? null : Number(value);
    if (num !== null && Number.isNaN(num)) return;
    await fetch('/api/products', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sku, [field]: num }),
    });
    router.refresh();
  }

  async function addStock(sku: string) {
    if (!qty || Number(qty) <= 0) return;
    setSaving(true);
    await fetch('/api/inventory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sku,
        quantity: Number(qty),
        unit_cost: unitCost ? Number(unitCost) : undefined,
        note: note || undefined,
      }),
    });
    setSaving(false);
    setEditingStockSku(null);
    setQty('');
    setUnitCost('');
    setNote('');
    router.refresh();
  }

  return (
    <div className="card p-4 overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[11px] text-slate uppercase text-left border-b border-line">
            <th className="pb-2">Item</th>
            <th className="pb-2">SKU</th>
            <th className="pb-2">Cost</th>
            <th className="pb-2">Price</th>
            <th className="pb-2 text-right">On Hand</th>
            <th className="pb-2 text-right">Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <Fragment key={p.sku}>
              <tr
                className={`border-b border-line last:border-0 ${
                  p.onHand <= 10 ? 'bg-jdred/5' : ''
                }`}
              >
                <td className="py-2">{p.name}</td>
                <td className="py-2 text-slate">{p.sku}</td>
                <td className="py-2">
                  <input
                    type="number"
                    defaultValue={p.cost ?? ''}
                    placeholder="—"
                    onBlur={(e) => saveField(p.sku, 'cost', e.target.value)}
                    className="w-20 border border-line rounded px-2 py-1 tabular"
                  />
                </td>
                <td className="py-2">
                  <input
                    type="number"
                    defaultValue={p.price}
                    onBlur={(e) => saveField(p.sku, 'price', e.target.value)}
                    className="w-20 border border-line rounded px-2 py-1 tabular"
                  />
                </td>
                <td
                  className={`py-2 text-right font-medium tabular ${
                    p.onHand <= 10 ? 'text-jdred' : ''
                  }`}
                >
                  {p.onHand}
                </td>
                <td className="py-2 text-right">
                  <button
                    onClick={() =>
                      setEditingStockSku(
                        editingStockSku === p.sku ? null : p.sku
                      )
                    }
                    className="text-xs text-jdred underline"
                  >
                    + Stock
                  </button>
                </td>
              </tr>
              {editingStockSku === p.sku && (
                <tr className="bg-paper">
                  <td colSpan={6} className="py-3">
                    <div className="flex flex-wrap items-end gap-2">
                      <div>
                        <div className="text-xs text-slate mb-1">Qty in</div>
                        <input
                          type="number"
                          value={qty}
                          onChange={(e) => setQty(e.target.value)}
                          className="w-20 border border-line rounded px-2 py-1"
                        />
                      </div>
                      <div>
                        <div className="text-xs text-slate mb-1">
                          Unit cost
                        </div>
                        <input
                          type="number"
                          value={unitCost}
                          onChange={(e) => setUnitCost(e.target.value)}
                          className="w-24 border border-line rounded px-2 py-1"
                        />
                      </div>
                      <div className="flex-1 min-w-[140px]">
                        <div className="text-xs text-slate mb-1">
                          Supplier note
                        </div>
                        <input
                          type="text"
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                          className="w-full border border-line rounded px-2 py-1"
                        />
                      </div>
                      <button
                        onClick={() => addStock(p.sku)}
                        disabled={saving}
                        className="bg-jdred text-white rounded px-3 py-1.5 text-sm"
                      >
                        {saving ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

import { money, dateTime } from '@/lib/format';
import type { LineItem } from '@/lib/types';

export default function Receipt({
  invoiceNumber,
  createdAt,
  items,
  subtotal,
  shipping,
  total,
  paymentMethod,
  customerName,
  customerContact,
  paid,
}: {
  invoiceNumber: string;
  createdAt: string;
  items: LineItem[];
  subtotal: number;
  shipping: number;
  total: number;
  paymentMethod?: string | null;
  customerName?: string | null;
  customerContact?: string | null;
  paid: boolean;
}) {
  return (
    <div className="card p-6 sm:p-8 bg-white w-full max-w-[420px] mx-auto">
      <div className="flex justify-between items-start">
        <div>
          <div className="text-2xl font-bold leading-none">
            <span className="text-jdred">J</span>
            <span className="text-jdgreen">D</span>
          </div>
          <div className="text-xs text-slate mt-1">
            JD Sales and Consulting L.L.C.
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold">INVOICE</div>
          <div className="text-xs text-slate">#{invoiceNumber}</div>
          <div className="text-xs text-slate">{dateTime(createdAt)}</div>
        </div>
      </div>

      {(customerName || customerContact) && (
        <div className="mt-6 text-xs">
          <div className="text-slate uppercase tracking-wide">Billed to</div>
          {customerName && <div className="font-medium">{customerName}</div>}
          {customerContact && <div>{customerContact}</div>}
        </div>
      )}

      <div className="mt-6">
        <div className="grid grid-cols-12 text-[11px] text-slate uppercase border-b border-line pb-2">
          <div className="col-span-6">Item</div>
          <div className="col-span-2 text-right">Qty</div>
          <div className="col-span-4 text-right">Amount</div>
        </div>
        {items.map((it, idx) => (
          <div
            key={idx}
            className="grid grid-cols-12 text-sm py-2 border-b border-line"
          >
            <div className="col-span-6">
              {it.name}{' '}
              <span className="text-slate text-xs">({it.sku})</span>
            </div>
            <div className="col-span-2 text-right tabular">{it.qty}</div>
            <div className="col-span-4 text-right tabular">
              {money(it.price * it.qty)}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-col items-end gap-1 text-sm">
        <div className="flex gap-8">
          <span className="text-slate">Subtotal</span>
          <span className="tabular">{money(subtotal)}</span>
        </div>
        <div className="flex gap-8">
          <span className="text-slate">Shipping</span>
          <span className="tabular">{money(shipping)}</span>
        </div>
        <div className="flex gap-8 text-lg font-bold border-t border-line pt-1 mt-1">
          <span>Total</span>
          <span className="tabular">{money(total)}</span>
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-line text-xs text-slate flex justify-between">
        <span>{paymentMethod ?? '—'}</span>
        <span className={paid ? 'text-jdgreen' : 'text-jdred'}>
          {paid ? 'Paid' : 'Unpaid'}
        </span>
      </div>
    </div>
  );
}

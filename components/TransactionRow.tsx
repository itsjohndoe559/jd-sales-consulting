'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { money, dateTime, channelFor } from '@/lib/format';
import type { Transaction } from '@/lib/types';

export default function TransactionRow({ t }: { t: Transaction }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const channel = channelFor(t.payment_method);

  async function toggleVoid() {
    setBusy(true);
    await fetch('/api/transactions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: t.id, voided: !t.voided }),
    });
    setBusy(false);
    router.refresh();
  }

  const itemsLabel = t.items
    .map((i) => `${i.name} (${i.sku})${i.qty > 1 ? ` ×${i.qty}` : ''}`)
    .join(' + ');

  const channelBadge = (
    <span
      className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${
        channel === 'Cash'
          ? 'bg-jdgreen/10 text-jdgreen'
          : 'bg-jdred/10 text-jdred'
      }`}
    >
      {t.payment_method}
    </span>
  );

  return (
    <div
      className={`py-3 border-b border-line last:border-0 text-sm ${
        t.voided ? 'opacity-40' : ''
      }`}
    >
      {/* Mobile: stacked card */}
      <div className="flex flex-col gap-1 md:hidden">
        <div className="flex justify-between items-start">
          <span className="text-xs text-slate">{dateTime(t.created_at)}</span>
          <span className="tabular font-medium">{money(t.total)}</span>
        </div>
        <div>
          {itemsLabel}
          {t.voided && <span className="ml-2 text-jdred text-xs">VOIDED</span>}
        </div>
        <div className="flex justify-between items-center mt-1">
          {channelBadge}
          <button
            onClick={toggleVoid}
            disabled={busy}
            className="text-xs text-slate hover:text-jdred underline"
          >
            {t.voided ? 'Restore' : 'Void'}
          </button>
        </div>
      </div>

      {/* Desktop: grid row */}
      <div className="hidden md:grid grid-cols-12 items-center">
        <div className="col-span-3 text-xs text-slate">
          {dateTime(t.created_at)}
        </div>
        <div className="col-span-5">
          {itemsLabel}
          {t.voided && <span className="ml-2 text-jdred text-xs">VOIDED</span>}
        </div>
        <div className="col-span-2">{channelBadge}</div>
        <div className="col-span-1 text-right tabular font-medium">
          {money(t.total)}
        </div>
        <div className="col-span-1 text-right">
          <button
            onClick={toggleVoid}
            disabled={busy}
            className="text-xs text-slate hover:text-jdred underline"
          >
            {t.voided ? 'Restore' : 'Void'}
          </button>
        </div>
      </div>
    </div>
  );
}

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

  return (
    <div
      className={`grid grid-cols-12 items-center text-sm py-3 border-b border-line last:border-0 ${
        t.voided ? 'opacity-40' : ''
      }`}
    >
      <div className="col-span-3 text-xs text-slate">
        {dateTime(t.created_at)}
      </div>
      <div className="col-span-5">
        {t.items.map((i) => `${i.name} (${i.sku})${i.qty > 1 ? ` ×${i.qty}` : ''}`).join(' + ')}
        {t.voided && <span className="ml-2 text-jdred text-xs">VOIDED</span>}
      </div>
      <div className="col-span-2">
        <span
          className={`text-xs px-2 py-0.5 rounded-full ${
            channel === 'Cash'
              ? 'bg-jdgreen/10 text-jdgreen'
              : 'bg-jdred/10 text-jdred'
          }`}
        >
          {t.payment_method}
        </span>
      </div>
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
  );
}

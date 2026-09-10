'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { businessDayRange } from '@/lib/format';
import SearchBar from './SearchBar';
import FilterChips from './FilterChips';
import TransactionRow from './TransactionRow';
import type { Transaction, PaymentMethod } from '@/lib/types';

const METHODS: PaymentMethod[] = ['Cash', 'Zelle', 'Apple Pay', 'Cash App', 'Other'];

export default function TransactionsClient({
  transactions,
}: {
  transactions: Transaction[];
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(() => searchParams.get('search') ?? '');
  const [methods, setMethods] = useState<string[]>(() =>
    (searchParams.get('methods') ?? '').split(',').filter(Boolean)
  );
  const [startDate, setStartDate] = useState(() => searchParams.get('start') ?? '');
  const [endDate, setEndDate] = useState(() => searchParams.get('end') ?? '');

  // Keep the URL in sync (for reload/bookmark) without triggering a
  // Next.js server re-render on every keystroke.
  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (methods.length) params.set('methods', methods.join(','));
    if (startDate) params.set('start', startDate);
    if (endDate) params.set('end', endDate);
    const qs = params.toString();
    window.history.replaceState(null, '', qs ? `${pathname}?${qs}` : pathname);
  }, [search, methods, startDate, endDate, pathname]);

  function toggleMethod(m: string) {
    setMethods((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]));
  }

  function clearAll() {
    setSearch('');
    setMethods([]);
    setStartDate('');
    setEndDate('');
  }

  const filtered = useMemo(() => {
    const startBoundary = startDate ? businessDayRange(startDate).start : null;
    const endBoundary = endDate ? businessDayRange(endDate).end : null;
    const q = search.trim().toLowerCase();

    return transactions.filter((t) => {
      if (methods.length > 0 && !methods.includes(t.payment_method)) return false;
      const created = new Date(t.created_at);
      if (startBoundary && created < startBoundary) return false;
      if (endBoundary && created > endBoundary) return false;
      if (q) {
        const matches = t.items.some(
          (i) => i.name.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q)
        );
        if (!matches) return false;
      }
      return true;
    });
  }, [transactions, methods, startDate, endDate, search]);

  const totalUnits = filtered.reduce(
    (s, t) => s + t.items.reduce((s2, i) => s2 + i.qty, 0),
    0
  );
  const totalAmount = filtered.reduce((s, t) => s + t.total, 0);
  const activeFilterCount =
    (search ? 1 : 0) + methods.length + (startDate ? 1 : 0) + (endDate ? 1 : 0);

  return (
    <div>
      <div className="flex justify-between items-start mb-4 gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Transaction Log</h1>
          <p className="text-sm text-slate">Every logged sale</p>
        </div>
        <div className="text-xs bg-line/50 px-3 py-1.5 rounded-full">
          {totalUnits} units · ${totalAmount.toFixed(0)}
        </div>
      </div>

      <div className="card p-4 mb-4 flex flex-col gap-3">
        <div className="flex gap-2 flex-wrap">
          <SearchBar value={search} onChange={setSearch} placeholder="Search item or SKU..." />
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border border-line rounded px-3 py-1.5 text-sm"
            aria-label="Start date"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="border border-line rounded px-3 py-1.5 text-sm"
            aria-label="End date"
          />
        </div>
        <div className="flex justify-between items-center gap-3 flex-wrap">
          <FilterChips options={METHODS} selected={methods} onToggle={toggleMethod} />
          {activeFilterCount > 0 && (
            <button onClick={clearAll} className="text-xs text-jdred underline shrink-0">
              Clear all ({activeFilterCount})
            </button>
          )}
        </div>
      </div>

      <div className="card p-4">
        <div className="hidden md:grid grid-cols-12 text-[11px] text-slate uppercase pb-2 border-b border-line">
          <div className="col-span-3">Date</div>
          <div className="col-span-5">Items Sold</div>
          <div className="col-span-2">Channel</div>
          <div className="col-span-1 text-right">Amount</div>
          <div className="col-span-1"></div>
        </div>
        {filtered.length === 0 && (
          <div className="text-sm text-slate italic py-6 text-center">
            No transactions match these filters.
          </div>
        )}
        {filtered.map((t) => (
          <TransactionRow key={t.id} t={t} />
        ))}
      </div>
    </div>
  );
}

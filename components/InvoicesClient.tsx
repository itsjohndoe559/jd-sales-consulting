'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { businessDayRange, money, dateTime } from '@/lib/format';
import SearchBar from './SearchBar';
import FilterChips from './FilterChips';
import CreateInvoice from './CreateInvoice';
import type { Invoice } from '@/lib/types';

const STATUSES = ['Paid', 'Unpaid'];

export default function InvoicesClient({ invoices }: { invoices: Invoice[] }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(() => searchParams.get('search') ?? '');
  const [statuses, setStatuses] = useState<string[]>(() =>
    (searchParams.get('status') ?? '').split(',').filter(Boolean)
  );
  const [startDate, setStartDate] = useState(() => searchParams.get('start') ?? '');
  const [endDate, setEndDate] = useState(() => searchParams.get('end') ?? '');

  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (statuses.length) params.set('status', statuses.join(','));
    if (startDate) params.set('start', startDate);
    if (endDate) params.set('end', endDate);
    const qs = params.toString();
    window.history.replaceState(null, '', qs ? `${pathname}?${qs}` : pathname);
  }, [search, statuses, startDate, endDate, pathname]);

  function toggleStatus(s: string) {
    setStatuses((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  }

  function clearAll() {
    setSearch('');
    setStatuses([]);
    setStartDate('');
    setEndDate('');
  }

  const filtered = useMemo(() => {
    const startBoundary = startDate ? businessDayRange(startDate).start : null;
    const endBoundary = endDate ? businessDayRange(endDate).end : null;
    const q = search.trim().toLowerCase();

    return invoices.filter((inv) => {
      const isPaid = !!inv.paid_at;
      if (statuses.length > 0) {
        if (statuses.includes('Paid') && !statuses.includes('Unpaid') && !isPaid) return false;
        if (statuses.includes('Unpaid') && !statuses.includes('Paid') && isPaid) return false;
      }
      const created = new Date(inv.created_at);
      if (startBoundary && created < startBoundary) return false;
      if (endBoundary && created > endBoundary) return false;
      if (q) {
        const matches =
          inv.invoice_number.toLowerCase().includes(q) ||
          (inv.customer_name ?? '').toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [invoices, statuses, startDate, endDate, search]);

  const activeFilterCount =
    (search ? 1 : 0) + statuses.length + (startDate ? 1 : 0) + (endDate ? 1 : 0);

  return (
    <div>
      <div className="flex justify-between items-start mb-4 gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Invoices</h1>
          <p className="text-sm text-slate">
            Create, send, and track invoices for buyers and consignors
          </p>
        </div>
        <CreateInvoice />
      </div>

      <div className="card p-4 mb-4 flex flex-col gap-3">
        <div className="flex gap-2 flex-wrap">
          <SearchBar value={search} onChange={setSearch} placeholder="Search invoice # or customer..." />
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
          <FilterChips options={STATUSES} selected={statuses} onToggle={toggleStatus} />
          {activeFilterCount > 0 && (
            <button onClick={clearAll} className="text-xs text-jdred underline shrink-0">
              Clear all ({activeFilterCount})
            </button>
          )}
        </div>
      </div>

      <div className="card p-4">
        <div className="hidden md:grid grid-cols-12 text-[11px] text-slate uppercase pb-2 border-b border-line">
          <div className="col-span-2">Invoice</div>
          <div className="col-span-3">Customer</div>
          <div className="col-span-3">Date</div>
          <div className="col-span-2 text-right">Total</div>
          <div className="col-span-2 text-right">Status</div>
        </div>
        {filtered.length === 0 && (
          <div className="text-sm text-slate italic py-6 text-center">
            No invoices match these filters.
          </div>
        )}
        {filtered.map((inv) => {
          const statusBadge = (
            <span
              className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${
                inv.paid_at ? 'bg-jdgreen/10 text-jdgreen' : 'bg-jdred/10 text-jdred'
              }`}
            >
              {inv.paid_at ? 'Paid' : 'Unpaid'}
            </span>
          );
          return (
            <Link
              key={inv.id}
              href={`/invoices/${inv.id}`}
              className="block py-3 border-b border-line last:border-0 hover:bg-paper text-sm"
            >
              <div className="flex flex-col gap-1 md:hidden">
                <div className="flex justify-between items-start">
                  <span className="font-medium">#{inv.invoice_number}</span>
                  <span className="tabular font-medium">{money(inv.total)}</span>
                </div>
                <div className="text-slate">{inv.customer_name ?? '—'}</div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate">{dateTime(inv.created_at)}</span>
                  {statusBadge}
                </div>
              </div>

              <div className="hidden md:grid grid-cols-12 items-center">
                <div className="col-span-2 font-medium">#{inv.invoice_number}</div>
                <div className="col-span-3 text-slate">{inv.customer_name ?? '—'}</div>
                <div className="col-span-3 text-xs text-slate">{dateTime(inv.created_at)}</div>
                <div className="col-span-2 text-right tabular font-medium">
                  {money(inv.total)}
                </div>
                <div className="col-span-2 text-right">{statusBadge}</div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

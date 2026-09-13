'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  businessDayRange,
  businessDateStr,
  money,
  dateTime,
  longDate,
} from '@/lib/format';
import { elementToPdfBlob } from '@/lib/pdf';
import SearchBar from './SearchBar';
import FilterChips from './FilterChips';
import CreateInvoice from './CreateInvoice';
import Receipt from './Receipt';
import type { Invoice } from '@/lib/types';

const STATUSES = ['Paid', 'Unpaid'];

export default function InvoicesClient({ invoices }: { invoices: Invoice[] }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [day, setDay] = useState<string | null>(() => searchParams.get('day'));
  const [search, setSearch] = useState(() => searchParams.get('search') ?? '');
  const [statuses, setStatuses] = useState<string[]>(() =>
    (searchParams.get('status') ?? '').split(',').filter(Boolean)
  );
  const [startDate, setStartDate] = useState(() => searchParams.get('start') ?? '');
  const [endDate, setEndDate] = useState(() => searchParams.get('end') ?? '');

  const [zipping, setZipping] = useState(false);
  const [zipInvoice, setZipInvoice] = useState<Invoice | null>(null);
  const zipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (day) params.set('day', day);
    if (search) params.set('search', search);
    if (statuses.length) params.set('status', statuses.join(','));
    if (startDate) params.set('start', startDate);
    if (endDate) params.set('end', endDate);
    const qs = params.toString();
    window.history.replaceState(null, '', qs ? `${pathname}?${qs}` : pathname);
  }, [day, search, statuses, startDate, endDate, pathname]);

  function toggleStatus(s: string) {
    setStatuses((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  }

  function clearAll() {
    setSearch('');
    setStatuses([]);
    setStartDate('');
    setEndDate('');
  }

  const activeFilterCount =
    (search ? 1 : 0) + statuses.length + (startDate ? 1 : 0) + (endDate ? 1 : 0);

  // Grouped-by-day folders, shown when no filters are active.
  const dayGroups = useMemo(() => {
    const groups = new Map<string, { count: number; total: number }>();
    for (const inv of invoices) {
      const d = businessDateStr(inv.created_at);
      const g = groups.get(d) ?? { count: 0, total: 0 };
      g.count += 1;
      g.total += inv.total;
      groups.set(d, g);
    }
    return Array.from(groups.entries())
      .map(([date, v]) => ({ date, ...v }))
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [invoices]);

  // Flat filtered list, shown when search/status/date filters are active.
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

  // Invoices for the currently selected day folder.
  const dayInvoices = useMemo(() => {
    if (!day) return [];
    return invoices
      .filter((inv) => businessDateStr(inv.created_at) === day)
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  }, [invoices, day]);

  async function downloadZip() {
    if (dayInvoices.length === 0 || !day) return;
    setZipping(true);
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();

    for (const inv of dayInvoices) {
      setZipInvoice(inv);
      // Let the hidden Receipt re-render with this invoice's data before capturing.
      await new Promise((r) => setTimeout(r, 80));
      if (zipRef.current) {
        const blob = await elementToPdfBlob(zipRef.current);
        zip.file(`${inv.invoice_number}.pdf`, blob);
      }
    }

    setZipInvoice(null);
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoices-${day}.zip`;
    a.click();
    URL.revokeObjectURL(url);
    setZipping(false);
  }

  function statusBadge(inv: Invoice) {
    return (
      <span
        className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${
          inv.paid_at ? 'bg-jdgreen/10 text-jdgreen' : 'bg-jdred/10 text-jdred'
        }`}
      >
        {inv.paid_at ? 'Paid' : 'Unpaid'}
      </span>
    );
  }

  function invoiceRow(inv: Invoice) {
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
            {statusBadge(inv)}
          </div>
        </div>

        <div className="hidden md:grid grid-cols-12 items-center">
          <div className="col-span-2 font-medium">#{inv.invoice_number}</div>
          <div className="col-span-3 text-slate">{inv.customer_name ?? '—'}</div>
          <div className="col-span-3 text-xs text-slate">{dateTime(inv.created_at)}</div>
          <div className="col-span-2 text-right tabular font-medium">{money(inv.total)}</div>
          <div className="col-span-2 text-right">{statusBadge(inv)}</div>
        </div>
      </Link>
    );
  }

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

      {/* Day detail view */}
      {day ? (
        <div>
          <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
            <button
              onClick={() => setDay(null)}
              className="text-sm text-slate inline-block"
            >
              ← All days
            </button>
            <button
              onClick={downloadZip}
              disabled={zipping || dayInvoices.length === 0}
              className="bg-jdred text-white rounded px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              {zipping
                ? `Zipping ${dayInvoices.length} invoices...`
                : `Download ZIP (${dayInvoices.length})`}
            </button>
          </div>
          <h2 className="text-lg font-bold mb-3">{longDate(day)}</h2>
          <div className="card p-4">
            <div className="hidden md:grid grid-cols-12 text-[11px] text-slate uppercase pb-2 border-b border-line">
              <div className="col-span-2">Invoice</div>
              <div className="col-span-3">Customer</div>
              <div className="col-span-3">Date</div>
              <div className="col-span-2 text-right">Total</div>
              <div className="col-span-2 text-right">Status</div>
            </div>
            {dayInvoices.length === 0 && (
              <div className="text-sm text-slate italic py-6 text-center">
                No invoices on this day.
              </div>
            )}
            {dayInvoices.map(invoiceRow)}
          </div>
        </div>
      ) : (
        <>
          <div className="card p-4 mb-4 flex flex-col gap-3">
            <div className="flex gap-2 flex-wrap">
              <SearchBar
                value={search}
                onChange={setSearch}
                placeholder="Search invoice # or customer..."
              />
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

          {activeFilterCount > 0 ? (
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
              {filtered.map(invoiceRow)}
            </div>
          ) : (
            <div className="card p-4">
              {dayGroups.length === 0 && (
                <div className="text-sm text-slate italic py-6 text-center">
                  No invoices yet.
                </div>
              )}
              {dayGroups.map((g) => (
                <button
                  key={g.date}
                  onClick={() => setDay(g.date)}
                  className="w-full flex justify-between items-center py-3 border-b border-line last:border-0 text-left hover:bg-paper"
                >
                  <div>
                    <div className="font-medium text-sm">{longDate(g.date)}</div>
                    <div className="text-xs text-slate">
                      {g.count} invoice{g.count === 1 ? '' : 's'}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="tabular font-medium text-sm">{money(g.total)}</span>
                    <span className="text-slate">→</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {/* Off-screen render target used to build each invoice's PDF for the ZIP */}
      {zipInvoice && (
        <div className="fixed -left-[9999px] top-0" ref={zipRef}>
          <Receipt
            invoiceNumber={zipInvoice.invoice_number}
            createdAt={zipInvoice.created_at}
            items={zipInvoice.items}
            subtotal={zipInvoice.subtotal}
            shipping={zipInvoice.shipping}
            total={zipInvoice.total}
            paymentMethod={zipInvoice.payment_method}
            customerName={zipInvoice.customer_name}
            customerContact={zipInvoice.customer_contact}
            paid={!!zipInvoice.paid_at}
          />
        </div>
      )}
    </div>
  );
}

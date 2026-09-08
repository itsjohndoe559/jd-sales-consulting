import Link from 'next/link';
import { getInvoices } from '@/lib/data';
import { money, dateTime } from '@/lib/format';
import CreateInvoice from '@/components/CreateInvoice';

export const dynamic = 'force-dynamic';

export default async function InvoicesPage() {
  const invoices = await getInvoices();

  return (
    <div>
      <div className="flex justify-between items-start mb-4">
        <div>
          <h1 className="text-2xl font-bold">Invoices</h1>
          <p className="text-sm text-slate">
            Create, send, and track invoices for buyers and consignors
          </p>
        </div>
        <CreateInvoice />
      </div>

      <div className="card p-4">
        <div className="grid grid-cols-12 text-[11px] text-slate uppercase pb-2 border-b border-line">
          <div className="col-span-2">Invoice</div>
          <div className="col-span-3">Customer</div>
          <div className="col-span-3">Date</div>
          <div className="col-span-2 text-right">Total</div>
          <div className="col-span-2 text-right">Status</div>
        </div>
        {invoices.length === 0 && (
          <div className="text-sm text-slate italic py-6 text-center">
            No invoices yet.
          </div>
        )}
        {invoices.map((inv) => (
          <Link
            key={inv.id}
            href={`/invoices/${inv.id}`}
            className="grid grid-cols-12 items-center text-sm py-3 border-b border-line last:border-0 hover:bg-paper"
          >
            <div className="col-span-2 font-medium">
              #{inv.invoice_number}
            </div>
            <div className="col-span-3 text-slate">
              {inv.customer_name ?? '—'}
            </div>
            <div className="col-span-3 text-xs text-slate">
              {dateTime(inv.created_at)}
            </div>
            <div className="col-span-2 text-right tabular font-medium">
              {money(inv.total)}
            </div>
            <div className="col-span-2 text-right">
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  inv.paid_at
                    ? 'bg-jdgreen/10 text-jdgreen'
                    : 'bg-jdred/10 text-jdred'
                }`}
              >
                {inv.paid_at ? 'Paid' : 'Unpaid'}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

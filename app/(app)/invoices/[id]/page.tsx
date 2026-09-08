import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getInvoiceById } from '@/lib/data';
import InvoiceDetail from '@/components/InvoiceDetail';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export default async function InvoicePage({
  params,
}: {
  params: { id: string };
}) {
  const invoice = await getInvoiceById(params.id);
  if (!invoice) notFound();

  return (
    <div>
      <Link href="/invoices" className="text-sm text-slate mb-4 inline-block">
        ← All invoices
      </Link>
      <h1 className="text-2xl font-bold mb-6">Invoice #{invoice.invoice_number}</h1>
      <InvoiceDetail invoice={invoice} />
    </div>
  );
}

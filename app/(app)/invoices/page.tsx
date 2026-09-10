import { getInvoices } from '@/lib/data';
import InvoicesClient from '@/components/InvoicesClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export default async function InvoicesPage() {
  const invoices = await getInvoices();
  return <InvoicesClient invoices={invoices} />;
}

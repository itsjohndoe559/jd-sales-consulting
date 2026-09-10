import { getTransactions } from '@/lib/data';
import TransactionsClient from '@/components/TransactionsClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export default async function TransactionsPage() {
  const transactions = await getTransactions();
  return <TransactionsClient transactions={transactions} />;
}

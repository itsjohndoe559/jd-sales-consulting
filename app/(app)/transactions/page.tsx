import Link from 'next/link';
import { getTransactions } from '@/lib/data';
import { channelFor } from '@/lib/format';
import TransactionRow from '@/components/TransactionRow';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

const FILTERS = ['All', 'Cash', 'Digital', 'This Week'] as const;

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: { filter?: string };
}) {
  const filter = (searchParams.filter ?? 'All') as (typeof FILTERS)[number];
  const all = await getTransactions();

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const filtered = all.filter((t) => {
    if (filter === 'Cash') return channelFor(t.payment_method) === 'Cash';
    if (filter === 'Digital') return channelFor(t.payment_method) === 'Digital';
    if (filter === 'This Week') return new Date(t.created_at) >= weekAgo;
    return true;
  });

  const totalUnits = filtered.reduce(
    (s, t) => s + t.items.reduce((s2, i) => s2 + i.qty, 0),
    0
  );
  const totalAmount = filtered.reduce((s, t) => s + t.total, 0);

  return (
    <div>
      <div className="flex justify-between items-start mb-4">
        <div>
          <h1 className="text-2xl font-bold">Transaction Log</h1>
          <p className="text-sm text-slate">Every logged sale</p>
        </div>
        <div className="text-xs bg-line/50 px-3 py-1.5 rounded-full">
          {totalUnits} units · ${totalAmount.toFixed(0)}
        </div>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {FILTERS.map((f) => (
          <Link
            key={f}
            href={`/transactions?filter=${encodeURIComponent(f)}`}
            className={`px-3 py-1.5 rounded-full text-sm ${
              filter === f
                ? 'bg-ink text-white'
                : 'bg-line/50 text-ink hover:bg-line'
            }`}
          >
            {f} {f === 'All' ? `(${all.length})` : ''}
          </Link>
        ))}
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
            No transactions here yet.
          </div>
        )}
        {filtered.map((t) => (
          <TransactionRow key={t.id} t={t} />
        ))}
      </div>
    </div>
  );
}

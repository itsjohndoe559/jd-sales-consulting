import { getProducts, getOnHand } from '@/lib/data';
import InventoryTable from '@/components/InventoryTable';

export const dynamic = 'force-dynamic';

export default async function InventoryPage() {
  const [products, onHand] = await Promise.all([getProducts(), getOnHand()]);
  const rows = products.map((p) => ({ ...p, onHand: onHand[p.sku] ?? 0 }));
  const missingCost = rows.filter((r) => r.cost === null).length;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Inventory</h1>
      <p className="text-sm text-slate mb-4">
        {rows.length} SKUs
        {missingCost > 0 && (
          <span className="text-jdred">
            {' '}
            · {missingCost} missing cost — fill these in so Profit/COGS can
            compute
          </span>
        )}
      </p>
      <InventoryTable rows={rows} />
    </div>
  );
}

import { getProducts, getOnHand } from '@/lib/data';
import InventoryTable from '@/components/InventoryTable';
import AddSkuForm from '@/components/AddSkuForm';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export default async function InventoryPage() {
  const [products, onHand] = await Promise.all([getProducts(), getOnHand()]);
  const rows = products.map((p) => ({ ...p, onHand: onHand[p.sku] ?? 0 }));

  return (
    <div>
      <div className="flex justify-between items-start mb-4 gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold mb-1">Inventory</h1>
          <p className="text-sm text-slate">{rows.length} SKUs</p>
        </div>
        <AddSkuForm />
      </div>
      <InventoryTable rows={rows} />
    </div>
  );
}

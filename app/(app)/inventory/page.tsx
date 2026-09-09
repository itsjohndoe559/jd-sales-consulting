import { getProducts, getOnHand } from '@/lib/data';
import InventoryTable from '@/components/InventoryTable';
import AddSkuForm from '@/components/AddSkuForm';
import KpiTile from '@/components/KpiTile';
import { money } from '@/lib/format';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export default async function InventoryPage() {
  const [products, onHand] = await Promise.all([getProducts(), getOnHand()]);
  const rows = products.map((p) => ({ ...p, onHand: onHand[p.sku] ?? 0 }));

  const totalUnits = rows.reduce((s, r) => s + r.onHand, 0);
  const missingCostInStock = rows.filter(
    (r) => r.onHand > 0 && r.cost === null
  );
  const inventoryValue =
    missingCostInStock.length > 0
      ? null
      : rows.reduce((s, r) => s + r.onHand * (r.cost ?? 0), 0);

  return (
    <div>
      <div className="flex justify-between items-start mb-4 gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold mb-1">Inventory</h1>
          <p className="text-sm text-slate">{rows.length} SKUs</p>
        </div>
        <AddSkuForm />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <KpiTile
          label="Units On Hand"
          value={`${totalUnits}`}
          sub="across all SKUs"
        />
        <KpiTile
          label="Inventory Value"
          value={
            inventoryValue === null
              ? `Incomplete — ${missingCostInStock.length} in-stock SKUs missing cost`
              : money(inventoryValue)
          }
          sub={inventoryValue !== null ? 'at cost' : undefined}
          accent="green"
        />
      </div>

      <InventoryTable rows={rows} />
    </div>
  );
}

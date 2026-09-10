'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import SearchBar from './SearchBar';
import FilterChips from './FilterChips';
import InventoryTable from './InventoryTable';
import type { Product } from '@/lib/types';

type Row = Product & { onHand: number };

const STOCK_STATUSES = ['In Stock', 'Low Stock'];

export default function InventorySearchFilter({ rows }: { rows: Row[] }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(() => searchParams.get('search') ?? '');
  const [stockStatuses, setStockStatuses] = useState<string[]>(() =>
    (searchParams.get('stock') ?? '').split(',').filter(Boolean)
  );
  const [minPrice, setMinPrice] = useState(() => searchParams.get('min') ?? '');
  const [maxPrice, setMaxPrice] = useState(() => searchParams.get('max') ?? '');

  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (stockStatuses.length) params.set('stock', stockStatuses.join(','));
    if (minPrice) params.set('min', minPrice);
    if (maxPrice) params.set('max', maxPrice);
    const qs = params.toString();
    window.history.replaceState(null, '', qs ? `${pathname}?${qs}` : pathname);
  }, [search, stockStatuses, minPrice, maxPrice, pathname]);

  function toggleStock(s: string) {
    setStockStatuses((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  }

  function clearAll() {
    setSearch('');
    setStockStatuses([]);
    setMinPrice('');
    setMaxPrice('');
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const min = minPrice ? Number(minPrice) : null;
    const max = maxPrice ? Number(maxPrice) : null;

    return rows.filter((r) => {
      if (q && !r.sku.toLowerCase().includes(q) && !r.name.toLowerCase().includes(q)) {
        return false;
      }
      if (stockStatuses.length > 0) {
        const isLow = r.onHand <= 10;
        if (stockStatuses.includes('Low Stock') && !stockStatuses.includes('In Stock') && !isLow) {
          return false;
        }
        if (stockStatuses.includes('In Stock') && !stockStatuses.includes('Low Stock') && isLow) {
          return false;
        }
      }
      if (min !== null && r.price < min) return false;
      if (max !== null && r.price > max) return false;
      return true;
    });
  }, [rows, search, stockStatuses, minPrice, maxPrice]);

  const activeFilterCount =
    (search ? 1 : 0) + stockStatuses.length + (minPrice ? 1 : 0) + (maxPrice ? 1 : 0);

  return (
    <div>
      <div className="card p-4 mb-4 flex flex-col gap-3">
        <div className="flex gap-2 flex-wrap">
          <SearchBar value={search} onChange={setSearch} placeholder="Search SKU or name..." />
          <input
            type="number"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            placeholder="Min $"
            className="w-24 border border-line rounded px-3 py-1.5 text-sm"
          />
          <input
            type="number"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            placeholder="Max $"
            className="w-24 border border-line rounded px-3 py-1.5 text-sm"
          />
        </div>
        <div className="flex justify-between items-center gap-3 flex-wrap">
          <FilterChips options={STOCK_STATUSES} selected={stockStatuses} onToggle={toggleStock} />
          {activeFilterCount > 0 && (
            <button onClick={clearAll} className="text-xs text-jdred underline shrink-0">
              Clear all ({activeFilterCount})
            </button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card p-6 text-sm text-slate italic text-center">
          No SKUs match these filters.
        </div>
      ) : (
        <InventoryTable rows={filtered} />
      )}
    </div>
  );
}

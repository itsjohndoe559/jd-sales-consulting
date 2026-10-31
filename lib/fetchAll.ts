// Supabase/PostgREST returns at most 1,000 rows per request. Any query that
// needs EVERY row (e.g. summing all inventory_adjustments into on-hand counts)
// must page through with .range(), or it silently drops everything past row
// 1,000. That bug froze the dashboard's units on hand on 10/25/26 once the
// adjustments table passed 1,000 rows.
//
// Usage: always give the query a stable .order() (include 'id') so pages
// don't overlap or skip rows.
//   const rows = await fetchAll((from, to) =>
//     sb.from('inventory_adjustments').select('sku, change').order('id').range(from, to)
//   );

const PAGE_SIZE = 1000;

type PageResult<T> = { data: T[] | null; error: { message: string } | null };

export async function fetchAll<T>(
  page: (from: number, to: number) => PromiseLike<PageResult<T>>
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await page(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) return rows;
  }
}

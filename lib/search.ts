// Shared search/ranking helpers so every "search by SKU or name" box in the
// app behaves the same way: SKU matches always rank ahead of name matches,
// but searching by name still works everywhere it used to.
//
// Lower score = better match. `null` = no match at all.
export function matchScore(query: string, sku: string, name: string): number | null {
  const q = query.trim().toLowerCase();
  if (!q) return 0;

  const s = sku.toLowerCase();
  const n = name.toLowerCase();

  if (s === q) return 0; // exact SKU match
  if (s.startsWith(q)) return 1; // SKU starts with query
  if (s.includes(q)) return 2; // SKU contains query
  if (n.startsWith(q)) return 3; // name starts with query
  if (n.includes(q)) return 4; // name contains query

  return null; // no match on either field
}

/**
 * Filters + ranks a list of SKU/name-bearing items against a query, SKU
 * matches first. Pass `limit` for autocomplete-style suggestion lists
 * (Add Sale, Create Invoice); omit it for full result lists (Inventory).
 */
export function rankBySkuThenName<T>(
  items: T[],
  query: string,
  getSku: (item: T) => string,
  getName: (item: T) => string,
  limit?: number
): T[] {
  const q = query.trim();
  if (!q) return limit ? [] : items;

  const scored = items
    .map((item) => ({ item, score: matchScore(q, getSku(item), getName(item)) }))
    .filter((x): x is { item: T; score: number } => x.score !== null)
    .sort((a, b) => a.score - b.score);

  const ranked = scored.map((x) => x.item);
  return typeof limit === 'number' ? ranked.slice(0, limit) : ranked;
}

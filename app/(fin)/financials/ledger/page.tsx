import { getLedger } from '@/lib/financialsData';
import LedgerClient from '@/components/financials/LedgerClient';
import type { LedgerEntry } from '@/lib/financials';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export default async function LedgerPage() {
  let entries: LedgerEntry[] = [];
  let error = '';
  try {
    entries = await getLedger();
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }
  return <LedgerClient entries={entries} loadError={error} />;
}

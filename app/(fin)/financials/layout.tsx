import FinancialsShell from '@/components/financials/FinancialsShell';
import { allWeeks } from '@/lib/financials';
import { todayInBusinessTz } from '@/lib/format';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Separate layout from the main app: no Add Sale button, its own short menu.
export default function FinancialsLayout({ children }: { children: React.ReactNode }) {
  return <FinancialsShell weeks={allWeeks(todayInBusinessTz())}>{children}</FinancialsShell>;
}

import DeductionsTracker from '@/components/DeductionsTracker';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// Same Deductions tracker as the main site (same data), shown inside Financials.
export default function FinancialsDeductionsPage() {
  return <DeductionsTracker />;
}

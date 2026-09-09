import ReportGenerator from '@/components/ReportGenerator';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export default function ReportsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Reports</h1>
      <p className="text-sm text-slate mb-4">
        Generate and download a daily snapshot report
      </p>
      <ReportGenerator />
    </div>
  );
}

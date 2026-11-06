import { notFound } from 'next/navigation';
import { getWeekSummaries } from '@/lib/financialsData';
import WeekTable from '@/components/financials/WeekTable';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export default async function WeekPage({ params }: { params: { start: string } }) {
  const weeks = await getWeekSummaries();
  const summary = weeks.find((w) => w.week.start === params.start);
  if (!summary) notFound();
  return <WeekTable summary={summary} />;
}

import { NextRequest, NextResponse } from 'next/server';
import { generateAndStoreReport, ReportError } from '@/lib/reportMetrics';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { reportDate } = body as { reportDate?: string };

  try {
    const report = await generateAndStoreReport(reportDate as string);
    return NextResponse.json({ success: true, report, metrics: report.json_data });
  } catch (err) {
    const status = err instanceof ReportError ? err.status : 500;
    const message = err instanceof Error ? err.message : 'Could not generate report.';
    return NextResponse.json({ error: message }, { status });
  }
}

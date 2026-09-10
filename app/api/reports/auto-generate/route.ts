import { NextRequest, NextResponse } from 'next/server';
import { generateAndStoreReport, ReportError, EARLIEST_REPORT_DATE } from '@/lib/reportMetrics';
import { buildDailyReportEmail, sendEmail, reportEmailRecipients } from '@/lib/emailService';
import { longDate, todayInBusinessTz, addDaysToDateStr } from '@/lib/format';
import { supabaseServer } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// This endpoint is deliberately exempted from the session-cookie middleware
// (see middleware.ts) so an external cron service can call it - protected
// instead by this shared secret, checked as a query param or Bearer header.
function isAuthorized(req: NextRequest) {
  const secret = process.env.REPORTS_CRON_SECRET;
  if (!secret) return false; // fail closed if it's not configured
  const fromQuery = req.nextUrl.searchParams.get('secret');
  const fromHeader = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  return fromQuery === secret || fromHeader === secret;
}

async function handle(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const dateParam = req.nextUrl.searchParams.get('date');
  const reportDate = dateParam || addDaysToDateStr(todayInBusinessTz(), -1);

  if (reportDate < EARLIEST_REPORT_DATE) {
    return NextResponse.json(
      { success: false, error: `Report date must be on or after ${EARLIEST_REPORT_DATE}.` },
      { status: 400 }
    );
  }

  let report;
  try {
    report = await generateAndStoreReport(reportDate);
  } catch (err) {
    const status = err instanceof ReportError ? err.status : 500;
    const message = err instanceof Error ? err.message : 'Could not generate report.';
    return NextResponse.json({ success: false, error: message }, { status });
  }

  // Email failures shouldn't fail the whole request - the report is
  // generated and saved either way. The error is still returned in the
  // response (not just logged) so this is debuggable from the cron
  // dashboard's response body alone, without needing Vercel's logs.
  let emailsSent = false;
  let recipientCount = 0;
  let emailError: string | null = null;
  try {
    const recipients = reportEmailRecipients();
    const html = buildDailyReportEmail(report.json_data);
    const subject = `JD Sales Daily Report - ${longDate(reportDate)}`;
    const result = await sendEmail(recipients, subject, html);
    recipientCount = result.emailsSent;
    emailsSent = true;

    const sb = supabaseServer();
    await sb
      .from('daily_reports')
      .update({ sent_at: new Date().toISOString(), recipients })
      .eq('id', report.id);
  } catch (err) {
    emailError = err instanceof Error ? err.message : 'Unknown email error.';
    console.error('auto-generate: email send failed', err);
  }

  return NextResponse.json({
    success: true,
    reportId: report.id,
    reportDate,
    emailsSent,
    recipientCount,
    emailError,
  });
}

// Most free cron services (cron-job.org included) fire a plain GET by
// default - accept both so the job works regardless of which method the
// cron dashboard ends up configured with.
export async function GET(req: NextRequest) {
  return handle(req);
}

export async function POST(req: NextRequest) {
  return handle(req);
}

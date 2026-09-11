import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { buildDailyReportEmail, buildDailyReportEmailText, sendEmail, reportEmailRecipients } from '@/lib/emailService';
import { longDate } from '@/lib/format';
import type { DailyReport } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { reportId, reportDate } = body as { reportId?: string; reportDate?: string };

  if (!reportId && !reportDate) {
    return NextResponse.json(
      { success: false, error: 'reportId or reportDate is required' },
      { status: 400 }
    );
  }

  const sb = supabaseServer();
  const query = sb.from('daily_reports').select('*');
  const { data: report, error } = reportId
    ? await query.eq('id', reportId).single()
    : await query.eq('report_date', reportDate as string).single();

  if (error || !report) {
    return NextResponse.json(
      { success: false, error: 'Report not found.' },
      { status: 404 }
    );
  }

  const recipients = reportEmailRecipients();
  const html = buildDailyReportEmail((report as DailyReport).json_data);
  const subject = `JD Sales Daily Report - ${longDate((report as DailyReport).report_date)}`;

  try {
    const { emailsSent } = await sendEmail(
      recipients,
      subject,
      html,
      buildDailyReportEmailText((report as DailyReport).json_data)
    );

    await sb
      .from('daily_reports')
      .update({ sent_at: new Date().toISOString(), recipients })
      .eq('id', (report as DailyReport).id);

    return NextResponse.json({ success: true, emailsSent });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not send email.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

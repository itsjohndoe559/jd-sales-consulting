import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const sb = supabaseServer();
  const { data, error } = await sb
    .from('daily_reports')
    .select('*')
    .order('report_date', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true, reports: data });
}

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/** PUT { day: 'YYYY-MM-DD', voided_count: number } - the hand-entered Voided count. */
export async function PUT(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const day = body?.day;
  const count = Number(body?.voided_count);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(day ?? '')))
    return NextResponse.json({ error: 'day must be YYYY-MM-DD' }, { status: 400 });
  if (!Number.isInteger(count) || count < 0)
    return NextResponse.json({ error: 'voided_count must be a whole number, 0 or more' }, { status: 400 });

  const sb = supabaseServer();
  const { error } = await sb
    .from('financial_day_manual')
    .upsert({ day, voided_count: count, updated_at: new Date().toISOString() });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

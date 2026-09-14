import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const sb = supabaseServer();
  const { error } = await sb.from('deductions').delete().eq('id', params.id);

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true, deleted: true });
}

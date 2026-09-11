import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { FILES_BUCKET, getSignedFileUrl } from '@/lib/storage';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const sb = supabaseServer();
  const { data: file, error } = await sb
    .from('files')
    .select('storage_path')
    .eq('id', params.id)
    .single();

  if (error || !file) {
    return NextResponse.json({ error: 'File not found.' }, { status: 404 });
  }

  try {
    const url = await getSignedFileUrl(file.storage_path);
    return NextResponse.json({ url });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not create signed URL.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const sb = supabaseServer();
  const { data: file, error: fetchError } = await sb
    .from('files')
    .select('storage_path')
    .eq('id', params.id)
    .single();

  if (fetchError || !file) {
    return NextResponse.json({ error: 'File not found.' }, { status: 404 });
  }

  const { error: removeError } = await sb.storage
    .from(FILES_BUCKET)
    .remove([file.storage_path]);
  if (removeError) {
    return NextResponse.json({ error: removeError.message }, { status: 500 });
  }

  const { error: deleteError } = await sb.from('files').delete().eq('id', params.id);
  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

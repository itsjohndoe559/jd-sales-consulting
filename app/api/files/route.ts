import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { FILES_BUCKET } from '@/lib/storage';
import type { FileCategory } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const ALLOWED_CATEGORIES: FileCategory[] = [
  'Paperwork',
  'Invoice',
  'Receipt',
  'Bank Info',
  'Other',
];

// Vercel serverless functions cap request bodies around 4.5MB - a scanned
// PDF or a high-res phone photo can exceed that. Enforce a slightly lower
// limit ourselves so the failure is a clear message instead of a generic
// platform error if someone tries to upload something too big.
const MAX_BYTES = 4 * 1024 * 1024;

export async function POST(req: NextRequest) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid upload.' }, { status: 400 });
  }

  const file = form.get('file');
  const name = (form.get('name') as string | null)?.trim();
  const category = form.get('category') as string | null;

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'A file is required.' }, { status: 400 });
  }
  if (!name) {
    return NextResponse.json({ error: 'A name is required.' }, { status: 400 });
  }
  if (!category || !ALLOWED_CATEGORIES.includes(category as FileCategory)) {
    return NextResponse.json({ error: 'A valid category is required.' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `File is too large (max ${(MAX_BYTES / 1024 / 1024).toFixed(1)}MB).` },
      { status: 400 }
    );
  }

  const sb = supabaseServer();
  const ext = file.name.split('.').pop() || 'bin';
  const storagePath = `${crypto.randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await sb.storage
    .from(FILES_BUCKET)
    .upload(storagePath, buffer, {
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: row, error: insertError } = await sb
    .from('files')
    .insert({
      name,
      category,
      storage_path: storagePath,
      mime_type: file.type || null,
      size_bytes: file.size,
    })
    .select()
    .single();

  if (insertError) {
    // Clean up the orphaned storage object if the metadata row failed.
    await sb.storage.from(FILES_BUCKET).remove([storagePath]);
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, file: row });
}

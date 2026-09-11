import { supabaseServer } from './supabase';

export const FILES_BUCKET = 'business-files';

/** Short-lived signed URL - files stay private, nothing is served publicly. */
export async function getSignedFileUrl(storagePath: string, expiresInSeconds = 120) {
  const sb = supabaseServer();
  const { data, error } = await sb.storage
    .from(FILES_BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds);
  if (error || !data) {
    throw new Error(error?.message ?? 'Could not create signed URL.');
  }
  return data.signedUrl;
}

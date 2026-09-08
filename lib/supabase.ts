import { createClient } from '@supabase/supabase-js';

// Server-only client. Uses the service role key, which bypasses RLS.
// This file must never be imported into a 'use client' component —
// it is only ever used from API routes / server components.
export function supabaseServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !key) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars.'
    );
  }

  // HTTP headers must be plain ASCII (Latin-1). A stray character from a
  // bad copy/paste (smart quotes, non-breaking spaces, autocorrect) breaks
  // every Supabase request with a cryptic "ByteString" crash. Catch it here
  // with a clear message instead.
  const asciiOnly = /^[\x00-\xFF]*$/;
  if (!asciiOnly.test(url) || !asciiOnly.test(key)) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY contains a ' +
        'non-standard character (likely from copy/paste autocorrect or a ' +
        'stray space). Re-copy both values directly from Supabase Project ' +
        'Settings → API into Vercel Environment Variables, then redeploy.'
    );
  }

  return createClient(url, key, {
    auth: { persistSession: false },
  });
}

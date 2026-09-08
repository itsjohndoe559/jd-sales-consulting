import { createClient } from '@supabase/supabase-js';

// Server-only client. Uses the service role key, which bypasses RLS.
// This file must never be imported into a 'use client' component —
// it is only ever used from API routes / server components.
export function supabaseServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars.'
    );
  }

  return createClient(url, key, {
    auth: { persistSession: false },
  });
}

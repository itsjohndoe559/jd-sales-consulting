# JD Sales and Consulting — Live Dashboard

Internal sales, inventory, and P&L tool for JD Sales and Consulting L.L.C.
Next.js + Supabase + Vercel. Single shared passcode, no per-user accounts.

## Stack

- Next.js 14 (App Router)
- Supabase (Postgres)
- Tailwind CSS
- Recharts (charts)
- html2canvas + jsPDF (client-side receipt/invoice PDFs)

## First-time setup

1. **Supabase**: create a project, then run `supabase/schema.sql` in the SQL
   Editor. This creates the four tables and seeds the 24-SKU catalog with
   `cost = null` for every item.
2. **Environment variables**: copy `.env.example` to `.env.local` and fill in:
   - `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` — from Supabase
     Project Settings → API
   - `SITE_PASSCODE` — the shared passcode gating the whole site
   - `SESSION_SECRET` — any random long string (used to sign the login cookie)
3. **Install & run locally**:
   ```
   npm install
   npm run dev
   ```
4. **Deploy**: import this repo into Vercel, set the same four env vars in
   Vercel's Project Settings → Environment Variables, deploy.

## Notes / assumptions made during the build

- Every product launches with `cost = null`. The Dashboard and P&L pages show
  "Incomplete — N SKUs missing cost" instead of a dollar profit figure until
  every SKU sold in that period has a cost — this is intentional per spec,
  not a bug. Fill costs in from the Inventory page (inline edit) or via the
  "+ Stock" action when a new purchase comes in.
- Editing a past transaction's items reverses the old inventory adjustment
  and applies the new one as separate audit-trail rows (nothing is
  overwritten), consistent with the "never hard-delete" rule in the spec.
- Voiding a transaction is a soft flag (`voided = true`), not a delete.
- Invoice numbers auto-increment from the last one in the table, starting at
  `JD-0100` if none exist yet.
- Low stock threshold defaults to 10 units on hand, matching the spec's
  suggested default (editable later, not exposed in the UI yet since
  Settings was explicitly out of scope for this build).
- No Settings page and no multi-user accounts, per spec — single shared
  passcode only.
- "Ask AI" chat (top-right bubble): summarizes all-time sales/inventory
  data server-side and sends that summary (not raw records) to Claude
  Haiku alongside the question. No chat history persistence - refreshing
  clears it, per spec. Requires `ANTHROPIC_API_KEY` in env vars; without
  it, the button still appears but answers with a clear configuration
  error instead of failing silently.
- Search/filter on Transactions, Invoices, Inventory: filters client-side
  against the already-fetched data (no refetch per keystroke) and persist
  in the URL via `history.replaceState`, so a bookmarked/reloaded filtered
  view is restored - without triggering a server re-render on every
  change the way updating the URL through Next's router would.
- Daily report emails: `/api/reports/auto-generate` is exempted from the
  login wall (see middleware.ts) since an external cron service has to
  reach it with no session - it authenticates instead via
  `REPORTS_CRON_SECRET`, passed as `?secret=...` or an `Authorization:
  Bearer` header. Fails closed (401) if that env var isn't set. Email
  failures never fail the report generation itself - the report still
  saves even if Resend is down or unconfigured.
- Margin Analysis (on the P&L page) uses its own date range rather than
  matching the chart above it exactly, per spec: Weekly = last 7 days,
  Monthly = the current calendar month, YTD = all-time.

## Support

Questions about this build go to Dominic McClelland (MOB Strategies), not
this repo — no MOB Strategies branding lives in the app itself, by design.

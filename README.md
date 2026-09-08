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

## Support

Questions about this build go to Dominic McClelland (MOB Strategies), not
this repo — no MOB Strategies branding lives in the app itself, by design.

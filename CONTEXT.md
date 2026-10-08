# JD Sales & Consulting — Dashboard Build Context

**Purpose of this file:** full handoff context for continuing work on the JD Sales and Consulting live dashboard, since the original build chat got too long. Read this before starting any new session/chat on "dashboard v2" or further changes to the existing site.

- **Live site:** https://jd-sales-consulting.vercel.app/
- **Repo:** `itsjohndoe559/jd-sales-consulting` (GitHub)
- **Stack:** Next.js 14 (App Router, TypeScript), Tailwind CSS, Recharts, Supabase (Postgres + Storage), deployed on Vercel, auto-deploys on push to `main`
- **Client:** Jonathan "Johnny" Diaz, JD Sales and Consulting L.L.C. (New Mexico, single-member LLC), cash-heavy streetwear/clothing resale business
- **Consultant:** Dominic McClelland, MOB Strategies L.L.C. — handles LLC formation, bookkeeping, and this dashboard build as part of the engagement

---

## 1. What exists today (feature list)

- **Password gate** — JWT session cookie (`lib/session.ts`), enforced by `middleware.ts`. One route (`/api/reports/auto-generate`) is exempted and instead authenticated via a shared secret (`REPORTS_CRON_SECRET`) for the daily cron job.
- **Dashboard** — KPI tiles, daily revenue chart, top products.
- **Transactions** — full sale log, search (SKU + name, SKU-priority as of the latest fix), payment-method filter chips, date range filter.
- **Inventory** — stock levels, inline cost/price editing, "+ Stock" adjustments, SKU/name renaming (with full historical-data relinking), search (SKU + name, SKU-priority).
- **P&L** — Weekly/Monthly/YTD toggle (all driven by the *same* underlying date range now), Margin Analysis (By Product / By Day of Week / By Sales Channel — 3-way Cash/Digital/Other).
- **Invoices** — manual invoice creation (Create Invoice modal, same SKU-priority search as Add Sale), day-folder grouping, ZIP export of a day's invoice PDFs.
- **Reports** — daily snapshot generator (KPI tiles, P&L table, inventory changes, low-stock alerts), PDF download, auto-emailed daily via an external cron job (cron-job.org) hitting `/api/reports/auto-generate`, emails sent via Resend from the verified domain `jdconsultingllc.org`.
- **Deductions tracker** — standalone page; recurring + one-time deductions, auto-pulled COGS from transactions, month nav. Deliberately isolated from P&L/Reports/Dashboard (per original spec — never comingle).
- **Files** — private document storage (Supabase Storage `business-files` bucket, signed URLs, 120s expiry), upload/view PDFs and images.
- **AI chat assistant** (`/chat` page) — Anthropic-backed, answers only sales/inventory/profit questions from an all-time data snapshot, declines everything else.
- **Add Sale** — header-level modal (via `AddSaleContext`), available from every page, logs a cash/digital/other sale and prints a receipt PDF.
- **Dark mode** — full visual reskin (Oct 2026), zero functional changes, `.doc-card` class deliberately kept light for printable docs (receipts, reports).
- **One-off deliverable (not part of the live site):** a real consultant-style sales analysis PDF for 9/8/26–9/25/26, built from actual exported Supabase CSVs (not simulated data) via a Python/pandas/weasyprint pipeline. Delivered once; user confirmed intent to eventually build this into the site as a permanent "Consultant Report" feature — **not yet started**.

---

## 2. Full change log (chronological, by feature/fix)

1. **Initial build** — turned mockups + `JD-Sales-Live-Site-Build-Instructions.md` into the live Next.js/Supabase/Vercel app: Dashboard, Transactions, Inventory, P&L, Invoices, Add Sale, password gate.
2. **ByteString crash fix** — a non-ASCII character (likely a copy/paste autocorrect artifact) in a Vercel env var crashed `fetch`. Added ASCII-only validation with a clear error in `lib/supabase.ts`.
3. **"No tables in Supabase" scare** — turned out to be a Table Editor UI/cache glitch, not a real problem.
4. **"Data never shows up" bug** — root cause: API routes/pages were missing `export const dynamic = 'force-dynamic'` / `revalidate = 0`, so Next.js statically cached empty responses forever. Fixed everywhere, plus a custom `cache: 'no-store'` fetch override in `lib/supabase.ts`.
5. **Mobile responsiveness pass** — hamburger menu replacing the sidebar on small screens.
6. **Inventory cleanup** — removed a "24 missing cost..." UI message; added the ability to add brand-new SKUs.
7. **PDF cropping fix (mobile)** — `lib/pdf.ts` was feeding raw canvas pixel dimensions into jsPDF assuming 96 DPI, which doesn't match PDF's native 72pt/inch. Added explicit px-to-pt conversion.
8. **Timezone display fix** — invoice/transaction timestamps were showing in UTC instead of Pacific. Added explicit `timeZone: 'America/Los_Angeles'` (constant `BUSINESS_TIMEZONE`) to all date formatters in `lib/format.ts`.
9. **Reports feature built** — daily snapshot + PDF, from `daily-report-instructions.md` / `daily-report-build-prompt.md` specs.
10. **AI chatbot feature built** — from `chatbot-instructions.md` spec. Originally a floating bubble; later moved to its own sidebar page (`/chat`) at the user's request ("remove the floating button its so ugly").
11. **Search/Filter + auto-emailed daily reports + Margin Analysis** — built together from `combined-features-instructions.md`. Multiple follow-up bugs:
    - cron-job.org test run returned 405 → auto-generate route only accepted POST, fixed to accept GET and POST too.
    - Resend emails not arriving → Resend sandbox-mode restriction (only sends to the account owner until a domain is verified) — explained, then fixed once `jdconsultingllc.org` verified on Resend.
    - Emails arriving blank-looking → Gmail was collapsing same-subject test emails into one thread; added a plain-text fallback body.
    - Cron timing mismatch — user wanted everything running in Pacific Time, not UTC; adjusted.
    - "Sent blank" turned out to be: there was no report generated yet for the cron to grab — not a bug.
12. **Dark mode reskin** — explicit instruction: "make zero changes to the site itself, how it runs or how it operates — push a dark mode update." Updated `globals.css` / `tailwind.config.js` tokens; fixed chart tooltips/legends that stayed white after the initial pass; kept `.doc-card` light for printable documents (receipts/reports) via scoped CSS overrides so those components needed no JSX changes.
13. **Add Sale button relocated** — moved from a floating button into the top-right of the header (via `AddSaleContext`), removed the old floating trigger.
14. **Full data-integrity audit** (triggered by "CA shows 0 sales but it clearly sold"):
    - Root cause: P&L's "Weekly" toggle used a *different* date range for the main chart than for Margin Analysis below it. Unified both to the same range.
    - Margin Analysis "By Product" was silently dropping SKUs with zero sales in the period instead of showing $0. Fixed by seeding from the full product list.
    - Margin Analysis "By Sales Channel" was only 2-way (Cash/Digital); added a canonical 3-way `channelFor3()` (Cash/Digital/Other) shared by Reports and Margin Analysis.
    - Pie chart colors were shifting based on array position instead of channel name when a channel had $0 revenue — fixed with a name-keyed `CHANNEL_COLORS` lookup.
    - The deepest bug: `businessDayRange()` (the core day-boundary primitive — converts a `YYYY-MM-DD` business date into UTC start/end instants) had a ~7-hour overshoot bug from an incomplete timezone-offset iteration. Verified numerically with standalone Node scripts before touching app code, then fixed with a proper 2-pass convergence loop. This was the root cause of the original "12:46am transaction shows on the wrong day" report.
15. **SKU/name editing** — added the ability to rename a SKU or item name from the Inventory page while keeping all historical sales/invoices linked. Required a real Postgres FK (`inventory_adjustments.sku → products.sku`) with `ON UPDATE CASCADE`, plus a manual JSONB rewrite (`relinkHistoricalItems()`) for `transactions.items` / `invoices.items` since those aren't live foreign keys.
    - Bug: renaming without also changing price/cost caused the PATCH route's trailing update call to run against an empty object, throwing "Cannot coerce the result to a single JSON object." Fixed by falling back to a plain `SELECT` when there's nothing to update.
16. **Files feature built** — document storage page, from a full spec message. Bug: "View" button did nothing on mobile — `window.open()` was called *after* an `await fetch()`, so mobile browsers no longer treated it as a user-gesture-initiated popup and silently blocked it. Fixed by opening a blank tab synchronously first, then filling it in once the signed URL resolves.
17. **Invoice day-folders + ZIP export, and Cash/Digital/Other boxes on daily reports** — built together from one combined request.
18. **One-off consultant PDF report** (9/8/26–9/25/26) — user asked for a "full scale consultant mode" report using *only the database, not the site*. Disclosed plainly that this sandbox has no live network path to Supabase; user ran 3 SQL exports and uploaded the CSVs (transactions, products, on_hand) instead. Built and visually QA'd a real 6-page PDF (letterhead, KPI tiles, status chips VERIFIED/ESTIMATE/UNCONFIRMED, honest "what this report could not determine" section) via Python/pandas/matplotlib/weasyprint (weasyprint chosen over headless Chrome because the sandbox's `apt` chromium resolved to a broken snap wrapper). User confirmed: "if it works we build into the site" — **this permanent in-site version has not been started yet.**
19. **Search prioritization fix (this session)** — reported bug: typing "PU" in the Add Sale modal didn't surface the actual SKU "PU" item ("Awful Lot of Cough Syrup Shirts") because unranked substring matches on item *names* (AMP, BBZ, GBP, MU) crowded it out of the top-4 suggestion slice. Fixed with a new shared helper `lib/search.ts`:
    - `matchScore(query, sku, name)` — ranks exact SKU match (0) > SKU starts-with (1) > SKU contains (2) > name starts-with (3) > name contains (4) > no match (`null`).
    - `rankBySkuThenName()` — filters + sorts + optionally truncates, used by Add Sale and Create Invoice's autocomplete.
    - Inventory and Transactions search results are sorted SKU-first when a query is active (list views, not truncated — just reordered).
    - Verified numerically: query "pu" now ranks SKU "PU" first; query "awful lot of" still finds it by name.

---

## 3. Current build status

- **Live and deployed.** Latest pushed commit: `26603c5` — "Prioritize SKU matches over name matches in all search/autocomplete" on `main`. Vercel auto-deploys on push, so this should be live within a few minutes of the push.
- `npm run build` passes clean with no type errors as of this commit.
- No open/unresolved bug reports as of this writing — the SKU-search issue was the last reported bug and it's fixed and pushed.
- **Not yet built:** the permanent in-site "Consultant Report" date-range generator (see item 18 above). This was explicitly deferred, not forgotten — pick it up only if the user asks to revisit it.

---

## 4. Mistakes made along the way (so v2 doesn't repeat them)

- **Missed `force-dynamic`/`revalidate=0` on new routes early on** — caused the "data never shows up" scare. Any new API route or page reading from Supabase needs this from day one, not bolted on after a bug report.
- **`businessDayRange()` had a real timezone-math bug** (overshoot from an incomplete DST/offset convergence loop) that silently miscategorized late-night transactions for *months* before being caught. Any new date-boundary logic should reuse the existing fixed primitive in `lib/format.ts` rather than reimplementing date math inline — every past timezone bug trace back to a one-off reimplementation instead of reusing this.
- **P&L's "Weekly" meant two different date ranges** depending on which part of the page you looked at (main chart vs. Margin Analysis) — introduced because the two were built in separate passes without cross-checking against each other. Any future page with multiple date-driven sections needs one shared range computation, not parallel ones.
- **Pie chart colors kept by array position, not by category name** — caused colors to shift when a category had $0 for a given period. Always key chart colors by name/id, never array index, when categories can appear/disappear across renders.
- **SKU rename PATCH route threw on partial updates** — calling `.update({}).single()` with an empty payload throws rather than being a no-op. Any "patch some-of-these-fields" endpoint needs an explicit guard for "nothing to update."
- **Mobile `window.open()` after an `await`** — breaks the user-gesture requirement and gets silently popup-blocked. Any "open in new tab" action triggered by a click must open the tab synchronously first, then fill it in.
- **Search/autocomplete filters were never ranked**, just filtered-then-sliced in whatever order the underlying query returned (alphabetical by SKU) — meant a true SKU match could be pushed past a suggestion-list cutoff by unrelated name substring matches. Fixed this session; any *new* search/autocomplete box added to the site should use `lib/search.ts`'s `matchScore`/`rankBySkuThenName` from the start rather than a raw `.includes()` filter.
- **Sandbox/session resets between conversation turns** repeatedly lost all local repo state, requiring a fresh clone and fresh PAT each time — not a code mistake, but ate a lot of turns. For v2, the Claude GitHub App should be installed on whichever GitHub account actually owns the repo (see next section) *before* starting, to avoid repeating this.
- **GitHub push access friction (this session)** — this sandbox's network proxy blocks git pushes to any repo not explicitly authorized for the session, and that authorization itself depends on the Claude GitHub App being installed on the *target* account/org (`itsjohndoe559`), not just connecting Dominic's own GitHub. This took several failed attempts (raw PAT in the remote URL, `add_repo` tool, reconnect links) before finding the actual fix: reconnecting via `https://claude.ai/customize/connectors?auth_start=github&auth_start_force=1` to re-link the installation, which the user did mid-session and which then let the push through cleanly. **For v2: confirm the Claude GitHub App is installed and linked to `itsjohndoe559`'s GitHub before starting work**, so this doesn't recur.

---

## 5. Architecture reference (for anyone picking this up fresh)

- **Business timezone:** everything is `America/Los_Angeles` (`BUSINESS_TIMEZONE` in `lib/format.ts`). The server runs in UTC; every "today"/day-boundary calculation MUST go through `businessDayRange(dateStr)`, `businessDateStr(iso)`, or `todayInBusinessTz()` — never raw `new Date(y, m, d)`.
- **Channel classification:** `channelFor3()` in `lib/format.ts` is the single canonical Cash/Digital/Other classifier, used identically by Reports and Margin Analysis. Don't reimplement this logic anywhere else.
- **Supabase access:** service-role key, server-side only (`lib/supabase.ts`), RLS enabled on every table with no public policies (service role bypasses RLS by design — this is intentional, not a gap).
- **PDF generation:** client-side, `lib/pdf.ts` (`html2canvas` + `jsPDF`), with the px→pt conversion fix baked in. Reused by receipts, reports, and ZIP-bundled invoices.
- **File storage:** Supabase Storage, private `business-files` bucket, always accessed via short-lived (120s) signed URLs from `lib/storage.ts` — never a public URL.
- **Historical data integrity on rename:** `inventory_adjustments.sku` has a real FK (`ON UPDATE CASCADE`) to `products.sku`. `transactions.items` / `invoices.items` are JSONB, not live FKs, so a SKU/name rename must also call `relinkHistoricalItems()` to rewrite those arrays.
- **Search:** `lib/search.ts` — `matchScore()` and `rankBySkuThenName()` are the shared SKU-first ranking helpers. Any new search/autocomplete UI should use these rather than a raw `.includes()` filter.
- **Cross-component state:** `components/AddSaleContext.tsx` is the pattern for sharing open/close state between the header button and a modal without prop drilling — reuse this pattern for similar cases rather than reinventing it.
- **Separation rule (business, not technical, but enforced in code structure):** JD Sales' numbers must never comingle with Dominic's other businesses (House Junkies, Ulloa Investment Group, Quick Cars, etc.), and MOB Strategies' billing *to* Johnny is tracked completely separately from JD Sales' own P&L. Deductions tracker is deliberately isolated from Dashboard/P&L/Reports for the same reason — don't "simplify" by merging these later.

---

## 6. What dashboard v2 needs to know before starting

- **Banking structure (JD Sales):** Bank of America "The Vault" (savings/holding, owner draws only), Tucoemas Credit Union "The Sweep" (operating account), Chase "The Digital Wallet" (Zelle/Cash App/PayPal/Apple Pay landing, sweeps to the Vault weekly).
- **Sales decode logic:** Johnny texts SKU codes + dollar totals. One code + one total → quantity = total ÷ unit price. Multiple codes on one line → one unit of each, verified by summing unit prices. SKU catalog lives in `productskus.md` (project doc).
- **Supplier flow:** Alibaba (sourcing), WhatsApp (communication/invoices), business PayPal connected to the Tucoemas Sweep account (payment).
- **Report start date:** September 8, 2026 is the earliest valid date across the system (reports, data) — this is a real business constraint (books started from scratch then), not an arbitrary cutoff. Keep it when building v2's date pickers/validators.
- **Pending/deferred work to ask the user about before starting, not assume:** the permanent in-site Consultant Report feature (date-range generator, built from real DB queries) — confirmed wanted, never built.
- **GitHub access:** repo is `itsjohndoe559/jd-sales-consulting`. Confirm the Claude GitHub App is installed/linked on that account before starting a new session's work, to skip the access friction documented above.
- **Document standards** (for any client-facing MOB Strategies documents, not the dashboard itself): MOB Strategies letterhead, navy/orange color scheme, memo block (To/Date/From/Re), KPI tiles, numbered sections, no em dashes anywhere (use a hyphen) — this is Dominic's standing preference across all his work, not specific to this project.
- **How Dominic likes to work:** direct, informal, skip preamble; give him concrete options to react to rather than open-ended questions; specific follow-ups over broad ones.

---

*Generated at the end of the original build-out conversation, covering everything from initial build through the SKU-search-priority fix (commit `26603c5`). Read this in full before making further changes to the live dashboard.*

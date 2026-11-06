-- FINANCIALS section (ledger + manual weekly counts).
-- Run once in the Supabase SQL Editor. Safe to re-run.
-- Only ADDS two new tables - nothing existing is touched.

-- Manual bank ledger. Works like the "Ledger" tab of the Google Sheet:
-- every row is typed in by hand, balances are calculated by the site.
create table if not exists ledger_entries (
  id uuid primary key default gen_random_uuid(),
  account text not null check (
    account in ('Tucoemas Checking', 'Tucoemas Savings', 'BoFA Checking', 'Chase Checking')
  ),
  reference text not null,
  amount numeric(12,2) not null,      -- positive = money in, negative = money out
  entry_date date not null,
  position bigint not null default 0, -- order of rows that share the same date
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_ledger_entries_order on ledger_entries(entry_date, position);

alter table ledger_entries enable row level security;

-- Manual per-day numbers on the week pages (the hand-entered "Voided" count).
create table if not exists financial_day_manual (
  day date primary key,
  voided_count integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table financial_day_manual enable row level security;

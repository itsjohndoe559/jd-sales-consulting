-- JD Sales and Consulting L.L.C. — Supabase schema
-- Run this whole file in the Supabase SQL Editor once, on a fresh project.

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  sku text unique not null,
  name text not null,
  price numeric(10,2) not null,
  cost numeric(10,2), -- nullable until real supplier invoice is entered
  created_at timestamptz not null default now()
);

create table if not exists inventory_adjustments (
  id uuid primary key default gen_random_uuid(),
  sku text not null references products(sku),
  change integer not null, -- positive = stock in, negative = stock out
  reason text not null,    -- 'purchase' | 'sale' | 'manual'
  note text,
  unit_cost numeric(10,2),
  created_at timestamptz not null default now()
);

create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  payment_method text not null, -- 'Cash' | 'Zelle' | 'Apple Pay' | 'Cash App' | 'Other'
  items jsonb not null,
  total numeric(10,2) not null,
  voided boolean not null default false
);

create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text unique not null,
  transaction_id uuid references transactions(id),
  customer_name text,
  customer_contact text,
  items jsonb not null,
  subtotal numeric(10,2) not null,
  shipping numeric(10,2) not null default 0,
  total numeric(10,2) not null,
  payment_method text,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

-- Daily Reports: one snapshot per calendar day (business-local), storing
-- the computed metrics as JSON so past reports re-download identically
-- even if later transactions/costs would change the live numbers.
create table if not exists daily_reports (
  id uuid primary key default gen_random_uuid(),
  report_date date not null,
  generated_at timestamptz not null default now(),
  json_data jsonb,
  sent_at timestamptz,
  recipients text[],
  created_at timestamptz not null default now(),
  unique(report_date)
);

create index if not exists idx_daily_reports_sent_at on daily_reports(sent_at);

alter table products enable row level security;
alter table inventory_adjustments enable row level security;
alter table transactions enable row level security;
alter table invoices enable row level security;
alter table daily_reports enable row level security;
-- No public policies: all reads/writes go through Next.js API routes using the
-- service_role key server-side only. The anon key (never used here) would have
-- zero access with RLS on and no policies defined.

-- Seed the 24-SKU catalog. Cost starts null everywhere — fill in from the
-- Inventory page once Johnny has real supplier invoices.
insert into products (sku, name, price) values
('DR',   'Hellstar Shirt', 30),
('FA',   'Vale Shirt', 30),
('DI',   'Burberry Shirt', 40),
('RG',   'Chrome Heart Shirt', 40),
('CA',   'Supreme Beanie', 25),
('BL',   'Louis Vuitton Belts', 30),
('LU',   'Spider Shirt', 30),
('FR',   'Bape Shirt', 25),
('TU',   'Asaali Shirts', 30),
('AC',   'Fear of God Shirts', 25),
('ACWC', 'Fear of God Shorts', 30),
('HI',   'Saint Vanity Shirts', 25),
('PU',   'Awful Lot of Cough Syrup Shirts', 25),
('CC',   'Godspeed Shirts', 25),
('BE',   'Amiri Shirt', 25),
('FO',   'Denim Tears Shirt', 30),
('FOBTC','Denim Tears Hoodie', 30),
('GB2',  'Amiri Hats', 25),
('GB50', 'Trapstar Shorts', 30),
('GBM',  'Awful Lot of Cough Syrup Shorts', 30),
('GBP',  'Purple Brand Shirts', 25),
('ED',   'Gucci Belts', 25),
('ST',   'Gallery Dept Shorts', 35),
('PH',   'Valley Dream Shirts', 25)
on conflict (sku) do nothing;

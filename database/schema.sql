-- =====================================================================
-- Abdullah Impex / M Riaz Trading — Inventory Management System
-- Database schema for Supabase (Postgres)
-- =====================================================================
-- HOW TO USE:
-- 1. Open your Supabase project -> SQL Editor -> New query.
-- 2. Paste this entire file and click "Run".
-- 3. It is safe to re-run (uses IF NOT EXISTS / ON CONFLICT where sensible).
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- COMPANIES  (the two business identities — selectable at invoice time)
-- ---------------------------------------------------------------------
create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  ntn text,
  strn text,
  address text,
  phone text,
  phone2 text,
  email text,
  logo_path text,              -- path inside the 'branding' storage bucket
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Only one company may be default at a time
create unique index if not exists one_default_company
  on companies (is_default)
  where is_default = true;

-- ---------------------------------------------------------------------
-- PROFILES  (admin users — mirrors auth.users, no extra roles for now)
-- ---------------------------------------------------------------------
create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- SUPPLIERS
-- ---------------------------------------------------------------------
create table if not exists suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_person text,
  phone text,
  email text,
  address text,
  ntn text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- CUSTOMERS
-- ---------------------------------------------------------------------
create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_person text,
  phone text,
  email text,
  address text,
  ntn text,
  strn text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- STOCK  (products / spinning machinery parts)
-- size = free-text dimension string, e.g. "25*26*88" or "12*55"
-- ---------------------------------------------------------------------
create table if not exists stock (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,                 -- unique item code, e.g. MR-0001
  name text not null,
  size text,                                  -- dimensions, 2 or 3 part
  unit text not null check (unit in ('ft','set','nos','mtr')),
  quantity numeric(14,2) not null default 0,
  purchase_rate numeric(14,2) not null default 0,
  sale_rate numeric(14,2),
  description text,
  low_stock_threshold numeric(14,2) default 5,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_stock_name on stock using gin (to_tsvector('english', name));
create index if not exists idx_stock_code on stock (code);

-- ---------------------------------------------------------------------
-- PURCHASES  (header + items) — purpose: bring stock IN
-- ---------------------------------------------------------------------
create table if not exists purchases (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid references suppliers (id) on delete set null,
  purchase_date date not null default current_date,
  supplier_invoice_ref text,
  notes text,
  total_amount numeric(14,2) not null default 0,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create table if not exists purchase_items (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references purchases (id) on delete cascade,
  stock_id uuid not null references stock (id),
  quantity numeric(14,2) not null,
  rate numeric(14,2) not null,
  amount numeric(14,2) not null
);

-- ---------------------------------------------------------------------
-- SALES  (header + items) — purpose: stock OUT to a customer
-- invoiced = whether this sale has already been pulled into an invoice
-- ---------------------------------------------------------------------
create table if not exists sales (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers (id) on delete set null,
  sale_date date not null default current_date,
  notes text,
  total_amount numeric(14,2) not null default 0,
  invoiced boolean not null default false,
  invoice_id uuid,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create table if not exists sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references sales (id) on delete cascade,
  stock_id uuid not null references stock (id),
  quantity numeric(14,2) not null,
  rate numeric(14,2) not null,
  amount numeric(14,2) not null
);

-- ---------------------------------------------------------------------
-- INVOICES  (header + items) — tenure/monthly billing documents
-- company_id: which of the two profiles this invoice was issued under
-- ---------------------------------------------------------------------
create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  serial_number int not null,
  company_id uuid not null references companies (id),
  customer_id uuid references customers (id) on delete set null,
  invoice_date date not null default current_date,
  period_start date,
  period_end date,
  subtotal numeric(14,2) not null default 0,
  tax_total numeric(14,2) not null default 0,
  grand_total numeric(14,2) not null default 0,
  status text not null default 'final' check (status in ('draft','final')),
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  unique (serial_number)
);

create table if not exists invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices (id) on delete cascade,
  stock_id uuid references stock (id),
  product_name text not null,
  size text,
  unit text,
  quantity numeric(14,2) not null,
  rate numeric(14,2) not null,
  tax_rate numeric(5,2) not null default 0,
  value_excl_tax numeric(14,2) not null,
  tax_amount numeric(14,2) not null default 0,
  value_incl_tax numeric(14,2) not null,
  sort_order int not null default 0
);

alter table sales
  add constraint sales_invoice_fk foreign key (invoice_id) references invoices (id) on delete set null;

-- Sequence backing invoice serial numbers (independent of row deletes)
create sequence if not exists invoice_serial_seq start 974;

-- =====================================================================
-- ROW LEVEL SECURITY — locked down by default.
-- The backend talks to Postgres using the Supabase SERVICE ROLE key,
-- which bypasses RLS entirely. That means: even if someone obtains the
-- public anon key, RLS below ensures they get ZERO direct table access.
-- All real reads/writes must go through the backend API.
-- =====================================================================
alter table companies        enable row level security;
alter table profiles         enable row level security;
alter table suppliers        enable row level security;
alter table customers        enable row level security;
alter table stock            enable row level security;
alter table purchases        enable row level security;
alter table purchase_items   enable row level security;
alter table sales            enable row level security;
alter table sale_items       enable row level security;
alter table invoices         enable row level security;
alter table invoice_items    enable row level security;

-- No policies are created on purpose => default-deny for anon & authenticated.
-- Only the service role (used exclusively by the backend) can read/write.

-- =====================================================================
-- ATOMIC OPERATIONS (run as Postgres functions so header + items + stock
-- updates either all succeed or all roll back together — no partial writes).
-- =====================================================================

-- ---------------------------------------------------------------------
-- create_purchase: inserts a purchase + its items, and increases stock
-- quantities accordingly. items = jsonb array of
--   { "stock_id": "...", "quantity": 10, "rate": 100 }
-- ---------------------------------------------------------------------
create or replace function create_purchase(
  p_supplier_id uuid,
  p_purchase_date date,
  p_supplier_invoice_ref text,
  p_notes text,
  p_created_by uuid,
  p_items jsonb
) returns uuid
language plpgsql
as $$
declare
  v_purchase_id uuid;
  v_total numeric(14,2) := 0;
  v_item jsonb;
begin
  if jsonb_array_length(p_items) = 0 then
    raise exception 'A purchase needs at least one item.';
  end if;

  select coalesce(sum((i->>'quantity')::numeric * (i->>'rate')::numeric), 0)
    into v_total
  from jsonb_array_elements(p_items) as i;

  insert into purchases (supplier_id, purchase_date, supplier_invoice_ref, notes, total_amount, created_by)
  values (p_supplier_id, p_purchase_date, p_supplier_invoice_ref, p_notes, v_total, p_created_by)
  returning id into v_purchase_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    insert into purchase_items (purchase_id, stock_id, quantity, rate, amount)
    values (
      v_purchase_id,
      (v_item->>'stock_id')::uuid,
      (v_item->>'quantity')::numeric,
      (v_item->>'rate')::numeric,
      (v_item->>'quantity')::numeric * (v_item->>'rate')::numeric
    );

    update stock
      set quantity = quantity + (v_item->>'quantity')::numeric,
          purchase_rate = (v_item->>'rate')::numeric,
          updated_at = now()
      where id = (v_item->>'stock_id')::uuid;
  end loop;

  return v_purchase_id;
end;
$$;

-- ---------------------------------------------------------------------
-- create_sale: inserts a sale + its items, and decreases stock quantities.
-- Raises an exception (rolling back everything) if any item would push
-- stock below zero.
-- ---------------------------------------------------------------------
create or replace function create_sale(
  p_customer_id uuid,
  p_sale_date date,
  p_notes text,
  p_created_by uuid,
  p_items jsonb
) returns uuid
language plpgsql
as $$
declare
  v_sale_id uuid;
  v_total numeric(14,2) := 0;
  v_item jsonb;
  v_available numeric(14,2);
  v_name text;
begin
  if jsonb_array_length(p_items) = 0 then
    raise exception 'A sale needs at least one item.';
  end if;

  select coalesce(sum((i->>'quantity')::numeric * (i->>'rate')::numeric), 0)
    into v_total
  from jsonb_array_elements(p_items) as i;

  insert into sales (customer_id, sale_date, notes, total_amount, created_by)
  values (p_customer_id, p_sale_date, p_notes, v_total, p_created_by)
  returning id into v_sale_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    select quantity, name into v_available, v_name from stock where id = (v_item->>'stock_id')::uuid;

    if v_available is null then
      raise exception 'Stock item not found.';
    end if;

    if v_available < (v_item->>'quantity')::numeric then
      raise exception 'Not enough stock for "%": only % available.', v_name, v_available;
    end if;

    insert into sale_items (sale_id, stock_id, quantity, rate, amount)
    values (
      v_sale_id,
      (v_item->>'stock_id')::uuid,
      (v_item->>'quantity')::numeric,
      (v_item->>'rate')::numeric,
      (v_item->>'quantity')::numeric * (v_item->>'rate')::numeric
    );

    update stock
      set quantity = quantity - (v_item->>'quantity')::numeric,
          updated_at = now()
      where id = (v_item->>'stock_id')::uuid;
  end loop;

  return v_sale_id;
end;
$$;

-- ---------------------------------------------------------------------
-- create_invoice: inserts an invoice + its line items, and (optionally)
-- marks a set of existing sales as "already invoiced" so they don't get
-- billed twice in a future tenure.
-- items = jsonb array of:
--   { "stock_id": "...", "product_name": "...", "size": "...", "unit": "...",
--     "quantity": 1, "rate": 100, "tax_rate": 18 }
-- ---------------------------------------------------------------------
create or replace function create_invoice(
  p_serial_number int,
  p_company_id uuid,
  p_customer_id uuid,
  p_invoice_date date,
  p_period_start date,
  p_period_end date,
  p_created_by uuid,
  p_items jsonb,
  p_sale_ids uuid[]
) returns uuid
language plpgsql
as $$
declare
  v_invoice_id uuid;
  v_subtotal numeric(14,2) := 0;
  v_tax_total numeric(14,2) := 0;
  v_item jsonb;
  v_excl numeric(14,2);
  v_tax numeric(14,2);
  v_sort int := 0;
begin
  if jsonb_array_length(p_items) = 0 then
    raise exception 'An invoice needs at least one item.';
  end if;

  insert into invoices (
    serial_number, company_id, customer_id, invoice_date,
    period_start, period_end, subtotal, tax_total, grand_total, created_by
  )
  values (p_serial_number, p_company_id, p_customer_id, p_invoice_date, p_period_start, p_period_end, 0, 0, 0, p_created_by)
  returning id into v_invoice_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_excl := (v_item->>'quantity')::numeric * (v_item->>'rate')::numeric;
    v_tax := round(v_excl * coalesce((v_item->>'tax_rate')::numeric, 0) / 100, 2);

    insert into invoice_items (
      invoice_id, stock_id, product_name, size, unit, quantity, rate,
      tax_rate, value_excl_tax, tax_amount, value_incl_tax, sort_order
    ) values (
      v_invoice_id,
      nullif(v_item->>'stock_id', '')::uuid,
      v_item->>'product_name',
      v_item->>'size',
      v_item->>'unit',
      (v_item->>'quantity')::numeric,
      (v_item->>'rate')::numeric,
      coalesce((v_item->>'tax_rate')::numeric, 0),
      v_excl,
      v_tax,
      v_excl + v_tax,
      v_sort
    );

    v_subtotal := v_subtotal + v_excl;
    v_tax_total := v_tax_total + v_tax;
    v_sort := v_sort + 1;
  end loop;

  update invoices
    set subtotal = v_subtotal, tax_total = v_tax_total, grand_total = v_subtotal + v_tax_total
    where id = v_invoice_id;

  if p_sale_ids is not null and array_length(p_sale_ids, 1) > 0 then
    update sales set invoiced = true, invoice_id = v_invoice_id where id = any(p_sale_ids);
  end if;

  return v_invoice_id;
end;
$$;

-- =====================================================================
-- SEED DATA — two company profiles.
-- M Riaz Trading = real details you provided (default for invoices).
-- Abdullah Impex = placeholder details — edit anytime from Settings.
-- =====================================================================
insert into companies (name, ntn, strn, address, phone, phone2, email, is_default)
select 'M Riaz Trading', '4196865-4', null,
       'Main Bazar, Nishatabad, Near Nishat Mills Ltd, Faisalabad.',
       '0300-9652564', '0314-9902564', 'm.riaztraders@yahoo.com', true
where not exists (select 1 from companies where name = 'M Riaz Trading');

insert into companies (name, ntn, strn, address, phone, phone2, email, is_default)
select 'Abdullah Impex', '0000000-0', '00-00-0000-000-00',
       'Suite 14, Trade Centre, Susan Road, Faisalabad. (placeholder — update in Settings)',
       '0300-0000000', null, 'info@abdullahimpex.example', false
where not exists (select 1 from companies where name = 'Abdullah Impex');

create extension if not exists "pgcrypto";

create table if not exists public.clinic_users (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  password_hash text not null,
  role text not null check (role in ('admin', 'staff')),
  created_at timestamptz not null default now()
);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text not null,
  email text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.staff (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null default 'Therapist',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.treatments (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  treatment text not null,
  variant text not null default 'Standard',
  duration integer not null default 30,
  price numeric(10, 2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  starts_at text not null,
  duration integer not null default 30,
  client_id uuid references public.clients(id) on delete set null,
  staff_id uuid references public.staff(id) on delete set null,
  treatment_id uuid references public.treatments(id) on delete set null,
  status text not null default 'scheduled' check (status in ('scheduled', 'completed', 'cancelled', 'no_show')),
  paid_status text not null default 'unpaid' check (paid_status in ('unpaid', 'deposit_paid', 'paid', 'refunded')),
  payment_method text not null default 'card' check (payment_method in ('cash', 'card', 'bank_transfer', 'voucher')),
  price numeric(10, 2) not null default 0,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.clinic_users enable row level security;
alter table public.clients enable row level security;
alter table public.staff enable row level security;
alter table public.treatments enable row level security;
alter table public.appointments enable row level security;

drop policy if exists "Shared clinic users access" on public.clinic_users;
drop policy if exists "Shared clients access" on public.clients;
drop policy if exists "Shared staff access" on public.staff;
drop policy if exists "Shared treatments access" on public.treatments;
drop policy if exists "Shared appointments access" on public.appointments;

create policy "Shared clinic users access" on public.clinic_users for all using (true) with check (true);
create policy "Shared clients access" on public.clients for all using (true) with check (true);
create policy "Shared staff access" on public.staff for all using (true) with check (true);
create policy "Shared treatments access" on public.treatments for all using (true) with check (true);
create policy "Shared appointments access" on public.appointments for all using (true) with check (true);

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'clinic_users') then
    alter publication supabase_realtime add table public.clinic_users;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'clients') then
    alter publication supabase_realtime add table public.clients;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'staff') then
    alter publication supabase_realtime add table public.staff;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'treatments') then
    alter publication supabase_realtime add table public.treatments;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'appointments') then
    alter publication supabase_realtime add table public.appointments;
  end if;
end $$;

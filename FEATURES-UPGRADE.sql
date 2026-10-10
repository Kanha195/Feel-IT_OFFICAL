-- Feel It feature tables (run in Supabase SQL editor)
create table if not exists public.blocked_dates (
  day date primary key,
  reason text,
  created_at timestamptz default now()
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid,
  email text,
  stars int check (stars between 1 and 5),
  comment text,
  tip_npr numeric default 0,
  photo_url text,
  approved boolean default false,
  created_at timestamptz default now()
);

create table if not exists public.vouchers (
  code text primary key,
  percent_off numeric check (percent_off > 0 and percent_off <= 100),
  active boolean default true,
  max_uses int default 100,
  used_count int default 0,
  expires_at date
);

create table if not exists public.ride_checklist (
  booking_id uuid primary key,
  pickup_done boolean default false,
  lunch_done boolean default false,
  return_done boolean default false,
  updated_at timestamptz default now()
);

alter table public.reviews enable row level security;
drop policy if exists reviews_public_read on public.reviews;
create policy reviews_public_read on public.reviews for select using (approved = true);
drop policy if exists reviews_anon_insert on public.reviews;
create policy reviews_anon_insert on public.reviews for insert with check (true);

alter table public.blocked_dates enable row level security;
drop policy if exists blocked_public_read on public.blocked_dates;
create policy blocked_public_read on public.blocked_dates for select using (true);

alter table public.vouchers enable row level security;
drop policy if exists vouchers_public_read on public.vouchers;
create policy vouchers_public_read on public.vouchers for select using (active = true);

-- SECURITY WARNING: The original "anon for all" policies let ANYONE
-- read/update/delete bookings. Run security-rls-harden.sql after this file.
-- Create a staff user: Supabase → Authentication → Users → Add user
-- (use the same email listed in STAFF_EMAILS in script.js).

-- ============================================================
-- Run this ONCE in Supabase → SQL Editor. Safe to re-run.
-- ============================================================

-- 1) New tables this update needs
create table if not exists messages (
  id bigint generated always as identity primary key,
  email text not null,
  name text,
  sender text not null check (sender in ('customer','admin')),
  body text not null,
  created_at timestamptz default now()
);

create table if not exists photos (
  id bigint generated always as identity primary key,
  image_url text not null,
  caption text,
  region text,
  created_at timestamptz default now()
);

create table if not exists popup_ad (
  id bigint primary key,
  image_url text,
  link_url text,
  enabled boolean default false,
  updated_at timestamptz default now()
);

-- 2) Turn on RLS everywhere (it may already be on for some of these)
alter table tours enable row level security;
alter table bookings enable row level security;
alter table guide_apps enable row level security;
alter table messages enable row level security;
alter table photos enable row level security;
alter table popup_ad enable row level security;

-- 3) Policies. This site's admin panel uses the public "anon" key for
-- everything (see the security note in script.js), so anon needs full
-- read/write access on every table for the app to work at all.
drop policy if exists "tours_all" on tours;
create policy "tours_all" on tours for all to anon using (true) with check (true);

drop policy if exists "bookings_all" on bookings;
create policy "bookings_all" on bookings for all to anon using (true) with check (true);

drop policy if exists "guide_apps_all" on guide_apps;
create policy "guide_apps_all" on guide_apps for all to anon using (true) with check (true);

drop policy if exists "messages_all" on messages;
create policy "messages_all" on messages for all to anon using (true) with check (true);

drop policy if exists "photos_all" on photos;
create policy "photos_all" on photos for all to anon using (true) with check (true);

drop policy if exists "popup_ad_all" on popup_ad;
create policy "popup_ad_all" on popup_ad for all to anon using (true) with check (true);

-- 4) Optional: site_settings for admin-tunable keys (weather_fx, hero_bg, etc.)
create table if not exists site_settings (
  key text primary key,
  value text,
  updated_at timestamptz default now()
);
alter table site_settings enable row level security;
drop policy if exists "site_settings_all" on site_settings;
create policy "site_settings_all" on site_settings for all to anon using (true) with check (true);

-- 5) Optional: hidden_gem flag on tours (safe if column already exists)
do $$ begin
  alter table tours add column if not exists hidden_gem boolean default false;
exception when others then null;
end $$;

-- 6) Optional: reviews table (if not already created)
create table if not exists reviews (
  id bigint generated always as identity primary key,
  tour_id text not null,
  email text,
  name text,
  rating int check (rating between 1 and 5),
  body text,
  created_at timestamptz default now()
);
alter table reviews enable row level security;
drop policy if exists "reviews_all" on reviews;
create policy "reviews_all" on reviews for all to anon using (true) with check (true);

-- Ride pack + post-ride fields on bookings
do $$ begin
  alter table bookings add column if not exists ride_details text;
  alter table bookings add column if not exists tip_npr numeric default 0;
  alter table bookings add column if not exists rated boolean default false;
exception when others then null;
end $$;

-- Allow status values beyond Pending/Confirmed (application-enforced text)
-- No enum change needed if status is already text.

-- Dual pricing + payment proof
do $$ begin
  alter table tours add column if not exists price_local numeric;
  alter table bookings add column if not exists payment_proof text;
  alter table bookings add column if not exists guest_type text default 'foreigner';
exception when others then null;
end $$;

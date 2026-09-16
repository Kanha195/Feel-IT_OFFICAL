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

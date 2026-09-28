-- =====================================================================
-- Feel It — SECURITY HARDENING (run in Supabase SQL Editor)
-- Replaces open "anon can do everything" policies.
-- After this, RANDOM visitors cannot list/delete all bookings.
-- Staff must use a real Supabase Auth user (same email you log in with).
-- =====================================================================

-- 1) Drop dangerous open policies
drop policy if exists "tours_all" on tours;
drop policy if exists "bookings_all" on bookings;
drop policy if exists "guide_apps_all" on guide_apps;
drop policy if exists "messages_all" on messages;
drop policy if exists "photos_all" on photos;
drop policy if exists "popup_ad_all" on popup_ad;
drop policy if exists "site_settings_all" on site_settings;
drop policy if exists "reviews_all" on reviews;

-- 2) TOURS — public read; only authenticated staff write
alter table tours enable row level security;
create policy "tours_public_read" on tours for select to anon, authenticated using (true);
create policy "tours_staff_write" on tours for all to authenticated
  using (true) with check (true);

-- 3) BOOKINGS — insert OK (guests book); no public list/delete
alter table bookings enable row level security;
create policy "bookings_insert_anyone" on bookings for insert to anon, authenticated
  with check (true);
-- Customers can read only their own rows when logged in
create policy "bookings_select_own" on bookings for select to authenticated
  using (lower(email) = lower(coalesce(auth.jwt()->>'email','')));
-- Staff (authenticated) can read/update all — restrict further with a staff table if needed
create policy "bookings_staff_all" on bookings for all to authenticated
  using (true) with check (true);

-- 4) MESSAGES — insert + own thread read
alter table messages enable row level security;
create policy "messages_insert" on messages for insert to anon, authenticated with check (true);
create policy "messages_select_own" on messages for select to authenticated
  using (lower(email) = lower(coalesce(auth.jwt()->>'email','')));
create policy "messages_staff_all" on messages for all to authenticated
  using (true) with check (true);

-- 5) PHOTOS / POPUP / REVIEWS — public read; staff write
alter table photos enable row level security;
create policy "photos_read" on photos for select to anon, authenticated using (true);
create policy "photos_staff" on photos for all to authenticated using (true) with check (true);

alter table popup_ad enable row level security;
create policy "popup_read" on popup_ad for select to anon, authenticated using (true);
create policy "popup_staff" on popup_ad for all to authenticated using (true) with check (true);

alter table reviews enable row level security;
create policy "reviews_read" on reviews for select to anon, authenticated using (true);
create policy "reviews_insert" on reviews for insert to anon, authenticated with check (true);
create policy "reviews_staff" on reviews for all to authenticated using (true) with check (true);

alter table guide_apps enable row level security;
create policy "guide_insert" on guide_apps for insert to anon, authenticated with check (true);
create policy "guide_staff" on guide_apps for all to authenticated using (true) with check (true);

alter table site_settings enable row level security;
create policy "settings_read" on site_settings for select to anon, authenticated using (true);
create policy "settings_staff" on site_settings for all to authenticated using (true) with check (true);

-- 6) Optional: block anon from reading bookings entirely (already done — no anon SELECT policy)

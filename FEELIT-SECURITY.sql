-- Feel It — run ONCE in Supabase → SQL Editor
-- Guests insert bookings only. Captains see one ride via locked function.
-- Staff must be authenticated to manage roster and bookings.

create table if not exists riders (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  email text,
  status text not null default 'pending',
  bike text,
  license_no text,
  regions text,
  experience text,
  notes text,
  created_at timestamptz default now()
);

alter table riders enable row level security;
alter table bookings enable row level security;
alter table guide_apps enable row level security;

drop policy if exists "bookings_live_read" on bookings;
drop policy if exists "riders_all" on riders;
drop policy if exists "riders_insert_app" on riders;
drop policy if exists "riders_staff" on riders;
drop policy if exists "riders_apply" on riders;
drop policy if exists "guide_insert" on guide_apps;
drop policy if exists "guide_apply" on guide_apps;
drop policy if exists "guide_staff" on guide_apps;
drop policy if exists "bookings_insert_anyone" on bookings;
drop policy if exists "bookings_staff_all" on bookings;

create policy "riders_apply" on riders
  for insert to anon, authenticated
  with check (status = 'pending');

create policy "riders_staff" on riders
  for all to authenticated
  using (true) with check (true);

create policy "guide_apply" on guide_apps
  for insert to anon, authenticated
  with check (true);

create policy "guide_staff" on guide_apps
  for all to authenticated
  using (true) with check (true);

create policy "bookings_insert_anyone" on bookings
  for insert to anon, authenticated
  with check (true);

create policy "bookings_staff_all" on bookings
  for all to authenticated
  using (true) with check (true);

create or replace function public.captain_board(p_ref text, p_phone text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  b bookings%rowtype;
  d1 text;
  d2 text;
begin
  if p_ref is null or length(p_ref) < 4 or p_phone is null then
    return null;
  end if;
  select * into b from bookings where ref = p_ref limit 1;
  if not found then return null; end if;
  d1 := right(regexp_replace(coalesce(b.guide_phone, ''), '\D', '', 'g'), 9);
  d2 := right(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), 9);
  if d1 = '' or d1 <> d2 then return null; end if;
  return jsonb_build_object(
    'id', b.id,
    'ref', b.ref,
    'tour_title', b.tour_title,
    'date', b.date,
    'name', b.name,
    'status', b.status,
    'guide', b.guide,
    'ride_details', b.ride_details
  );
end;
$$;

create or replace function public.captain_ping(p_ref text, p_phone text, p_lat double precision, p_lng double precision)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  b bookings%rowtype;
  d1 text;
  d2 text;
  pack jsonb;
begin
  select * into b from bookings where ref = p_ref limit 1;
  if not found then return false; end if;
  d1 := right(regexp_replace(coalesce(b.guide_phone, ''), '\D', '', 'g'), 9);
  d2 := right(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), 9);
  if d1 = '' or d1 <> d2 then return false; end if;
  if p_lat is null or p_lng is null or p_lat < -90 or p_lat > 90 or p_lng < -180 or p_lng > 180 then
    return false;
  end if;
  begin
    pack := coalesce(b.ride_details::jsonb, '{}'::jsonb);
  exception when others then
    pack := '{}'::jsonb;
  end;
  pack := pack || jsonb_build_object('live_lat', p_lat, 'live_lng', p_lng, 'gps_at', now());
  update bookings set ride_details = pack::text where id = b.id;
  return true;
end;
$$;

revoke all on function public.captain_board(text, text) from public;
revoke all on function public.captain_ping(text, text, double precision, double precision) from public;
grant execute on function public.captain_board(text, text) to anon, authenticated;
grant execute on function public.captain_ping(text, text, double precision, double precision) to anon, authenticated;

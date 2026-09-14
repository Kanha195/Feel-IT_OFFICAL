-- =========================================================================
-- FEEL IT NEPAL — SUPABASE SETUP
-- =========================================================================
-- Run this ENTIRE file once in your Supabase project's SQL Editor
-- (Dashboard → SQL Editor → New Query → paste all of this → Run).
--
-- This is very likely the actual reason things feel "messed up" right now:
-- if these tables don't exist yet, every booking, contact message, and
-- guide application silently fails to save (the site's error-handling
-- swallows the failure so it doesn't crash — but nothing was ever stored).
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. TOURS — the routes shown on the site and editable from the admin panel
-- -------------------------------------------------------------------------
-- NOTE: "desc" is a reserved SQL keyword (used in ORDER BY ... DESC), so it
-- must stay double-quoted everywhere it's used as a column name, exactly
-- as below. If you ever query this table by hand, remember to quote it too.
create table if not exists tours (
  id           text primary key,
  title        text not null,
  region       text not null,
  duration     text,
  price        numeric,              -- null/blank = "Coming Soon" (no price shown)
  guide        text,
  guide_phone  text,
  bio          text,
  "desc"       text,
  includes     text[],               -- e.g. '{"Off-road bike","Fuel","Local guide"}'
  lat          double precision,
  lng          double precision,
  image_url    text,
  coming_soon  boolean default false,
  created_at   timestamptz default now()
);

-- -------------------------------------------------------------------------
-- 2. BOOKINGS — one row per submitted booking
-- -------------------------------------------------------------------------
create table if not exists bookings (
  id             uuid primary key default gen_random_uuid(),
  ref            text,
  tour_id        text,
  tour_title     text,
  date           date,
  travelers      integer,
  total          numeric,
  name           text,
  email          text,
  phone          text,
  txn_ref        text,
  payment_method text,               -- 'bank' or 'esewa'
  status         text default 'Pending',  -- 'Pending' | 'Confirmed' | 'Cancelled'
  guide          text,
  guide_phone    text,
  created_at     timestamptz default now()
);

-- -------------------------------------------------------------------------
-- 3. CONTACTS — messages from the Contact form
-- -------------------------------------------------------------------------
create table if not exists contacts (
  id         uuid primary key default gen_random_uuid(),
  name       text,
  email      text,
  message    text,
  created_at timestamptz default now()
);

-- -------------------------------------------------------------------------
-- 4. GUIDE_APPS — applications from the "Apply as a guide" form
-- -------------------------------------------------------------------------
-- `years` is stored as text (not integer) on purpose: the form allows it
-- to be left blank, and an empty string would fail to insert into an
-- integer column.
create table if not exists guide_apps (
  id         uuid primary key default gen_random_uuid(),
  name       text,
  phone      text,
  city       text,
  years      text,
  message    text,
  created_at timestamptz default now()
);

-- =========================================================================
-- 5. SEED THE REAL TOUR DATA
-- =========================================================================
-- Without this step, the `tours` table above is empty, and the site quietly
-- falls back to showing in-memory demo data (see seedTours in script.js).
-- In that state, editing or deleting a tour from the admin panel LOOKS like
-- it works but doesn't actually change anything in the database — because
-- there's no real row to update or delete yet. Running this INSERT once
-- gives you real rows to manage from day one.
--
-- These are the same 8 routes currently in script.js. Edit prices/guides
-- here before running, or just run as-is and edit them later from the
-- admin panel (Manage Tours tab) — either works.
insert into tours (id, title, region, duration, price, guide, guide_phone, bio, "desc", includes, lat, lng, coming_soon)
values
  ('t1','Sarangkot Sunrise Ridge','Pokhara','Half day',4000,'Bikash Gurung','+977-9812345678',
   '11 years riding the Pokhara hills, fluent English.',
   'A dawn climb out of Pokhara to the Sarangkot ridgeline for a sunrise over the Annapurna range.',
   array['125cc bike','Helmet & jacket','Fuel','Local guide'], 28.2439, 83.9486, false),

  ('t2','Kathmandu Valley Rim Loop','Kathmandu','Full day',7000,'Sunita Tamang','+977-9823456789',
   'Grew up riding the valley rim roads, runs a small 4-bike outfit.',
   'A full loop around the ridges ringing Kathmandu, stopping at Nagarkot and tea houses.',
   array['150cc bike','Full gear set','Fuel & permits','Lunch stop'], 27.7172, 85.3240, false),

  ('t3','Upper Mustang Desert Crossing','Mustang','5 days',105000,'Tenzin Lama','+977-9834567890',
   'Born in Lo Manthang, led Mustang crossings for 9 seasons.',
   'High desert crossing past Chörtens and canyon roads to the walled city of Lo Manthang. Price reflects the 2026 restricted-area permit rate of $50/person/day.',
   array['Off-road bike','Restricted area permit (RAP)','ACAP & TIMS','Teahouse lodging','Fuel'], 28.7819, 83.7380, false),

  ('t4','Chitwan Jungle & Riverside Ride','Chitwan','2 days',14000,'Rajan Chaudhary','+977-9845678901',
   'Tharu guide from Sauraha, rides the park-edge trails daily.',
   'Warm lowland riding down to Chitwan, with a riverside camp and a walk along the national park buffer zone.',
   array['150cc bike','Full gear set','Fuel','Park entry fee','Local guide'], 27.5291, 84.3542, false),

  ('t5','Annapurna Circuit via Manang','Manang','6 days',58000,'Dawa Sherpa','+977-9856789012',
   'High-altitude specialist, has ridden the Manang loop for 6 seasons.',
   'Switchbacks and suspension bridges up to Manang, with teahouse stops and thinning air above 3,500m.',
   array['Off-road bike','ACAP & TIMS permits','Teahouse lodging','Fuel','Local guide'], 28.6667, 84.0167, false),

  ('t6','Rara Lake Far-West Expedition','Rara','6 days',72000,'Karan Bohara','+977-9867890123',
   'Grew up in Mugu district, knows every fuel stop between here and Rara.',
   'Nepal''s remotest lake, reached via long, sparsely-fuelled far-west roads — bring patience and extra jerry cans.',
   array['Off-road bike','Extra fuel carried','Rara National Park entry','Basic lodging','Local guide'], 29.5333, 82.0833, false),

  ('t7','Ilam Tea Garden Hills Ride','Ilam','2 days',12000,'Sarita Rai','+977-9878901234',
   'Eastern-hills native, rides the tea estate roads around Ilam.',
   'Gentle, green switchbacks through rolling tea estates in the far east — the calmest ride in the lineup.',
   array['150cc bike','Full gear set','Fuel','Tea garden visit','Local guide'], 26.9096, 87.9310, false),

  ('t8','Manaslu Circuit Off-Road Adventure','Manaslu','7 days',null,'','',
   '',
   'A restricted-area circuit around the eighth-highest mountain on earth — in the works, launching soon.',
   array['Off-road bike','Restricted area permit','Teahouse lodging','Fuel','Local guide'], 28.5561, 84.6339, true)
on conflict (id) do nothing;  -- safe to re-run this file; won't duplicate rows

-- =========================================================================
-- 6. ROW LEVEL SECURITY (RLS)
-- =========================================================================
-- Your Supabase anon key is public by design (it's sitting in script.js,
-- visible to anyone who views your site's source) — RLS is what stops that
-- key from being able to read/write more than it should. Without RLS
-- enabled, anyone with your anon key could read every customer's name,
-- email, phone and transaction reference directly via the Supabase REST
-- API, bypassing your site entirely.
--
-- This policy set: lets everyone browse tours, lets anyone submit a
-- booking/message/guide application (required — customers aren't logged
-- in when they book), lets a logged-in customer see only their OWN
-- bookings, and leaves admin write-access (confirming bookings, editing
-- tours) to the client-side admin password for now — the same limitation
-- already flagged in the SECURITY NOTE at the bottom of script.js. Tightening
-- that further means creating a real Supabase Auth admin user; happy to
-- wire that up when you're ready.

alter table tours enable row level security;
alter table bookings enable row level security;
alter table contacts enable row level security;
alter table guide_apps enable row level security;

drop policy if exists "Public read tours" on tours;
create policy "Public read tours" on tours for select using (true);

drop policy if exists "Anyone can create a booking" on bookings;
create policy "Anyone can create a booking" on bookings for insert with check (true);

drop policy if exists "Users can view own bookings" on bookings;
create policy "Users can view own bookings" on bookings for select using (auth.jwt() ->> 'email' = email);

drop policy if exists "Anyone can send a message" on contacts;
create policy "Anyone can send a message" on contacts for insert with check (true);

drop policy if exists "Anyone can apply as a guide" on guide_apps;
create policy "Anyone can apply as a guide" on guide_apps for insert with check (true);

-- That's it — run this whole file once, then refresh your live site.

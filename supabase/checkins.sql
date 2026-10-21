-- RevenueApp: office check-ins on Supabase (personal app, no sign-in).
-- Run once: Supabase Dashboard → SQL Editor → New query → paste this whole file → Run.
-- Safe to run again.
--
-- No accounts: the app reads and writes with the publishable key, so anyone who has the app link
-- can change these two tables. They only hold office check-in dates and the goal.

-- One row per day: 'done' = went to the office, 'plan' = intend to go.
create table if not exists public.checkins (
  day date primary key,
  status text not null check (status in ('done', 'plan')),
  updated_at timestamptz not null default now()
);

-- The goal (e.g. 36 days from 2026-10-01 to 2026-12-31): a single row, id = 1.
create table if not exists public.checkin_goals (
  id integer primary key default 1 check (id = 1),
  goal integer not null check (goal > 0),
  period_from date not null,
  period_to date not null check (period_to >= period_from),
  updated_at timestamptz not null default now()
);

alter table public.checkins enable row level security;
alter table public.checkin_goals enable row level security;

drop policy if exists "app: read checkins" on public.checkins;
drop policy if exists "app: write checkins" on public.checkins;
drop policy if exists "app: read goal" on public.checkin_goals;
drop policy if exists "app: write goal" on public.checkin_goals;

create policy "app: read checkins" on public.checkins for select to anon, authenticated using (true);
create policy "app: write checkins" on public.checkins for all to anon, authenticated using (true) with check (true);
create policy "app: read goal" on public.checkin_goals for select to anon, authenticated using (true);
create policy "app: write goal" on public.checkin_goals for all to anon, authenticated using (true) with check (true);

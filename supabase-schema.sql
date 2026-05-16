-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query)

create table if not exists daily_stats (
  id           uuid primary key default gen_random_uuid(),
  user_name    text not null,
  avatar       text not null default '🐱',
  date         date not null default current_date,
  na_count     int  not null default 0,
  vm_count     int  not null default 0,
  cb_count     int  not null default 0,
  conn_count   int  not null default 0,
  busy_count   int  not null default 0,
  meetings     int  not null default 0,
  updated_at   timestamptz not null default now(),
  unique (user_name, date)
);

-- If the table already exists, add the avatar column:
alter table daily_stats add column if not exists avatar text not null default '🐱';

-- Allow anyone with the anon key to read and write (no auth needed)
alter table daily_stats enable row level security;

create policy "public read"  on daily_stats for select using (true);
create policy "public write" on daily_stats for insert with check (true);
create policy "public update" on daily_stats for update using (true);

-- Enable real-time so the leaderboard updates live
alter publication supabase_realtime add table daily_stats;

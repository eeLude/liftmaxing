-- User goal (bulk / cut / maintain) for weekly body-weight rate tracking.
-- Run once in the Supabase SQL Editor on existing databases.

create table if not exists user_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade default auth.uid(),
  goal_type text check (goal_type in ('bulk', 'cut', 'maintain')),
  updated_at timestamptz not null default now()
);

alter table user_profiles enable row level security;

drop policy if exists "users_own_profiles" on user_profiles;

create policy "users_own_profiles" on user_profiles
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

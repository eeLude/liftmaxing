-- Run this ONCE in Supabase SQL Editor BEFORE seed-history.sql
-- Adds user_id columns + login-only RLS policies.
--
-- If you have existing workout/health rows, uncomment and set YOUR UUID below
-- (Supabase → Authentication → Users → copy UUID), run this script, then seed-history.sql.

-- alter table workout_sessions set ( ... )  -- see bottom for optional backfill

alter table workout_sessions
  add column if not exists is_seeded boolean not null default false;

alter table workout_sessions
  add column if not exists user_id uuid references auth.users (id) on delete cascade;

alter table health_logs
  add column if not exists user_id uuid references auth.users (id) on delete cascade;

-- Old schema had unique(date); new schema uses unique(user_id, date)
alter table health_logs drop constraint if exists health_logs_date_key;

drop index if exists health_logs_user_date_idx;
create unique index health_logs_user_date_idx on health_logs (user_id, date);

-- Drop open dev policies (old schema)
drop policy if exists "anon_all" on workout_splits;
drop policy if exists "anon_all" on movements;
drop policy if exists "anon_all" on split_exercises;
drop policy if exists "anon_all" on workout_sessions;
drop policy if exists "anon_all" on session_exercises;
drop policy if exists "anon_all" on workout_logs;
drop policy if exists "anon_all" on health_logs;
drop policy if exists "Allow anon read/write (dev only)" on health_logs;

-- Drop auth policies if re-running
drop policy if exists "auth_read_splits" on workout_splits;
drop policy if exists "auth_read_movements" on movements;
drop policy if exists "auth_insert_movements" on movements;
drop policy if exists "auth_read_split_exercises" on split_exercises;
drop policy if exists "users_own_sessions" on workout_sessions;
drop policy if exists "users_own_session_exercises" on session_exercises;
drop policy if exists "users_own_workout_logs" on workout_logs;
drop policy if exists "users_own_health_logs" on health_logs;
drop policy if exists "users_own_profiles" on user_profiles;
drop policy if exists "users_own_books" on books;
drop policy if exists "users_own_mood_logs" on mood_logs;
drop policy if exists "users_own_spotify_tokens" on spotify_tokens;

create policy "auth_read_splits" on workout_splits
  for select to authenticated using (true);

create policy "auth_read_movements" on movements
  for select to authenticated using (true);

create policy "auth_insert_movements" on movements
  for insert to authenticated with check (true);

create policy "auth_read_split_exercises" on split_exercises
  for select to authenticated using (true);

create policy "users_own_sessions" on workout_sessions
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users_own_session_exercises" on session_exercises
  for all to authenticated
  using (
    exists (
      select 1 from workout_sessions ws
      where ws.id = session_exercises.session_id
        and ws.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from workout_sessions ws
      where ws.id = session_exercises.session_id
        and ws.user_id = auth.uid()
    )
  );

create policy "users_own_workout_logs" on workout_logs
  for all to authenticated
  using (
    exists (
      select 1 from session_exercises se
      join workout_sessions ws on ws.id = se.session_id
      where se.id = workout_logs.session_exercise_id
        and ws.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from session_exercises se
      join workout_sessions ws on ws.id = se.session_id
      where se.id = workout_logs.session_exercise_id
        and ws.user_id = auth.uid()
    )
  );

create policy "users_own_health_logs" on health_logs
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users_own_profiles" on user_profiles
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users_own_books" on books
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users_own_mood_logs" on mood_logs
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users_own_spotify_tokens" on spotify_tokens
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Optional: attach old rows to your account, then enforce NOT NULL
-- update workout_sessions set user_id = 'YOUR-USER-UUID'::uuid where user_id is null;
-- update health_logs set user_id = 'YOUR-USER-UUID'::uuid where user_id is null;
-- alter table workout_sessions alter column user_id set not null;
-- alter table health_logs alter column user_id set not null;

-- Secure RLS for personal use (run AFTER reset.sql, AFTER creating your auth user)
-- Replaces open anon read/write with authenticated user-only access.

alter table workout_sessions
  add column if not exists user_id uuid references auth.users (id) on delete cascade;

alter table health_logs
  add column if not exists user_id uuid references auth.users (id) on delete cascade;

alter table health_logs drop constraint if exists health_logs_date_key;

create unique index if not exists health_logs_user_date_idx
  on health_logs (user_id, date);

-- Drop open dev policies
drop policy if exists "anon_all" on workout_splits;
drop policy if exists "anon_all" on movements;
drop policy if exists "anon_all" on split_exercises;
drop policy if exists "anon_all" on workout_sessions;
drop policy if exists "anon_all" on session_exercises;
drop policy if exists "anon_all" on workout_logs;
drop policy if exists "anon_all" on health_logs;

-- Catalog: authenticated read (no personal data)
create policy "auth_read_splits" on workout_splits
  for select to authenticated using (true);

create policy "auth_read_movements" on movements
  for select to authenticated using (true);

create policy "auth_insert_movements" on movements
  for insert to authenticated with check (true);

create policy "auth_read_split_exercises" on split_exercises
  for select to authenticated using (true);

-- User-owned workout data
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

-- Optional: assign existing rows to your account (replace YOUR_USER_UUID)
-- update workout_sessions set user_id = 'YOUR_USER_UUID' where user_id is null;
-- update health_logs set user_id = 'YOUR_USER_UUID' where user_id is null;
-- alter table workout_sessions alter column user_id set not null;
-- alter table health_logs alter column user_id set not null;

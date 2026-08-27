-- Daily mood log. Run once in the Supabase SQL Editor on existing databases.

create table if not exists mood_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  date date not null,
  score int not null check (score >= 1 and score <= 5),
  note text,
  created_at timestamptz not null default now(),
  unique (user_id, date)
);

create index if not exists mood_logs_user_date_idx on mood_logs (user_id, date desc);

alter table mood_logs enable row level security;

drop policy if exists "users_own_mood_logs" on mood_logs;

create policy "users_own_mood_logs" on mood_logs
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

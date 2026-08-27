-- Book reading log. Run once in the Supabase SQL Editor on existing databases.

create table if not exists books (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  title text not null,
  author text,
  status text not null check (status in ('reading', 'finished')),
  started_on date,
  finished_on date,
  page_count int check (page_count > 0),
  rating numeric(2, 1) check (rating >= 1 and rating <= 5),
  note text,
  created_at timestamptz not null default now()
);

create index if not exists books_user_status_idx on books (user_id, status);
create index if not exists books_user_finished_idx on books (user_id, finished_on desc);

alter table books enable row level security;

drop policy if exists "users_own_books" on books;

create policy "users_own_books" on books
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Spotify refresh token (one row per user). Run once in the Supabase SQL Editor.

create table if not exists spotify_tokens (
  user_id uuid primary key references auth.users (id) on delete cascade default auth.uid(),
  refresh_token text not null,
  updated_at timestamptz not null default now()
);

alter table spotify_tokens enable row level security;

drop policy if exists "users_own_spotify_tokens" on spotify_tokens;

create policy "users_own_spotify_tokens" on spotify_tokens
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

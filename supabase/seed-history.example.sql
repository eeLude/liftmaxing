-- Personal import template — copy to seed-history.sql (gitignored) and fill in YOUR data.
-- Do NOT commit seed-history.sql to git.
--
-- Setup:
--   1. Sign up in the app (or create user in Supabase → Authentication)
--   2. Copy your user UUID from Supabase → Authentication → Users
--   3. cp supabase/seed-history.example.sql supabase/seed-history.sql
--   4. Replace REPLACE-WITH-YOUR-USER-UUID in seed-history.sql
--   5. Run in Supabase SQL Editor after reset.sql

create or replace function _seed_user_id() returns uuid language sql as $$
  select 'REPLACE-WITH-YOUR-USER-UUID'::uuid;
$$;

-- Update _seed_session in your local file to insert user_id = _seed_user_id()
-- Update health_logs inserts to include user_id and on conflict (user_id, date)

-- Example session:
--
-- do $$ declare s uuid; begin
--   s := _seed_session('2026-01-15', 'Push');
--   perform _seed_exercise(s, 'Cable Chest Fly', 'Cable Chest Fly', 1, array[[20,10],[20,10]]::numeric[][]);
-- end $$;

drop function if exists _seed_user_id();

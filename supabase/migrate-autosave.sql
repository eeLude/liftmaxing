-- Incremental workout auto-save (run once on existing DBs)
alter table workout_sessions
  add column if not exists completed_at timestamptz;

create index if not exists workout_sessions_in_progress_idx
  on workout_sessions (split_id, date desc)
  where completed_at is null;

-- Backfill completed_at for seeded history (run once on existing DBs)
update workout_sessions
set completed_at = coalesce(completed_at, created_at)
where is_seeded = true and completed_at is null;

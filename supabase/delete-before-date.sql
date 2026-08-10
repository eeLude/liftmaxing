-- Utility: delete workout and health rows before a cutoff date.
-- Keeps rows on and after the cutoff.
--
-- 1. Set the cutoff date below
-- 2. Run in Supabase SQL Editor
--
-- Preview first (optional):
--   select date, count(*) from workout_sessions where date < '2026-01-01' group by date order by date;
--   select date, weight_kg from health_logs where date < '2026-01-01' order by date;

-- *** SET CUTOFF DATE HERE ***
-- delete ... where date < 'YYYY-MM-DD';

delete from workout_logs
where session_exercise_id in (
  select se.id
  from session_exercises se
  join workout_sessions ws on ws.id = se.session_id
  where ws.date < '2026-01-01'
);

delete from session_exercises
where session_id in (
  select id from workout_sessions where date < '2026-01-01'
);

delete from workout_sessions
where date < '2026-01-01';

delete from health_logs
where date < '2026-01-01';

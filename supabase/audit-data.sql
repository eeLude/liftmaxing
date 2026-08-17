-- Read-only data audit for Liftmaxxing. Run in Supabase SQL Editor.

-- 1) Completed sessions in the last 30 days with zero logged sets
select
  ws.id,
  ws.date,
  ws.split_id,
  ws.completed_at
from workout_sessions ws
where ws.completed_at is not null
  and ws.date >= (current_date - interval '30 days')
  and not exists (
    select 1
    from session_exercises se
    join workout_logs wl on wl.session_exercise_id = se.id
    where se.session_id = ws.id
  )
order by ws.date desc;

-- 2) In-progress sessions older than 7 days (possible abandoned drafts)
select
  ws.id,
  ws.date,
  ws.split_id,
  ws.created_at
from workout_sessions ws
where ws.completed_at is null
  and ws.created_at < (now() - interval '7 days')
order by ws.created_at;

-- 3) Duplicate sessions on the same date (ideally zero rows)
select
  ws.date,
  ws.user_id,
  count(*) as session_count
from workout_sessions ws
group by ws.date, ws.user_id
having count(*) > 1
order by ws.date desc;

-- 4) Recent logged sets (last 20)
select
  ws.date,
  m.name as movement,
  wl.weight_kg,
  wl.reps,
  wl.set_number,
  ws.completed_at is not null as is_completed
from workout_logs wl
join session_exercises se on se.id = wl.session_exercise_id
join workout_sessions ws on ws.id = se.session_id
join movements m on m.id = se.movement_id
order by ws.date desc, wl.created_at desc
limit 20;

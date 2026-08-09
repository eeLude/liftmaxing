-- Demo data for development / public repo (NOT personal data)
-- Run AFTER reset.sql. Safe to re-run.
--
-- 1. Sign up in the app first (creates your auth user)
-- 2. Copy your UUID from Supabase → Authentication → Users
-- 3. Replace the placeholder below, then run this script

create or replace function _demo_user_id() returns uuid language sql as $$
  select 'REPLACE-WITH-YOUR-USER-UUID'::uuid;
$$;

delete from workout_logs where session_exercise_id in (
  select se.id from session_exercises se
  join workout_sessions ws on ws.id = se.session_id
  where ws.date between '2026-01-06' and '2026-01-12'
);

delete from session_exercises where session_id in (
  select id from workout_sessions where date between '2026-01-06' and '2026-01-12'
);

delete from workout_sessions where date between '2026-01-06' and '2026-01-12';

delete from health_logs where date between '2026-01-01' and '2026-01-12';

create or replace function _demo_exercise(
  p_session_id uuid,
  p_template text,
  p_sets numeric[][]
) returns void language plpgsql as $$
declare
  v_slot_id uuid;
  v_movement_id uuid;
  v_se_id uuid;
  i int;
begin
  select se.id, se.movement_id into v_slot_id, v_movement_id
  from split_exercises se
  join workout_splits sp on sp.id = se.split_id
  join movements tm on tm.id = se.movement_id
  join workout_sessions ws on ws.id = p_session_id and ws.split_id = sp.id
  where tm.name = p_template
  limit 1;

  if v_slot_id is null then return; end if;

  insert into session_exercises (session_id, template_slot_id, movement_id, sort_order)
  values (p_session_id, v_slot_id, v_movement_id, 1)
  returning id into v_se_id;

  for i in 1..array_length(p_sets, 1) loop
    insert into workout_logs (session_exercise_id, set_number, weight_kg, reps)
    values (v_se_id, i, p_sets[i][1], p_sets[i][2]::int);
  end loop;
end;
$$;

create or replace function _demo_session(p_date date, p_split text)
returns uuid language plpgsql as $$
declare v_id uuid;
begin
  insert into workout_sessions (split_id, date, is_seeded, user_id)
  select id, p_date, true, _demo_user_id() from workout_splits where name = p_split
  returning id into v_id;
  return v_id;
end;
$$;

-- Sample week: Push, Pull, Legs
do $$ declare s uuid; begin
  s := _demo_session('2026-01-06', 'Push');
  perform _demo_exercise(s, 'Cable Chest Fly', array[[20,10],[20,10]]::numeric[][]);
  perform _demo_exercise(s, 'Incline DB Bench Press', array[[20,8],[20,8]]::numeric[][]);
  perform _demo_exercise(s, 'Dumbbell Shoulder Press', array[[24,8],[24,8],[22,10]]::numeric[][]);
  perform _demo_exercise(s, 'Incline Chest Machine Press', array[[30,8],[28,10]]::numeric[][]);
  perform _demo_exercise(s, 'Cable Tricep Extension', array[[30,10],[28,12],[25,12]]::numeric[][]);
end $$;

do $$ declare s uuid; begin
  s := _demo_session('2026-01-08', 'Pull');
  perform _demo_exercise(s, 'Face Pull', array[[0,12],[0,12]]::numeric[][]);
  perform _demo_exercise(s, 'Wide Grip Lat Pulldown', array[[45,10],[45,10]]::numeric[][]);
  perform _demo_exercise(s, 'Close Grip Seated Cable Row', array[[35,10],[35,10]]::numeric[][]);
  perform _demo_exercise(s, 'T-Bar Row', array[[40,8],[40,8]]::numeric[][]);
  perform _demo_exercise(s, 'EZ Bar Bicep Curl', array[[15,10],[15,10],[12,12]]::numeric[][]);
end $$;

do $$ declare s uuid; begin
  s := _demo_session('2026-01-10', 'Legs');
  perform _demo_exercise(s, 'Leg Press', array[[80,12],[100,10],[120,8]]::numeric[][]);
  perform _demo_exercise(s, 'RDL with Bar', array[[30,10],[32,10],[34,8]]::numeric[][]);
  perform _demo_exercise(s, 'Walking Lunges', array[[40,10],[40,10]]::numeric[][]);
  perform _demo_exercise(s, 'Hamstring Curl', array[[25,10],[25,10],[27,8]]::numeric[][]);
  perform _demo_exercise(s, 'Machine Calf Raise', array[[0,12],[0,12],[0,10]]::numeric[][]);
  perform _demo_exercise(s, 'Cable Crunch', array[[40,10],[40,10],[40,10]]::numeric[][]);
end $$;

insert into health_logs (user_id, date, weight_kg) values
  (_demo_user_id(), '2026-01-12', 75.0),
  (_demo_user_id(), '2026-01-11', 75.2),
  (_demo_user_id(), '2026-01-10', 75.1),
  (_demo_user_id(), '2026-01-09', 75.4),
  (_demo_user_id(), '2026-01-08', 75.3),
  (_demo_user_id(), '2026-01-07', 75.5),
  (_demo_user_id(), '2026-01-06', 75.6),
  (_demo_user_id(), '2026-01-05', 75.8),
  (_demo_user_id(), '2026-01-04', 75.7),
  (_demo_user_id(), '2026-01-03', 76.0),
  (_demo_user_id(), '2026-01-02', 75.9),
  (_demo_user_id(), '2026-01-01', 76.2)
on conflict (user_id, date) do update set weight_kg = excluded.weight_kg;

drop function if exists _demo_user_id();

drop function if exists _demo_exercise(uuid, text, numeric[][]);
drop function if exists _demo_session(date, text);

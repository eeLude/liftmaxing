-- Incremental migration for existing DBs (no full reset required)
-- Run migrate-v2.sql, then secure-rls.sql, then optional seed scripts.

alter table workout_sessions
  add column if not exists is_seeded boolean not null default false;

update workout_sessions
set is_seeded = true
where date between '2026-07-23' and '2026-08-07';

insert into movements (name, target_muscle) values
  ('Cable Chest Fly', 'Chest'),
  ('Dumbbell Shoulder Press', 'Shoulders'),
  ('Incline Chest Machine Press', 'Chest'),
  ('Cable Tricep Extension', 'Triceps'),
  ('Face Pull', 'Rear Delts'),
  ('Close Grip Seated Cable Row', 'Back'),
  ('EZ Bar Bicep Curl', 'Biceps'),
  ('RDL with Bar', 'Hamstrings'),
  ('Walking Lunges', 'Quads'),
  ('Hamstring Curl', 'Hamstrings'),
  ('Machine Calf Raise', 'Calves'),
  ('Cable Crunch', 'Core'),
  ('Chest Cable Machine', 'Chest'),
  ('Barbell Squat', 'Quads'),
  ('Hip Thrust', 'Hamstrings'),
  ('Pec Deck / Pec Fly', 'Chest'),
  ('Machine Shoulder Press', 'Shoulders'),
  ('Dumbbell Bicep Curl', 'Biceps'),
  ('Dumbbell Flat Bench Press', 'Chest'),
  ('Machine Rear Delt Fly', 'Rear Delts'),
  ('Smith Machine Press', 'Chest'),
  ('Leg Extension', 'Quads'),
  ('Preacher Bicep Curl', 'Biceps'),
  ('Dumbbell Hammer Curl', 'Biceps'),
  ('Pull-ups / Chin-ups', 'Back'),
  ('Treadmill Run', 'Cardio'),
  ('Outdoor Run', 'Cardio')
on conflict (name) do nothing;

insert into workout_splits (name, sort_order) values
  ('Run', 5)
on conflict (name) do nothing;

insert into split_exercises (split_id, movement_id, default_sets, sort_order)
select s.id, m.id, 1, 1
from workout_splits s
cross join movements m
where s.name = 'Run' and m.name = 'Treadmill Run'
on conflict (split_id, movement_id) do nothing;

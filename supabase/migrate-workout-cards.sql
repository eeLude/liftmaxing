-- Allow extra exercises added during a workout (not from split template)
alter table session_exercises
  alter column template_slot_id drop not null;

alter table session_exercises
  drop constraint if exists session_exercises_session_id_template_slot_id_key;

create unique index if not exists session_exercises_session_slot_idx
  on session_exercises (session_id, template_slot_id)
  where template_slot_id is not null;

-- Extra catalog movements (safe to re-run)
insert into movements (name, target_muscle) values
  ('Smith Machine Press', 'Chest'),
  ('Smith Machine Squat', 'Quads'),
  ('Leg Extension', 'Quads'),
  ('Preacher Bicep Curl', 'Biceps'),
  ('Dumbbell Hammer Curl', 'Biceps'),
  ('Pull-ups / Chin-ups', 'Back'),
  ('Barbell Row', 'Back'),
  ('Deadlift', 'Back'),
  ('Rack Pull', 'Back'),
  ('Straight Arm Pulldown', 'Back'),
  ('Dumbbell Fly', 'Chest'),
  ('Decline Bench Press', 'Chest'),
  ('Arnold Press', 'Shoulders'),
  ('Cable Lateral Raise', 'Shoulders'),
  ('Dumbbell Lateral Raise', 'Shoulders'),
  ('Tricep Pushdown', 'Triceps'),
  ('Skull Crushers', 'Triceps'),
  ('Overhead Tricep Extension', 'Triceps'),
  ('Hack Squat', 'Quads'),
  ('Bulgarian Split Squat', 'Quads'),
  ('Seated Calf Raise', 'Calves'),
  ('Hanging Leg Raise', 'Core'),
  ('Ab Wheel', 'Core'),
  ('Stationary Bike', 'Cardio'),
  ('Stairmaster', 'Cardio')
on conflict (name) do nothing;

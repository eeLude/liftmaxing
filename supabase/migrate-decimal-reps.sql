-- Allow half reps (e.g. 8.5) in workout logs. Run once in Supabase SQL Editor.

alter table workout_logs
  alter column reps type numeric(4, 1)
  using reps::numeric(4, 1);

alter table workout_logs
  drop constraint if exists workout_logs_reps_check;

alter table workout_logs
  add constraint workout_logs_reps_check check (reps > 0);

# Data trust and verification

Your logged sets live in **Supabase Postgres**, not in git or on your device. The app autosaves to the database; `localStorage` drafts are only a temporary cache while you type.

## In-app signal that a save worked

While logging a workout, watch the header next to the date:

- **Saving…** — debounce in progress; wait before finishing
- **Saved** — sets for that exercise are in the database
- **Save failed — edit again to retry** — tap a field and change a value to retry

Finish the workout only when exercises with logged sets show **Saved** and nothing is pending.

## Browse data in Supabase

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → your project
2. **Table Editor** — drill down:
   - `workout_sessions` (date, `completed_at`)
   - `session_exercises` (movement per session)
   - `workout_logs` (weight, reps per set)
3. Filter by date to confirm a specific gym day matches what you remember

## Audit queries

Run [`supabase/audit-data.sql`](../supabase/audit-data.sql) in **SQL Editor**. It reports:

- Completed sessions with no logged sets (unexpected empty workouts)
- Old in-progress sessions (abandoned drafts)
- Duplicate sessions on the same date
- Your 20 most recent logged sets

## Export a backup (manual)

In **SQL Editor**, run a query such as:

```sql
select
  ws.date,
  ws.completed_at,
  m.name as movement,
  wl.set_number,
  wl.weight_kg,
  wl.reps
from workout_logs wl
join session_exercises se on se.id = wl.session_exercise_id
join workout_sessions ws on ws.id = se.session_id
join movements m on m.id = se.movement_id
order by ws.date desc, m.name, wl.set_number;
```

Use the result panel’s download/export option to save CSV.

## Automatic backups

Supabase **Database → Backups** (availability depends on your plan). Pro includes point-in-time recovery. For personal use, periodic CSV exports from SQL Editor are a simple extra safety net.

## Migrations

If you add features that change the schema (e.g. half reps), run the matching file in SQL Editor once:

- [`migrate-decimal-reps.sql`](../supabase/migrate-decimal-reps.sql) — decimal reps (8.5)

Fresh installs from [`reset.sql`](../supabase/reset.sql) already include the latest schema.

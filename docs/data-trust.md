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

## Weekly backup (free tier)

Supabase **Pro** includes dashboard point-in-time backups. On the **free plan**, run a local export yourself so workouts are not only in the cloud.

### One-time setup

1. Supabase Dashboard → **Project Settings → API** → copy the **service_role** key (secret — full DB access)
2. Add to `.env.local` (already gitignored):

   ```
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

   Optionally set `BACKUP_USER_ID` to your auth UUID if multiple users share the project.

3. Never put the service role key in Vercel or any `NEXT_PUBLIC_*` variable.

### Run a backup

From the repo root:

```bash
npm run backup
```

This writes `backups/liftmaxxing-YYYY-MM-DD.json` with:

- `workout_sessions`, `session_exercises`, `workout_logs`, `health_logs`

The `backups/` folder is gitignored. Open the JSON and confirm recent dates and sets look right.

**Retention:** keep the last 4–8 weekly files; delete older ones. Optionally copy the folder to OneDrive or Google Drive.

### Schedule weekly (Windows)

1. Open **Task Scheduler** → Create Basic Task
2. Trigger: Weekly (e.g. Sunday 20:00)
3. Action: **Start a program**
   - Program: `npm.cmd` (or full path to npm)
   - Arguments: `run backup`
   - Start in: `C:\Users\eemil\Documents\liftmaxxing` (your repo path)
4. Ensure `.env.local` exists in that folder so the script can read your keys

Alternative: skip the scheduler and set a phone reminder to run `npm run backup` once a week.

### Restore

There is no one-click restore yet. Backups are an **insurance copy**. To recover data:

- Inspect the JSON and re-insert rows via Supabase SQL Editor, or
- Contact future-you to add a restore script if needed

Catalog tables (`movements`, splits) can be recreated from [`reset.sql`](../supabase/reset.sql) if you ever rebuild from scratch.

### Optional: full database dump (monthly)

For a complete Postgres snapshot, use **Database → Connection string** in Supabase with [pg_dump](https://www.postgresql.org/docs/current/app-pgdump.html) (requires PostgreSQL tools installed):

```bash
pg_dump "postgresql://..." -Fc -f backups/full-YYYY-MM-DD.dump
```

Heavier than JSON; useful as a occasional full snapshot, not weekly.

## Automatic backups (Supabase Pro)

Supabase **Database → Backups** on Pro includes point-in-time recovery. Free tier: use the weekly JSON export above instead.

## Migrations

If you add features that change the schema (e.g. half reps), run the matching file in SQL Editor once:

- [`migrate-decimal-reps.sql`](../supabase/migrate-decimal-reps.sql) — decimal reps (8.5)

Fresh installs from [`reset.sql`](../supabase/reset.sql) already include the latest schema.

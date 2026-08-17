# Liftmaxing

Mobile-first workout tracking: log gym sessions, body weight, and view strength progress on a dashboard.

## Demo

[![Katso demo YouTubessa]
(https://img.youtube.com/vi/UbDtB0gqzLw/hqdefault.jpg)](https://youtube.com/shorts/UbDtB0gqzLw)

## Why I built this

I wanted a simple way to log gym stats (sets, weight, splits) and track progress without getting bombed with ads or "buy pro" popups and keep my data private. Also wanted to try how powerful cursor coding agent(composer 2.5)  is with vibe coding.

## What it does

- Log workouts by split (Push / Pull / Legs / Upper / Run)
- Autosave sets while typing; resume in-progress sessions
- Reorder exercises (saved for your next session of that split)
- Track daily weight & calories
- Dashboard: activity graph, calendar, progressive overload, weekly volume, muscle group progress
- Auth + per-user data (Supabase RLS)

## Tech stack

| | |
|---|---|
| Frontend | Next.js 15, React 19, TypeScript, Tailwind |
| Backend | Supabase (Postgres, Auth, RLS) |
| Data | TanStack Query |
| Charts | Recharts |

## Architecture

```
Next.js (client) → TanStack Query → Supabase JS → Postgres (RLS)
```

- `workout_sessions` → `session_exercises` → `workout_logs`
- Autosave: debounced writes + localStorage draft merge (`lib/useActiveWorkout.ts`)

## Run locally

```bash
git clone https://github.com/eeLude/liftmaxing.git
cd liftmaxing
npm install
cp .env.local.example .env.local   # add Supabase URL + anon key
npm run dev
```

1. Run `supabase/reset.sql` in Supabase SQL Editor
2. Enable Email auth in Supabase
3. Sign up at `localhost:3000` and log a workout

Optional: `supabase/seed-demo.sql` for fake sample data.

**Existing databases:** run one-off migrations in `supabase/` as needed (e.g. `migrate-decimal-reps.sql` for half reps). See [docs/data-trust.md](docs/data-trust.md) for verifying and backing up your logged data.

## Routes

| Route | Purpose |
|-------|---------|
| `/` | Dashboard |
| `/workout` | Pick split |
| `/workout/[splitId]` | Log workout |
| `/health` | Weight & calories |
| `/login` | Auth |

MIT — see [LICENSE](LICENSE).

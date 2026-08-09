# Liftmaxxing

Mobile-first workout tracking PWA built with Next.js, Supabase, and Recharts.

## Personal use (recommended setup)

This app is designed for **one person**. Protect your data in two places:

### 1. Git — code only, never personal rows

| File | Commit to git? |
|------|----------------|
| App source code | Yes |
| `supabase/seed-demo.sql` | Yes (fake numbers) |
| `supabase/seed-history.example.sql` | Yes (empty template) |
| **`supabase/seed-history.sql`** | **Never** (gitignored) |
| `.env.local` | **Never** (gitignored) |

**If a file was committed before `.gitignore`**, Git still tracks it until you run:

```powershell
git rm --cached supabase/seed-history.sql
git commit -m "Stop tracking personal seed file"
```

Old commits may still contain the file. For a clean public history, use a **new private repo** or squash to a single fresh commit before pushing.

### 2. Live site — login required (Supabase RLS)

Even with a private repo, anyone with your **Vercel URL** could read data if the database allowed anonymous access. This project uses:

- **Supabase Auth** (email + password login)
- **Row Level Security** — each user only sees their own workouts and health logs

After deploy, in Supabase Dashboard → **Authentication → Providers**, consider **disabling public sign-ups** once your account exists (Settings → disable “Allow new users to sign up”), so only you can create an account.

Use a **private GitHub repo** if you do not want others browsing your code.

## Setup

1. Create a Supabase project.
2. Enable **Email** auth (Authentication → Providers).
3. Run **`supabase/reset.sql`** in the SQL Editor.
4. Copy `.env.local.example` → `.env.local` and add Supabase URL + anon key.
5. Install and run locally:

```bash
npm install
npm run dev
```

6. Open the app → **Sign up** with your email (creates your auth user).
7. Optional demo data: replace the UUID in `supabase/seed-demo.sql`, then run it in SQL Editor.
8. Personal history: copy `seed-history.example.sql` → **`seed-history.sql`** (local only), add your UUID + data, run in SQL Editor.

### Existing database (no full reset)

Run **`supabase/secure-rls.sql`** on an older DB to add `user_id` columns and lock down policies.

## Data & privacy checklist

- [ ] `git ls-files` does **not** list `seed-history.sql`
- [ ] GitHub repo is **private** (optional but recommended)
- [ ] Supabase sign-ups **disabled** after you create your account
- [ ] Rotated Supabase anon key if `.env` was ever committed
- [ ] Vercel env vars set (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`)

## Routine structure

| Split | Movements (default sets) |
|-------|--------------------------|
| **Push** | Cable Chest Fly (2), Incline DB Bench Press (2), Dumbbell Shoulder Press (3), Incline Chest Machine Press (2), Cable Tricep Extension (3) |
| **Pull** | Face Pull (2), Wide Grip Lat Pulldown (2), Close Grip Seated Cable Row (2), T-Bar Row (2), EZ Bar Bicep Curl (3) |
| **Legs** | Leg Press (3), RDL with Bar (3), Walking Lunges (2), Hamstring Curl (3), Machine Calf Raise (3), Cable Crunch (3) |
| **Upper** | Chest Cable Machine (3), Bench Press (3), Close Grip Lat Pulldown (3), Incline DB Bench Press (3), Horizontal Lat Row Machine (3) |
| **Run** | Treadmill Run (1) — log duration, distance, speed & elevation |

## Features

- Login-protected personal data
- Finnish dates (`7.8.2026`)
- Workout calendar, volume charts, run logger
- Replace any template movement during a workout

## Stack

Next.js 15 · TypeScript · Tailwind · Supabase Auth + RLS · TanStack Query · Recharts

## Routes

| Route | Description |
|-------|-------------|
| `/login` | Sign in / sign up |
| `/` | Dashboard |
| `/workout` | Split selector |
| `/workout/[splitId]` | Workout logger |
| `/health` | Daily weight & calories |

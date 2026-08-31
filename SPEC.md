# Liftmaxxing spec

Personal PWA for gym, books, mood, Spotify, weather, Finnish electricity, and flag days. One user. Live: [liftmaxing.vercel.app](https://liftmaxing.vercel.app).

**New chat:** read this file first. After a feature ships, update the matching section here.

## Stack and run

- Next.js 15 App Router, React 19, Tailwind, dark UI (`brand` = `#004cff`). Tailwind `content` includes `app/`, `components/`, and `lib/` (mood fill classes live in `lib/mood.ts`).
- Supabase Auth + Postgres + RLS (anon key in the browser; no service role on Vercel)
- TanStack Query, Recharts, lucide-react
- Dev: `npm run dev` → `http://localhost:3000` (port is fixed)
- Env: copy `.env.local.example` → `.env.local`

## Layout

| Area | Role |
| --- | --- |
| `app/page.tsx` | Hub dashboard. Renders `HUB_MODULES` from `lib/hub.ts`. |
| `app/{gym,workout,books,mood,health,login}/` | Feature pages |
| `app/api/` | Server routes: electricity proxy, Spotify OAuth/stats |
| `components/hub/HubXCard.tsx` | One card per hub domain |
| `lib/*.ts` | Domain logic |
| `lib/queries.ts` | Supabase + fetch helpers used by the client |
| `types/database.ts` | Row types + generated `Database` shape |
| `supabase/schema.sql` | Full schema (same as `reset.sql` minus the “wipe” warning copy) |
| `supabase/migrate-*.sql` | Incremental SQL to run in the Supabase editor |
| `components/BottomNav.tsx` | Home, Gym, Books |

Auth: `components/AuthProvider.tsx` redirects unknown users to `/login`. Public: `/login`, `/spotify/callback`.

Hub layout: `HubMasonry` on `app/page.tsx` packs cards into the shortest column. Column count is `floor(containerWidth / 20rem)`. Add a domain with `HubXCard` and append it in `lib/hub.ts` (order is only a placement seed). Current order: weather, electricity, mood, gym, flag-day, books, spotify.

## Product rules

- Mobile-first; verify UI in the browser (hub + any other route that shares the state).
- UI mix: English copy, Finnish dates (`formatFiDate`), comma decimals (`formatLocaleNumber`).
- Owner is a student; prefer working in code over long design writeups.
- Do not commit unless asked. Do not force-push. Do not put secrets, PDFs, or real quantities in git.

### Never commit

`.env*.local`, `supabase/seed-history.sql`, `supabase/seed-portfolio.sql`, `/backups/`, `*.pdf`. Seed examples without real positions are OK (`seed-history.example.sql`, `seed-demo.sql`).

`formatLocaleNumber(value, 0)` must **not** strip trailing zeros on integers (`1700` → `"1700"`, never `"17"`).

## Gym

Splits (Push / Pull / Legs / Upper / Run) → session → exercises → sets. Autosave on the workout page. Run logs store duration in `reps` and km in `weight_kg`. Weight/calories live in `health_logs`.

## Other hub cards

- **Weather:** Open-Meteo; saved location in `localStorage`. Today also shows sunrise, sunset, and day length (`daily=sunrise,sunset`).
- **Flag days:** Official + established Finnish flag-flying days from sisäministeriö (`lib/flag-days.ts`). Glance is today or the next day. Not recommended-only days, elections, or inauguration.
- **Electricity:** FI spot via `app/api/electricity/route.ts` (spot-hinta.fi). Bar **height** is relative to today; **color** is absolute snt/kWh (VAT in): green ≤ 10, amber < 20, red ≥ 20.
- **Spotify:** OAuth; tokens in `spotify_tokens`; stats via `app/api/spotify/stats` (top artists/tracks). Genre is counted from up to 50 top artists. Spotify often returns empty `genres`; missing names are filled from Apple Search `primaryGenreName` (top 10). Web API has **no monthly listening minutes** (the in-app number is first-party; recently-played tops out at ~50 tracks).
- **Books / mood:** `books`, `mood_logs`. Mood scores 1–5 are a heatmap (rose → orange → amber → lime → emerald) in `lib/mood.ts` for week bars and the month grid. Empty days stay `zinc-800`. Picker buttons stay gray until hover.

There is **no portfolio**. Drop leftover `portfolio_holdings` with `supabase/migrate-drop-portfolio.sql`.

## Data backup

`npm run backup` uses `SUPABASE_SERVICE_ROLE_KEY` locally only. Writes under `/backups/` (gitignored).

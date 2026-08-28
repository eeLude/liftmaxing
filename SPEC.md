# Liftmaxxing spec

Personal PWA for gym, books, mood, Spotify, weather, Finnish electricity, and a Yahoo-priced portfolio. One user. Live: [liftmaxing.vercel.app](https://liftmaxing.vercel.app).

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
| `app/{gym,workout,books,mood,portfolio,health,login}/` | Feature pages |
| `app/api/` | Server routes: electricity proxy, Spotify OAuth/stats, Yahoo quotes |
| `components/hub/HubXCard.tsx` | One card per hub domain |
| `lib/*.ts` | Domain logic (keep quotes route free of React) |
| `lib/queries.ts` | Supabase + fetch helpers used by the client |
| `types/database.ts` | Row types + generated `Database` shape |
| `supabase/schema.sql` | Full schema (same as `reset.sql` minus the “wipe” warning copy) |
| `supabase/migrate-*.sql` | Incremental SQL to run in the Supabase editor |
| `components/BottomNav.tsx` | Home, Gym, Books, Salkku |

Auth: `components/AuthProvider.tsx` redirects unknown users to `/login`. Public: `/login`, `/spotify/callback`.

Hub layout: `HubMasonry` on `app/page.tsx` packs cards into the shortest column. Column count is `floor(containerWidth / 20rem)`. Add a domain with `HubXCard` and append it in `lib/hub.ts` (order is only a placement seed). Current order: weather, electricity, mood, gym, portfolio, books, spotify.

## Product rules

- Mobile-first; verify UI in the browser (hub + any other route that shares the state).
- UI mix: English copy, Finnish dates (`formatFiDate`), comma decimals (`formatLocaleNumber`). Nav label for portfolio is **Salkku**.
- Owner is a student; prefer working in code over long design writeups.
- Do not commit unless asked. Do not force-push. Do not put secrets, PDFs, or real quantities in git.

### Never commit

`.env*.local`, `supabase/seed-history.sql`, `supabase/seed-portfolio.sql`, `/backups/`, `*.pdf`. Seed examples without real positions are OK (`seed-history.example.sql`, `seed-demo.sql`).

`formatLocaleNumber(value, 0)` must **not** strip trailing zeros on integers (`1700` → `"1700"`, never `"17"`).

## Gym

Splits (Push / Pull / Legs / Upper / Run) → session → exercises → sets. Autosave on the workout page. Run logs store duration in `reps` and km in `weight_kg`. Weight/calories live in `health_logs`.

## Portfolio

Holdings in `portfolio_holdings` (qty + cost). **Prices come from Yahoo**, not Nordnet. There is no Nordnet API and we do not copy Nordnet TWR / Max / “today”.

- Quotes: `GET /api/portfolio/quotes?tickers=…&range=1mo` (Bearer session). Cache key is `symbol|range`.
- Displayed **1 kk** change is `holdingsRangeChange(snapshot)`: first complete `history[]` day vs current `totalEur`. Do **not** label Yahoo `chartPreviousClose` as “today” (`range=1mo` is often the window start).
- Tickers/names: `TICKER_HINTS` in `lib/portfolio.ts`. Real qty/cost stay in gitignored seed SQL.
- Hide euros for demos: eye toggle on hub + `/portfolio`, `localStorage` key `liftmaxxing.hidePortfolioValues`. Keeps % and sparkline shape; masks €, cost, qty, chart axis.

New table locally: run `supabase/migrate-portfolio.sql` in the SQL editor (or reset from `schema.sql`).

## Other hub cards

- **Weather:** Open-Meteo; saved location in `localStorage`.
- **Electricity:** FI spot via `app/api/electricity/route.ts` (spot-hinta.fi).
- **Spotify:** OAuth; tokens in `spotify_tokens`; stats via `app/api/spotify/stats`.
- **Books / mood:** `books`, `mood_logs`. Mood scores 1–5 are a heatmap (rose → orange → amber → lime → emerald) in `lib/mood.ts` for week bars and the month grid. Empty days stay `zinc-800`. Picker buttons stay gray until hover.

## Data backup

`npm run backup` uses `SUPABASE_SERVICE_ROLE_KEY` locally only. Writes under `/backups/` (gitignored). Includes `portfolio_holdings`.

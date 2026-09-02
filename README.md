# Dashboard

A personal hub for gym progress, reading, mood, and music — one clean screen instead of juggling separate apps.

## Why

I built this for myself. No ads, no analytics, no selling accounts — just my data in my own database. The home screen is **Dashboard**; the gym section keeps the **Liftmaxing** header.

## Stack

Next.js 15 · Supabase (Auth + RLS) · TanStack Query · Recharts · Tailwind

## Features

- Workout logging with autosave (Push / Pull / Legs / Upper / Run)
- Reading log, daily mood, Spotify stats
- Hub cards: Finnish weather, electricity spot prices, flag days, homelab glance

## Local setup

```bash
npm install
cp .env.local.example .env.local   # add your keys
npm run dev
```

Opens at [http://localhost:3000](http://localhost:3000). See `.env.local.example` for required environment variables.

## License

MIT

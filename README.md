# Personal Dashboard

A single-screen personal dashboard for tracking workouts, reading, mood, and context, replacing separate apps and notes with your own data in Supabase. Built for daily personal use: no ads, analytics, or data monetization.

<img width="2100" height="1439" alt="Dashboard hub screenshot" src="https://github.com/user-attachments/assets/c76c4b14-5680-4ded-a4d7-21ca18da26fe" />

---

## Why



It started with a simple thought: why keep logging workouts in my phone's notepad when I could build an app around it and use the data to make charts and better track my progress. I also wanted to try coding agents to explore their capabilities, while making something I actually use every day.


---

## Features

- **Workouts & progress:** Logging with autosave (Push / Pull / Legs / Upper / Run), body weight, strength charts, and run progress
- **Reading & mood:** Book log, daily mood (1–5), Spotify top artists/tracks/genre
- **Context cards:** Finnish weather, electricity spot prices, flag days, homelab glance (offline until home PC + tunnel)

---

## Tech Stack

- **Frontend:** Next.js 15, Tailwind CSS, TanStack Query, Recharts
- **Backend & database:** Supabase (PostgreSQL, Auth, RLS)
- **Deploy:** Vercel (app) + Supabase (data) — not LAN self-hosted; data stays in your own project

---

## Development Note

Architecture, requirements, and infra choices are mine; most of the code is AI-generated and not line-by-line manually audited.

This is a **single-user personal app**, not a multi-tenant production product. Security is handled at the infrastructure layer:

- **Auth & data isolation:** Supabase Auth + Row Level Security (RLS) on all personal tables
- **Secrets:** API keys in `.env.local` only
- **Verification:** Functional testing and daily personal use, not a formal security audit

UI supports **EN / FI** toggle (stored in `localStorage`).

---

## Local Setup

```bash
npm install
cp .env.local.example .env.local   # add your keys
npm run dev
```


---

## License

MIT

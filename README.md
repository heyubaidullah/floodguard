# FloodGuard

**AI-powered flood alert and response dashboard** — combines real-time weather forecasts, citizen drain reports, and social media signals into a unified risk dashboard powered by a multi-agent Google Gemini AI pipeline.

> 🏆 Best Overall / 1st Prize Winner — ShellHacks 2025 · Made by Ubaid & Christina at [Dyne Labs](https://www.dynelabs.org)

---

## Table of Contents

1. [How it works](#how-it-works)
2. [Running locally](#running-locally)
3. [Deploying for free](#deploying-for-free)
4. [Environment variables](#environment-variables)
5. [Database setup](#database-setup)
6. [Project structure](#project-structure)

---

## How it works

```
┌─────────────────────────────────────────────────────────┐
│  Frontend  (React 18 + Vite + Tailwind)                 │
│  Hosted on Netlify                                      │
│  • Public zip-code risk checker                         │
│  • Admin operations dashboard (Demo / Live AI modes)    │
│  • Bring-your-own Gemini key — stays in your browser    │
└────────────────────┬────────────────────────────────────┘
                     │  REST /api/*
┌────────────────────▼────────────────────────────────────┐
│  Backend  (Fastify + Node.js 20)                        │
│  Hosted on Render                                       │
│  • A0 Orchestrator → A1 Weather → A2 Drain → A3 Social  │
│    → A4 Risk Fusion (Gemini) → A6 Comms                 │
│  • Demo mode works with no API key                      │
└────────────────────┬────────────────────────────────────┘
                     │  Prisma ORM
┌────────────────────▼────────────────────────────────────┐
│  PostgreSQL  (Supabase)                                 │
│  Tables: Forecast, Incident, SocialIncident,            │
│          Alert, OpsLog                                  │
└─────────────────────────────────────────────────────────┘
```

**Demo mode vs Live AI mode:**

- **Demo mode** (default) — the app runs entirely off the pre-seeded sample database. No API keys required. Anyone can visit the deployed URL and see the full dashboard working.
- **Live AI mode** — click the mode toggle in the admin dashboard and enter a Gemini API key. The key stays in your browser and is never stored on the server. Get a free key at [aistudio.google.com](https://aistudio.google.com/app/apikey).

**Admin login (demo credentials):** `admin@nws.gov` / `FloodGuard2025`

---

## Running locally

### Prerequisites

- Node.js 20+
- A Supabase project (or any PostgreSQL database)

### 1 — Clone and install

```bash
git clone https://github.com/YOUR_USERNAME/floodguard.git
cd floodguard
npm install
```

### 2 — Set up environment variables

**Backend:**

```bash
cp floodguard-backend/.env.example floodguard-backend/.env
```

Open `floodguard-backend/.env` and set your `DATABASE_URL` (from Supabase — see [Database setup](#database-setup)).

**Frontend:**

```bash
cp floodguard-frontend/.env.example floodguard-frontend/.env.local
```

For local dev, leave `VITE_API_BASE` blank — the Vite dev server proxies `/api` to the backend automatically. Optionally add a Mapbox token if you want the risk map to render.

### 3 — Apply migrations and seed demo data

```bash
cd floodguard-backend
npx prisma migrate deploy
npx prisma db seed
cd ..
```

### 4 — Start

```bash
npm run dev        # backend on :3000, frontend on :5000
```

Open [http://localhost:5000](http://localhost:5000).

---

## Deploying for free

The production stack is: **Netlify (frontend) + Render (backend) + Supabase (database).**
All three are free within normal usage.

---

### Step 1 — Get your Supabase connection string

1. Open your [Supabase project](https://supabase.com/dashboard).
2. Go to **Project Settings → Database → Connection string → URI**.
3. Copy the string. It looks like:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   ```
4. Make sure `?sslmode=require` is at the end (add it if missing).

---

### Step 2 — Deploy the backend on Render

1. Sign up at [render.com](https://render.com) — free, no credit card needed.
2. Click **New → Blueprint** and connect your GitHub repo.
3. Render reads `render.yaml` automatically and creates the `floodguard-api` service.
4. In the Render dashboard, go to **floodguard-api → Environment** and fill in:

   | Variable | Value |
   |---|---|
   | `DATABASE_URL` | Your Supabase URI from Step 1 |
   | `CORS_ORIGIN` | Your Netlify URL (fill in after Step 3, e.g. `https://floodguard.netlify.app`) |
   | `GEMINI_API_KEY` | Leave blank — users enter their own key in the app |
   | `TWITTER_BEARER` | Leave blank |

5. Render will build and start the backend. Note the public URL — it looks like `https://floodguard-api.onrender.com`.

> **First deploy only:** After the backend is live, run migrations and seed the demo data once:
> ```bash
> # From your local machine (with DATABASE_URL set to Supabase)
> cd floodguard-backend
> npx prisma migrate deploy
> npx prisma db seed
> ```

---

### Step 3 — Deploy the frontend on Netlify

1. Sign up at [netlify.com](https://netlify.com) — free.
2. Click **Add new site → Import an existing project → GitHub** and select your repo.
3. Netlify reads `netlify.toml` automatically — build settings are pre-configured.
4. Under **Site settings → Environment variables**, add:

   | Variable | Value |
   |---|---|
   | `VITE_API_BASE` | Your Render backend URL from Step 2, e.g. `https://floodguard-api.onrender.com` |
   | `VITE_MAPBOX_TOKEN` | Optional — your Mapbox token if you want the risk map (free at [account.mapbox.com](https://account.mapbox.com/)) |

5. Trigger a deploy. Netlify builds the React app and serves it from its global CDN.
6. Copy your Netlify site URL (e.g. `https://floodguard.netlify.app`).

---

### Step 4 — Wire CORS back to Render

Go back to **Render → floodguard-api → Environment** and set:

```
CORS_ORIGIN = https://floodguard.netlify.app
```

Render will redeploy automatically. Your app is now live.

---

## Environment variables

### Frontend

| Variable | When needed | Description |
|---|---|---|
| `VITE_API_BASE` | Production only | Full URL of the Render backend. Leave blank for local dev — the Vite proxy handles it. |
| `VITE_MAPBOX_TOKEN` | Optional | Mapbox public token for the risk map. Free at [account.mapbox.com](https://account.mapbox.com/). Without it the map panel is blank; everything else works. |

### Backend

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | Supabase (or any PostgreSQL) connection string with `?sslmode=require`. |
| `CORS_ORIGIN` | Yes | Your Netlify URL. Comma-separate multiple origins if needed, e.g. `https://floodguard.netlify.app,https://other.domain.com`. |
| `PORT` | No | Defaults to `3000`. Render injects this automatically. |
| `GEMINI_API_KEY` | No | Leave blank. Users enter their own key in-browser via the Live AI mode toggle. |
| `TWITTER_BEARER` | No | Leave blank. Without it the social agent uses synthetic signals, which is fine for demo. |
| `NODE_ENV` | No | Set to `production` on Render. |

---

## Database setup

The project uses Prisma with migrations in `floodguard-backend/prisma/migrations/`.

```bash
cd floodguard-backend

# Apply the schema to your database (safe to run multiple times)
npx prisma migrate deploy

# Populate with sample data for the demo
npx prisma db seed

# Optional: browse your data visually
npx prisma studio
```

Run these once against your Supabase database before the first deploy. After that, Render's build command runs `migrate deploy` automatically on every push.

---

## Project structure

```
floodguard/
├── floodguard-backend/
│   ├── prisma/
│   │   ├── schema.prisma        # DB schema
│   │   ├── migrations/          # SQL migration history
│   │   └── seed.mjs             # Demo data seeder
│   └── src/
│       ├── index.js             # Fastify server entry point
│       ├── env.js               # Env vars + multi-origin CORS parser
│       ├── agents/              # A0–A6 AI agent pipeline
│       ├── a2a/                 # Agent-to-Agent message bus
│       ├── demo/                # Demo mode snapshots + GeoJSON
│       ├── lib/                 # Shared utilities
│       └── routes/              # API route handlers
│
├── floodguard-frontend/
│   ├── src/
│   │   ├── api.ts               # Axios client (reads VITE_API_BASE)
│   │   ├── components/          # MapView, AlertsPanel, Controls, …
│   │   ├── context/             # Auth, Theme, Mode (demo/live)
│   │   └── pages/               # PublicPage, AdminDashboard, Login, About
│   ├── .env.example
│   └── vite.config.js
│
├── netlify.toml                 # Netlify build config + SPA redirect
├── render.yaml                  # Render backend blueprint
├── Procfile                     # Fallback for other Node hosts
└── README.md
```

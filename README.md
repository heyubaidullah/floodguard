# FloodGuard

**AI-powered flood alert and response dashboard** — combines real-time weather forecasts, citizen drain reports, and social media signals into a unified risk dashboard powered by a multi-agent Google Gemini AI pipeline.

> 🏆 Best Overall / 1st Prize Winner — ShellHacks 2025 · Made by Ubaid & Christina at [Dyne Labs](https://www.dynelabs.org)

---

## Table of Contents

1. [Architecture overview](#architecture-overview)
2. [Running locally](#running-locally)
3. [Environment variables reference](#environment-variables-reference)
4. [Deploying for free](#deploying-for-free)
   - [Option A — Netlify (frontend) + Railway (backend) + Supabase (database)](#option-a--netlify--railway--supabase)
   - [Option B — Render (frontend + backend) + Neon (database)](#option-b--render--neon)
   - [Option C — Vercel (frontend) + Railway (backend) + Supabase (database)](#option-c--vercel--railway--supabase)
5. [Replit deployment (existing)](#replit-deployment)
6. [Required API keys](#required-api-keys)
7. [Database migrations](#database-migrations)
8. [Project structure](#project-structure)

---

## Architecture overview

```
┌─────────────────────────────────────────────────────────┐
│  Frontend  (React 18 + Vite + Tailwind)  port 5000      │
│  • Public zip-code risk checker                         │
│  • Admin operations dashboard (Demo / Live AI modes)    │
│  • BYOK Gemini key support (browser-local)              │
└────────────────────┬────────────────────────────────────┘
                     │  REST  /api/*  (proxied in dev,
                     │  VITE_API_BASE in production)
┌────────────────────▼────────────────────────────────────┐
│  Backend  (Fastify + Node.js 20)  port 3000             │
│  • A0 Orchestrator → A1 Weather, A2 Drain, A3 Social    │
│    → A4 Risk Fusion (Gemini) → A6 Comms                 │
│  • Demo mode (no API key needed)                        │
│  • BYOK Gemini key via x-gemini-key header              │
└────────────────────┬────────────────────────────────────┘
                     │  Prisma ORM
┌────────────────────▼────────────────────────────────────┐
│  PostgreSQL database                                    │
│  Tables: Forecast, Incident, SocialIncident, Alert,     │
│          OpsLog                                         │
└─────────────────────────────────────────────────────────┘
```

**Data flow (one Live AI cycle):**

1. A0 dispatches A1, A2, A3 in parallel via in-process A2A messages
2. A1 fetches real weather from Open-Meteo (free, no key) then optionally asks Gemini to fill gaps
3. A2 reads drain/incident reports from the DB
4. A3 scans social signals and Gemini scores them for flood risk
5. A4 (Risk Fusion) fuses all three streams and asks Gemini for a 0–1 risk score + rationale
6. A6 generates targeted ops and public alerts, stores them in the DB

---

## Running locally

### Prerequisites

- Node.js 20+
- A PostgreSQL database (local, Supabase, Neon, or any Postgres-compatible service)
- npm 9+

### 1 — Clone and install

```bash
git clone https://github.com/dynelabs/floodguard.git
cd floodguard
npm install          # installs all workspace packages
```

### 2 — Configure environment variables

**Backend:**

```bash
cp floodguard-backend/.env.example floodguard-backend/.env
# Edit floodguard-backend/.env with your DATABASE_URL and optional GEMINI_API_KEY
```

**Frontend:**

```bash
cp floodguard-frontend/.env.example floodguard-frontend/.env.local
# For local dev, leave VITE_API_BASE blank (the Vite proxy handles /api → :3000)
# Set VITE_MAPBOX_TOKEN to your Mapbox public token
```

### 3 — Set up the database

```bash
cd floodguard-backend
npx prisma migrate deploy    # applies all migrations
npx prisma db seed           # seeds demo scenario data
cd ..
```

### 4 — Start both services

```bash
npm run dev          # starts backend (:3000) + frontend (:5000) concurrently
```

Or start them individually:

```bash
npm run dev:backend   # Fastify on :3000
npm run dev:frontend  # Vite on :5000
```

Open http://localhost:5000 in your browser.

**Admin login:** `admin@nws.gov` / `FloodGuard2025`

---

## Environment variables reference

### Frontend (`floodguard-frontend/.env.local`)

| Variable | Required | Description |
|---|---|---|
| `VITE_API_BASE` | Production only | Full URL of the backend, e.g. `https://floodguard-api.railway.app`. Leave blank for local dev (Vite proxy handles it). |
| `VITE_MAPBOX_TOKEN` | Yes | Mapbox GL JS public token (starts with `pk.`). Free tier: 50 000 map loads/month. Get one at [account.mapbox.com](https://account.mapbox.com/). |

### Backend (`floodguard-backend/.env`)

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string. See [Database options](#database-options) below. |
| `PORT` | No | Port the server listens on. Defaults to `3000`. Railway/Render inject `$PORT` automatically. |
| `CORS_ORIGIN` | Yes | Comma-separated list of allowed frontend origins, e.g. `https://floodguard.netlify.app` or `*` for all. |
| `GEMINI_API_KEY` | No | Google Gemini API key for live AI agents. Free at [aistudio.google.com](https://aistudio.google.com/app/apikey). Users can supply their own key in-browser (BYOK). |
| `TWITTER_BEARER` | No | Twitter/X v2 Bearer Token for real social ingestion. Without it the social agent uses synthetic signals. |
| `NODE_ENV` | No | Set to `production` on hosted platforms. |

---

## Deploying for free

All three options below are **completely free** within typical usage limits.

---

### Option A — Netlify + Railway + Supabase

**Best for:** ease of use, Netlify's CDN for the frontend.

#### Step 1 — Database on Supabase (free tier)

1. Sign up at [supabase.com](https://supabase.com) (free forever plan, 500 MB).
2. Create a new project.
3. Go to **Project Settings → Database → Connection string → URI**.
4. Copy the URI — it looks like:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   ```
5. Append `?sslmode=require` if not already present.

#### Step 2 — Backend on Railway (free $5 credit / month)

1. Sign up at [railway.app](https://railway.app).
2. Click **New Project → Deploy from GitHub repo** and select this repo.
3. Railway auto-detects the `Procfile` (`web: node floodguard-backend/src/index.js`).
4. Under **Variables**, add:
   ```
   DATABASE_URL   = <your Supabase URI from Step 1>
   CORS_ORIGIN    = https://your-app.netlify.app   ← fill in after Step 3
   GEMINI_API_KEY = <your Gemini key, optional>
   PORT           = 3000
   NODE_ENV       = production
   ```
5. Under **Settings → Deploy**, set the **Root Directory** to `/` (repo root).
6. Add a **Build Command**:
   ```
   npm install && cd floodguard-backend && npx prisma generate && npx prisma migrate deploy && npx prisma db seed
   ```
7. Note the Railway public URL (e.g. `https://floodguard-api.railway.app`).

#### Step 3 — Frontend on Netlify (free tier)

1. Sign up at [netlify.com](https://netlify.com).
2. Click **Add new site → Import an existing project → GitHub** and select this repo.
3. Netlify reads **`netlify.toml`** automatically — base directory, build command, and publish directory are pre-configured.
4. Under **Site settings → Environment variables**, add:
   ```
   VITE_API_BASE      = https://floodguard-api.railway.app   ← your Railway URL
   VITE_MAPBOX_TOKEN  = pk.your_mapbox_token_here
   ```
5. Trigger a deploy. Netlify builds `floodguard-frontend` and serves the `dist/` folder.
6. Copy the Netlify site URL (e.g. `https://floodguard.netlify.app`) and paste it back into Railway's `CORS_ORIGIN` variable.

---

### Option B — Render + Neon

**Best for:** one platform for everything; `render.yaml` handles provisioning.

#### Step 1 — Database on Neon (free tier)

1. Sign up at [neon.tech](https://neon.tech) (free — serverless PostgreSQL, 512 MB).
2. Create a project and copy the **Connection string** from the dashboard.
   ```
   postgresql://USER:PASSWORD@ep-xxxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```

#### Step 2 — Deploy via render.yaml

1. Open `render.yaml` and replace all `REPLACE_ME` values with your actual credentials.
2. Push to GitHub.
3. At [dashboard.render.com](https://dashboard.render.com), click **New → Blueprint** and select your repo.
4. Render reads `render.yaml` and creates both the API service and static site automatically.

---

### Option C — Vercel + Railway + Supabase

**Best for:** fastest cold-start for the frontend.

#### Step 1 — Database + Backend

Follow Steps 1–2 from [Option A](#option-a--netlify--railway--supabase).

#### Step 2 — Frontend on Vercel (free tier)

1. Sign up at [vercel.com](https://vercel.com).
2. **New Project → Import Git Repository** → select this repo.
3. Under **Framework Preset**, select **Vite**.
4. Set the **Root Directory** to `floodguard-frontend`.
5. Under **Environment Variables**, add:
   ```
   VITE_API_BASE      = https://floodguard-api.railway.app
   VITE_MAPBOX_TOKEN  = pk.your_mapbox_token_here
   ```
6. Deploy. Vercel automatically handles SPA routing (no extra config needed).
7. Copy the Vercel URL and add it to `CORS_ORIGIN` in your Railway backend.

---

## Replit deployment

The project is already configured for Replit via `.replit`:

- **Dev:** Run the "Project" workflow — starts backend on `:3000` and frontend on `:5000`.
- **Published:** `.replit` builds (`npm install && prisma generate && prisma migrate deploy && vite build`) and runs (`node floodguard-backend/src/index.js & serve floodguard-frontend/dist`).
- **Database:** Replit provides `DATABASE_URL` automatically via the built-in PostgreSQL integration.
- **Env vars:** Set `GEMINI_API_KEY` and `VITE_MAPBOX_TOKEN` in Replit's **Secrets** panel.

---

## Required API keys

| Key | Where to get | Free tier | Required? |
|---|---|---|---|
| `VITE_MAPBOX_TOKEN` | [account.mapbox.com](https://account.mapbox.com/) | 50 000 map loads/month | **Yes** — map and geocoding won't work without it |
| `GEMINI_API_KEY` | [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) | Free (with rate limits) | No — users can supply BYOK in-browser; Demo mode works without it |
| `TWITTER_BEARER` | [developer.twitter.com](https://developer.twitter.com/en/portal/dashboard) | Limited free tier | No — social agent uses synthetic signals without it |

> **Note:** The admin dashboard login credentials are hardcoded for demo purposes:
> - Email: `admin@nws.gov`
> - Password: `FloodGuard2025`

---

## Database migrations

The project uses **Prisma** with migration files in `floodguard-backend/prisma/migrations/`.

```bash
# Apply all pending migrations (safe to run multiple times)
cd floodguard-backend
npx prisma migrate deploy

# Seed demo + baseline data
npx prisma db seed

# View/edit data in Prisma Studio
npx prisma studio
```

**When connecting a new database** (e.g. Supabase or Neon), run `migrate deploy` + `db seed` once before starting the backend. The app will error on startup if migrations haven't been applied.

---

## Project structure

```
floodguard/
├── floodguard-backend/          # Fastify API server
│   ├── prisma/
│   │   ├── schema.prisma        # DB schema (Forecast, Incident, Alert, …)
│   │   ├── migrations/          # SQL migration files
│   │   └── seed.mjs             # Baseline + demo data seeder
│   └── src/
│       ├── index.js             # Fastify server entry point
│       ├── env.js               # Environment variable config + CORS parser
│       ├── agents/              # A0–A6 AI agents
│       │   └── ai/llmClient.js  # Gemini wrapper (supports BYOK via AsyncLocalStorage)
│       ├── a2a/                 # Agent-to-Agent messaging bus
│       ├── demo/                # Demo mode: seed + snapshot + GeoJSON
│       ├── lib/                 # Shared utils (zones, requestContext, stopwatch)
│       └── routes/              # Fastify routes (forecast, incidents, social, …)
│
├── floodguard-frontend/         # React 18 + Vite + Tailwind SPA
│   ├── src/
│   │   ├── api.ts               # Axios client (reads VITE_API_BASE)
│   │   ├── components/          # MapView, Controls, AlertsPanel, …
│   │   ├── context/             # ThemeContext, ModeContext (demo/live), AuthContext
│   │   └── pages/               # PublicPage, AdminDashboard, AdminLogin, AboutPage
│   ├── .env.example             # Frontend env var template
│   └── vite.config.js           # Dev proxy + build config
│
├── netlify.toml                 # Netlify build + SPA redirect config
├── render.yaml                  # Render one-click deploy blueprint
├── Procfile                     # Railway / Heroku process file
├── scripts/post-merge.sh        # Replit post-merge hook (migrate + seed)
└── README.md                    # This file
```

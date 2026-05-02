# FloodGuard - AI-Powered Flood Alert Dashboard

## Overview

FloodGuard is an AI-powered early flood alert and response dashboard that integrates real-time weather forecasts, drain condition reports (incidents), and social media sentiment to assess flood risks. It uses a multi-agent orchestration system powered by Google Gemini AI.

## Architecture

This is an npm workspace monorepo with two packages:

### Backend (`floodguard-backend`)
- **Framework:** Fastify (Node.js, ES Modules)
- **Database:** PostgreSQL via Prisma ORM
- **AI:** Google Gemini (`gemini-2.5-flash`) via `@google/generative-ai`
- **Port:** 3000 (localhost)
- **Agents:** A0 Orchestrator managing A1-A6 specialized agents for weather, drain monitoring, social media analysis, risk fusion, and comms

### Frontend (`floodguard-frontend`)
- **Framework:** React 18 + TypeScript + Vite
- **Styling:** Tailwind CSS + Framer Motion
- **Mapping:** Mapbox GL via react-map-gl
- **Port:** 5000 (0.0.0.0)
- **API:** Connects to backend via Vite proxy (`/api` → `localhost:3000`)

## Key Files

- `floodguard-backend/src/index.js` - Fastify server entry point
- `floodguard-backend/src/env.js` - Environment variable config
- `floodguard-backend/src/agents/` - AI agent implementations (A0–A7)
- `floodguard-backend/src/agents/ai/llmClient.js` - Gemini AI wrapper (supports per-request BYOK key via AsyncLocalStorage)
- `floodguard-backend/src/lib/requestContext.js` - AsyncLocalStorage for per-request Gemini key threading
- `floodguard-backend/src/demo/snapshot.js` - Static demo data fixture
- `floodguard-backend/src/demo/seedDemo.js` - Seeds demo data to DB (uses $queryRawUnsafe to bypass Prisma Float binary issue)
- `floodguard-backend/src/db/prisma.js` - Prisma client (patched with binary_parameters=no for PostgreSQL 22P03 float workaround)
- `floodguard-backend/prisma/schema.prisma` - Database schema
- `floodguard-frontend/vite.config.js` - Vite config (port 5000, allowedHosts: true)
- `floodguard-frontend/src/api.ts` - Axios API client with BYOK interceptor (reads `fg_gemini_key` from localStorage)
- `floodguard-frontend/src/context/ModeContext.tsx` - Demo/Live AI mode + BYOK key state (persisted to localStorage)
- `floodguard-frontend/src/context/AuthContext.tsx` - Auth (clears BYOK key + mode on logout)
- `floodguard-frontend/src/components/Controls.tsx` - Controls panel with Demo/Live AI toggle and BYOK key input

## Environment Variables

- `DATABASE_URL` - PostgreSQL connection (auto-set by Replit)
- `PORT` - Backend port (3000)
- `CORS_ORIGIN` - CORS origin (*)
- `GEMINI_API_KEY` - Google Gemini API key (optional if users provide BYOK key)

## Workflows

- **Backend** - `npm --workspace floodguard-backend run dev` on port 3000
- **Start application** - `npm --workspace floodguard-frontend run dev` on port 5000 (webview)

## Database

Uses Replit's built-in PostgreSQL. Run migrations with:
```
cd floodguard-backend && npx prisma migrate deploy
```

**Note:** Prisma 5.x + PostgreSQL has a binary Float encoding issue (PostgreSQL error 22P03). Fixed in:
- `src/db/prisma.js` — attempts `binary_parameters=no` in URL
- `src/agents/A1_weather.js` — uses `$queryRawUnsafe` for Forecast INSERT
- `src/agents/A4_risk_fusion.js` — uses `$executeRawUnsafe` for Forecast UPDATE
- `src/demo/seedDemo.js` — uses raw SQL throughout

## Key Features

### Demo Mode
- Controls panel has a **Demo / Live AI** toggle (persisted to localStorage as `fg_mode`)
- Demo mode: clicking "Load" calls `GET /api/ops/demo` which seeds a pre-recorded Miami flood scenario to the DB and returns the snapshot — no API key needed
- Live AI mode: clicking "Run" calls `POST /api/ops/run` which triggers the full multi-agent cycle

### Bring-Your-Own-Key (BYOK)
- In Live AI mode, users can enter their own Gemini API key in the Controls panel
- Key is stored in `localStorage` as `fg_gemini_key`
- Axios interceptor injects the key as `x-gemini-key` header only on AI-triggering routes (`/ops/run`, `/ops/loop/start`, `/ops/ai-status`) — not on data-read endpoints (least-privilege)
- Backend reads `x-gemini-key` header and wraps the cycle in `AsyncLocalStorage` context
- `llmClient.js` checks `getRequestGeminiKey()` before falling back to `env.GEMINI_API_KEY`
- Key is cleared from localStorage on logout

### AI Status Banner
- `GET /api/ops/ai-status` returns `{ hasServerKey, hasRequestKey, aiEnabled }`
- Controls panel shows appropriate status banners:
  - Amber warning if Live AI mode with no key
  - Sky blue "AI agents active" if key is available

## Setup Notes

- Vite configured with `allowedHosts: true` and `host: '0.0.0.0'` for Replit proxy
- Backend CORS set to `*` for development
- Portable across Replit, Railway, Docker, VPS

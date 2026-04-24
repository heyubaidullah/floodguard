# FloodGuard - AI-Powered Flood Alert Dashboard

## Overview

FloodGuard is an AI-powered early flood alert and response dashboard that integrates real-time weather forecasts, drain condition reports (incidents), and social media sentiment to assess flood risks. It uses a multi-agent orchestration system powered by Google Gemini AI.

## Architecture

This is an npm workspace monorepo with two packages:

### Backend (`floodguard-backend`)
- **Framework:** Fastify (Node.js, ES Modules)
- **Database:** PostgreSQL via Prisma ORM
- **AI:** Google Gemini (`gemini-2.5-flash`) via `@google/generative-ai`
- **Real-time:** Socket.io for frontend updates
- **Port:** 3000 (localhost)
- **Agents:** A0 Orchestrator managing A1-A6 specialized agents for weather, drain monitoring, social media analysis, risk fusion

### Frontend (`floodguard-frontend`)
- **Framework:** React 18 + TypeScript + Vite
- **Styling:** Tailwind CSS + Framer Motion
- **Mapping:** Mapbox GL via react-map-gl
- **Port:** 5000 (0.0.0.0)
- **API:** Connects to backend via `VITE_API_BASE` env var

## Key Files

- `floodguard-backend/src/index.js` - Fastify server entry point
- `floodguard-backend/src/env.js` - Environment variable config (PORT=3000, CORS_ORIGIN=*)
- `floodguard-backend/src/agents/` - AI agent implementations
- `floodguard-backend/prisma/schema.prisma` - Database schema
- `floodguard-frontend/vite.config.js` - Vite config (port 5000, allowedHosts: true)
- `floodguard-frontend/src/lib/api.js` - API client using VITE_API_BASE

## Environment Variables

- `DATABASE_URL` - PostgreSQL connection (auto-set by Replit)
- `PORT` - Backend port (3000)
- `CORS_ORIGIN` - CORS origin (*)
- `VITE_API_BASE` - Frontend API base URL (http://localhost:3000)
- `GEMINI_API_KEY` - Google Gemini API key (required for AI features)
- `TWITTER_BEARER` - Twitter/X API bearer token (optional, for social sentiment)

## Workflows

- **Backend** - `npm --workspace floodguard-backend run dev` on port 3000 (console)
- **Start application** - `npm --workspace floodguard-frontend run dev` on port 5000 (webview)

## Database

Uses Replit's built-in PostgreSQL. Run migrations with:
```
cd floodguard-backend && npx prisma migrate deploy
```

## Setup Notes

- Prisma schema had a duplicate `provider` line (fixed)
- Vite configured with `allowedHosts: true` and `host: '0.0.0.0'` for Replit proxy
- Backend CORS set to `*` for development

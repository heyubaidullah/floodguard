-- FloodGuard — Supabase setup script
-- Paste this entire file into: Supabase Dashboard → SQL Editor → New query → Run
--
-- All tables are prefixed with "fg_" so they coexist safely with your other projects.
-- Safe to run multiple times — uses CREATE TABLE IF NOT EXISTS.

-- ── Enum types ────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE "IncidentType" AS ENUM ('drain', 'citizen');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "Audience" AS ENUM ('ops', 'public');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "RiskTier" AS ENUM ('SAFE', 'MEDIUM', 'HIGH');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Tables ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "fg_forecasts" (
    "id"         TEXT             NOT NULL,
    "zone"       TEXT             NOT NULL,
    "rainProb"   DOUBLE PRECISION NOT NULL,
    "rainAmount" DOUBLE PRECISION,
    "riskScore"  DOUBLE PRECISION NOT NULL DEFAULT 0,
    "timestamp"  TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "fg_forecasts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "fg_incidents" (
    "id"           TEXT           NOT NULL,
    "type"         "IncidentType" NOT NULL,
    "description"  TEXT           NOT NULL,
    "zone"         TEXT           NOT NULL,
    "photoUrl"     TEXT,
    "locationName" TEXT,
    "latitude"     DOUBLE PRECISION,
    "longitude"    DOUBLE PRECISION,
    "timestamp"    TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "fg_incidents_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "fg_social_incidents" (
    "id"        TEXT         NOT NULL,
    "text"      TEXT         NOT NULL,
    "user"      TEXT         NOT NULL,
    "zone"      TEXT         NOT NULL,
    "riskFlag"  BOOLEAN      NOT NULL DEFAULT false,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "fg_social_incidents_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "fg_alerts" (
    "id"        TEXT         NOT NULL,
    "audience"  "Audience"   NOT NULL,
    "message"   TEXT         NOT NULL,
    "riskTier"  "RiskTier"   NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "fg_alerts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "fg_ops_logs" (
    "id"         TEXT         NOT NULL,
    "cycleId"    TEXT         NOT NULL,
    "step"       TEXT         NOT NULL,
    "status"     TEXT         NOT NULL,
    "durationMs" INTEGER      NOT NULL,
    "timestamp"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "fg_ops_logs_pkey" PRIMARY KEY ("id")
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS "fg_forecasts_zone_timestamp_idx"       ON "fg_forecasts"("zone", "timestamp");
CREATE INDEX IF NOT EXISTS "fg_incidents_zone_timestamp_idx"       ON "fg_incidents"("zone", "timestamp");
CREATE INDEX IF NOT EXISTS "fg_social_incidents_zone_timestamp_idx" ON "fg_social_incidents"("zone", "timestamp");
CREATE INDEX IF NOT EXISTS "fg_ops_logs_cycleId_timestamp_idx"     ON "fg_ops_logs"("cycleId", "timestamp");

-- ── Prisma migrations tracking table ─────────────────────────────────────────
-- This tells Prisma that the migration has already been applied,
-- so running "prisma migrate deploy" from Render won't re-run it.
CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
    "id"                  VARCHAR(36)  NOT NULL,
    "checksum"            VARCHAR(64)  NOT NULL,
    "finished_at"         TIMESTAMPTZ,
    "migration_name"      VARCHAR(255) NOT NULL,
    "logs"                TEXT,
    "rolled_back_at"      TIMESTAMPTZ,
    "started_at"          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    "applied_steps_count" INTEGER      NOT NULL DEFAULT 0,
    CONSTRAINT "_prisma_migrations_pkey" PRIMARY KEY ("id")
);

INSERT INTO "_prisma_migrations" ("id", "checksum", "finished_at", "migration_name", "applied_steps_count")
VALUES (
    gen_random_uuid()::text,
    'manual',
    NOW(),
    '20250927000000_init_fg',
    1
)
ON CONFLICT DO NOTHING;

-- ── Demo seed data ────────────────────────────────────────────────────────────
-- Inserts the Miami flood scenario used by Demo mode.
-- Only inserts if not already present (idempotent).

INSERT INTO "fg_forecasts" ("id", "zone", "rainProb", "rainAmount", "riskScore") VALUES
  (gen_random_uuid()::text, 'DEMO-HIGH', 0.82, 18.4, 0.87),
  (gen_random_uuid()::text, 'DEMO-MED',  0.54,  7.1, 0.54),
  (gen_random_uuid()::text, 'DEMO-SAFE', 0.18,  1.2, 0.18),
  (gen_random_uuid()::text, 'Z1',        0.80, 10.0, 0.80),
  (gen_random_uuid()::text, 'Z2',        0.50,  5.0, 0.50)
ON CONFLICT DO NOTHING;

INSERT INTO "fg_incidents" ("id", "type", "description", "zone", "locationName") VALUES
  (gen_random_uuid()::text, 'drain',   'Blocked storm drain on Bayshore Dr — water backing up',        'DEMO-HIGH', 'Bayshore Dr & 15th'),
  (gen_random_uuid()::text, 'citizen', 'Street flooding ankle-deep at intersection of 12th and Bay',   'DEMO-HIGH', '12th Ave & Bay Rd'),
  (gen_random_uuid()::text, 'drain',   'Overflow from gutter on NW 5th — pavement cracking',           'DEMO-HIGH', 'NW 5th St'),
  (gen_random_uuid()::text, 'citizen', 'Puddles forming near midtown underpass',                        'DEMO-MED',  'Midtown Underpass'),
  (gen_random_uuid()::text, 'citizen', 'Flooded street in Z1',                                         'Z1',        NULL),
  (gen_random_uuid()::text, 'drain',   'Blocked drain in Z2',                                          'Z2',        NULL)
ON CONFLICT DO NOTHING;

INSERT INTO "fg_social_incidents" ("id", "text", "user", "zone", "riskFlag") VALUES
  (gen_random_uuid()::text, 'Can barely walk down my street — standing water all the way to the corner. #BayshoreFlooding',             '@bayshore_resident',  'DEMO-HIGH', true),
  (gen_random_uuid()::text, 'ALERT: Bayshore District experiencing active street flooding. Avoid the area. City crews on scene.',        '@miamialerts',        'DEMO-HIGH', true),
  (gen_random_uuid()::text, 'My car is stuck — water came up so fast on Bay Rd. Do NOT come this way.',                                 '@commuter305',        'DEMO-HIGH', true),
  (gen_random_uuid()::text, 'Rainfall radar shows 18+ mm accumulation over Bayshore in the last hour. Drainage cannot keep up.',        '@weatherwatch_mia',   'DEMO-HIGH', true),
  (gen_random_uuid()::text, 'Puddles around the underpass getting worse. Anyone know if city crews are coming?',                         '@midtown_watch',      'DEMO-MED',  false),
  (gen_random_uuid()::text, 'Light drizzle here in Coral Terrace. Roads clear so far.',                                                 '@coral_terrace_news', 'DEMO-SAFE', false)
ON CONFLICT DO NOTHING;

INSERT INTO "fg_alerts" ("id", "audience", "message", "riskTier") VALUES
  (gen_random_uuid()::text, 'ops',    'OPS ALERT – Bayshore District (DEMO-HIGH): HIGH flood risk. Deploy pump units to Storm Basin 7. Inspect drain grates on Biscayne Blvd. Stage traffic barricades at intersections.',       'HIGH'),
  (gen_random_uuid()::text, 'public', 'PUBLIC ALERT – Bayshore District (DEMO-HIGH): High flood risk detected. Avoid low-lying roads and underpasses. Do NOT drive through standing water. Call 911 for life-threatening emergencies.', 'HIGH'),
  (gen_random_uuid()::text, 'ops',    'Flood alert in Z1',    'HIGH'),
  (gen_random_uuid()::text, 'public', 'Blocked drain in Z2',  'MEDIUM')
ON CONFLICT DO NOTHING;

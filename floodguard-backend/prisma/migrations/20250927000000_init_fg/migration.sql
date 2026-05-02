-- FloodGuard initial migration
-- All tables use the "fg_" prefix to avoid conflicts in shared Supabase projects.

-- CreateEnum
CREATE TYPE "IncidentType" AS ENUM ('drain', 'citizen');

-- CreateEnum
CREATE TYPE "Audience" AS ENUM ('ops', 'public');

-- CreateEnum
CREATE TYPE "RiskTier" AS ENUM ('SAFE', 'MEDIUM', 'HIGH');

-- CreateTable
CREATE TABLE "fg_forecasts" (
    "id" TEXT NOT NULL,
    "zone" TEXT NOT NULL,
    "rainProb" DOUBLE PRECISION NOT NULL,
    "rainAmount" DOUBLE PRECISION,
    "riskScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fg_forecasts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fg_incidents" (
    "id" TEXT NOT NULL,
    "type" "IncidentType" NOT NULL,
    "description" TEXT NOT NULL,
    "zone" TEXT NOT NULL,
    "photoUrl" TEXT,
    "locationName" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fg_incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fg_social_incidents" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "user" TEXT NOT NULL,
    "zone" TEXT NOT NULL,
    "riskFlag" BOOLEAN NOT NULL DEFAULT false,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fg_social_incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fg_alerts" (
    "id" TEXT NOT NULL,
    "audience" "Audience" NOT NULL,
    "message" TEXT NOT NULL,
    "riskTier" "RiskTier" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fg_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fg_ops_logs" (
    "id" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "step" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fg_ops_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fg_forecasts_zone_timestamp_idx" ON "fg_forecasts"("zone", "timestamp");

-- CreateIndex
CREATE INDEX "fg_incidents_zone_timestamp_idx" ON "fg_incidents"("zone", "timestamp");

-- CreateIndex
CREATE INDEX "fg_social_incidents_zone_timestamp_idx" ON "fg_social_incidents"("zone", "timestamp");

-- CreateIndex
CREATE INDEX "fg_ops_logs_cycleId_timestamp_idx" ON "fg_ops_logs"("cycleId", "timestamp");

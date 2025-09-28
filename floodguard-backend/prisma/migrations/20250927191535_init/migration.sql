-- CreateEnum
CREATE TYPE "IncidentType" AS ENUM ('drain', 'citizen');

-- CreateEnum
CREATE TYPE "Audience" AS ENUM ('ops', 'public');

-- CreateEnum
CREATE TYPE "RiskTier" AS ENUM ('SAFE', 'MEDIUM', 'HIGH');

-- CreateTable
CREATE TABLE "Forecast" (
    "id" TEXT NOT NULL,
    "zone" TEXT NOT NULL,
    "rainProb" INTEGER NOT NULL,
    "rainAmount" INTEGER NOT NULL,
    "riskScore" DOUBLE PRECISION NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Forecast_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Incident" (
    "id" TEXT NOT NULL,
    "type" "IncidentType" NOT NULL,
    "description" TEXT NOT NULL,
    "zone" TEXT NOT NULL,
    "photoUrl" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Incident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialIncident" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "user" TEXT NOT NULL,
    "zone" TEXT NOT NULL,
    "riskFlag" BOOLEAN NOT NULL DEFAULT false,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SocialIncident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL,
    "audience" "Audience" NOT NULL,
    "message" TEXT NOT NULL,
    "riskTier" "RiskTier" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpsLog" (
    "id" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "step" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OpsLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Forecast_zone_timestamp_idx" ON "Forecast"("zone", "timestamp");

-- CreateIndex
CREATE INDEX "Incident_zone_timestamp_idx" ON "Incident"("zone", "timestamp");

-- CreateIndex
CREATE INDEX "SocialIncident_zone_timestamp_idx" ON "SocialIncident"("zone", "timestamp");

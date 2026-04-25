/**
 * Writes a realistic demo scenario into the DB so the dashboard
 * can display it via the normal /forecast, /incidents, /social, /alerts endpoints.
 * Uses raw SQL to avoid Prisma 5.x binary-format Float issues (PostgreSQL error 22P03).
 * Uses crypto.randomUUID() for portable UUID generation (no gen_random_uuid() required).
 */
import { prisma } from '../db/prisma.js'
import { randomUUID } from 'crypto'

const ZONES = [
  { id: 'DEMO-HIGH', name: 'Bayshore District', lat: 25.7617, lon: -80.1918, rainProb: 0.82, rainAmount: 18.4, score: 0.87, tier: 'HIGH' },
  { id: 'DEMO-MED',  name: 'Midtown Heights',   lat: 25.8007, lon: -80.1931, rainProb: 0.54, rainAmount: 7.1,  score: 0.54, tier: 'MEDIUM' },
  { id: 'DEMO-SAFE', name: 'Coral Terrace',      lat: 25.7473, lon: -80.2870, rainProb: 0.18, rainAmount: 1.2,  score: 0.18, tier: 'SAFE' },
]

const INCIDENTS = [
  { zone: 'DEMO-HIGH', type: 'drain',   description: 'Blocked storm drain on Bayshore Dr — water backing up',              locationName: 'Bayshore Dr & 15th' },
  { zone: 'DEMO-HIGH', type: 'citizen', description: 'Street flooding ankle-deep at intersection of 12th and Bay',         locationName: '12th Ave & Bay Rd' },
  { zone: 'DEMO-HIGH', type: 'drain',   description: 'Overflow from gutter on NW 5th — pavement cracking',                locationName: 'NW 5th St' },
  { zone: 'DEMO-MED',  type: 'citizen', description: 'Puddles forming near midtown underpass',                             locationName: 'Midtown Underpass' },
]

const SOCIAL_POSTS = [
  { zone: 'DEMO-HIGH', user: '@bayshore_resident', text: 'Can barely walk down my street — standing water all the way to the corner. #BayshoreFlooding', riskFlag: true },
  { zone: 'DEMO-HIGH', user: '@miamialerts',       text: 'ALERT: Bayshore District experiencing active street flooding. Avoid the area. City crews on scene.', riskFlag: true },
  { zone: 'DEMO-HIGH', user: '@commuter305',       text: 'My car is stuck — water came up so fast on Bay Rd. Do NOT come this way.', riskFlag: true },
  { zone: 'DEMO-HIGH', user: '@weatherwatch_mia',  text: 'Rainfall radar shows 18+ mm accumulation over Bayshore in the last hour. Drainage cannot keep up.', riskFlag: true },
  { zone: 'DEMO-MED',  user: '@midtown_watch',     text: 'Puddles around the underpass getting worse. Anyone know if city crews are coming?', riskFlag: false },
  { zone: 'DEMO-SAFE', user: '@coral_terrace_news',text: 'Light drizzle here in Coral Terrace. Roads clear so far.', riskFlag: false },
]

const ALERTS = [
  {
    audience: 'ops',
    message: 'OPS ALERT – Bayshore District (DEMO-HIGH): HIGH flood risk. Deploy pump units to Storm Basin 7. Inspect drain grates on Biscayne Blvd. Stage traffic barricades at intersections.',
    riskTier: 'HIGH',
  },
  {
    audience: 'public',
    message: 'PUBLIC ALERT – Bayshore District (DEMO-HIGH): High flood risk detected. Avoid low-lying roads and underpasses. Do NOT drive through standing water. Call 911 for life-threatening emergencies.',
    riskTier: 'HIGH',
  },
]

/**
 * Seed demo data into the DB, idempotently. Skips all writes if demo records
 * already exist (i.e., seeded at startup/post-merge). Returns { scores, alerts }.
 * Uses $queryRawUnsafe/$executeRawUnsafe to bypass Prisma 5.x binary Float encoding issues.
 */
export async function seedDemoData() {
  // Idempotency check: verify ALL four demo tables are fully populated
  const [forecasts, incidents, social, alerts] = await Promise.all([
    prisma.$queryRawUnsafe(`SELECT id FROM "Forecast" WHERE zone LIKE 'DEMO-%' LIMIT 1`),
    prisma.$queryRawUnsafe(`SELECT id FROM "Incident" WHERE zone LIKE 'DEMO-%' LIMIT 1`),
    prisma.$queryRawUnsafe(`SELECT id FROM "SocialIncident" WHERE zone LIKE 'DEMO-%' LIMIT 1`),
    prisma.$queryRawUnsafe(`SELECT id FROM "Alert" WHERE message LIKE '%(DEMO-%' LIMIT 1`),
  ])
  const isFullySeeded = forecasts.length > 0 && incidents.length > 0 && social.length > 0 && alerts.length > 0
  if (isFullySeeded) {
    // Demo data is already present — build and return scores without re-seeding
    const scores = {}
    for (const z of ZONES) {
      scores[z.id] = { riskScore: z.score, riskTier: z.tier, rationale: buildRationale(z) }
    }
    const alertRows = await prisma.$queryRawUnsafe(
      `SELECT id, audience, message, "riskTier", "createdAt" FROM "Alert" WHERE message LIKE '%(DEMO-%' ORDER BY "createdAt" DESC LIMIT 5`
    )
    return { forecasts: [], alerts: alertRows, scores }
  }

  // First-time seed (or partial state recovery): clean up any stale demo records then re-insert
  await prisma.$executeRawUnsafe(`DELETE FROM "Alert" WHERE message LIKE '%(DEMO-%'`)
  await prisma.$executeRawUnsafe(`DELETE FROM "SocialIncident" WHERE zone LIKE 'DEMO-%'`)
  await prisma.$executeRawUnsafe(`DELETE FROM "Incident" WHERE zone LIKE 'DEMO-%'`)
  await prisma.$executeRawUnsafe(`DELETE FROM "Forecast" WHERE zone LIKE 'DEMO-%'`)

  // Insert forecasts via raw SQL to bypass Float binary encoding issue
  const forecastIds = []
  for (const z of ZONES) {
    const id = randomUUID()
    const rows = await prisma.$queryRawUnsafe(
      `INSERT INTO "Forecast" (id, zone, "rainProb", "rainAmount", "riskScore")
       VALUES ($1, $2, $3::float8, $4::float8, $5::float8)
       RETURNING id, zone, "rainProb", "rainAmount", "riskScore", timestamp`,
      id, z.id, z.rainProb, z.rainAmount, z.score
    )
    forecastIds.push(rows[0])
  }

  // Insert incidents via raw SQL
  for (const i of INCIDENTS) {
    const id = randomUUID()
    await prisma.$executeRawUnsafe(
      `INSERT INTO "Incident" (id, type, description, zone, "locationName")
       VALUES ($1, $2::"IncidentType", $3, $4, $5)`,
      id, i.type, i.description, i.zone, i.locationName
    )
  }

  // Insert social posts via raw SQL
  for (const s of SOCIAL_POSTS) {
    const id = randomUUID()
    await prisma.$executeRawUnsafe(
      `INSERT INTO "SocialIncident" (id, text, "user", zone, "riskFlag")
       VALUES ($1, $2, $3, $4, $5)`,
      id, s.text, s.user, s.zone, s.riskFlag
    )
  }

  // Insert alerts via raw SQL
  const alertRows = []
  for (const a of ALERTS) {
    const id = randomUUID()
    const rows = await prisma.$queryRawUnsafe(
      `INSERT INTO "Alert" (id, audience, message, "riskTier")
       VALUES ($1, $2::"Audience", $3, $4::"RiskTier")
       RETURNING id, audience, message, "riskTier", "createdAt"`,
      id, a.audience, a.message, a.riskTier
    )
    alertRows.push(rows[0])
  }

  // Build scores map
  const scores = {}
  for (const z of ZONES) {
    scores[z.id] = { riskScore: z.score, riskTier: z.tier, rationale: buildRationale(z) }
  }

  return { forecasts: forecastIds, alerts: alertRows, scores }
}

function buildRationale(z) {
  if (z.tier === 'HIGH') return 'Severe rainfall (82% probability, 18 mm) combined with 3 citizen/drain reports and 4 flagged social posts indicating active street flooding.'
  if (z.tier === 'MEDIUM') return 'Moderate rainfall (54% probability, 7 mm) with 1 citizen incident reported. Social sentiment shows concern but no confirmed flooding.'
  return 'Low rainfall probability (18%). No incidents or flagged social activity. Drainage appears nominal.'
}

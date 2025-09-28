// floodguard-backend/src/index.js
import Fastify from 'fastify'
import cors from '@fastify/cors'
import { env } from './env.js'
import { prisma } from './db/prisma.js'

// Agents
import { WeatherIngestAgent } from './agents/A1_weather.js'
import { DrainWatchAgent }   from './agents/A2_drain_grid.js'
import { SocialMediaAgent }  from './agents/A3_social.js'
import { OrchestratorAgent } from './agents/A0_orchestrator.js'
import { RiskFusionAgent }   from './agents/A4_risk_fusion.js'   // <-- A4

const fastify = Fastify({ logger: true })

// CORS
await fastify.register(cors, { origin: env.CORS_ORIGIN })

/* ---------- AGENTS ---------- */
const weatherAgent      = new WeatherIngestAgent()
const drainAgent        = new DrainWatchAgent(prisma)
if (drainAgent.startListenerOnce) drainAgent.startListenerOnce() // Pub/Sub subscriber
const socialAgent       = new SocialMediaAgent(prisma)
const riskAgent         = new RiskFusionAgent()                   // <-- A4 singleton
const orchestratorAgent = new OrchestratorAgent({
  prisma,
  weather: weatherAgent,
  drain:   drainAgent,
  social:  socialAgent,
})

/* ---------- HEALTH / DB ---------- */
fastify.get('/health', async () => ({ status: 'ok' }))

fastify.get('/db/ping', async () => {
  const r = await prisma.$queryRaw`SELECT 1 AS ok`
  return { ok: true, result: r }
})

/* ---------- CORE DATA ---------- */
fastify.get('/forecast', async () => prisma.forecast.findMany())
fastify.get('/incidents', async () => prisma.incident.findMany())
fastify.get('/alerts',   async () => prisma.alert.findMany())

fastify.post('/incidents/report', async (request) => {
  const { type, description, zone, photoUrl = null } = request.body || {}
  if (!type || !description || !zone) {
    return { ok: false, error: 'type, description, and zone are required' }
  }
  return prisma.incident.create({ data: { type, description, zone, photoUrl } })
})

fastify.post('/incidents/simulate', async (request) => {
  const { zone } = request.body || {}
  const rows = await drainAgent.simulateBatch(zone || 'Z2')
  return { ok: true, insertedPreview: rows }
})

/* ---------- SOCIAL (A3) ---------- */
// GET /social?zone=Z1&take=10
fastify.get('/social', async (request) => {
  const { zone, take } = request.query ?? {}
  return socialAgent.listSocial({
    zone,
    take: take ? Number(take) : undefined,
  })
})

// POST /social/simulate  { "zone": "Z1", "text": "Standing water..." }
fastify.post('/social/simulate', async (request) => {
  const { zone, text } = request.body || {}
  const row = await socialAgent.simulatePost({ zone: zone || 'Z1', text })
  return { ok: true, row }
})

// POST /social/simulate-batch { "zone": "Z1", "n": 3 }
fastify.post('/social/simulate-batch', async (request) => {
  const { zone, n } = request.body || {}
  const rows = await socialAgent.simulateBatch(zone || 'Z1', Number(n) || 3)
  return { ok: true, rows }
})

/* ---------- RISK (A4) ---------- */
// GET /risk/map → GeoJSON FeatureCollection with properties {zone, tier, riskScore, ...}
fastify.get('/risk/map', async () => {
  const geojson = await riskAgent.getRiskMap()
  return geojson
})

// GET /risk/preview → compact per-zone table for quick checks
fastify.get('/risk/preview', async () => {
  const geo = await riskAgent.getRiskMap()
  const rows = geo.features
    .map(f => ({
      zone: f.properties.zone,
      tier: f.properties.tier,
      riskScore: Number(f.properties.riskScore.toFixed(2)),
      incidents: f.properties.incidentCount,
      social: f.properties.socialCount,
      rainProb: f.properties.rainProb,
    }))
    // sort by risk desc, then zone
    .sort((a, b) => (b.riskScore - a.riskScore) || a.zone.localeCompare(b.zone))
  return { ok: true, rows }
})


/* ---------- DEMO HELPERS ---------- */
fastify.get('/weather/ingest', async () => {
  const published = await weatherAgent.ingestWeatherData()
  return { ok: true, published }
})

fastify.get('/cycle/run', async () => {
  const cycle = await orchestratorAgent.runCycle()
  return { ok: true, cycle }
})

/* ---------- START & SHUTDOWN ---------- */
fastify.listen({ port: env.PORT, host: '0.0.0.0' }, (err, address) => {
  if (err) {
    fastify.log.error(err)
    process.exit(1)
  }
  console.log(`🚀 Backend running at ${address}`)
})

process.on('SIGINT', async () => {
  try {
    await fastify.close()
    await prisma.$disconnect()
  } finally {
    process.exit(0)
  }
})
process.on('SIGTERM', async () => {
  try {
    await fastify.close()
    await prisma.$disconnect()
  } finally {
    process.exit(0)
  }
})

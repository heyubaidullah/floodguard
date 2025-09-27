import Fastify from 'fastify'
import cors from '@fastify/cors'
import { env } from './env.js'
import { prisma } from './db/prisma.js'

// Agents
import { WeatherIngestAgent } from './agents/A1_weather.js'
import { DrainWatchAgent } from './agents/A2_drain_grid.js'

const fastify = Fastify({ logger: true })

// Enable CORS
await fastify.register(cors, { origin: env.CORS_ORIGIN })

/* ---------- CORE ROUTES ---------- */

// Health
fastify.get('/health', async () => ({ status: 'ok' }))

// Forecasts
fastify.get('/forecast', async () => prisma.forecast.findMany())

// Alerts
fastify.get('/alerts', async () => prisma.alert.findMany())

// DB ping
fastify.get('/db/ping', async () => {
  // simple round-trip to DB
  const r = await prisma.$queryRaw`SELECT 1 as ok`
  return { ok: true, result: r }
})


/* ---------- AGENTS ---------- */

// A1 Weather Ingest
const weatherAgent = new WeatherIngestAgent()
fastify.get('/weather/ingest', async () => weatherAgent.ingestWeatherData())

// A2 Drain/Grid Watch
const drainAgent = new DrainWatchAgent(prisma)

// GET /incidents (optional: ?zone=Z2&take=10)
fastify.get('/incidents', async (request) => {
  const { zone, take } = request.query ?? {}
  return drainAgent.listIncidents({
    zone,
    take: take ? Number(take) : undefined,
  })
})

// POST /incidents/report
fastify.post('/incidents/report', async (request) => {
  const { type, description, zone, photoUrl } = request.body || {}
  if (!type || !description || !zone) {
    return { ok: false, error: 'type, description, and zone are required' }
  }
  return drainAgent.createIncident({ type, description, zone, photoUrl })
})

// POST /incidents/simulate
fastify.post('/incidents/simulate', async (request) => {
  const { zone } = request.body || {}
  const rows = await drainAgent.simulateBatch(zone || 'Z2')
  return { ok: true, insertedPreview: rows }
})

/* ---------- START & SHUTDOWN ---------- */
fastify.listen({ port: env.PORT, host: '0.0.0.0' }, (err, address) => {
  if (err) {
    fastify.log.error(err)
    process.exit(1)
  }
  console.log(`🚀 Backend running at ${address}`)
})

// Graceful shutdown
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

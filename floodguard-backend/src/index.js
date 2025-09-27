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

// DB ping (simple round-trip to Postgres)
fastify.get('/db/ping', async () => {
  const r = await prisma.$queryRaw`SELECT 1 AS ok`
  return { ok: true, result: r }
})

// GET /forecast route
fastify.get('/forecast', async (request, reply) => {
  const forecasts = await prisma.forecast.findMany()
  return forecasts
})

// GET /incidents route
fastify.get('/incidents', async (request, reply) => {
  const incidents = await prisma.incident.findMany()
  return incidents
})

// GET /alerts route
fastify.get('/alerts', async (request, reply) => {
  const alerts = await prisma.alert.findMany()
  return alerts
})

// POST /incidents/report route
fastify.post('/incidents/report', async (request, reply) => {
  const { type, description, zone } = request.body

  const newIncident = await prisma.incident.create({
    data: {
      type,
      description,
      zone,
    },
  })

  return newIncident
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

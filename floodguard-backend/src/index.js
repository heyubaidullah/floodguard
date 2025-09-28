// src/index.js
import Fastify from 'fastify'
import cors from '@fastify/cors'
import { env } from './env.js'
import { prisma } from './db/prisma.js'

// Agents (Pub/Sub based)
import { WeatherIngestAgent } from './agents/A1_weather.js'
import { DrainWatchAgent }   from './agents/A2_drain_grid.js'
import { OrchestratorAgent } from './agents/A0_orchestrator.js'

// --- Fastify setup ---
const fastify = Fastify({ logger: true })

// CORS
await fastify.register(cors, { origin: env.CORS_ORIGIN })

// --- Agents ---
const drainAgent = new DrainWatchAgent(prisma)
drainAgent.startListenerOnce()                    // start Pub/Sub subscription once

const weatherAgent = new WeatherIngestAgent()
const orchestratorAgent = new OrchestratorAgent() // placeholder, returns demo payload

// --- Utility / health ---
fastify.get('/health', async () => ({ status: 'ok' }))

// Quick DB round-trip
fastify.get('/db/ping', async () => {
  const r = await prisma.$queryRaw`SELECT 1 AS ok`
  return { ok: true, result: r }
})

// --- Forecasts / Incidents / Alerts ---
fastify.get('/forecast', async () => {
  return prisma.forecast.findMany()
})

fastify.get('/incidents', async () => {
  return prisma.incident.findMany()
})

fastify.get('/alerts', async () => {
  return prisma.alert.findMany()
})

// Create incident
fastify.post('/incidents/report', async (request) => {
  const { type, description, zone, photoUrl = null } = request.body || {}
  if (!type || !description || !zone) {
    return { ok: false, error: 'type, description, and zone are required' }
  }
  const row = await prisma.incident.create({ data: { type, description, zone, photoUrl } })
  return row
})

// Simulate incidents (helper)
fastify.post('/incidents/simulate', async (request) => {
  const { zone } = request.body || {}
  const rows = await drainAgent.simulateBatch(zone || 'Miami Beach')
  return { ok: true, insertedPreview: rows }
})

// --- Pub/Sub test routes ---
// Publish a weather alert (A1 -> topic)
fastify.get('/weather/ingest', async () => {
  const published = await weatherAgent.ingestWeatherData()
  return { ok: true, published }
})

// Simple orchestrator cycle: call A1 and return demo payload
fastify.get('/cycle/run', async (request, reply) => {
  try {
    const weather = await weatherAgent.ingestWeatherData()
    const cycle = await orchestratorAgent.runCycle()
    return { ok: true, cycle, published: weather }
  } catch (error) {
    fastify.log.error(error)
    reply.code(500)
    return { ok: false, error: 'Cycle execution failed', details: error?.message }
  }
})

// --- Start & graceful shutdown ---
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

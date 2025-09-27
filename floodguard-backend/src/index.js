import Fastify from 'fastify'
import cors from '@fastify/cors'
import { PrismaClient } from '@prisma/client'
import { env } from './env.js'

const prisma = new PrismaClient()

const fastify = Fastify({ logger: true })

// Enable CORS
await fastify.register(cors, { origin: env.CORS_ORIGIN })

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

// Start the server
fastify.listen({ port: env.PORT, host: '0.0.0.0' }, (err, address) => {
  if (err) {
    fastify.log.error(err)
    process.exit(1)
  }
  console.log(`🚀 Backend running at ${address}`)
})

// The following is only for testing purposes

import { WeatherIngestAgent } from './agents/A1_weather.js';

// Instantiate the agent
const weatherAgent = new WeatherIngestAgent();

// Route to trigger the weather data ingestion
fastify.get('/weather/ingest', async (request, reply) => {
  const weatherData = await weatherAgent.ingestWeatherData();
  return weatherData;
});


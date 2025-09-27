import Fastify from 'fastify'
import cors from '@fastify/cors'
import { env } from './env.js'
import healthRoutes from './routes/health.js'
import versionRoutes from './routes/version.js'
import forecastRoutes from './routes/forecast.js'
import incidentsRoutes from './routes/incidents.js'
import socialRoutes from './routes/social.js'
import alertsRoutes from './routes/alerts.js'
import { OrchestratorAgent } from './agents/A0_orchestrator.js'


const fastify = Fastify({ logger: true })


await fastify.register(cors, { origin: env.CORS_ORIGIN })


await fastify.register(healthRoutes)
await fastify.register(versionRoutes)
await fastify.register(forecastRoutes)
await fastify.register(incidentsRoutes)
await fastify.register(socialRoutes)
await fastify.register(alertsRoutes)


const orchestrator = new OrchestratorAgent()
fastify.post('/ops/run', async (req, reply) => {
const result = await orchestrator.runCycle()
return { ok: true, result }
})


fastify.listen({ port: env.PORT, host: '0.0.0.0' }, (err, address) => {
if (err) {
fastify.log.error(err)
process.exit(1)
}
console.log(`🚀 Backend running at ${address}`)
})
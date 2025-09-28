import Fastify from 'fastify';
import cors from '@fastify/cors';
import { env } from './env.js';

import healthRoutes from './routes/health.js';
import versionRoutes from './routes/version.js';
import forecastRoutes from './routes/forecast.js';
import incidentsRoutes from './routes/incidents.js';
import socialRoutes from './routes/social.js';
import alertsRoutes from './routes/alerts.js';
import agentRoutes from './routes/agents.js';

import { registerAllAgents } from './agents/register.js';
import { getTraceAndClear } from './a2a/bus.js';

const fastify = Fastify({ logger: true });
await fastify.register(cors, { origin: env.CORS_ORIGIN });

// Bring A2A agents online
registerAllAgents();

await fastify.register(healthRoutes);
await fastify.register(versionRoutes);
await fastify.register(forecastRoutes);
await fastify.register(incidentsRoutes);
await fastify.register(socialRoutes);
await fastify.register(alertsRoutes);
await fastify.register(agentRoutes);

// Inspect last cycle's A2A trace (for demo)
fastify.get('/ops/trace', async () => getTraceAndClear());

fastify.listen({ port: env.PORT, host: '0.0.0.0' }, (err, address) => {
  if (err) { fastify.log.error(err); process.exit(1); }
  console.log(`🚀 Backend running at ${address}`);
});

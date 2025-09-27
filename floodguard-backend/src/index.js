import Fastify from 'fastify';
import cors from '@fastify/cors';
import http from 'http';
import { env } from './env.js';
import { attachRealtime } from './realtime.js';
import healthRoutes from './routes/health.js';
import versionRoutes from './routes/version.js';
import { OrchestratorAgent } from './agents/A0_orchestrator.js';


const fastify = Fastify({ logger: true });
await fastify.register(cors, { origin: env.CORS_ORIGIN });


// Basic routes
await fastify.register(healthRoutes);
await fastify.register(versionRoutes);


// Minimal /ops/run (wire-up only; real logic in Phase 3)
const orchestrator = new OrchestratorAgent();
fastify.post('/ops/run', async (req, reply) => {
const result = await orchestrator.runCycle(io);
return reply.send({ ok: true, result });
});


// Create HTTP server and attach Socket.IO
const server = http.createServer(fastify.server);
const io = attachRealtime(server, env.CORS_ORIGIN);


server.listen(env.PORT, () => {
console.log(`🚀 Backend on http://localhost:${env.PORT}`);
});
export default async function healthRoutes(fastify) {
    fastify.get('/health', async () => ({ status: 'ok' }));
    }
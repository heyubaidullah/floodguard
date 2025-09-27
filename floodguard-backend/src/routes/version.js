export default async function versionRoutes(fastify) {
    fastify.get('/version', async () => ({ name: 'floodguard-backend', version: '0.1.0' }));
    }
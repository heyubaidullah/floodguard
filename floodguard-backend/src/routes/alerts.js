import { prisma } from '../db/prisma.js'


export default async function alertsRoutes(fastify) {
fastify.get('/alerts', async () => {
return prisma.alert.findMany({ orderBy: { createdAt: 'desc' }, take: 50 })
})
}
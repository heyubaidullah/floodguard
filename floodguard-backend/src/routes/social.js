import { prisma } from '../db/prisma.js'


export default async function socialRoutes(fastify) {
fastify.get('/social', async () => {
return prisma.socialIncident.findMany({ orderBy: { timestamp: 'desc' }, take: 50 })
})
}
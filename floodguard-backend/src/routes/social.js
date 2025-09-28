import { prisma } from '../db/prisma.js'

export default async function socialRoutes(fastify) {
  fastify.get('/social', async (req) => {
    const zone = req.query?.zone
    return prisma.socialIncident.findMany({
      where: zone ? { zone: String(zone) } : undefined,
      orderBy: { timestamp: 'desc' },
      take: 50,
    })
  })
}

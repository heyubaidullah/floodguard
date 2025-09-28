import { prisma } from '../db/prisma.js'

export default async function forecastRoutes(fastify) {
  fastify.get('/forecast', async (req) => {
    const zone = req.query?.zone
    return prisma.forecast.findMany({
      where: zone ? { zone: String(zone) } : undefined,
      orderBy: { timestamp: 'desc' },
      take: 50,
    })
  })
}

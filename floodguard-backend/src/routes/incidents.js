import { prisma } from '../db/prisma.js'

export default async function incidentsRoutes(fastify) {
  fastify.get('/incidents', async (req) => {
    const zone = req.query?.zone
    return prisma.incident.findMany({
      where: zone ? { zone: String(zone) } : undefined,
      orderBy: { timestamp: 'desc' },
      take: 50,
    })
  })

  fastify.post('/incidents/report', async (req, reply) => {
    const { type, description, zone, photoUrl, locationName, latitude, longitude } = req.body || {}
    if (!type || !description || !zone) {
      reply.code(400)
      return { error: 'type, description, zone are required' }
    }
    if (!['drain', 'citizen'].includes(type)) {
      reply.code(400)
      return { error: 'type must be drain|citizen' }
    }
    const created = await prisma.incident.create({
      data: { type, description, zone, photoUrl, locationName, latitude, longitude }
    })
    return created
  })
}

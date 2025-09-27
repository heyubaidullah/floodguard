import { prisma } from '../db/prisma.js'


export default async function forecastRoutes(fastify) {
fastify.get('/forecast', async (req, reply) => {
const rows = await prisma.forecast.findMany({
orderBy: { timestamp: 'desc' },
take: 50
})
return rows
})
}
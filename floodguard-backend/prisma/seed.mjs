import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()


async function main() {
// Clear existing
await prisma.alert.deleteMany()
await prisma.socialIncident.deleteMany()
await prisma.incident.deleteMany()
await prisma.forecast.deleteMany()
await prisma.opsLog.deleteMany()


// Seed Forecasts
await prisma.forecast.createMany({
data: [
{ zone: 'Z1', rainProb: 0.85, rainAmount: 42.3, riskScore: 0.0 },
{ zone: 'Z2', rainProb: 0.35, rainAmount: 10.2, riskScore: 0.0 },
{ zone: 'Z3', rainProb: 0.62, rainAmount: 25.0, riskScore: 0.0 }
]
})


// Seed Incidents
await prisma.incident.createMany({
data: [
{ type: 'drain', description: 'Blocked drain near 5th Ave', zone: 'Z1' },
{ type: 'citizen', description: 'Water pooling reported', zone: 'Z2' }
]
})


// Seed Social
await prisma.socialIncident.createMany({
data: [
{ text: '#flood near central park', user: 'alice', zone: 'Z1', riskFlag: true },
{ text: 'road blocked, heavy water', user: 'bob', zone: 'Z3', riskFlag: false }
]
})


// Seed Alerts
await prisma.alert.createMany({
data: [
{ audience: 'ops', message: 'Prepare pumps in Z1', riskTier: 'HIGH' },
{ audience: 'public', message: 'Avoid low-lying areas in Z3', riskTier: 'MEDIUM' }
]
})


// Seed OpsLog
await prisma.opsLog.create({
data: { cycleId: 'demo-0001', step: 'init', status: 'ok', durationMs: 1200 }
})


console.log('🌱 Seed complete')
}


main()
.catch((e) => { console.error(e); process.exit(1) })
.finally(async () => { await prisma.$disconnect() })
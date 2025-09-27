import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Seed Forecast data
  await prisma.forecast.createMany({
    data: [
      { zone: 'Z1', rainProb: 80, rainAmount: 10, riskScore: 0.8 },
      { zone: 'Z2', rainProb: 50, rainAmount: 5, riskScore: 0.5 },
    ],
  })

  // Seed Incidents
  await prisma.incident.createMany({
    data: [
      { type: 'citizen', description: 'Flooded street in Z1', zone: 'Z1' },
      { type: 'drain', description: 'Blocked drain in Z2', zone: 'Z2' },
    ],
  })

  // Seed Alerts
  await prisma.alert.createMany({
    data: [
      { audience: 'ops', message: 'Flood alert in Z1', riskTier: 'HIGH' },
      { audience: 'public', message: 'Blocked drain in Z2', riskTier: 'MEDIUM' },
    ],
  })

  console.log("Data seeded successfully!")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

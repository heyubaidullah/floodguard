// src/db/prisma.js
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['error', 'warn'], // add 'query' for verbose logs temporarily if needed
  })

// Reuse the prisma instance across hot-reloads in dev
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

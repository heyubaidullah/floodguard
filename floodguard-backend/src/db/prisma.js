// src/db/prisma.js
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis

/**
 * Appends binary_parameters=no to the DATABASE_URL to prevent the Prisma 5.x
 * "incorrect binary data format" error (PostgreSQL error 22P03) with Float fields.
 * This forces the PostgreSQL driver to use text-format parameters instead of binary.
 */
function buildDatabaseUrl() {
  const url = process.env.DATABASE_URL || ''
  if (!url || url.includes('binary_parameters')) return url
  const sep = url.includes('?') ? '&' : '?'
  return `${url}${sep}binary_parameters=no`
}

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    datasources: { db: { url: buildDatabaseUrl() } },
    log: ['error', 'warn'],
  })

// Reuse the prisma instance across hot-reloads in dev
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

// src/agents/A2_drain_grid.js

export class DrainWatchAgent {
  constructor(prisma) {
    this.prisma = prisma
  }

  /**
   * Simulate reading drain/citizen reports from a sensor feed or CSV and store them.
   * Returns a preview of the latest rows for that zone.
   */
  async simulateBatch(zone = 'Z2') {
    const batch = [
      { type: 'drain',   description: `Blocked drain detected in ${zone}`, zone },
      { type: 'citizen', description: `Citizen report: standing water in ${zone}`, zone }
    ]
    await this.prisma.incident.createMany({ data: batch })
    return this.prisma.incident.findMany({
      where: { zone },
      orderBy: { timestamp: 'desc' },
      take: 5
    })
  }

  /**
   * Persist a single incident (used by POST /incidents/report)
   */
  async createIncident({ type, description, zone, photoUrl = null }) {
    return this.prisma.incident.create({
      data: { type, description, zone, photoUrl }
    })
  }

  /**
   * Fetch latest incidents (optionally by zone)
   */
  async listIncidents(params = {}) {
    const { zone, take = 50 } = params
    return this.prisma.incident.findMany({
      where: zone ? { zone } : undefined,
      orderBy: { timestamp: 'desc' },
      take
    })
  }
}

// src/agents/A3_social.js

// Very simple keyword/rule detector for flood-related posts.
// In a real build, you’d replace this with Twitter/X API or a dataset stream.
const KEYWORDS = [
  'flood', 'flooding', 'waterlogging', 'water logged',
  'road blocked', 'street under water', 'standing water',
  'drain overflow', 'sewage', 'heavy rain', 'inundated'
]

function scoreText(text = '') {
  const t = text.toLowerCase()
  let hits = 0
  for (const k of KEYWORDS) {
    if (t.includes(k)) hits++
  }
  return hits
}

export class SocialMediaAgent {
  constructor(prisma) {
    this.prisma = prisma
  }

  /**
   * Create one synthetic social post (used by POST /social/simulate).
   * If no text is provided, we’ll generate a plausible one.
   */
  async simulatePost({ zone = 'Z1', text } = {}) {
    const samples = [
      `Heavy rain reported, road blocked near ${zone}`,
      `Standing water observed in ${zone} after storm`,
      `Drain overflow causing waterlogging in ${zone}`,
      `Light drizzle in ${zone}, no flooding`
    ]
    const content = text || samples[Math.floor(Math.random() * samples.length)]
    const hits = scoreText(content)
    const riskFlag = hits >= 1

    const row = await this.prisma.socialIncident.create({
      data: {
        text: content,
        user: 'demo_user',
        zone,
        riskFlag
      }
    })
    return row
  }

  /**
   * Bulk simulate a few posts for a zone to see the feed populate.
   */
  async simulateBatch(zone = 'Z1', n = 3) {
    const created = []
    for (let i = 0; i < n; i++) {
      created.push(await this.simulatePost({ zone }))
    }
    return created
  }

  /**
   * List latest social incidents (optionally filtered by zone)
   */
  async listSocial({ zone, take = 20 } = {}) {
    return this.prisma.socialIncident.findMany({
      where: zone ? { zone } : undefined,
      orderBy: { timestamp: 'desc' },
      take
    })
  }
}

// floodguard-backend/src/agents/A6_comms.js
import { prisma as defaultPrisma } from '../db/prisma.js'

export class CommsAgent {
  constructor({ prisma = defaultPrisma } = {}) {
    this.prisma = prisma
  }

  async generateAndPersistAlerts({ zones } = {}) {
    const { zones: chosen, details } = await this.collectRiskZones({ zones })
    const { opsMessage, publicMessage } = await this.generateMessages({ zones: chosen, details })

    // Use plain strings that match your Prisma enum values exactly
    const overallTier = this.pickOverallTier(details) // 'HIGH' | 'MEDIUM' | 'SAFE'

    const rows = [
      { audience: 'ops',    message: opsMessage,    riskTier: overallTier, createdAt: new Date() },
      { audience: 'public', message: publicMessage, riskTier: overallTier, createdAt: new Date() },
    ]

    await this.prisma.alert.createMany({ data: rows })

    return this.prisma.alert.findMany({
      orderBy: { createdAt: 'desc' },
      take: 2,
    })
  }

  pickOverallTier(details = []) {
    const hasHigh   = details.some(d => (d.tier || '').toLowerCase() === 'high')
    const hasMedium = details.some(d => (d.tier || '').toLowerCase() === 'medium')
    if (hasHigh) return 'HIGH'
    if (hasMedium) return 'MEDIUM'
    return 'SAFE'
  }

  async collectRiskZones({ zones } = {}) {
    const forecasts = await this.prisma.forecast.findMany({ orderBy: { timestamp: 'desc' } })
    const since = new Date(Date.now() - 3 * 60 * 60 * 1000)

    const [incidents, social] = await Promise.all([
      this.prisma.incident.groupBy({
        by: ['zone'],
        where: { timestamp: { gte: since } },
        _count: { _all: true },
      }),
      this.prisma.socialIncident.groupBy({
        by: ['zone'],
        where: { timestamp: { gte: since } },
        _count: { _all: true },
      }),
    ])

    const toCount = (arr) => arr.reduce((m, r) => ((m[r.zone] = r._count._all), m), {})
    const inc = toCount(incidents)
    const soc = toCount(social)

    const zonesSeen = new Set([
      ...forecasts.map(f => f.zone),
      ...Object.keys(inc),
      ...Object.keys(soc),
    ])

    const detailsAll = Array.from(zonesSeen).map((z) => {
      const f = forecasts.find(x => x.zone === z)
      const rainProb   = f?.rainProb ?? null
      const rainAmount = f?.rainAmount ?? null
      const riskScore  = f?.riskScore ?? 0
      const tier = this.scoreToTier(riskScore, rainProb, (inc[z] || 0), (soc[z] || 0))
      return {
        zone: z,
        tier, // 'high' | 'medium' | 'safe'
        riskScore,
        rainProb,
        rainAmount,
        incidentCount: inc[z] || 0,
        socialCount:   soc[z] || 0,
        updatedAt: f?.timestamp ?? null,
      }
    })

    let chosen = zones && zones.length ? zones : undefined
    if (!chosen || chosen.length === 0) {
      const rank = (t) => (t === 'high' ? 3 : t === 'medium' ? 2 : 1)
      const sorted = [...detailsAll].sort((a, b) => {
        const t = rank(b.tier) - rank(a.tier)
        return t !== 0 ? t : (b.riskScore || 0) - (a.riskScore || 0)
      })
      chosen = sorted.slice(0, 2).map(d => d.zone)
    }

    const details = detailsAll.filter(d => chosen.includes(d.zone))
    return { zones: chosen, details }
  }

  scoreToTier(riskScore = 0, rainProb = 0, incidentCount = 0, socialCount = 0) {
    let score = Math.max(riskScore, (rainProb || 0) / 100)
    if (incidentCount >= 1) score += 0.2
    if (socialCount >= 2)   score += 0.2
    if (score >= 0.7) return 'high'
    if (score >= 0.4) return 'medium'
    return 'safe'
  }

  async generateMessages({ zones, details }) {
    if (!process.env.GEMINI_API_KEY) {
      return this.templateMessages({ zones, details })
    }

    // Try to use Gemini, fall back gracefully if not available
    try {
      const mod = await import('@google/generative-ai')
      const client = new mod.GoogleGenerativeAI(process.env.GEMINI_API_KEY)
      const model  = client.getGenerativeModel({ model: 'gemini-1.5-flash' })

      const summary = this.detailsToSummary(details)
      const opsPrompt = [
        'You are an operations coordinator for city flood response.',
        'Write a concise, actionable alert for field ops with bullet points.',
        'Keep under 900 characters.',
        `Zones: ${zones.join(', ')}`,
        `Details: ${summary}`,
        'Cover actions like inspection, barricades, detours, and monitoring.',
      ].join('\n')

      const publicPrompt = [
        'You are a public safety officer.',
        'Write a clear, reassuring public alert for residents.',
        'Keep under 600 characters, short bullets.',
        `Areas: ${zones.join(', ')}`,
        `Details: ${summary}`,
        'Include “avoid driving through standing water” and “report blocked drains via 311 with photos.”',
      ].join('\n')

      const [opsResp, pubResp] = await Promise.all([
        model.generateContent(opsPrompt),
        model.generateContent(publicPrompt),
      ])

      const opsMessage    = opsResp?.response?.text?.() || ''
      const publicMessage = pubResp?.response?.text?.() || ''

      if (opsMessage.trim() && publicMessage.trim()) {
        return { opsMessage, publicMessage }
      }
      return this.templateMessages({ zones, details })
    } catch {
      return this.templateMessages({ zones, details })
    }
  }

  templateMessages({ zones, details }) {
    const summary = this.detailsToSummary(details)
    const opsMessage =
      `Ops Alert — FloodGuard\n` +
      `Zones: ${zones.join(', ')}\n` +
      `Summary: ${summary}\n` +
      `Actions:\n` +
      `• Dispatch crews to inspect drains in affected zones\n` +
      `• Place signage and barricades where waterlogging observed\n` +
      `• Monitor social reports and 311 tickets for escalation\n`

    const publicMessage =
      `Public Safety Alert\n` +
      `Areas affected: ${zones.join(', ')}\n` +
      `What to do:\n` +
      `• Avoid driving through standing water\n` +
      `• Park away from low-lying streets and underpasses\n` +
      `• Report blocked drains or flooding via 311 (with photos)\n` +
      `Stay safe. Authorities are responding.`

    return { opsMessage, publicMessage }
  }

  detailsToSummary(details = []) {
    if (!details.length) return 'No active zones.'
    return details
      .map(d =>
        `${d.zone}: risk=${(d.riskScore ?? 0).toFixed(2)} (${d.tier}), ` +
        `incidents=${d.incidentCount}, social=${d.socialCount}, rainProb=${d.rainProb ?? 0}%`
      )
      .join(' | ')
  }
}

export default CommsAgent

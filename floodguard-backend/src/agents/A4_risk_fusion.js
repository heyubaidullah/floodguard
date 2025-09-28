import { prisma } from '../db/prisma.js'
import { resolveZones, asGeoJSONWithScores } from '../lib/zones.js'
import { Task } from '../adk/runtime.js'
import { generateStructuredJson, LlmDisabledError } from './ai/llmClient.js'

export const A4_RiskFusion = new Task('A4_RiskFusion', async (input, ctx) => {
  const params = ctx?.params ?? {}
  const zones = resolveZones(params)
  const weatherRows = Array.isArray(input?.weather) ? input.weather : []
  const incidents = Array.isArray(input?.incidents) ? input.incidents : []
  const social = Array.isArray(input?.social) ? input.social : []
  const upstreamMeta = input?.meta ?? null

  const zoneContext = buildZoneContext({ weatherRows, incidents, social, params, zones })

  let usedMode = 'ai'
  let fused

  try {
    fused = await fuseWithAi(zoneContext, zones)
  } catch (error) {
    usedMode = 'fallback'
    fused = fuseWithHeuristics(zoneContext)
    if (!(error instanceof LlmDisabledError)) {
      console.warn('A4_RiskFusion fallback heuristics engaged:', error?.message ?? error)
    }
  }

  await updateForecastRiskScores(weatherRows, fused.scores)

  const geojson = asGeoJSONWithScores(fused.scores, zones)

  return {
    ...input,
    scores: fused.scores,
    geojson,
    meta: { agent: 'A4', mode: usedMode, summary: fused.summary ?? fused.rationale ?? null, upstream: upstreamMeta },
  }
})

function buildZoneContext({ weatherRows, incidents, social, params, zones }) {
  const incidentWindowMin = params?.incidentWindowMin ?? 90
  const cutoff = new Date(Date.now() - incidentWindowMin * 60 * 1000)

  const weatherMap = new Map()
  for (const row of weatherRows) {
    if (row?.zone) weatherMap.set(row.zone, row)
  }

  const filteredIncidents = incidents.filter((i) => !cutoff || !i?.timestamp || new Date(i.timestamp) >= cutoff)
  const filteredSocial = social.filter((s) => !cutoff || !s?.timestamp || new Date(s.timestamp) >= cutoff)

  return zones.map((zone) => ({
    zone: zone.id,
    name: zone.name,
    location: zone.center,
    rainProb: Number(weatherMap.get(zone.id)?.rainProb ?? 0) || 0,
    rainAmount: Number(weatherMap.get(zone.id)?.rainAmount ?? 0) || 0,
    weatherId: weatherMap.get(zone.id)?.id ?? null,
    incidents: filteredIncidents.filter((i) => i.zone === zone.id).map((i) => ({ type: i.type, description: i.description })),
    social: filteredSocial.filter((s) => s.zone === zone.id).map((s) => ({ text: s.text, riskFlag: Boolean(s.riskFlag) })),
  }))
}

async function fuseWithAi(zoneContext, zones) {
  const instructions = [
    'You are FloodGuard RiskFusion, an emergency operations AI.',
    'Analyse each zone and compute flood risk.',
    'Return JSON of the form { "scores": { "ZONE": { "riskScore": 0.72, "riskTier": "HIGH", "rationale": "Heavy rain + drain failure" } }, "summary": "short overall note" }.',
    'riskScore must be between 0 and 1. riskTier must be one of SAFE, MEDIUM, HIGH.',
    'Use rainfall probability and incident/social evidence when scoring. Highlight uncertainty in the rationale if evidence is weak.',
  ].join(' ')

  const response = await generateStructuredJson({
    instructions,
    input: { zones: zoneContext },
    temperature: 0.2,
  })

  const rawScores = response?.scores
  if (!rawScores || typeof rawScores !== 'object') throw new Error('AI fusion response missing scores map')

  const scores = {}
  for (const zone of zones) {
    const entry = rawScores[zone.id] || rawScores[zone.id.toLowerCase()]
    if (!entry) throw new Error(`AI fusion missing zone ${zone.id}`)
    const riskScore = clamp(Number(entry.riskScore ?? entry.score ?? 0), 0, 1)
    const riskTier = normaliseTier(entry.riskTier)
    scores[zone.id] = {
      riskScore,
      riskTier,
      rationale: entry.rationale ?? entry.reason ?? null,
    }
  }

  return { scores, summary: response.summary ?? response.note ?? null }
}

function fuseWithHeuristics(zoneContext) {
  const scores = {}
  for (const zone of zoneContext) {
    let score = clamp(Number(zone.rainProb) || 0, 0, 1)
    if (zone.incidents.length >= 1) score += 0.2
    if (zone.social.filter((s) => s.riskFlag).length >= 2) score += 0.2
    score = clamp(Number(score.toFixed(2)), 0, 1)
    scores[zone.zone] = {
      riskScore: score,
      riskTier: score > 0.7 ? 'HIGH' : score >= 0.4 ? 'MEDIUM' : 'SAFE',
      rationale: 'Heuristic fusion of rainfall + incident/social counts',
    }
  }
  return { scores, summary: 'Heuristic risk fusion fallback' }
}

async function updateForecastRiskScores(weatherRows, scores) {
  for (const row of weatherRows) {
    const zoneScore = scores[row.zone]
    if (!zoneScore || !row?.id) continue
    try {
      await prisma.forecast.update({
        where: { id: row.id },
        data: { riskScore: zoneScore.riskScore },
      })
    } catch (error) {
      console.warn(`Failed to update risk score for forecast ${row.id}`, error?.message ?? error)
    }
  }
}

function clamp(value, min, max) {
  if (!Number.isFinite(value)) return min
  return Math.max(min, Math.min(max, value))
}

function normaliseTier(tier) {
  const value = (tier ?? '').toString().toUpperCase()
  if (value === 'HIGH' || value === 'MEDIUM' || value === 'SAFE') return value
  if (value.startsWith('H')) return 'HIGH'
  if (value.startsWith('M')) return 'MEDIUM'
  return 'SAFE'
}

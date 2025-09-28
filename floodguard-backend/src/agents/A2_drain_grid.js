// A2_drain_grid.js
export class DrainGridAgent { /* Phase 3 */ }
import { prisma } from '../db/prisma.js'
import { resolveZones } from '../lib/zones.js'
import { Task } from '../adk/runtime.js'
import { generateStructuredJson, LlmDisabledError } from './ai/llmClient.js'

const DESCS = [
  'Blocked drain reported',
  'Water pooling at intersection',
  'Overflow from manhole',
  'Debris blocking gutter',
]

export const A2_DrainGrid = new Task('A2_DrainGrid', async (input, ctx) => {
  const params = ctx?.params ?? {}
  const zones = resolveZones(params)
  let usedMode = 'ai'
  let incidents

  try {
    incidents = await inferIncidentsWithAi(params, zones)
  } catch (error) {
    usedMode = 'fallback'
    incidents = fallbackIncidents(params, zones)
    if (!(error instanceof LlmDisabledError)) {
      console.warn('A2_DrainGrid falling back to heuristic incidents:', error?.message ?? error)
    }
  }

  const persisted = []
  for (const incident of incidents) {
    const type = normaliseType(incident.type)
    const description = enrichDescription(incident)
    const zone = validateZone(incident.zone, zones)
    if (!zone) continue
    const latitude = Number(params?.latitude ?? params?.lat)
    const longitude = Number(params?.longitude ?? params?.lon)
    persisted.push(
      await prisma.incident.create({
        data: {
          type,
          description,
          zone,
          locationName: params?.locationName ?? zones.find(z => z.id === zone)?.name,
          latitude: Number.isFinite(latitude) ? latitude : null,
          longitude: Number.isFinite(longitude) ? longitude : null,
        },
      }),
    )
  }

  return { ...input, incidents: persisted, meta: { agent: 'A2', mode: usedMode } }
})

async function inferIncidentsWithAi(params, zones) {
  const instructions = [
    'You are FloodGuard DrainGrid, an AI agent that triages drainage infrastructure alerts.',
    'Return JSON { "incidents": [ { "zoneId": "Z1", "type": "drain", "severity": "HIGH", "description": "Debris blocking main culvert" } ] }.',
    'Base the severity on likely impact (LOW, MEDIUM, HIGH) and keep descriptions short but actionable.',
    'If no issues are likely, still produce at least one low-severity inspection recommendation per zone.',
  ].join(' ')

  const target = Number(params?.simulateIncidents ?? 1)
  const response = await generateStructuredJson({
    instructions,
    input: { zones, target },
    temperature: 0.25,
  })

  const incidents = Array.isArray(response?.incidents) ? response.incidents : []
  if (!incidents.length) throw new Error('AI drain response empty')
  return incidents.map((incident) => ({
    zone: (incident.zoneId ?? incident.zone ?? incident.area ?? zones[0]?.id ?? '').toString().toUpperCase(),
    type: incident.type ?? 'drain',
    severity: (incident.severity ?? 'LOW').toUpperCase(),
    description: incident.description ?? incident.summary ?? 'Drain inspection recommended',
  }))
}

function fallbackIncidents(params = {}, zones) {
  const target = Number(params?.simulateIncidents ?? 1)
  const incidents = []
  for (let i = 0; i < Math.max(1, target); i += 1) {
    const zone = zones[i % zones.length]
    const desc = DESCS[i % DESCS.length]
    incidents.push({
      zone: zone.id,
      type: 'drain',
      severity: i % 3 === 0 ? 'HIGH' : 'MEDIUM',
      description: desc,
    })
  }
  return incidents
}

function normaliseType(value) {
  if (typeof value === 'string') {
    const lowered = value.toLowerCase()
    if (lowered.includes('citizen')) return 'citizen'
  }
  return 'drain'
}

function enrichDescription(incident) {
  const severity = incident.severity ? incident.severity.toUpperCase() : null
  const base = incident.description ?? 'Drain inspection recommended'
  return severity ? `[${severity}] ${base}` : base
}

function validateZone(zoneCandidate, zones) {
  const id = (zoneCandidate ?? '').toString().toUpperCase()
  return zones.some((z) => z.id === id) ? id : null
}

import { prisma } from '../db/prisma.js'
import { Task } from '../adk/runtime.js'
import { generateStructuredJson, LlmDisabledError } from './ai/llmClient.js'

function basicTemplate(highZones, locationName) {
  const zones = highZones.join(', ')
  const prefix = locationName ? `${locationName}: ` : ''
  return {
    ops: `${prefix}OPS: High flood risk in ${zones}. Deploy pumps, inspect drains, stage barricades.`,
    pub: `${prefix}PUBLIC ALERT: High flood risk in ${zones}. Avoid low-lying areas, do not drive through water.`,
  }
}

export const A6_Comms = new Task('A6_Comms', async (input, ctx) => {
  const scores = input?.scores || {}
  const locationName = ctx?.params?.locationName
  const postalCode = ctx?.params?.postalCode
  const highZones = Object.entries(scores)
    .filter(([, v]) => Number(v?.riskScore ?? 0) > 0.7)
    .map(([k]) => k)

  if (highZones.length === 0) return { ...input, alerts: [] }

  let usedMode = 'ai'
  let messages

  try {
    messages = await craftAlertsWithAi({ highZones, scores, locationName, postalCode })
  } catch (error) {
    usedMode = 'fallback'
    messages = basicTemplate(highZones, locationName)
    if (!(error instanceof LlmDisabledError)) {
      console.warn('A6_Comms fallback template used:', error?.message ?? error)
    }
  }

  const created = []
  if (messages?.ops) {
    created.push(
      await prisma.alert.create({ data: { audience: 'ops', message: truncate(messages.ops), riskTier: 'HIGH' } }),
    )
  }
  if (messages?.pub ?? messages?.public) {
    created.push(
      await prisma.alert.create({
        data: { audience: 'public', message: truncate(messages.pub ?? messages.public), riskTier: 'HIGH' },
      }),
    )
  }

  return { ...input, alerts: created, meta: { agent: 'A6', mode: usedMode } }
})

async function craftAlertsWithAi({ highZones, scores, locationName, postalCode }) {
  const instructions = [
    'You are FloodGuard Comms, an AI agent crafting operational flood alerts.',
    'Return JSON { "ops": "...", "public": "..." } with <= 240 characters each.',
    'The ops alert should be imperative and mention mitigations; the public alert should emphasise safety.',
    'If multiple zones are affected, summarise them clearly.',
    locationName ? `Location: ${locationName}${postalCode ? ` (${postalCode})` : ''}.` : '',
  ].join(' ')

  const response = await generateStructuredJson({
    instructions,
    input: { highZones, scores },
    temperature: 0.3,
  })

  if (!response?.ops && !response?.public && Array.isArray(response?.alerts)) {
    const alerts = response.alerts
    return {
      ops: alerts.find((a) => /ops/i.test(a.audience ?? a.channel ?? ''))?.message,
      pub: alerts.find((a) => /public|civ|residents/i.test(a.audience ?? a.channel ?? ''))?.message,
    }
  }

  return {
    ops: response?.ops ?? response?.operators ?? null,
    pub: response?.public ?? response?.civilians ?? null,
  }
}

function truncate(text) {
  if (typeof text !== 'string') return ''
  return text.length > 240 ? `${text.slice(0, 237)}...` : text
}

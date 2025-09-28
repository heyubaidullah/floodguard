// src/a2a/server.js
import express from 'express'
import { v4 as uuidv4 } from 'uuid'
import { prisma } from '../db/prisma.js'

// Import server API via namespace to avoid named-export drift
import * as Server from '@a2a-js/sdk/server'
import { A2AExpressApp } from '@a2a-js/sdk/server/express'

import { WeatherIngestAgent } from '../agents/A1_weather.js'
import { DrainWatchAgent }   from '../agents/A2_drain_grid.js'
import { SocialMediaAgent }  from '../agents/A3_social.js'
import { RiskFusionAgent }   from '../agents/A4_risk_fusion.js'

const PORT = process.env.A2A_PORT ? Number(process.env.A2A_PORT) : 4500
const PUBLIC_URL = process.env.A2A_PUBLIC_URL || `http://localhost:${PORT}`

// Public identity + skills
const floodguardCard = {
  name: 'FloodGuard Agent',
  description: 'Runs weather ingest, simulates drain/social, computes risk, and exposes controls via A2A.',
  protocolVersion: '0.3.0',
  version: '0.3.0',
  url: PUBLIC_URL,
  capabilities: {
    pushNotifications: false,
  },
  skills: [
    { id: 'runCycle',        name: 'Run Cycle',        description: 'Runs a demo cycle: weather → drain simulate' },
    { id: 'ingestWeather',   name: 'Ingest Weather',   description: 'Publishes a weather alert (A1)' },
    { id: 'listIncidents',   name: 'List Incidents',   description: 'Returns latest incidents' },
    { id: 'listSocial',      name: 'List Social',      description: 'Returns latest social signals' },
    { id: 'simulateSocial',  name: 'Simulate Social',  description: 'Adds synthetic social posts for a zone' },
    { id: 'showRisk',        name: 'Show Risk',        description: 'Returns fused risk GeoJSON (A4)' }, // <-- new
  ],
}

// Minimal executor object
class FloodguardExecutor {
  constructor() {
    this.weather = new WeatherIngestAgent()
    this.drain   = new DrainWatchAgent(prisma)
    this.social  = new SocialMediaAgent(prisma)
    this.risk    = new RiskFusionAgent()
    if (this.drain.startListenerOnce) this.drain.startListenerOnce()
  }

  async execute(requestContext, eventBus) {
    const text = (getUserText(requestContext) || '').toLowerCase().trim()

    const wantsIngest   = /\b(ingest|weather)\b/.test(text)
    const wantsListInc  = /\blist\b.*\bincidents?\b/.test(text)
    const wantsListSoc  = /\blist\b.*\bsocial\b/.test(text)
    const wantsSimSoc   = /\bsim(ulate|)\b.*\bsocial\b/.test(text)
    const wantsRisk     = /(show|list|get)\s+(risk|risk\s*map)/.test(text)

    // very simple zone extractor: look for "z<number>"
    const zoneMatch = text.match(/\bz(\d+)\b/i)
    const zone = zoneMatch ? `Z${zoneMatch[1]}` : 'Z1'

    let payload
    try {
      if (wantsIngest) {
        payload = await this.weather.ingestWeatherData()
      } else if (wantsListInc) {
        payload = await this.drain.listIncidents({ take: 10 })
      } else if (wantsListSoc) {
        payload = await this.social.listSocial({ zone, take: 10 })
      } else if (wantsSimSoc) {
        payload = await this.social.simulateBatch(zone, 3)
      } else if (wantsRisk) {
        payload = await this.risk.getRiskMap()
      } else {
        // default “cycle”
        const published = await this.weather.ingestWeatherData()
        payload = { message: 'cycle complete', published }
      }

      eventBus.publish({
        kind: 'message',
        messageId: uuidv4(),
        role: 'agent',
        parts: [{ kind: 'text', text: JSON.stringify(payload) }],
        contextId: requestContext.contextId,
      })
      eventBus.finished()
    } catch (err) {
      eventBus.publish({
        kind: 'message',
        messageId: uuidv4(),
        role: 'agent',
        parts: [{ kind: 'text', text: `Error: ${err?.message || err}` }],
        contextId: requestContext.contextId,
      })
      eventBus.finished()
    }
  }

  cancelTask = async () => {}
}

function getUserText(requestContext) {
  const p = requestContext?.message?.parts
  const part = Array.isArray(p) ? p.find(x => x?.kind === 'text') : null
  return part?.text
}

// Boot the A2A server
const agentExecutor = new FloodguardExecutor()
const handler = new Server.DefaultRequestHandler(
  floodguardCard,
  new Server.InMemoryTaskStore(),
  agentExecutor
)
const appBuilder = new A2AExpressApp(handler)
const expressApp = appBuilder.setupRoutes(express())

// JSON parsing
expressApp.use(express.json())

// Minimal message endpoint compatible with our client
expressApp.post('/a2a/message', async (req, res) => {
  try {
    const text =
      req.body?.parts?.find(p => p?.kind === 'text')?.text ??
      req.body?.text ?? ''

    const requestContext = {
      contextId: uuidv4(),
      message: { kind: 'message', role: 'user', parts: [{ kind: 'text', text }] },
    }

    const events = []
    const eventBus = {
      publish: (msg) => events.push(msg),
      finished: () => {},
    }

    await agentExecutor.execute(requestContext, eventBus)
    return res.status(200).json({ ok: true, events })
  } catch (err) {
    return res.status(500).json({ ok: false, error: err?.message || String(err) })
  }
})

expressApp.listen(PORT, () => {
  console.log(`🟢 A2A server ready on ${PUBLIC_URL}`)
  console.log(`    Agent Card: ${PUBLIC_URL}/.well-known/agent-card.json`)
})

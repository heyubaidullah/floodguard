// src/a2a/server.js
import express from 'express'
import { v4 as uuidv4 } from 'uuid'
import { prisma } from '../db/prisma.js'

// Import server API via namespace to avoid named-export drift
import * as Server from '@a2a-js/sdk/server'
import { A2AExpressApp } from '@a2a-js/sdk/server/express'

import { WeatherIngestAgent } from '../agents/A1_weather.js'
import { DrainWatchAgent }   from '../agents/A2_drain_grid.js'

const PORT = process.env.A2A_PORT ? Number(process.env.A2A_PORT) : 4500
const PUBLIC_URL = process.env.A2A_PUBLIC_URL || `http://localhost:${PORT}`

// Public identity + skills
const floodguardCard = {
  name: 'FloodGuard Agent',
  description: 'Runs weather ingest and triggers drain watch; exposes FloodGuard controls via A2A.',
  protocolVersion: '0.3.0',
  version: '0.1.0',
  url: PUBLIC_URL,

  // ✅ add this block
  capabilities: {
    pushNotifications: false,   // minimal required field for current SDK
  },

  skills: [
    { id: 'runCycle',      name: 'Run Cycle',      description: 'Runs a demo cycle: weather → drain simulate' },
    { id: 'ingestWeather', name: 'Ingest Weather', description: 'Publishes a weather alert (A1)' },
    { id: 'listIncidents', name: 'List Incidents', description: 'Returns latest incidents' },
  ],
}


// Minimal executor object (no base class needed)
class FloodguardExecutor {
  constructor() {
    this.weather = new WeatherIngestAgent()
    this.drain   = new DrainWatchAgent(prisma)
    this.drain.startListenerOnce()
  }

  async execute(requestContext, eventBus) {
    const text = getUserText(requestContext) || ''
    const wantsIngest = /\bingest\b|\bweather\b/i.test(text)
    const wantsList   = /\blist\b|\bincidents?\b/i.test(text)
    let payload

    try {
      if (wantsIngest) {
        payload = await this.weather.ingestWeatherData()
      } else if (wantsList) {
        payload = await this.drain.listIncidents({ take: 10 })
      } else {
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


// ✅ add JSON body parsing (needed for POST)
expressApp.use(express.json())

// ✅ add a minimal A2A-compatible message endpoint
expressApp.post('/a2a/message', async (req, res) => {
  try {
    const text =
      req.body?.parts?.find(p => p?.kind === 'text')?.text ??
      req.body?.text ??
      ''

    // Build a minimal RequestContext
    const requestContext = {
      contextId: uuidv4(),
      message: {
        kind: 'message',
        role: 'user',
        parts: [{ kind: 'text', text }],
      },
    }

    // Collect executor outputs via an in-memory event bus
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


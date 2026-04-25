import { OrchestratorAgent } from '../agents/A0_orchestrator.js';
import { A4_RiskFusion } from '../agents/A4_risk_fusion.js';
import { requestContext } from '../lib/requestContext.js';
import { env } from '../env.js';
import { getDemoSnapshot } from '../demo/snapshot.js';
import { seedDemoData } from '../demo/seedDemo.js';
import { injectTrace } from '../a2a/bus.js';

const orchestrator = new OrchestratorAgent();

export default async function agentRoutes(fastify) {
  // Check whether the server has a Gemini key configured (never exposes the key itself)
  fastify.get('/ops/ai-status', async (req) => {
    const byokHeader = (req.headers['x-gemini-key'] ?? '').trim()
    return {
      hasServerKey: Boolean(env.GEMINI_API_KEY),
      hasRequestKey: byokHeader.length > 0,
      aiEnabled: Boolean(env.GEMINI_API_KEY) || byokHeader.length > 0,
    }
  })

  // Demo snapshot — seeds realistic pre-recorded data into DB, then returns snapshot shape
  fastify.get('/ops/demo', async () => {
    const { scores, alerts } = await seedDemoData()
    const snapshot = getDemoSnapshot()

    // Inject synthetic A2A trace entries so AgentTimeline populates in demo mode
    const now = new Date()
    const ts = (offsetMs) => new Date(now.getTime() - offsetMs).toISOString()
    injectTrace([
      { dir: '→', env: { a2a: '2.0', id: 'demo-req-a1', from: 'A0', to: 'A1', type: 'request', timestamp: ts(9000), payload: {} } },
      { dir: '→', env: { a2a: '2.0', id: 'demo-req-a2', from: 'A0', to: 'A2', type: 'request', timestamp: ts(8900), payload: {} } },
      { dir: '→', env: { a2a: '2.0', id: 'demo-req-a3', from: 'A0', to: 'A3', type: 'request', timestamp: ts(8800), payload: {} } },
      { dir: '←', env: { a2a: '2.0', id: 'demo-res-a1', from: 'A1', to: 'A0', type: 'response', correlationId: 'demo-req-a1', timestamp: ts(7200), payload: {} } },
      { dir: '←', env: { a2a: '2.0', id: 'demo-res-a2', from: 'A2', to: 'A0', type: 'response', correlationId: 'demo-req-a2', timestamp: ts(6800), payload: {} } },
      { dir: '←', env: { a2a: '2.0', id: 'demo-res-a3', from: 'A3', to: 'A0', type: 'response', correlationId: 'demo-req-a3', timestamp: ts(6500), payload: {} } },
      { dir: '→', env: { a2a: '2.0', id: 'demo-req-a4', from: 'A0', to: 'A4', type: 'request', timestamp: ts(6300), payload: {} } },
      { dir: '←', env: { a2a: '2.0', id: 'demo-res-a4', from: 'A4', to: 'A0', type: 'response', correlationId: 'demo-req-a4', timestamp: ts(4800), payload: {} } },
      { dir: '→', env: { a2a: '2.0', id: 'demo-req-a6', from: 'A0', to: 'A6', type: 'request', timestamp: ts(4600), payload: {} } },
      { dir: '←', env: { a2a: '2.0', id: 'demo-res-a6', from: 'A6', to: 'A0', type: 'response', correlationId: 'demo-req-a6', timestamp: ts(3100), payload: {} } },
    ])

    return { ...snapshot, scores, alerts }
  })

  // One full parallel cycle — with optional BYOK Gemini key from request header
  fastify.post('/ops/run', async (req) => {
    const simulateIncidents = Number(req.query?.inc ?? 1);
    const simulateSocial    = Number(req.query?.soc ?? 2);
    const params = { simulateIncidents, simulateSocial, ...parseLocationQuery(req.query) }

    const byokKey = (req.headers['x-gemini-key'] ?? '').trim() || null

    if (byokKey) {
      return requestContext.run({ geminiApiKey: byokKey }, () => orchestrator.runOnce(params))
    }
    return orchestrator.runOnce(params);
  });

  // Continuous loop control
  fastify.post('/ops/loop/start', async (req) => {
    const intervalMs        = Number(req.query?.intervalMs ?? 5000);
    const simulateIncidents = Number(req.query?.inc ?? 1);
    const simulateSocial    = Number(req.query?.soc ?? 2);
    const params = { simulateIncidents, simulateSocial, ...parseLocationQuery(req.query) }

    const byokKey = (req.headers['x-gemini-key'] ?? '').trim() || null

    if (byokKey) {
      return requestContext.run({ geminiApiKey: byokKey }, () => orchestrator.startLoop({ intervalMs, ...params }))
    }
    return orchestrator.startLoop({ intervalMs, ...params });
  });

  fastify.post('/ops/loop/stop', async () => orchestrator.stopLoop());

  // Risk GeoJSON (convenience for frontend maps)
  fastify.get('/risk/map', async (req) => {
    const params = parseLocationQuery(req.query)
    const byokKey = (req.headers['x-gemini-key'] ?? '').trim() || null

    if (byokKey) {
      const result = await requestContext.run(
        { geminiApiKey: byokKey },
        () => A4_RiskFusion.run({}, { params: { incidentWindowMin: 90, ...params } })
      )
      return result.geojson
    }
    const out = await A4_RiskFusion.run({}, { params: { incidentWindowMin: 90, ...params } });
    return out.geojson;
  });
}

function parseLocationQuery(query = {}) {
  const latitudeRaw = query.lat ?? query.latitude
  const longitudeRaw = query.lon ?? query.lng ?? query.longitude
  const latitude = latitudeRaw !== undefined ? Number(latitudeRaw) : undefined
  const longitude = longitudeRaw !== undefined ? Number(longitudeRaw) : undefined
  const postalCode = query.postal ?? query.postalCode ?? query.pincode
  const zoneId = query.zoneId ?? query.zone ?? postalCode
  return {
    latitude: Number.isFinite(latitude) ? latitude : undefined,
    longitude: Number.isFinite(longitude) ? longitude : undefined,
    locationName: query.location ?? query.locationName,
    postalCode: postalCode ? String(postalCode) : undefined,
    zoneId: zoneId ? String(zoneId).toUpperCase() : undefined,
  }
}

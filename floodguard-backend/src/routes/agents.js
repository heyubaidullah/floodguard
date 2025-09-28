import { OrchestratorAgent } from '../agents/A0_orchestrator.js';
import { A4_RiskFusion } from '../agents/A4_risk_fusion.js';

const orchestrator = new OrchestratorAgent();

export default async function agentRoutes(fastify) {
  // One full parallel cycle
  fastify.post('/ops/run', async (req) => {
    const simulateIncidents = Number(req.query?.inc ?? 1);
    const simulateSocial    = Number(req.query?.soc ?? 2);
    const params = { simulateIncidents, simulateSocial, ...parseLocationQuery(req.query) }
    return orchestrator.runOnce(params);
  });

  // Continuous loop control
  fastify.post('/ops/loop/start', async (req) => {
    const intervalMs        = Number(req.query?.intervalMs ?? 5000);
    const simulateIncidents = Number(req.query?.inc ?? 1);
    const simulateSocial    = Number(req.query?.soc ?? 2);
    const params = { simulateIncidents, simulateSocial, ...parseLocationQuery(req.query) }
    return orchestrator.startLoop({ intervalMs, ...params });
  });

  fastify.post('/ops/loop/stop', async () => orchestrator.stopLoop());

  // Risk GeoJSON (convenience for frontend maps)
  fastify.get('/risk/map', async (req) => {
    const params = parseLocationQuery(req.query)
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

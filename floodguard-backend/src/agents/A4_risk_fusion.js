// src/agents/A4_risk_fusion.js

/**
 * A4 Risk Fusion
 * Combines latest Forecast + Incidents + Social into a simple risk score per zone,
 * returns a GeoJSON FeatureCollection suitable for map layers.
 */
import { prisma } from '../db/prisma.js'

export class RiskFusionAgent {
  // Helper: convert numeric score to tier
  scoreToTier(score) {
    if (score >= 0.75) return 'high'
    if (score >= 0.4)  return 'medium'
    return 'low'
  }

  // Helper: build dummy polygon per zone (rectangle around a centroid)
  zonePolygon(zone) {
    // quick centroids for demo
    const centers = {
      Z1: [ -98.50, 29.45 ],
      Z2: [ -98.48, 29.47 ],
      Z3: [ -98.46, 29.49 ],
      Z4: [ -98.44, 29.51 ],
    }
    const [cx, cy] = centers[zone] || centers.Z1
    const d = 0.005
    return {
      type: 'Polygon',
      coordinates: [[
        [cx - d, cy - d],
        [cx + d, cy - d],
        [cx + d, cy + d],
        [cx - d, cy + d],
        [cx - d, cy - d],
      ]],
    }
  }

  /**
   * Compute fused risk and return GeoJSON
   * Rule of thumb (adjust as needed):
   *   base = latest forecast.riskScore (0..1, default 0.2)
   *   +0.15 if there were recent incidents in zone (last 24h)
   *   +0.10 if there were recent social risk posts in zone (last 24h)
   * score is clamped to [0,1], tier derived from score.
   */
  async getRiskMap() {
    // 1) pull recent data
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000)

    const [forecasts, incidents, social] = await Promise.all([
      prisma.forecast.findMany({ orderBy: { timestamp: 'desc' } }),
      prisma.incident.findMany({ where: { timestamp: { gte: since } } }),
      prisma.socialSignal?.findMany
        ? prisma.socialSignal.findMany({ where: { timestamp: { gte: since } } })
        : Promise.resolve([]),
    ])

    // normalize to map by zone
    const latestForecastByZone = new Map()
    for (const f of forecasts) {
      if (!latestForecastByZone.has(f.zone)) latestForecastByZone.set(f.zone, f)
    }

    const incidentCountByZone = new Map()
    for (const i of incidents) {
      incidentCountByZone.set(i.zone, (incidentCountByZone.get(i.zone) || 0) + 1)
    }

    const socialCountByZone = new Map()
    for (const s of social) {
      if (s.riskFlag) {
        socialCountByZone.set(s.zone, (socialCountByZone.get(s.zone) || 0) + 1)
      }
    }

    // union of zones observed anywhere
    const zones = new Set([
      ...Array.from(latestForecastByZone.keys()),
      ...Array.from(incidentCountByZone.keys()),
      ...Array.from(socialCountByZone.keys()),
      'Z1','Z2','Z3','Z4', // ensure at least a few zones for demo
    ])

    // 2) fuse risk
    const features = []
    for (const zone of zones) {
      const f = latestForecastByZone.get(zone)
      let score = Math.max(0, Math.min(1, f?.riskScore ?? 0.2))

      if ((incidentCountByZone.get(zone) || 0) > 0) score += 0.15
      if ((socialCountByZone.get(zone) || 0) > 0)   score += 0.10
      score = Math.max(0, Math.min(1, score))

      const tier = this.scoreToTier(score)

      features.push({
        type: 'Feature',
        geometry: this.zonePolygon(zone),
        properties: {
          zone,
          tier,
          riskScore: score,
          rainProb: f?.rainProb ?? null,
          rainAmount: f?.rainAmount ?? null,
          incidentCount: incidentCountByZone.get(zone) || 0,
          socialCount: socialCountByZone.get(zone) || 0,
          updatedAt: f?.timestamp ?? null,
        },
      })
    }

    return {
      type: 'FeatureCollection',
      features,
    }
  }
}

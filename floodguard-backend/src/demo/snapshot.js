/**
 * Pre-recorded realistic cycle snapshot for Demo mode.
 * Covers three zones with all three risk tiers: HIGH, MEDIUM, SAFE.
 * Shape matches OrchestratorAgent.runOnce() output exactly.
 */

const DEMO_ZONES = {
  HIGH: { id: 'DEMO-HIGH', name: 'Bayshore District', lat: 25.7617, lon: -80.1918 },
  MEDIUM: { id: 'DEMO-MED', name: 'Midtown Heights', lat: 25.8007, lon: -80.1931 },
  SAFE: { id: 'DEMO-SAFE', name: 'Coral Terrace', lat: 25.7473, lon: -80.2870 },
}

export function getDemoSnapshot() {
  const now = new Date().toISOString()

  return {
    cycleId: `demo-cycle-${Date.now()}`,
    scores: {
      [DEMO_ZONES.HIGH.id]: {
        riskScore: 0.87,
        riskTier: 'HIGH',
        rationale:
          'Severe rainfall (82% probability, 18 mm) combined with 3 citizen drain-blockage reports and 4 flagged social posts indicating street flooding. Immediate response recommended.',
      },
      [DEMO_ZONES.MEDIUM.id]: {
        riskScore: 0.54,
        riskTier: 'MEDIUM',
        rationale:
          'Moderate rainfall (54% probability, 7 mm). One infrastructure incident reported. Social sentiment shows concern but no confirmed flooding.',
      },
      [DEMO_ZONES.SAFE.id]: {
        riskScore: 0.18,
        riskTier: 'SAFE',
        rationale:
          'Low rainfall probability (18%). No incidents or flagged social activity in the past 90 minutes. Drainage infrastructure appears nominal.',
      },
    },
    alerts: [
      {
        id: 'demo-alert-ops',
        audience: 'ops',
        message:
          `OPS ALERT – ${DEMO_ZONES.HIGH.name}: HIGH flood risk. Deploy pump units to Storm Basin 7. Inspect drain grates on Biscayne Blvd. Stage traffic barricades at intersections. Coordinate with emergency services.`,
        riskTier: 'HIGH',
        createdAt: now,
      },
      {
        id: 'demo-alert-pub',
        audience: 'public',
        message:
          `PUBLIC ALERT – ${DEMO_ZONES.HIGH.name}: High flood risk detected. Avoid low-lying roads and underpasses. Do NOT drive through standing water. Tune in to local emergency radio. Call 911 for life-threatening emergencies.`,
        riskTier: 'HIGH',
        createdAt: now,
      },
    ],
    weather: [
      { id: 'demo-w1', zone: DEMO_ZONES.HIGH.id, rainProb: 0.82, rainAmount: 18.4, riskScore: 0.87, timestamp: now },
      { id: 'demo-w2', zone: DEMO_ZONES.MEDIUM.id, rainProb: 0.54, rainAmount: 7.1, riskScore: 0.54, timestamp: now },
      { id: 'demo-w3', zone: DEMO_ZONES.SAFE.id, rainProb: 0.18, rainAmount: 1.2, riskScore: 0.18, timestamp: now },
    ],
    incidents: [
      { id: 'demo-i1', type: 'drain', zone: DEMO_ZONES.HIGH.id, description: 'Blocked storm drain on Bayshore Dr — water backing up', locationName: 'Bayshore Dr & 15th', timestamp: now },
      { id: 'demo-i2', type: 'citizen', zone: DEMO_ZONES.HIGH.id, description: 'Street flooding ankle-deep at intersection of 12th and Bay', locationName: '12th Ave & Bay Rd', timestamp: now },
      { id: 'demo-i3', type: 'drain', zone: DEMO_ZONES.HIGH.id, description: 'Overflow from gutter on NW 5th — pavement cracking', locationName: 'NW 5th St', timestamp: now },
      { id: 'demo-i4', type: 'citizen', zone: DEMO_ZONES.MEDIUM.id, description: 'Puddles forming near midtown underpass', locationName: 'Midtown Underpass', timestamp: now },
    ],
    social: [
      { id: 'demo-s1', zone: DEMO_ZONES.HIGH.id, user: '@bayshore_resident', text: 'Can barely walk down my street — standing water all the way to the corner. #BayshoreFlooding 🚨', riskFlag: true, timestamp: now },
      { id: 'demo-s2', zone: DEMO_ZONES.HIGH.id, user: '@miamialerts', text: 'ALERT: Bayshore District experiencing active street flooding. Avoid the area. City crews are on scene.', riskFlag: true, timestamp: now },
      { id: 'demo-s3', zone: DEMO_ZONES.HIGH.id, user: '@commuter305', text: 'My car is stuck — water came up so fast on Bay Rd. Do NOT come this way.', riskFlag: true, timestamp: now },
      { id: 'demo-s4', zone: DEMO_ZONES.HIGH.id, user: '@weatherwatch_mia', text: 'Rainfall radar shows 18+ mm accumulation over Bayshore in the last hour. Drainage cannot keep up.', riskFlag: true, timestamp: now },
      { id: 'demo-s5', zone: DEMO_ZONES.MEDIUM.id, user: '@midtown_watch', text: 'Puddles around the underpass getting worse. Anyone know if city crews are coming?', riskFlag: false, timestamp: now },
      { id: 'demo-s6', zone: DEMO_ZONES.SAFE.id, user: '@coral_terrace_news', text: 'Light drizzle here in Coral Terrace. Roads clear so far, keeping an eye on it.', riskFlag: false, timestamp: now },
    ],
    geojson: {
      type: 'FeatureCollection',
      features: [
        makeFeature(DEMO_ZONES.HIGH, 0.87, 'HIGH'),
        makeFeature(DEMO_ZONES.MEDIUM, 0.54, 'MEDIUM'),
        makeFeature(DEMO_ZONES.SAFE, 0.18, 'SAFE'),
      ],
    },
    meta: {
      A1: { agent: 'A1', mode: 'demo' },
      A2: { agent: 'A2', mode: 'demo' },
      A3: { agent: 'A3', mode: 'demo' },
      A4: { agent: 'A4', mode: 'demo', summary: 'Demo snapshot: realistic multi-zone flood scenario (Bayshore District HIGH, Midtown Heights MEDIUM, Coral Terrace SAFE)' },
      A6: { agent: 'A6', mode: 'demo' },
      location: { locationName: 'Miami Demo Scenario', zoneId: 'DEMO', postalCode: 'DEMO' },
    },
  }
}

function makeFeature(zone, score, tier) {
  return {
    type: 'Feature',
    properties: { zone: zone.id, name: zone.name, riskScore: score, riskTier: tier },
    geometry: {
      type: 'Point',
      coordinates: [zone.lon, zone.lat],
    },
  }
}

/**
 * Returns a pre-built GeoJSON FeatureCollection for all demo zones.
 * Used by /risk/map to avoid calling A4_RiskFusion (and thus Gemini) for DEMO-* zones.
 */
export function getDemoGeoJSON() {
  return {
    type: 'FeatureCollection',
    features: [
      makeFeature(DEMO_ZONES.HIGH,   0.87, 'HIGH'),
      makeFeature(DEMO_ZONES.MEDIUM, 0.54, 'MEDIUM'),
      makeFeature(DEMO_ZONES.SAFE,   0.18, 'SAFE'),
    ],
  }
}

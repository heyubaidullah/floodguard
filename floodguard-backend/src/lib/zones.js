export const ZONES = [
  { id: 'Z1', name: 'Zone 1', center: [-98.4951, 29.4241] },
  { id: 'Z2', name: 'Zone 2', center: [-98.5, 29.46] },
  { id: 'Z3', name: 'Zone 3', center: [-98.48, 29.40] }
]

export function resolveZones(params) {
  const lon = Number(params?.longitude ?? params?.lon)
  const lat = Number(params?.latitude ?? params?.lat)
  if (Number.isFinite(lon) && Number.isFinite(lat)) {
    const zoneId = String(params?.zoneId ?? params?.postalCode ?? params?.zone ?? 'LOC').toUpperCase()
    const name = params?.locationName ?? params?.location ?? zoneId
    return [{ id: zoneId, name, center: [lon, lat] }]
  }
  return ZONES
}

export function asGeoJSONWithScores(scoresByZone, zones = ZONES) {
  return {
    type: 'FeatureCollection',
    features: zones.map(z => ({
      type: 'Feature',
      properties: {
        zone: z.id,
        name: z.name,
        riskScore: scoresByZone[z.id]?.riskScore ?? 0,
        riskTier: scoresByZone[z.id]?.riskTier ?? 'SAFE'
      },
      geometry: { type: 'Point', coordinates: z.center }
    }))
  }
}

export function zoneIdFromParams(params) {
  const zones = resolveZones(params)
  return zones[0]?.id ?? 'Z1'
}

import axios from 'axios'
import type { SelectedLocation } from './types/location'

const BASE = import.meta.env.VITE_API_BASE as string

export const api = axios.create({
  baseURL: BASE,
  timeout: 8000, // avoid hanging calls
})

// ---------- existing endpoints ----------
function buildLocationParams(location?: SelectedLocation | null, zoneOverride?: string) {
  if (!location) return {}
  return {
    lat: location.latitude,
    lon: location.longitude,
    location: location.label,
    postal: location.postalCode,
    zoneId: zoneOverride ?? location.zoneId,
  }
}

export async function runCycle(inc = 1, soc = 2, location?: SelectedLocation | null, zoneOverride?: string) {
  const { data } = await api.post('/ops/run', undefined, {
    params: {
      inc,
      soc,
      ...buildLocationParams(location, zoneOverride),
    },
  })
  return data
}
export async function startLoop(intervalMs = 15000, inc = 1, soc = 2, location?: SelectedLocation | null, zoneOverride?: string) {
  const { data } = await api.post('/ops/loop/start', undefined, {
    params: {
      intervalMs,
      inc,
      soc,
      ...buildLocationParams(location, zoneOverride),
    },
  })
  return data
}
export async function stopLoop() {
  const { data } = await api.post(`/ops/loop/stop`)
  return data
}
export async function getRiskMap(location?: SelectedLocation | null, zoneOverride?: string) {
  const { data } = await api.get('/risk/map', {
    params: buildLocationParams(location, zoneOverride),
  })
  return data
}
export async function getForecast(zoneId?: string) {
  const { data } = await api.get('/forecast', {
    params: zoneId ? { zone: zoneId } : undefined,
  })
  return data
}
export async function getIncidents(zoneId?: string) {
  const { data } = await api.get('/incidents', {
    params: zoneId ? { zone: zoneId } : undefined,
  })
  return data
}
type IncidentLocation = {
  name?: string
  latitude?: number
  longitude?: number
}

export async function reportIncident(
  zone: string,
  description: string,
  type: 'drain' | 'citizen' = 'citizen',
  location?: IncidentLocation,
) {
  const { data } = await api.post('/incidents/report', {
    zone,
    description,
    type,
    locationName: location?.name,
    latitude: location?.latitude,
    longitude: location?.longitude,
  })
  return data
}
export async function getSocial(zoneId?: string) {
  const { data } = await api.get('/social', {
    params: zoneId ? { zone: zoneId } : undefined,
  })
  return data
}
export async function getAlerts() {
  const { data } = await api.get('/alerts')
  return data
}

// ---------- hardened trace ----------
export async function getTrace(): Promise<any[]> {
  try {
    const { data } = await api.get('/ops/trace')
    // Some environments return '' or objects on error; always normalize to array
    if (Array.isArray(data)) return data
    return []
  } catch {
    // Never let this throw into UI components
    return []
  }
}

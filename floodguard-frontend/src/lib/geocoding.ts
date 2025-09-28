const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined

export type GeocodeResult = {
  id: string
  label: string
  latitude: number
  longitude: number
  postalCode?: string
}

function ensureToken() {
  if (!MAPBOX_TOKEN) throw new Error('Missing Mapbox token')
  return MAPBOX_TOKEN
}

export async function reverseGeocode(lon: number, lat: number): Promise<GeocodeResult | null> {
  try {
    const token = ensureToken()
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lon},${lat}.json?types=address,place,postcode&limit=1&access_token=${token}`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Reverse geocode failed: ${res.status}`)
    const json = await res.json()
    const feature = Array.isArray(json?.features) ? json.features[0] : undefined
    if (!feature) return null
    const context = Array.isArray(feature.context) ? feature.context : []
    const postcode = feature.postcode
      ?? context.find((c: any) => typeof c?.id === 'string' && c.id.startsWith('postcode'))?.text
    return {
      id: feature.id,
      label: feature.place_name ?? `${lat.toFixed(3)}, ${lon.toFixed(3)}`,
      latitude: lat,
      longitude: lon,
      postalCode: postcode,
    }
  } catch (error) {
    console.warn('reverseGeocode error', error)
    return null
  }
}

export async function forwardGeocode(query: string, limit = 5): Promise<GeocodeResult[]> {
  if (!query.trim()) return []
  try {
    const token = ensureToken()
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?types=address,place,postcode&limit=${limit}&access_token=${token}`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Forward geocode failed: ${res.status}`)
    const json = await res.json()
    const features = Array.isArray(json?.features) ? json.features : []
    return features.map((feature: any) => {
      const [lon, lat] = Array.isArray(feature?.center) ? feature.center : [0, 0]
      const context = Array.isArray(feature?.context) ? feature.context : []
      const postcode = feature?.postcode
        ?? context.find((c: any) => typeof c?.id === 'string' && c.id.startsWith('postcode'))?.text
      return {
        id: feature.id,
        label: feature.place_name ?? feature.text ?? query,
        latitude: lat,
        longitude: lon,
        postalCode: postcode,
      }
    })
  } catch (error) {
    console.warn('forwardGeocode error', error)
    return []
  }
}

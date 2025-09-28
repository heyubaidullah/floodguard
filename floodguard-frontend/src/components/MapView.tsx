import { useCallback, useEffect, useMemo, useState } from 'react'
import Map, { Layer, Source, NavigationControl, Marker, ViewStateChangeEvent, MapLayerMouseEvent } from 'react-map-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import Card from './Card'
import { getRiskMap } from '../api'
import { reverseGeocode } from '../lib/geocoding'
import type { SelectedLocation } from '../types/location'

const TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string

type MapViewProps = {
  refreshKey: number
  theme: 'light' | 'dark'
  selectedLocation: SelectedLocation
  onLocationSelect: (location: SelectedLocation) => void
}

export default function MapView({ refreshKey, theme, selectedLocation, onLocationSelect }: MapViewProps) {
  const [geojson, setGeojson] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [resolving, setResolving] = useState(false)
  const [viewState, setViewState] = useState({
    longitude: selectedLocation.longitude,
    latitude: selectedLocation.latitude,
    zoom: 12,
  })

  async function load() {
    setLoading(true)
    try {
      setGeojson(await getRiskMap(selectedLocation, selectedLocation.zoneId))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [refreshKey, selectedLocation.latitude, selectedLocation.longitude, selectedLocation.zoneId])

  useEffect(() => {
    setViewState(v => ({ ...v, longitude: selectedLocation.longitude, latitude: selectedLocation.latitude }))
  }, [selectedLocation.latitude, selectedLocation.longitude])

  const circleLayer = useMemo(() => ({
    id: 'risk-circles',
    type: 'circle',
    paint: {
      'circle-radius': 12,
      'circle-color': [
        'match', ['get', 'riskTier'],
        'HIGH', '#ef4444',
        'MEDIUM', '#f59e0b',
        'SAFE', '#10b981',
        /* other */ '#9ca3af',
      ],
      'circle-stroke-width': 1.5,
      'circle-stroke-color': theme === 'dark' ? '#f9fafb' : '#111827',
    },
  } as const), [theme])

  const handleMove = useCallback((evt: ViewStateChangeEvent) => {
    setViewState(evt.viewState)
  }, [])

  const handleMapClick = useCallback(async (event: MapLayerMouseEvent) => {
    const { lng, lat } = event.lngLat ?? {}
    if (typeof lng !== 'number' || typeof lat !== 'number') return
    setResolving(true)
    try {
      const result = await reverseGeocode(lng, lat)
      if (result) {
        const zoneId = (result.postalCode ?? selectedLocation.zoneId ?? 'LOC').toString().toUpperCase()
        onLocationSelect({
          label: result.label,
          latitude: result.latitude,
          longitude: result.longitude,
          postalCode: result.postalCode,
          zoneId,
          source: 'map',
        })
      } else {
        const zoneId = (selectedLocation.zoneId ?? 'LOC').toString().toUpperCase()
        onLocationSelect({
          label: `Lat ${lat.toFixed(3)}, Lon ${lng.toFixed(3)}`,
          latitude: lat,
          longitude: lng,
          zoneId,
          postalCode: selectedLocation.postalCode,
          source: 'map',
        })
      }
    } catch (error) {
      console.warn('Map click reverse geocode failed', error)
    } finally {
      setResolving(false)
    }
  }, [onLocationSelect, selectedLocation.zoneId, selectedLocation.postalCode])

  return (
    <Card title="Risk Map">
      <div className="h-[420px] rounded-xl overflow-hidden">
        <Map
          mapboxAccessToken={TOKEN}
          {...viewState}
          initialViewState={viewState}
          onMove={handleMove}
          onClick={handleMapClick}
          cursor={resolving ? 'progress' : 'pointer'}
          mapStyle={theme === 'dark' ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/light-v11'}
          style={{ width: '100%', height: '100%' }}
        >
          {geojson && (
            <Source id="risk" type="geojson" data={geojson}>
              <Layer {...circleLayer} />
            </Source>
          )}
          <Marker longitude={selectedLocation.longitude} latitude={selectedLocation.latitude} anchor="bottom">
            <div className="rounded-full bg-emerald-500 px-2 py-1 text-xs font-medium text-white shadow-lg">
              {selectedLocation.zoneId}
            </div>
            <div className="mx-auto h-2 w-2 -mt-1 rotate-45 bg-emerald-500" />
          </Marker>
          <div className="absolute right-2 top-2"><NavigationControl /></div>
        </Map>
      </div>
      <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
        {loading ? 'Loading risk…' : resolving ? 'Resolving location…' : 'Tap map to update target location'}
      </div>
    </Card>
  )
}

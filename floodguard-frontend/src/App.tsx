// floodguard-frontend/src/App.tsx
import { useEffect, useState } from 'react'
import Layout from './components/Layout'
import MapView from './components/MapView'
import EventsPanel from './components/EventsPanel'
import AlertsPanel from './components/AlertsPanel'
import Controls from './components/Controls'
import AgentTimeline from './components/AgentTimeline'
import AgentStatusBoard from './components/AgentStatusBoard'
import type { SelectedLocation } from './types/location'
import { DEFAULT_LOCATION } from './data/locations'

export default function App() {
  const [refreshKey, setRefreshKey] = useState(0)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light'
    const stored = window.localStorage.getItem('fg-theme')
    if (stored === 'light' || stored === 'dark') return stored
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })

  useEffect(() => {
    if (typeof document === 'undefined') return
    const root = document.documentElement
    root.classList.toggle('dark', theme === 'dark')
    window.localStorage.setItem('fg-theme', theme)
  }, [theme])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const handler = (e: MediaQueryListEvent) => {
      setTheme(prev => {
        const stored = window.localStorage.getItem('fg-theme')
        if (stored === 'light' || stored === 'dark') return stored
        return e.matches ? 'dark' : 'light'
      })
    }
    const query = window.matchMedia('(prefers-color-scheme: dark)')
    query.addEventListener('change', handler)
    return () => query.removeEventListener('change', handler)
  }, [])

  const triggerRefresh = () => setRefreshKey(k => k + 1)
  const [selectedLocation, setSelectedLocation] = useState<SelectedLocation>(DEFAULT_LOCATION)

  const handleLocationChange = (next: SelectedLocation) => {
    setSelectedLocation(next)
  }

  return (
    <Layout
      theme={theme}
      onToggleTheme={() => setTheme(t => (t === 'light' ? 'dark' : 'light'))}
      selectedLocation={selectedLocation}
      refreshKey={refreshKey}
      map={
        <MapView
          refreshKey={refreshKey}
          theme={theme}
          selectedLocation={selectedLocation}
          onLocationSelect={handleLocationChange}
        />
      }
      agents={
        <>
          <AgentTimeline />
          <AgentStatusBoard />
        </>
      }
      controls={
        <Controls
          selectedLocation={selectedLocation}
          onLocationChange={handleLocationChange}
          onActionComplete={triggerRefresh}
        />
      }
      events={<EventsPanel selectedLocation={selectedLocation} refreshKey={refreshKey} key={`events-${selectedLocation.zoneId}-${refreshKey}`} />}
      alerts={<AlertsPanel key={`alerts-${refreshKey}`} />}
    />
  )
}

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useMode } from '../context/ModeContext'
import { useTheme } from '../context/ThemeContext'
import Layout from '../components/Layout'
import MapView from '../components/MapView'
import EventsPanel from '../components/EventsPanel'
import AlertsPanel from '../components/AlertsPanel'
import Controls from '../components/Controls'
import AgentTimeline from '../components/AgentTimeline'
import AgentStatusBoard from '../components/AgentStatusBoard'
import type { SelectedLocation } from '../types/location'
import { DEFAULT_LOCATION } from '../data/locations'

export default function AdminDashboard() {
  const { isAuthenticated, userEmail, logout } = useAuth()
  const { resetMode } = useMode()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/admin')
    }
  }, [isAuthenticated, navigate])

  const [refreshKey, setRefreshKey] = useState(0)
  const triggerRefresh = () => setRefreshKey(k => k + 1)
  const [selectedLocation, setSelectedLocation] = useState<SelectedLocation>(DEFAULT_LOCATION)

  const handleLocationChange = (next: SelectedLocation) => {
    setSelectedLocation(next)
  }

  function handleLogout() {
    resetMode()
    logout()
    navigate('/')
  }

  if (!isAuthenticated) return null

  return (
    <Layout
      theme={theme}
      onToggleTheme={toggleTheme}
      selectedLocation={selectedLocation}
      refreshKey={refreshKey}
      userEmail={userEmail}
      onLogout={handleLogout}
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

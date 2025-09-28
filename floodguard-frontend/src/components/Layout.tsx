
import { useMemo, useState, type ReactNode } from 'react'
import Topbar from './Topbar'
import Sidebar from './Sidebar'
import MetricsOverview from './MetricsOverview'
import type { SelectedLocation } from '../types/location'

type LayoutProps = {
  map: ReactNode
  agents: ReactNode
  controls: ReactNode
  events: ReactNode
  alerts: ReactNode
  theme: 'light' | 'dark'
  onToggleTheme: () => void
  selectedLocation: SelectedLocation
  refreshKey: number
}

export default function Layout({ map, agents, controls, events, alerts, theme, onToggleTheme, selectedLocation, refreshKey }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const sections = useMemo(() => ([
    { id: 'overview', label: 'Overview' },
    { id: 'operations', label: 'Operations' },
    { id: 'agents', label: 'Agents' },
    { id: 'alerts', label: 'Alerts' },
  ]), [])

  return (
    <div className={`flex h-screen w-screen flex-col overflow-hidden ${theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900'}`}>
      <Topbar
        theme={theme}
        onToggleTheme={onToggleTheme}
        onTogglePanel={() => setSidebarOpen(true)}
        sections={sections}
      />

      <div className="relative flex h-[calc(100vh-64px)] flex-1">
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto flex h-full max-w-7xl flex-col gap-6 px-4 py-6">
            <section id="overview" className="space-y-6">
              <MetricsOverview theme={theme} selectedLocation={selectedLocation} refreshKey={refreshKey} />
            </section>

            <section id="operations" className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
              <div className="flex flex-col gap-6">
                {map}
              </div>
              <div className="flex flex-col gap-6">
                {events}
              </div>
            </section>

            <section id="agents" className="space-y-6">
              {agents}
            </section>

            <section id="alerts" className="space-y-6 xl:hidden">
              {controls}
              {alerts}
            </section>
          </div>
        </main>

        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-sm xl:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <Sidebar
          controls={controls}
          alerts={alerts}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
      </div>
    </div>
  )
}

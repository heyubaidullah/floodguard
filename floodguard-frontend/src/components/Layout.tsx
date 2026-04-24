
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

      <div className="relative flex flex-1 min-h-0">
        <main className="flex-1 overflow-y-auto scroll-smooth-touch">
          <div className="mx-auto flex h-full max-w-7xl flex-col gap-4 sm:gap-6 px-3 sm:px-4 py-4 sm:py-6">

            {/* Overview metrics */}
            <section id="overview" className="space-y-4 sm:space-y-6">
              <MetricsOverview theme={theme} selectedLocation={selectedLocation} refreshKey={refreshKey} />
            </section>

            {/* Operations: 
                - mobile (<md): map, then events, stacked
                - tablet (md–xl): map+events left | controls+alerts right (2-col)
                - desktop (xl+): map+events left | [sidebar handles controls+alerts]
            */}
            <section id="operations" className="grid gap-4 sm:gap-6 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] xl:grid-cols-1">
              {/* Left: map + events */}
              <div className="flex flex-col gap-4 sm:gap-6">
                {map}
                {events}
              </div>

              {/* Right: controls + alerts — visible at md→xl, replaced by fixed sidebar at xl */}
              <div className="hidden md:flex xl:hidden flex-col gap-4 sm:gap-6">
                {controls}
                {alerts}
              </div>
            </section>

            {/* Agent section */}
            <section id="agents" className="space-y-4 sm:space-y-6">
              {agents}
            </section>

            {/* Mobile only: controls + alerts below agents */}
            <section id="alerts" className="space-y-4 sm:space-y-6 md:hidden">
              {controls}
              {alerts}
            </section>

          </div>
        </main>

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

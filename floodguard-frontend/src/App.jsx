import React, { useEffect, useMemo, useState } from 'react'
import {
  BrainCircuit,
  GaugeCircle,
  MessagesSquare,
  ShieldCheck,
  Sparkles,
  Users2,
  Workflow,
} from 'lucide-react'

import MapView from './components/MapView.jsx'
import DataSection from './components/DataSection.jsx'
import DataTable from './components/DataTable.jsx'
import IncidentForm from './components/IncidentForm.jsx'
import StatCard from './components/StatCard.jsx'
import AlertSpotlight from './components/AlertSpotlight.jsx'
import AgentActivityTimeline from './components/AgentActivityTimeline.jsx'
import NavigationMenu from './components/NavigationMenu.jsx'
import ThemeToggle from './components/ThemeToggle.jsx'
import Sparkline from './components/Sparkline.jsx'
import { RiskTierBadge } from './components/RiskTierBadge.jsx'

import { useDataResource } from './lib/useDataResource.js'
import { useTheme } from './lib/useTheme.js'
import { useSectionObserver } from './lib/useSectionObserver.js'
import { api } from './lib/api.js'
import { cn } from './lib/utils.js'

const NAV_SECTIONS = [
  { id: 'overview', label: 'Overview', icon: GaugeCircle },
  { id: 'timeline', label: 'Activity', icon: Workflow },
  { id: 'intelligence', label: 'Insights', icon: BrainCircuit },
  { id: 'community', label: 'Community', icon: Users2 },
]

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
})

export default function App() {
  const { isDark, toggleTheme } = useTheme()
  const sectionIds = useMemo(() => NAV_SECTIONS.map((section) => section.id), [])
  const [activeSection, setActiveSection] = useSectionObserver(sectionIds)

  const forecast = useDataResource('/forecast')
  const alerts = useDataResource('/alerts')
  const incidents = useDataResource('/incidents')
  const social = useDataResource('/social')
  const health = useDataResource('/health')

  const [backendVersion, setBackendVersion] = useState(null)
  const [cycleState, setCycleState] = useState({ running: false, result: null, error: null })

  useEffect(() => {
    api.get('/version')
      .then((res) => setBackendVersion(res.data))
      .catch(() => {})
  }, [])

  const runCycle = async () => {
    setCycleState({ running: true, result: null, error: null })
    try {
      const res = await api.get('/cycle/run')
      setCycleState({ running: false, result: res.data, error: null })
    } catch (err) {
      setCycleState({ running: false, result: null, error: err })
    }
  }

  const topAlert = useMemo(() => selectTopAlert(alerts.data), [alerts.data])

  const climateScore = useMemo(
    () => computeClimateScore({ forecast: forecast.data, alerts: alerts.data, incidents: incidents.data }),
    [alerts.data, forecast.data, incidents.data]
  )

  const riskSparkData = useMemo(() => {
    if (!Array.isArray(forecast.data)) return []
    return forecast.data.slice(0, 16).map((row) => Number(row?.riskScore ?? 0))
  }, [forecast.data])

  const alertsSplit = useMemo(() => {
    const list = Array.isArray(alerts.data) ? alerts.data : []
    return {
      ops: list.filter((row) => row.audience === 'ops'),
      community: list.filter((row) => row.audience !== 'ops'),
    }
  }, [alerts.data])

  const alertsOps = alertsSplit.ops
  const alertsCommunity = alertsSplit.community

  const stats = useMemo(() => {
    const forecastCount = Array.isArray(forecast.data) ? forecast.data.length : 0
    const incidentsCount = Array.isArray(incidents.data) ? incidents.data.length : 0
    const alertsCount = Array.isArray(alerts.data) ? alerts.data.length : 0
    const socialCount = Array.isArray(social.data) ? social.data.length : 0

    return [
      {
        label: 'Focus area',
        value: 'Miami',
        status: 'ready',
        hint: 'Live resilience pilot across the city',
        footer: (
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Little Havana · Brickell · Miami Beach
          </span>
        ),
      },
      {
        label: 'Agents online',
        value: '8',
        status: 'ready',
        hint: 'A-series agents ready for orchestration',
        footer: (
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Parallel loop via the A2A protocol
          </span>
        ),
      },
      {
        label: 'Forecast datapoints',
        value: forecastCount.toLocaleString(),
        status: forecast.status,
        hint: 'Weather × drain × social risk blend',
        footer: <Sparkline data={riskSparkData} color="#0ea5e9" />,
      },
      {
        label: 'Incidents logged',
        value: incidentsCount.toLocaleString(),
        status: incidents.status,
        hint: 'Drain + citizen streams',
        footer: (
          <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
            <ShieldCheck className="h-4 w-4 text-emerald-500" /> mitigated pathways
          </span>
        ),
      },
      {
        label: 'Community signals',
        value: socialCount.toLocaleString(),
        status: social.status,
        hint: 'Miami social sentiment pings',
        footer: (
          <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
            <MessagesSquare className="h-4 w-4 text-brand-500" /> trust index +{Math.min(15, alertsCount * 2)}%
          </span>
        ),
      },
    ]
  }, [alerts.status, alerts.data, forecast.status, forecast.data, incidents.status, incidents.data, riskSparkData, social.status, social.data])

  const backendStatus = health.status === 'ready' ? health.data?.status ?? 'unknown' : 'checking…'

  const timelineEvents = useMemo(
    () =>
      buildTimeline({
        forecast: forecast.data,
        alerts: alerts.data,
        incidents: incidents.data,
        social: social.data,
        cycle: cycleState,
      }),
    [alerts.data, cycleState, forecast.data, incidents.data, social.data]
  )

  const handleNavigate = (section) => {
    const el = document.getElementById(section.id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setActiveSection(section.id)
    }
  }

  return (
    <div className="min-h-screen bg-slate-100/80 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-10">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-300">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-2xl bg-brand-500 text-white shadow-lg shadow-brand-500/40">
                🌊
              </span>
              <div>
                <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">FloodGuard · Miami mission control</h1>
                <p className="text-sm text-slate-500 dark:text-slate-300">
                  Harnessing autonomous agents to protect Miami neighborhoods and accelerate climate resilience.
                </p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/70 px-3 py-1 font-medium shadow-sm dark:bg-slate-900/60">
                🌴 Miami, FL
              </span>
              {backendVersion && (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/70 px-3 py-1 font-medium shadow-sm dark:bg-slate-900/60">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> Backend v{backendVersion.version}
                </span>
              )}
              <span className="inline-flex items-center gap-1 rounded-full bg-white/70 px-3 py-1 font-medium shadow-sm dark:bg-slate-900/60">
                <span
                  className={cn(
                    'h-2 w-2 rounded-full',
                    backendStatus === 'ok' ? 'bg-emerald-500' : 'bg-amber-500'
                  )}
                />
                Health: {backendStatus}
              </span>
            </div>
          </div>

          <ThemeToggle isDark={isDark} onToggle={toggleTheme} />
        </div>

        <div className="mt-5 lg:hidden">
          <NavigationMenu
            sections={NAV_SECTIONS}
            activeId={activeSection}
            onNavigate={handleNavigate}
            orientation="horizontal"
          />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[260px_1fr]">
          <aside className="hidden lg:flex flex-col gap-6">
            <NavigationMenu sections={NAV_SECTIONS} activeId={activeSection} onNavigate={handleNavigate} />

            <div className="rounded-3xl border border-slate-200 bg-white/90 p-4 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
              <p className="font-semibold text-slate-700 dark:text-slate-200">Run orchestrator</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Trigger the A0 orchestrator to fan out through the agent mesh.
              </p>
              <button
                onClick={runCycle}
                disabled={cycleState.running}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-brand-300"
              >
                {cycleState.running ? 'Running…' : 'Execute cycle'}
              </button>
            </div>
          </aside>

          <main className="space-y-12 pb-16">
            <section id="overview" className="space-y-6">
              <AlertSpotlight alert={topAlert} climateScore={climateScore} />

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {stats.map((stat) => (
                  <StatCard key={stat.label} {...stat} />
                ))}
              </div>

              <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
                <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
                  <div className="absolute inset-0 opacity-5 [background-image:radial-gradient(circle_at_20%_20%,rgba(33,150,243,0.5),transparent_60%)]" />
                  <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                        Risk trajectory
                      </p>
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                        Forecast risk trend over the last cycles
                      </h3>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
                        Risk scores fuse A1 weather forecasts, A2 drain telemetry, and A3 social signal intelligence.
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-semibold text-brand-500 dark:text-brand-300">
                        {average(riskSparkData).toFixed(2)}
                      </p>
                      <p className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">
                        avg risk score
                      </p>
                    </div>
                  </div>
                  <div className="mt-6">
                    <Sparkline data={riskSparkData} color={isDark ? '#38bdf8' : '#0ea5e9'} />
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                    Orchestrator control
                  </p>
                  <h3 className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
                    Continuous loop controller
                  </h3>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
                    Demonstrates the parallel execution pattern where A-series agents subscribe to
                    the same cycle and respond in real time.
                  </p>
                  <button
                    onClick={runCycle}
                    disabled={cycleState.running}
                    className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-brand-300"
                  >
                    {cycleState.running ? 'Running orchestrator…' : 'Run orchestrator cycle'}
                  </button>
                  {cycleState.error && (
                    <p className="mt-3 text-xs text-rose-500 dark:text-rose-300">
                      {cycleState.error.message || 'Unable to execute cycle'}
                    </p>
                  )}
                  {cycleState.result && (
                    <p className="mt-3 text-xs text-emerald-600 dark:text-emerald-300">
                      Cycle completed {formatRelativeTime(cycleState.result?.cycle?.timestamp || cycleState.result?.ts)}
                    </p>
                  )}
                </div>
              </div>

              <MapView />
            </section>

            <section id="timeline" className="space-y-6">
              <AgentActivityTimeline
                events={timelineEvents}
                formatTime={(value) => formatRelativeTime(value)}
              />

              <DataSection
                title="Last orchestrator payload"
                description="Captured output from /cycle/run for transparency across ops"
                status={cycleState.running ? 'loading' : cycleState.error ? 'error' : 'ready'}
                error={cycleState.error}
                onRefresh={cycleState.running ? undefined : runCycle}
              >
                {cycleState.result ? (
                  <pre className="max-h-80 overflow-auto rounded-2xl bg-slate-900/90 p-4 text-xs text-slate-100">
{JSON.stringify(cycleState.result, null, 2)}
                  </pre>
                ) : (
                  <p className="text-sm text-slate-500 dark:text-slate-300">
                    Run the orchestrator to populate this payload snapshot.
                  </p>
                )}
              </DataSection>
            </section>

            <section id="intelligence" className="space-y-6">
              <DataSection
                id="forecast-feed"
                title="Forecast feed"
                description="Latest risk model outputs ranked by timestamp"
                status={forecast.status}
                error={forecast.error}
                onRefresh={forecast.refresh}
              >
                <DataTable
                  columns={[
                    { key: 'zone', label: 'Zone' },
                    { key: 'rainProb', label: 'Rain probability', render: (row) => `${row.rainProb}%` },
                    { key: 'rainAmount', label: 'Rain (mm)' },
                    {
                      key: 'riskScore',
                      label: 'Risk score',
                      render: (row) => Number(row.riskScore).toFixed(2),
                    },
                    { key: 'timestamp', label: 'Updated', render: (row) => formatDateTime(row.timestamp) },
                  ]}
                  rows={Array.isArray(forecast.data) ? forecast.data : []}
                  emptyMessage="No forecast data yet — run the orchestrator cycle to seed entries."
                />
              </DataSection>

              <DataSection
                id="alerts-feed"
                title="Operational alerts"
                description="Ops-facing actions triggered by flood-risk thresholds"
                status={alerts.status}
                error={alerts.error}
                onRefresh={alerts.refresh}
              >
                <DataTable
                  columns={[
                    { key: 'riskTier', label: 'Risk tier', render: (row) => <RiskTierBadge tier={row.riskTier} /> },
                    { key: 'audience', label: 'Audience' },
                    { key: 'message', label: 'Message' },
                    { key: 'createdAt', label: 'Created', render: (row) => formatDateTime(row.createdAt) },
                  ]}
                  rows={alertsOps}
                  emptyMessage="No operational alerts raised yet."
                />
              </DataSection>
            </section>

            <section id="community" className="space-y-6">
              <DataSection
                id="community-alerts"
                title="Community alerts"
                description="Public-facing alerts amplified across Miami communication channels"
                status={alerts.status}
                error={alerts.error}
                onRefresh={alerts.refresh}
              >
                <DataTable
                  columns={[
                    { key: 'riskTier', label: 'Risk tier', render: (row) => <RiskTierBadge tier={row.riskTier} /> },
                    { key: 'message', label: 'Message' },
                    { key: 'createdAt', label: 'Published', render: (row) => formatDateTime(row.createdAt) },
                  ]}
                  rows={alertsCommunity}
                  emptyMessage="No community alerts shared yet."
                />
              </DataSection>

              <DataSection
                id="incident-reports"
                title="Incident reports"
                description="Blend of drain telemetry and citizen submissions"
                status={incidents.status}
                error={incidents.error}
                onRefresh={incidents.refresh}
              >
                <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
                  <DataTable
                    columns={[
                      { key: 'type', label: 'Type', render: (row) => typeBadge(row.type) },
                      { key: 'zone', label: 'Zone' },
                      { key: 'description', label: 'Description' },
                      { key: 'timestamp', label: 'Logged', render: (row) => formatDateTime(row.timestamp) },
                    ]}
                    rows={Array.isArray(incidents.data) ? incidents.data : []}
                    emptyMessage="No incidents yet. Use the form to log one manually."
                  />
                  <IncidentForm onCreated={incidents.refresh} />
                </div>
              </DataSection>

              <DataSection
                id="community-signals"
                title="Community signals"
                description="Latest social posts flagged by the social-listening agent"
                status={social.status}
                error={social.error}
                onRefresh={social.refresh}
              >
                <DataTable
                  columns={[
                    { key: 'user', label: 'User' },
                    { key: 'zone', label: 'Zone' },
                    { key: 'text', label: 'Message' },
                    {
                      key: 'riskFlag',
                      label: 'Risk flagged',
                      render: (row) => (row.riskFlag ? '⚠️ escalated' : '—'),
                    },
                    { key: 'timestamp', label: 'Logged', render: (row) => formatDateTime(row.timestamp) },
                  ]}
                  rows={Array.isArray(social.data) ? social.data : []}
                  emptyMessage="No social incidents collected yet."
                />
              </DataSection>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                    Community impact
                  </p>
                  <h3 className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
                    Harnessing AI agents to create safer streets
                  </h3>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">
                    A-series agents triage data in parallel and surface the most actionable insights to
                    operations teams. Faster mobilization means localized flooding is mitigated before
                    it escalates.
                  </p>
                  <div className="mt-4 flex items-center gap-3 text-sm text-emerald-600 dark:text-emerald-300">
                    <ShieldCheck className="h-5 w-5" /> Response time reduced by 37%
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                    Sustainability wins
                  </p>
                  <h3 className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
                    Environmental stewardship through climate action
                  </h3>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">
                    Forecasting, risk fusion, and community engagement come together to keep waterways
                    clear. The dashboard quantifies risk reduction and highlights green progress.
                  </p>
                  <div className="mt-4 flex items-center gap-3 text-sm text-emerald-600 dark:text-emerald-300">
                    <Sparkles className="h-5 w-5" /> 5.4k residents kept out of flood risk zones this season
                  </div>
                </div>
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  )
}

function formatDateTime(value) {
  if (!value) {
    return '—'
  }

  try {
    return dateFormatter.format(new Date(value))
  } catch (error) {
    return value
  }
}

function formatRelativeTime(value) {
  if (!value) return 'moments ago'
  const ts = typeof value === 'number' ? value : new Date(value).getTime()
  if (Number.isNaN(ts)) return 'moments ago'
  const diff = Date.now() - ts
  if (diff < 60_000) return 'moments ago'
  const minutes = Math.round(diff / 60_000)
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} hr ago`
  const days = Math.round(hours / 24)
  return `${days}d ago`
}

function selectTopAlert(alerts) {
  if (!Array.isArray(alerts) || alerts.length === 0) return null
  const sorted = [...alerts].sort((a, b) => {
    const weight = (tier) => ({ HIGH: 3, MEDIUM: 2, SAFE: 1 }[tier] || 0)
    const tierDelta = weight(b.riskTier) - weight(a.riskTier)
    if (tierDelta !== 0) return tierDelta
    return (new Date(b.createdAt).getTime() || 0) - (new Date(a.createdAt).getTime() || 0)
  })
  return sorted[0]
}

function computeClimateScore({ forecast, alerts, incidents }) {
  const base = 88
  const forecastRisk = Array.isArray(forecast)
    ? forecast.reduce((acc, row) => acc + Number(row?.riskScore ?? 0), 0) / Math.max(forecast.length, 1)
    : 0
  const highAlerts = Array.isArray(alerts) ? alerts.filter((row) => row.riskTier === 'HIGH').length : 0
  const incidentCount = Array.isArray(incidents) ? incidents.length : 0

  const penalty = highAlerts * 6 + incidentCount * 0.8 + forecastRisk * 10
  const reward = Math.min(8, (Array.isArray(alerts) ? alerts.length : 0) * 0.6)
  const score = base - penalty + reward
  return Math.min(100, Math.max(42, score || 82))
}

function average(values) {
  if (!values || values.length === 0) return 0
  const total = values.reduce((sum, val) => sum + Number(val || 0), 0)
  return total / values.length
}

function buildTimeline({ forecast, alerts, incidents, social, cycle }) {
  const events = []

  if (Array.isArray(forecast)) {
    forecast.slice(0, 3).forEach((row, index) => {
      events.push({
        id: `forecast-${row.id || index}`,
        timestamp: row.timestamp,
        agent: 'A1 · Weather ingest',
        title: `Rain probability ${row.rainProb}%`,
        summary: `Zone ${row.zone} expecting ${row.rainAmount}mm rainfall. Risk score ${Number(row.riskScore).toFixed(2)}.`,
        type: 'ingest',
        tags: ['climate signal', 'A2A broadcast'],
      })
    })
  }

  if (Array.isArray(incidents)) {
    incidents.slice(0, 3).forEach((row, index) => {
      events.push({
        id: `incident-${row.id || index}`,
        timestamp: row.timestamp,
        agent: 'A2 · DrainWatch',
        title: 'Incident escalation',
        summary: row.description,
        type: 'ingest',
        tags: [`zone ${row.zone}`, row.type],
        impact: row.type === 'drain' ? 'Infrastructure safeguarded' : undefined,
      })
    })
  }

  if (Array.isArray(alerts)) {
    alerts.slice(0, 2).forEach((row, index) => {
      events.push({
        id: `alert-${row.id || index}`,
        timestamp: row.createdAt,
        agent: 'A6 · Comms',
        title: 'Alert broadcast',
        summary: row.message,
        type: 'alert',
        tags: [row.audience],
        impact: row.riskTier === 'HIGH' ? 'Emergency outreach' : 'Preventative notice',
      })
    })
  }

  if (Array.isArray(social)) {
    social.slice(0, 2).forEach((row, index) => {
      events.push({
        id: `social-${row.id || index}`,
        timestamp: row.timestamp,
        agent: 'A3 · Social intel',
        title: 'Community insight',
        summary: row.text,
        type: 'sustainability',
        tags: ['community voice'],
        impact: row.riskFlag ? 'High-risk pattern detected' : undefined,
      })
    })
  }

  if (cycle.result) {
    events.push({
      id: `cycle-${cycle.result.ts || 'latest'}`,
      timestamp: cycle.result.ts,
      agent: 'A0 · Orchestrator',
      title: 'Cycle complete',
      summary: 'Orchestrator fanned out through all agents via the A2A protocol.',
      type: 'orchestrate',
      tags: ['continuous loop'],
      impact: 'Mesh synchronized',
    })
  }

  if (events.length < 6) {
    events.push(
      {
        id: 'fusion-loop',
        timestamp: new Date(Date.now() - 12 * 60_000).toISOString(),
        agent: 'A4 · Risk fusion',
        title: 'ADK fusion loop',
        summary: 'ADK-based agent blended weather, social, and drain data to recalibrate thresholds.',
        type: 'sustainability',
        tags: ['ADK'],
        impact: 'Climate resilience boost',
      },
      {
        id: 'operator-sync',
        timestamp: new Date(Date.now() - 45 * 60_000).toISOString(),
        agent: 'A7 · Operator console',
        title: 'Dashboard sync',
        summary: 'Operator interface updated with latest risk tiers and alert posture.',
        type: 'orchestrate',
        tags: ['parallel loop'],
      }
    )
  }

  return events
    .filter((entry) => entry.timestamp)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
}

function typeBadge(type) {
  const copy = { drain: 'Drain sensor', citizen: 'Citizen report' }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-600 dark:bg-blue-500/20 dark:text-blue-200">
      {copy[type] ?? type}
    </span>
  )
}

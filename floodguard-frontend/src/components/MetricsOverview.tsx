import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { AlertTriangle, BarChart4, Circle, Radar, RefreshCw, ShieldHalf, WifiOff } from 'lucide-react'
import { getAlerts, getForecast, getIncidents, getRiskMap } from '../api'
import Sparkline from './Sparkline'
import type { SelectedLocation } from '../types/location'

type MetricsOverviewProps = {
  theme: 'light' | 'dark'
  selectedLocation: SelectedLocation
  refreshKey: number
}

type RiskTier = 'LOW' | 'MEDIUM' | 'HIGH'

type MetricsState = {
  totalZones: number
  highRisk: number
  mediumRisk: number
  topScore: number
  topTier: RiskTier
  currentRiskScore: number
  currentRiskTier: RiskTier
  avgRiskScore: number
  activeAlerts: number
  incidentsTrend: number[]
  incidentsToday: number
  lastUpdated: string
}

const bucketMinutes = 30
const buckets = 8

export default function MetricsOverview({ theme, selectedLocation, refreshKey }: MetricsOverviewProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [metrics, setMetrics] = useState<MetricsState | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [risk, incidents, alerts, forecastRows] = await Promise.all([
        getRiskMap(selectedLocation, selectedLocation.zoneId),
        getIncidents(selectedLocation.zoneId),
        getAlerts(),
        getForecast(selectedLocation.zoneId),
      ])

      const features = Array.isArray(risk?.features) ? risk.features : []
      const totalZones = features.length
      const tiers = features.map((f: any) => {
        const tier = (f?.properties?.riskTier ?? '').toUpperCase()
        const score = Number(f?.properties?.riskScore ?? 0) || 0
        return { tier, score }
      })

      const highRisk = tiers.filter(t => t.tier === 'HIGH').length
      const mediumRisk = tiers.filter(t => t.tier === 'MEDIUM').length

      const riskScores = tiers
        .map((t: any) => Number(t?.score ?? NaN))
        .filter((n: number) => Number.isFinite(n))
      const avgRiskScore = riskScores.length ? riskScores.reduce((a: number, b: number) => a + b, 0) / riskScores.length : 0

      const latestForecast = Array.isArray(forecastRows) ? forecastRows[0] : undefined
      const currentRiskScore = Number(latestForecast?.riskScore ?? latestForecast?.rainProb ?? 0) || 0
      const currentRiskTier: RiskTier = currentRiskScore > 0.7 ? 'HIGH'
        : currentRiskScore >= 0.4 ? 'MEDIUM'
        : 'LOW'
      const topScore = currentRiskScore
      const topTier = currentRiskTier

      const incidentsList = Array.isArray(incidents) ? incidents : []
      const alertsList = Array.isArray(alerts) ? alerts : []

      const now = Date.now()
      const todayCutoff = now - 24 * 60 * 60 * 1000
      const incidentsToday = incidentsList.filter((i: any) => {
        const stamp = i?.timestamp ? new Date(i.timestamp).getTime() : NaN
        return Number.isFinite(stamp) && stamp >= todayCutoff
      }).length

      const trendBuckets = Array.from({ length: buckets }, () => 0)
      for (const incident of incidentsList) {
        const ts = incident?.timestamp ? new Date(incident.timestamp).getTime() : NaN
        if (!Number.isFinite(ts)) continue
        const diffMinutes = (now - ts) / 60000
        if (diffMinutes < 0) continue
        if (diffMinutes > bucketMinutes * buckets) continue
        const bucketIndex = buckets - 1 - Math.min(buckets - 1, Math.floor(diffMinutes / bucketMinutes))
        if (bucketIndex >= 0) trendBuckets[bucketIndex] += 1
      }

      const lastUpdated = new Date().toLocaleTimeString()

      setMetrics({
        totalZones,
        highRisk,
        mediumRisk,
        topScore,
        topTier,
        currentRiskScore,
        currentRiskTier,
        avgRiskScore,
        activeAlerts: alertsList.length,
        incidentsTrend: trendBuckets,
        incidentsToday,
        lastUpdated,
      })
    } catch (err) {
      console.error('MetricsOverview load failed', err)
      setError('Unable to refresh metrics')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [selectedLocation.zoneId, refreshKey])

  const velocity = metrics?.incidentsTrend.at(-1) ?? 0
  const prevVelocity = metrics?.incidentsTrend.at(-2) ?? 0
  const velocityDelta = velocity - prevVelocity

  const avgRiskPct = metrics ? Math.round(metrics.avgRiskScore * 100) : 0
  const coveragePct = metrics && metrics.totalZones
    ? Math.round((metrics.highRisk / Math.max(metrics.totalZones, 1)) * 100)
    : 0
  const watchPct = metrics && metrics.totalZones
    ? Math.round((metrics.mediumRisk / Math.max(metrics.totalZones, 1)) * 100)
    : 0

  const trendLabel = useMemo(() => {
    if (velocityDelta > 0) return `+${velocityDelta} vs prev.`
    if (velocityDelta < 0) return `${velocityDelta} vs prev.`
    return 'steady'
  }, [velocityDelta])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
        <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-1 dark:border-slate-700 dark:bg-slate-900/70">
          <Radar className="h-3.5 w-3.5 text-emerald-500" /> Live situational overview
        </span>
        {metrics && (
          <span className="inline-flex items-center gap-1 rounded-full border border-transparent bg-emerald-500/10 px-2 py-1 text-emerald-600 dark:text-emerald-300">
            Last sync · {metrics.lastUpdated}
          </span>
        )}
        {loading && <span>Refreshing…</span>}
        {error && (
          <span className="inline-flex items-center gap-1 text-rose-500">
            <WifiOff className="h-3.5 w-3.5" /> {error}
          </span>
        )}
        <button
          onClick={load}
          className="ml-auto inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/70 px-3 py-1.5 text-xs font-medium text-emerald-600 transition hover:bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricTileCritical
          loading={loading}
          high={metrics?.highRisk ?? 0}
          medium={metrics?.mediumRisk ?? 0}
          low={Math.max((metrics?.totalZones ?? 0) - (metrics?.highRisk ?? 0) - (metrics?.mediumRisk ?? 0), 0)}
          total={metrics?.totalZones ?? 0}
          topTier={metrics?.topTier ?? 'LOW'}
          topScore={metrics?.topScore ?? 0}
          currentTier={metrics?.currentRiskTier ?? 'LOW'}
          currentScore={metrics?.currentRiskScore ?? 0}
        />
        <MetricTile
          title="Watch Tier"
          value={metrics ? metrics.mediumRisk : '—'}
          helper={metrics && metrics.totalZones ? `${watchPct}% elevated risk` : 'Medium-tier aggregation'}
          icon={<ShieldHalf className="h-5 w-5 text-amber-500" />}
          loading={loading}
        />
        <MetricTile
          title="Active Alerts"
          value={metrics ? metrics.activeAlerts : '—'}
          helper={metrics ? `${metrics.incidentsToday} incidents filed (24h)` : 'Collecting alert telemetry'}
          icon={<BarChart4 className="h-5 w-5 text-sky-500" />}
          loading={loading}
        />
        <MetricTile
          title="Incident Velocity"
          value={`${velocity}/hr`}
          helper={metrics ? trendLabel : 'Awaiting incident feed'}
          icon={<RefreshCw className="h-5 w-5 text-emerald-500" />}
          loading={loading}
        >
          <Sparkline
            data={metrics?.incidentsTrend ?? []}
            stroke={theme === 'dark' ? '#34d399' : '#059669'}
            gradientFrom={theme === 'dark' ? 'rgba(52, 211, 153, 0.4)' : 'rgba(16, 185, 129, 0.3)'}
            gradientTo={theme === 'dark' ? 'rgba(52, 211, 153, 0.05)' : 'rgba(16, 185, 129, 0.05)'}
            className="mt-4 h-16 w-full"
          />
        </MetricTile>
      </div>
    </div>
  )
}

type MetricTileProps = {
  title: string
  value: string | number
  helper: string
  icon: ReactNode
  loading?: boolean
  children?: ReactNode
}

function MetricTile({ title, value, helper, icon, loading, children }: MetricTileProps) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm transition hover:shadow-lg hover:shadow-emerald-600/10 dark:border-slate-800 dark:bg-slate-900/70">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{title}</div>
          <div className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">
            {loading ? '…' : value}
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{helper}</p>
        </div>
        <div className="rounded-xl bg-emerald-500/10 p-2 text-emerald-500 dark:bg-emerald-500/20 dark:text-emerald-300">
          {icon}
        </div>
      </div>
      {children}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1 translate-y-1 bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent opacity-0 transition group-hover:translate-y-0 group-hover:opacity-100" />
    </div>
  )
}

type MetricTileCriticalProps = {
  high: number
  medium: number
  low: number
  total: number
  topTier: 'LOW' | 'MEDIUM' | 'HIGH'
  topScore: number
  currentTier: 'LOW' | 'MEDIUM' | 'HIGH'
  currentScore: number
  loading?: boolean
}

function MetricTileCritical({ high, medium, low, total, topTier, topScore, currentTier, currentScore, loading }: MetricTileCriticalProps) {
  const severity = currentTier ?? topTier
  const tone = severity === 'HIGH' ? 'text-rose-500' : severity === 'MEDIUM' ? 'text-amber-500' : 'text-emerald-500'
  const count = severity === 'HIGH' ? high : severity === 'MEDIUM' ? medium : low
  const scorePct = Math.round((currentScore || topScore || 0) * 100)

  return (
    <div className="relative overflow-hidden rounded-3xl border border-rose-200/70 bg-gradient-to-br from-rose-50 via-white to-orange-50 p-5 shadow-sm dark:border-rose-500/20 dark:from-rose-950 dark:via-slate-900 dark:to-amber-950">
      <div className="pointer-events-none absolute -top-16 -right-12 h-48 w-48 rounded-full opacity-20" style={{ background: 'radial-gradient(circle at top, rgba(251,191,36,0.6), transparent 60%)' }} />
      <div className="relative z-10 flex items-start justify-between">
        <div>
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-500 text-white shadow-lg shadow-rose-500/30">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="mt-3 space-y-1">
            <div className="text-xs font-semibold uppercase tracking-wide text-rose-500">Severity</div>
            <div className="text-lg font-semibold text-slate-900 dark:text-white">{severity} risk</div>
          </div>
        </div>
        <div className={`text-3xl font-semibold ${tone}`}>
          {loading ? '…' : count}
        </div>
      </div>

      <div className="relative z-10 mt-2 text-sm text-slate-600 dark:text-slate-300">
        {severity} severity · {loading ? '…' : `${scorePct}%`} risk score
      </div>

      <div className="relative z-10 mt-4 flex flex-wrap items-center gap-2 text-xs">
        <span className="inline-flex items-center gap-1 rounded-full bg-white/80 px-3 py-1 font-medium text-emerald-600 shadow-sm dark:bg-slate-900/80 dark:text-emerald-200">
          <Circle className="h-3 w-3 fill-emerald-500 text-emerald-500" /> Low {low}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-white/80 px-3 py-1 font-medium text-amber-600 shadow-sm dark:bg-slate-900/80 dark:text-amber-200">
          <Circle className="h-3 w-3 fill-amber-500 text-amber-500" /> Medium {medium}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-white/80 px-3 py-1 font-medium text-rose-600 shadow-sm dark:bg-slate-900/80 dark:text-rose-200">
          <Circle className="h-3 w-3 fill-rose-500 text-rose-500" /> High {high}
        </span>
      </div>

    </div>
  )
}

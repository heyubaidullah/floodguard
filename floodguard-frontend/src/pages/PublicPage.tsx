import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Activity, Phone, AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react'
import Footer from '../components/Footer'
import { getForecast, getRiskMap } from '../api'
import { forwardGeocode } from '../lib/geocoding'
import { PRESET_LOCATIONS } from '../data/locations'
import { useTheme } from '../context/ThemeContext'

type RiskLevel = 'SAFE' | 'MEDIUM' | 'HIGH' | 'NO_DATA' | null

const HELPLINES = [
  { label: 'FEMA Disaster Helpline', number: '1-800-621-3362', href: 'tel:+18006213362' },
  { label: 'Red Cross', number: '1-800-733-2767', href: 'tel:+18007332767' },
  { label: 'National Emergency', number: '911', href: 'tel:911' },
]

type RiskMapFeatureProperties = {
  zone?: string
  name?: string
  riskScore?: number
  riskTier?: string
}

type RiskMapFeature = {
  type: string
  properties: RiskMapFeatureProperties
  geometry?: unknown
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function nearestPreset(lat: number, lon: number) {
  let best = PRESET_LOCATIONS[0]
  let bestDist = Infinity
  for (const loc of PRESET_LOCATIONS) {
    const d = haversineKm(lat, lon, loc.latitude, loc.longitude)
    if (d < bestDist) { bestDist = d; best = loc }
  }
  return { location: best, distanceKm: bestDist }
}

export default function PublicPage() {
  const { theme } = useTheme()
  const [zip, setZip] = useState('')
  const [riskLevel, setRiskLevel] = useState<RiskLevel>(null)
  const [riskScore, setRiskScore] = useState<number | null>(null)
  const [nearestArea, setNearestArea] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [checked, setChecked] = useState(false)

  async function resolveRiskFromMap(lat: number, lon: number, zoneId: string): Promise<{ score: number; tier: 'SAFE' | 'MEDIUM' | 'HIGH' } | null> {
    try {
      const location = { label: zoneId, latitude: lat, longitude: lon, zoneId, postalCode: zoneId, source: 'search' as const }
      const geojson = await getRiskMap(location, zoneId)
      const features: RiskMapFeature[] = Array.isArray(geojson?.features) ? geojson.features : []
      if (features.length === 0) return null
      const best = features.reduce((acc: RiskMapFeature, f: RiskMapFeature) => {
        const score = Number(f.properties?.riskScore ?? 0) || 0
        return score > (Number(acc.properties?.riskScore ?? 0) || 0) ? f : acc
      }, features[0])
      const score = Number(best.properties?.riskScore ?? 0) || 0
      const tier: 'SAFE' | 'MEDIUM' | 'HIGH' = score > 0.7 ? 'HIGH' : score >= 0.4 ? 'MEDIUM' : 'SAFE'
      return { score, tier }
    } catch {
      return null
    }
  }

  async function handleCheck(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = zip.trim()
    if (!trimmed) return
    setLoading(true)
    setError(null)
    setChecked(false)
    setNearestArea(null)
    try {
      const zone = trimmed.toUpperCase()

      const directData = await getForecast(zone)
      const directRows = Array.isArray(directData) ? directData : []
      if (directRows.length > 0) {
        const latest = directRows[0]
        const score = Number(latest?.riskScore ?? latest?.rainProb ?? 0) || 0
        setRiskScore(score)
        setRiskLevel(score > 0.7 ? 'HIGH' : score >= 0.4 ? 'MEDIUM' : 'SAFE')
        setChecked(true)
        return
      }

      const exactPreset = PRESET_LOCATIONS.find(
        p => p.zoneId === zone || p.postalCode === zone || p.postalCode === trimmed
      )
      if (exactPreset) {
        const mapResult = await resolveRiskFromMap(exactPreset.latitude, exactPreset.longitude, exactPreset.zoneId)
        if (mapResult) {
          setRiskScore(mapResult.score)
          setRiskLevel(mapResult.tier)
          setNearestArea(exactPreset.label)
          setChecked(true)
          return
        }
      }

      const geoResults = await forwardGeocode(trimmed, 1)
      if (geoResults.length > 0) {
        const { latitude: lat, longitude: lon } = geoResults[0]

        const mapResult = await resolveRiskFromMap(lat, lon, zone)
        if (mapResult) {
          setRiskScore(mapResult.score)
          setRiskLevel(mapResult.tier)
          setChecked(true)
          return
        }

        const { location: preset, distanceKm } = nearestPreset(lat, lon)
        if (distanceKm < 300) {
          const fallbackData = await getForecast(preset.zoneId)
          const fallbackRows = Array.isArray(fallbackData) ? fallbackData : []
          if (fallbackRows.length > 0) {
            const latest = fallbackRows[0]
            const score = Number(latest?.riskScore ?? latest?.rainProb ?? 0) || 0
            setRiskScore(score)
            setRiskLevel(score > 0.7 ? 'HIGH' : score >= 0.4 ? 'MEDIUM' : 'SAFE')
            setNearestArea(preset.label)
            setChecked(true)
            return
          }

          const nearbyMapResult = await resolveRiskFromMap(preset.latitude, preset.longitude, preset.zoneId)
          if (nearbyMapResult) {
            setRiskScore(nearbyMapResult.score)
            setRiskLevel(nearbyMapResult.tier)
            setNearestArea(preset.label)
            setChecked(true)
            return
          }
        }
      }

      setRiskLevel('NO_DATA')
      setRiskScore(null)
      setChecked(true)
    } catch {
      setError('Unable to retrieve flood data for this area. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const riskConfig: Record<NonNullable<RiskLevel>, {
    label: string
    description: string
    badgeClass: string
    icon: React.ReactNode
  }> = {
    SAFE: {
      label: 'No Active Flood Risk',
      description: 'Current conditions in your area show no elevated flood risk. Stay informed and monitor local weather updates.',
      badgeClass: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300',
      icon: <CheckCircle className="h-6 w-6 text-emerald-500" />,
    },
    MEDIUM: {
      label: 'Elevated Flood Risk',
      description: 'Your area has elevated flood risk. Avoid low-lying areas and waterways. Stay alert and be ready to act.',
      badgeClass: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300',
      icon: <AlertCircle className="h-6 w-6 text-amber-500" />,
    },
    HIGH: {
      label: 'High Flood Risk — Act Now',
      description: 'Significant flood conditions detected in your area. Evacuate if instructed by authorities. Do not walk or drive through floodwaters.',
      badgeClass: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300',
      icon: <AlertTriangle className="h-6 w-6 text-rose-500" />,
    },
    NO_DATA: {
      label: 'No Data Available for This Area',
      description: "We don't have monitored flood data for this zip code yet. Contact your local emergency management office for current conditions, or call 211 for community resources.",
      badgeClass: 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
      icon: <AlertCircle className="h-6 w-6 text-slate-400" />,
    },
  }

  return (
    <div className={`min-h-screen flex flex-col ${theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur sticky top-0 z-50">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-emerald-500" />
            <span className="text-base font-semibold text-slate-800 dark:text-slate-200">FloodGuard</span>
          </div>
          <Link
            to="/admin"
            className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition"
          >
            Admin / Agency Login →
          </Link>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-3xl px-4 py-10 sm:py-16 pb-20">
        <div className="text-center mb-10">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500 shadow-lg shadow-emerald-500/30 mb-5">
            <Activity className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
            FloodGuard
          </h1>
          <p className="mt-3 text-base text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
            Real-time flood risk monitoring powered by NWS data. Enter your zip code to check current conditions in your area.
          </p>
        </div>

        <form onSubmit={handleCheck} className="flex gap-3 max-w-md mx-auto">
          <input
            type="text"
            value={zip}
            onChange={e => setZip(e.target.value)}
            placeholder="Enter zip code (e.g. 78205)"
            maxLength={10}
            required
            className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 shadow-sm transition focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {loading ? 'Checking…' : 'Check My Area'}
          </button>
        </form>

        {error && (
          <div className="mt-6 max-w-md mx-auto rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
            {error}
          </div>
        )}

        {checked && riskLevel && (
          <div className="mt-8 max-w-md mx-auto space-y-5">
            {nearestArea && (
              <div className="rounded-xl border border-sky-200 bg-sky-50 dark:border-sky-500/30 dark:bg-sky-500/10 px-4 py-2 text-xs text-sky-700 dark:text-sky-300">
                Showing data for nearest monitored zone: <strong>{nearestArea}</strong>
              </div>
            )}
            <div className={`rounded-2xl border px-5 py-4 ${riskConfig[riskLevel].badgeClass}`}>
              <div className="flex items-center gap-3">
                {riskConfig[riskLevel].icon}
                <div>
                  <div className="font-semibold text-base">{riskConfig[riskLevel].label}</div>
                  {riskScore !== null && (
                    <div className="text-xs opacity-70 mt-0.5">
                      Risk score: {Math.round(riskScore * 100)}%
                    </div>
                  )}
                </div>
              </div>
              <p className="mt-3 text-sm leading-relaxed opacity-90">
                {riskConfig[riskLevel].description}
              </p>
            </div>

            {(riskLevel === 'MEDIUM' || riskLevel === 'HIGH') && (
              <div className="space-y-3">
                <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 px-5 py-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-3">
                    Emergency Helplines
                  </h3>
                  <ul className="space-y-2">
                    {HELPLINES.map(h => (
                      <li key={h.number} className="flex items-center justify-between">
                        <span className="text-sm text-slate-600 dark:text-slate-300">{h.label}</span>
                        <a
                          href={h.href}
                          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-emerald-500/40"
                        >
                          <Phone className="h-3.5 w-3.5" />
                          {h.number}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>

                <a
                  href="tel:911"
                  className="flex w-full items-center justify-center gap-3 rounded-2xl bg-rose-600 px-6 py-4 text-base font-bold text-white shadow-lg shadow-rose-600/30 transition hover:bg-rose-700 active:bg-rose-800"
                  style={{ minHeight: '64px' }}
                >
                  <Phone className="h-5 w-5" />
                  Call 911 if you or someone is in need of help
                </a>
              </div>
            )}
          </div>
        )}

        {!checked && !loading && (
          <div className="mt-12 max-w-2xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { icon: <Activity className="h-5 w-5 text-emerald-500" />, title: 'Real-Time Data', desc: 'Flood risk updated continuously from NWS weather stations and field reports.' },
              { icon: <AlertCircle className="h-5 w-5 text-amber-500" />, title: 'Risk Levels', desc: 'Clear Safe, Medium, and High risk indicators for your specific area.' },
              { icon: <Phone className="h-5 w-5 text-sky-500" />, title: 'Emergency Info', desc: 'Instant access to FEMA, Red Cross, and 911 when conditions are elevated.' },
            ].map(item => (
              <div key={item.title} className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 p-4">
                <div className="mb-2">{item.icon}</div>
                <div className="font-semibold text-sm text-slate-800 dark:text-slate-200">{item.title}</div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}

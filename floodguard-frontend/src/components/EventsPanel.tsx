import { useEffect, useState } from 'react'
import Card from './Card'
import { getForecast, getIncidents, getSocial } from '../api'
import type { SelectedLocation } from '../types/location'

type Tab = 'forecast' | 'incidents' | 'social'

type EventsPanelProps = {
  selectedLocation: SelectedLocation
  refreshKey: number
}

export default function EventsPanel({ selectedLocation, refreshKey }: EventsPanelProps) {
  const [tab, setTab] = useState<Tab>('forecast')
  const [forecast, setForecast] = useState<any[]>([])
  const [incidents, setIncidents] = useState<any[]>([])
  const [social, setSocial] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { load() }, [tab, selectedLocation.zoneId, refreshKey])

  async function load() {
    setLoading(true); setError(null)
    try {
      const zone = selectedLocation.zoneId
      if (tab === 'forecast') setForecast(await getForecast(zone))
      if (tab === 'incidents') setIncidents(await getIncidents(zone))
      if (tab === 'social') setSocial(await getSocial(zone))
    } catch (e) {
      console.error('EventsPanel load error:', e)
      setError('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card title="Events">
      <div className="mb-3 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
        Viewing data for <span className="font-semibold text-slate-700 dark:text-slate-200">{selectedLocation.label}</span>
        {selectedLocation.postalCode && ` · ${selectedLocation.postalCode}`}
      </div>
      <div className="mb-3 flex gap-2 overflow-x-auto pb-0.5">
        {(['forecast','incidents','social'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg border min-h-[44px] px-3 py-1.5 text-sm font-medium capitalize transition shrink-0 ${
              tab === t
                ? 'border-emerald-500 bg-emerald-500 text-white'
                : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:text-emerald-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-emerald-500/40 dark:hover:text-emerald-200'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {error && <div className="mb-2 text-sm text-rose-500">{error}</div>}
      {loading && <div className="text-sm text-slate-500 dark:text-slate-400">Loading…</div>}

      {!loading && tab === 'forecast' && (
        <div className="overflow-y-auto max-h-[400px] scroll-smooth-touch">
          <div className="mb-2 text-xs text-slate-500 dark:text-slate-400">
            Zone/Pincode: <span className="font-semibold text-slate-700 dark:text-slate-200">{selectedLocation.zoneId}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[280px] text-sm">
              <thead className="text-left text-xs text-slate-500 dark:text-slate-400 sticky top-0 bg-white dark:bg-slate-900">
                <tr>
                  <th className="pb-2 pr-3 font-medium">Rain Prob</th>
                  <th className="pb-2 pr-3 font-medium">Risk Score</th>
                  <th className="pb-2 font-medium">Updated</th>
                </tr>
              </thead>
              <tbody>
                {forecast.slice().reverse().slice(0,12).map((f:any)=> (
                  <tr key={f.id} className="border-t border-slate-200 dark:border-slate-800">
                    <td className="py-2 pr-3 text-sm">{typeof f.rainProb==='number' ? `${Math.round(f.rainProb*100)}%` : '-'}</td>
                    <td className="pr-3 text-sm">{typeof f.riskScore==='number' ? `${Math.round(f.riskScore*100)}%` : '-'}</td>
                    <td className="text-xs text-slate-500 dark:text-slate-400">{f.timestamp ? new Date(f.timestamp).toLocaleTimeString() : '-'}</td>
                  </tr>
                ))}
                {forecast.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-3 text-center text-xs text-slate-400">No forecast yet for this location.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && tab === 'incidents' && (
        <ul className="divide-y divide-slate-200 dark:divide-slate-800 overflow-y-auto max-h-[400px] scroll-smooth-touch">
          {incidents.slice().reverse().slice(0,15).map((i:any)=> (
            <li key={i.id} className="py-2.5 text-sm">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                <div className="font-medium text-slate-700 dark:text-slate-200">{i.type} · {i.zone}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 shrink-0">{i.timestamp ? new Date(i.timestamp).toLocaleTimeString() : '-'}</div>
              </div>
              <div className="mt-0.5 text-slate-600 dark:text-slate-300 text-xs sm:text-sm leading-relaxed">{i.description}</div>
            </li>
          ))}
          {incidents.length === 0 && (
            <li className="py-3 text-center text-xs text-slate-400">No recent incidents for this zone.</li>
          )}
        </ul>
      )}

      {!loading && tab === 'social' && (
        <ul className="divide-y divide-slate-200 dark:divide-slate-800 overflow-y-auto max-h-[400px] scroll-smooth-touch">
          {social.slice().reverse().slice(0,20).map((s:any)=> (
            <li key={s.id} className="py-2.5 text-sm">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                <div className="font-medium text-slate-700 dark:text-slate-200">@{s.user} · {s.zone}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 shrink-0">{s.timestamp ? new Date(s.timestamp).toLocaleTimeString() : '-'}</div>
              </div>
              <div className="mt-0.5 text-slate-600 dark:text-slate-300 text-xs sm:text-sm leading-relaxed">{s.text}</div>
            </li>
          ))}
          {social.length === 0 && (
            <li className="py-3 text-center text-xs text-slate-400">No recent social chatter detected here.</li>
          )}
        </ul>
      )}
    </Card>
  )
}

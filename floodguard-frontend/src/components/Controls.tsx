import { useEffect, useState } from 'react'
import Card from './Card'
import { runCycle, startLoop, stopLoop, reportIncident } from '../api'
import Toast, { useToast } from './Toast'
import { Play, Square, RefreshCw, Send, Search } from 'lucide-react'
import { forwardGeocode, type GeocodeResult } from '../lib/geocoding'
import type { SelectedLocation } from '../types/location'

const DEFAULT_DESCRIPTION = 'Citizen report: standing water'

type ControlsProps = {
  selectedLocation: SelectedLocation
  onLocationChange: (loc: SelectedLocation) => void
  onActionComplete: () => void
}

export default function Controls({ selectedLocation, onLocationChange, onActionComplete }: ControlsProps) {
  const [incidentsTarget, setIncidentsTarget] = useState(1)
  const [socialTarget, setSocialTarget] = useState(2)
  const [intervalMs, setIntervalMs] = useState(5000)
  const [zone, setZone] = useState(selectedLocation.zoneId)
  const [description, setDescription] = useState(DEFAULT_DESCRIPTION)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<GeocodeResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const { msg, type, toast, dismiss } = useToast()

  useEffect(() => {
    setZone(selectedLocation.zoneId)
  }, [selectedLocation.zoneId])

  async function runOnce() {
    try {
      await runCycle(incidentsTarget, socialTarget, selectedLocation, zone)
      onActionComplete()
      toast('Cycle completed')
    } catch (error: any) {
      toast(error?.message ?? 'Cycle failed', 'err')
    }
  }

  async function startLoopHandler() {
    try {
      await runCycle(incidentsTarget, socialTarget, selectedLocation, zone)
      onActionComplete()
      await startLoop(intervalMs, incidentsTarget, socialTarget, selectedLocation, zone)
      onActionComplete()
      toast('Loop started with selected location')
    } catch (error: any) {
      toast(error?.message ?? 'Failed to start loop', 'err')
    }
  }

  async function stopLoopHandler() {
    try {
      await stopLoop()
      toast('Loop stopped')
      onActionComplete()
    } catch (error: any) {
      toast(error?.message ?? 'Failed to stop loop', 'err')
    }
  }

  async function report() {
    try {
      await reportIncident(zone, description, 'citizen', {
        name: selectedLocation.label,
        latitude: selectedLocation.latitude,
        longitude: selectedLocation.longitude,
      })
      toast('Incident reported')
      onActionComplete()
    } catch (error: any) {
      toast(error?.message ?? 'Failed to report incident', 'err')
    }
  }

  async function handleSearch() {
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }
    setIsSearching(true)
    const results = await forwardGeocode(searchQuery.trim())
    setSearchResults(results)
    setIsSearching(false)
  }

  function applyLocation(result: GeocodeResult) {
    const zoneId = (result.postalCode || zone || selectedLocation.zoneId).toString().toUpperCase()
    onLocationChange({
      label: result.label,
      latitude: result.latitude,
      longitude: result.longitude,
      postalCode: result.postalCode,
      zoneId,
      source: 'search',
    })
    setZone(zoneId)
    setSearchResults([])
    setSearchQuery('')
  }

  function handleZoneInput(value: string) {
    const normalized = value.toUpperCase()
    setZone(normalized)
    onLocationChange({ ...selectedLocation, zoneId: normalized })
  }

  return (
    <>
      <Card title="Controls">
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div>
            <label className="text-xs font-medium text-slate-500 dark:text-slate-300">Incidents</label>
            <input
              type="number"
              min={0}
              value={incidentsTarget}
              onChange={e => setIncidentsTarget(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-slate-700 transition focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 dark:text-slate-300">Social</label>
            <input
              type="number"
              min={0}
              value={socialTarget}
              onChange={e => setSocialTarget(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-slate-700 transition focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 dark:text-slate-300">Interval (ms)</label>
            <input
              type="number"
              min={1000}
              step={500}
              value={intervalMs}
              onChange={e => setIntervalMs(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-slate-700 transition focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 text-sm font-medium">
          <button onClick={runOnce} className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2 text-white shadow-sm transition hover:bg-emerald-700 hover:shadow-md"><RefreshCw className="h-4 w-4" />Run Cycle</button>
          <button onClick={startLoopHandler} className="flex items-center justify-center gap-2 rounded-xl bg-sky-600 py-2 text-white shadow-sm transition hover:bg-sky-700 hover:shadow-md"><Play className="h-4 w-4" />Start</button>
          <button onClick={stopLoopHandler} className="flex items-center justify-center gap-2 rounded-xl bg-rose-600 py-2 text-white shadow-sm transition hover:bg-rose-700 hover:shadow-md"><Square className="h-4 w-4" />Stop</button>
        </div>

        <div className="mt-5 space-y-3 text-sm">
          <div>
            <label className="text-xs font-medium text-slate-500 dark:text-slate-300">Search location</label>
            <div className="mt-1 flex gap-2">
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search city, address, postcode"
                className="flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-slate-700 transition focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
              <button
                type="button"
                onClick={handleSearch}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-slate-600 transition hover:border-emerald-300 hover:text-emerald-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-emerald-500/40 dark:hover:text-emerald-200"
              >
                <Search className="h-4 w-4" />
              </button>
            </div>
            {isSearching && <div className="mt-2 text-xs text-slate-500">Searching…</div>}
            {searchResults.length > 0 && (
              <ul className="mt-2 max-h-40 overflow-auto rounded-lg border border-slate-200 bg-white text-xs shadow-sm dark:border-slate-700 dark:bg-slate-900">
                {searchResults.map(result => (
                  <li key={result.id ?? `${result.latitude}-${result.longitude}`}>
                    <button
                      onClick={() => applyLocation(result)}
                      className="flex w-full items-start gap-2 px-3 py-2 text-left hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
                    >
                      <span className="font-medium text-slate-700 dark:text-slate-200">{result.label}</span>
                      {result.postalCode && (
                        <span className="ml-auto text-slate-500 dark:text-slate-400">{result.postalCode}</span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="text-xs font-medium text-slate-500 dark:text-slate-300">Selected location</label>
              <div className="mt-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                <div className="font-medium text-sm">{selectedLocation.label}</div>
                <div>Lat: {selectedLocation.latitude.toFixed(4)}</div>
                <div>Lon: {selectedLocation.longitude.toFixed(4)}</div>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-slate-300">Postal / Zone</label>
              <input
                value={zone}
                onChange={e => handleZoneInput(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-slate-700 transition focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-500 dark:text-slate-300">Description</label>
            <input
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-1 text-slate-700 transition focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>
        </div>

        <div className="mt-3">
          <button onClick={report} className="flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-white shadow-sm transition hover:bg-slate-800 hover:shadow-md dark:bg-slate-700 dark:hover:bg-slate-600"><Send className="h-4 w-4" />Report Incident</button>
        </div>
      </Card>

      {msg && <Toast msg={msg} type={type} onClose={dismiss} />}
    </>
  )
}

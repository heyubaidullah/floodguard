import { useEffect, useState } from 'react'
import Card from './Card'
import { runCycle, startLoop, stopLoop, reportIncident, getDemoSnapshot, getAiStatus } from '../api'
import Toast, { useToast } from './Toast'
import { Play, Square, RefreshCw, Send, Search, Zap, FlaskConical, Eye, EyeOff, KeyRound, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { forwardGeocode, type GeocodeResult } from '../lib/geocoding'
import type { SelectedLocation } from '../types/location'
import { useMode, type AppMode } from '../context/ModeContext'

const DEFAULT_DESCRIPTION = 'Citizen report: standing water'

type ControlsProps = {
  selectedLocation: SelectedLocation
  onLocationChange: (loc: SelectedLocation) => void
  onActionComplete: (data?: any) => void
}

export default function Controls({ selectedLocation, onLocationChange, onActionComplete }: ControlsProps) {
  const { mode, setMode, geminiKey, setGeminiKey } = useMode()

  const [incidentsTarget, setIncidentsTarget] = useState(1)
  const [socialTarget, setSocialTarget] = useState(2)
  const [intervalMs, setIntervalMs] = useState(5000)
  const [zone, setZone] = useState(selectedLocation.zoneId)
  const [description, setDescription] = useState(DEFAULT_DESCRIPTION)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<GeocodeResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const { msg, type, toast, dismiss } = useToast()

  // BYOK key state
  const [keyDraft, setKeyDraft] = useState(geminiKey)
  const [showKey, setShowKey] = useState(false)
  const [aiStatus, setAiStatus] = useState<{ hasServerKey: boolean; aiEnabled: boolean } | null>(null)

  useEffect(() => {
    setZone(selectedLocation.zoneId)
  }, [selectedLocation.zoneId])

  // Sync draft when stored key changes externally
  useEffect(() => {
    setKeyDraft(geminiKey)
  }, [geminiKey])

  // Check AI availability when switching to live mode or key changes
  useEffect(() => {
    if (mode === 'live') {
      getAiStatus().then(setAiStatus)
    }
  }, [mode, geminiKey])

  function handleModeSwitchTo(m: AppMode) {
    setMode(m)
    if (m === 'demo') setAiStatus(null)
  }

  function saveKey() {
    setGeminiKey(keyDraft)
    toast('Gemini key saved')
  }

  function clearKey() {
    setKeyDraft('')
    setGeminiKey('')
    toast('Gemini key cleared')
  }

  async function runOnce() {
    try {
      if (mode === 'demo') {
        const data = await getDemoSnapshot()
        // Switch location to DEMO-HIGH so all dashboard panels filter to demo data
        onLocationChange({
          label: 'Miami Demo Scenario (Bayshore District)',
          latitude: 25.7617,
          longitude: -80.1918,
          postalCode: 'DEMO',
          zoneId: 'DEMO-HIGH',
          source: 'search',
        })
        onActionComplete(data)
        toast('Demo snapshot loaded')
      } else {
        const data = await runCycle(incidentsTarget, socialTarget, selectedLocation, zone)
        onActionComplete(data)
        toast('Cycle completed')
      }
    } catch (error: any) {
      toast(error?.message ?? 'Cycle failed', 'err')
    }
  }

  async function startLoopHandler() {
    if (mode === 'demo') {
      toast('Loop not available in Demo mode — use Load instead', 'err')
      return
    }
    try {
      const data = await runCycle(incidentsTarget, socialTarget, selectedLocation, zone)
      onActionComplete(data)
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

  const inputClass = "mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 min-h-[44px] text-sm text-slate-700 transition focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"

  const isLiveWithoutAi = mode === 'live' && aiStatus && !aiStatus.aiEnabled

  return (
    <>
      <Card title="Controls">

        {/* ── Mode Toggle ── */}
        <div className="mb-4">
          <p className="mb-1.5 text-xs font-medium text-slate-500 dark:text-slate-300">Data source</p>
          <div className="flex rounded-xl border border-slate-200 bg-slate-100 p-1 dark:border-slate-700 dark:bg-slate-800">
            <button
              onClick={() => handleModeSwitchTo('demo')}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                mode === 'demo'
                  ? 'bg-white text-emerald-700 shadow-sm dark:bg-slate-700 dark:text-emerald-300'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <FlaskConical className="h-3.5 w-3.5 shrink-0" />
              Demo
            </button>
            <button
              onClick={() => handleModeSwitchTo('live')}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                mode === 'live'
                  ? 'bg-white text-sky-700 shadow-sm dark:bg-slate-700 dark:text-sky-300'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <Zap className="h-3.5 w-3.5 shrink-0" />
              Live AI
            </button>
          </div>

          {/* Demo mode info pill */}
          {mode === 'demo' && (
            <div className="mt-2 flex items-start gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
              <FlaskConical className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>Pre-recorded realistic flood scenario — instant, no API key needed. Explore the dashboard freely.</span>
            </div>
          )}

          {/* Live AI — no key warning */}
          {isLiveWithoutAi && (
            <div className="mt-2 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                No Gemini API key configured — AI agents will fall back to heuristics. Enter your key below, or set{' '}
                <code className="rounded bg-amber-100 px-1 dark:bg-amber-900/40">GEMINI_API_KEY</code>{' '}
                as an environment variable when self-hosting.
              </span>
            </div>
          )}

          {/* Live AI — key active */}
          {mode === 'live' && aiStatus?.aiEnabled && (
            <div className="mt-2 flex items-center gap-2 rounded-lg bg-sky-50 px-3 py-2 text-xs text-sky-700 dark:bg-sky-500/10 dark:text-sky-300">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
              <span>AI agents active — {aiStatus.hasServerKey ? 'server key' : 'your key'} in use.</span>
            </div>
          )}
        </div>

        {/* ── BYOK key input (only in live mode) ── */}
        {mode === 'live' && (
          <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
            <label className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-300">
              <KeyRound className="h-3.5 w-3.5" />
              Gemini API Key (optional)
            </label>
            <div className="mt-1.5 flex gap-2">
              <div className="relative flex-1">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={keyDraft}
                  onChange={e => setKeyDraft(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && saveKey()}
                  placeholder="AIza..."
                  className={`${inputClass} mt-0 pr-9 font-mono text-xs`}
                />
                <button
                  type="button"
                  onClick={() => setShowKey(v => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  aria-label={showKey ? 'Hide key' : 'Show key'}
                >
                  {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
              <button
                type="button"
                onClick={saveKey}
                className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/20 min-h-[44px]"
              >
                Save
              </button>
              {geminiKey && (
                <button
                  type="button"
                  onClick={clearKey}
                  className="rounded-lg border border-rose-200 bg-rose-50 px-3 text-xs font-medium text-rose-600 transition hover:bg-rose-100 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-500/20 min-h-[44px]"
                >
                  Clear
                </button>
              )}
            </div>
            <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">
              Stored locally in your browser only. Get a free key at{' '}
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-emerald-600 dark:hover:text-emerald-400"
              >
                aistudio.google.com
              </a>
            </p>
          </div>
        )}

        {/* ── Cycle parameters (only in live mode) ── */}
        {mode === 'live' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-slate-300">Incidents</label>
              <input
                type="number"
                min={0}
                value={incidentsTarget}
                onChange={e => setIncidentsTarget(Number(e.target.value))}
                className={inputClass}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-slate-300">Social</label>
              <input
                type="number"
                min={0}
                value={socialTarget}
                onChange={e => setSocialTarget(Number(e.target.value))}
                className={inputClass}
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
                className={inputClass}
              />
            </div>
          </div>
        )}

        {/* ── Action buttons ── */}
        <div className={`${mode === 'live' ? 'mt-3' : ''} grid grid-cols-3 gap-2 text-sm font-medium`}>
          <button onClick={runOnce} className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 min-h-[44px] py-2 text-white shadow-sm transition hover:bg-emerald-700 hover:shadow-md active:bg-emerald-800">
            <RefreshCw className="h-4 w-4 shrink-0" />
            <span className="truncate">{mode === 'demo' ? 'Load' : 'Run'}</span>
          </button>
          <button
            onClick={startLoopHandler}
            disabled={mode === 'demo'}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-sky-600 min-h-[44px] py-2 text-white shadow-sm transition hover:bg-sky-700 hover:shadow-md active:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Play className="h-4 w-4 shrink-0" />
            <span className="truncate">Start</span>
          </button>
          <button
            onClick={stopLoopHandler}
            disabled={mode === 'demo'}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-rose-600 min-h-[44px] py-2 text-white shadow-sm transition hover:bg-rose-700 hover:shadow-md active:bg-rose-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Square className="h-4 w-4 shrink-0" />
            <span className="truncate">Stop</span>
          </button>
        </div>

        <div className="mt-5 space-y-3 text-sm">
          <div>
            <label className="text-xs font-medium text-slate-500 dark:text-slate-300">Search location</label>
            <div className="mt-1 flex gap-2">
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="Search city, address, postcode"
                className={`${inputClass} flex-1 mt-0`}
              />
              <button
                type="button"
                onClick={handleSearch}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white min-h-[44px] px-3 text-slate-600 transition hover:border-emerald-300 hover:text-emerald-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-emerald-500/40 dark:hover:text-emerald-200"
              >
                <Search className="h-4 w-4" />
              </button>
            </div>
            {isSearching && <div className="mt-2 text-xs text-slate-500">Searching…</div>}
            {searchResults.length > 0 && (
              <ul className="mt-2 max-h-48 overflow-auto rounded-lg border border-slate-200 bg-white text-xs shadow-sm dark:border-slate-700 dark:bg-slate-900 scroll-smooth-touch">
                {searchResults.map(result => (
                  <li key={result.id ?? `${result.latitude}-${result.longitude}`}>
                    <button
                      onClick={() => applyLocation(result)}
                      className="flex w-full items-start gap-2 min-h-[44px] px-3 py-2.5 text-left hover:bg-emerald-50 active:bg-emerald-100 dark:hover:bg-emerald-500/10"
                    >
                      <span className="font-medium text-slate-700 dark:text-slate-200">{result.label}</span>
                      {result.postalCode && (
                        <span className="ml-auto text-slate-500 dark:text-slate-400 shrink-0">{result.postalCode}</span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-slate-500 dark:text-slate-300">Selected location</label>
              <div className="mt-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                <div className="font-medium text-sm truncate">{selectedLocation.label}</div>
                <div>Lat: {selectedLocation.latitude.toFixed(4)} · Lon: {selectedLocation.longitude.toFixed(4)}</div>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-slate-300">Postal / Zone</label>
              <input
                value={zone}
                onChange={e => handleZoneInput(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-500 dark:text-slate-300">Description</label>
            <input
              value={description}
              onChange={e => setDescription(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div className="mt-3">
          <button onClick={report} className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-slate-900 min-h-[44px] px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 hover:shadow-md active:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600"><Send className="h-4 w-4 shrink-0" />Report Incident</button>
        </div>
      </Card>

      {msg && <Toast msg={msg} type={type} onClose={dismiss} />}
    </>
  )
}

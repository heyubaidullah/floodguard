import { useEffect, useMemo, useRef, useState } from 'react'
import { Activity, ArrowRight, CheckCircle2, Clock, PauseCircle, PlayCircle, Zap } from 'lucide-react'
import Card from './Card'
import { getTrace } from '../api'
import { motion, AnimatePresence } from 'framer-motion'

type A2AItem = {
  dir: '→' | '←',
  env: {
    a2a: string
    id: string
    from: string
    to: string
    type: 'request' | 'response' | 'event'
    timestamp: string
    payload?: any
    correlationId?: string
  }
}

type PhaseKey = 'PARALLEL' | 'FUSE' | 'COMMS'

/**
 * Polls /ops/trace and renders a live timeline of A2A envelopes.
 * We infer phases:
 * - PARALLEL: A0 → A1/A2/A3 (request/response)
 * - FUSE:     A0 → A4
 * - COMMS:    A0 → A6
 */
export default function AgentTimeline() {
  const [items, setItems] = useState<A2AItem[]>([])
  const [isPolling, setIsPolling] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<number | null>(null)
  const timerRef = useRef<number | null>(null)

  // Poll every 2s for fresh trace (backend clears after each read)
  useEffect(() => {
    async function tick() {
      try {
        const batch: A2AItem[] = await getTrace()
        if (Array.isArray(batch) && batch.length > 0) {
          setItems(prev => {
            // append new envelopes; avoid dup by id+dir
            const seen = new Set(prev.map(p => p.dir + p.env.id + (p.env.correlationId ?? '')))
            const merged = [...prev]
            for (const b of batch) {
              const key = b.dir + b.env.id + (b.env.correlationId ?? '')
              if (!seen.has(key)) merged.push(b)
            }
            return merged
          })
          setLastUpdated(Date.now())
        }
      } catch (e) {
        // silent fail; keep UI running
        // console.warn('trace poll failed', e)
      }
    }

    if (isPolling) {
      tick()
      timerRef.current = window.setInterval(tick, 2000) as unknown as number
    }
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current)
    }
  }, [isPolling])

  // Derive per-phase progress + human-friendly rows
  const rows = useMemo(() => {
    // Keep last ~80 entries to avoid DOM bloat
    const trimmed = items.slice(-80)
    // map to display rows
    return trimmed.map((it) => {
      const { env, dir } = it
      const phase: PhaseKey =
        env.to === 'A1' || env.to === 'A2' || env.to === 'A3' ? 'PARALLEL'
        : env.to === 'A4' || env.from === 'A4' ? 'FUSE'
        : 'COMMS'
      const ts = new Date(env.timestamp).toLocaleTimeString()
      return { key: env.id + (env.correlationId ?? '') + dir, dir, phase, from: env.from, to: env.to, type: env.type, ts }
    })
  }, [items])

  // Phase completion booleans for progress bar
  const phaseStatus = useMemo(() => {
    const hasReq = (to: string) => rows.some(r => r.type === 'request' && r.to === to)
    const hasRes = (from: string) => rows.some(r => r.type === 'response' && r.from === from)
    const parallelDone = (hasReq('A1') && hasRes('A1')) || (hasReq('A2') && hasRes('A2')) || (hasReq('A3') && hasRes('A3'))
    const allParallelDone = ['A1','A2','A3'].every(a => hasReq(a) && hasRes(a))
    const fuseDone = hasReq('A4') && hasRes('A4')
    const commsDone = hasReq('A6') && hasRes('A6')
    return { parallelDone, allParallelDone, fuseDone, commsDone }
  }, [rows])

  const phasePct = useMemo(() => {
    // Progress from 0 → 100 across three logical phases
    let pct = 0
    if (phaseStatus.parallelDone) pct = 33
    if (phaseStatus.allParallelDone) pct = 45 // bonus feedback when all 3 returned
    if (phaseStatus.fuseDone) pct = 75
    if (phaseStatus.commsDone) pct = 100
    return pct
  }, [phaseStatus])

  return (
    <Card
      title="Agent Activity"
      actions={
        <div className="flex items-center gap-2">
          <span className="hidden text-xs text-slate-500 dark:text-slate-400 sm:inline">
            {lastUpdated ? `updated ${new Date(lastUpdated).toLocaleTimeString()}` : 'listening…'}
          </span>
          <button
            onClick={() => setIsPolling(p => !p)}
            className={`rounded-lg border px-2 py-1 text-xs font-semibold transition ${
              isPolling
                ? 'border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:text-emerald-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-emerald-500/40 dark:hover:text-emerald-200'
                : 'border-emerald-500 bg-emerald-500 text-white hover:bg-emerald-400 dark:border-emerald-400 dark:bg-emerald-400 dark:text-slate-900'
            }`}
            title={isPolling ? 'Pause trace' : 'Resume trace'}
          >
            {isPolling ? <PauseCircle className="w-4 h-4 inline mr-1" /> : <PlayCircle className="w-4 h-4 inline mr-1" />} {isPolling ? 'Pause' : 'Resume'}
          </button>
        </div>
      }
    >
      {/* Phase progress */}
      <div className="mb-3">
        <div className="mb-1 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
          <span className="flex items-center gap-1"><Zap className="w-3.5 h-3.5" /> Parallel (A1/A2/A3)</span>
          <span className="flex items-center gap-1"><Activity className="w-3.5 h-3.5" /> Fuse (A4)</span>
          <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Comms (A6)</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
          <motion.div
            className="h-full bg-emerald-600"
            initial={{ width: 0 }}
            animate={{ width: `${phasePct}%` }}
            transition={{ type: 'spring', stiffness: 120, damping: 20 }}
          />
        </div>
        <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
          {phasePct === 0 && 'Waiting for next cycle…'}
          {phasePct > 0 && phasePct < 100 && 'Cycle in progress…'}
          {phasePct === 100 && 'Cycle complete'}
        </div>
      </div>

      {/* Timeline list */}
      <div className="max-h-72 overflow-auto pr-1">
        <ul className="space-y-2">
          <AnimatePresence initial={false}>
            {rows.slice(-40).map(row => (
              <motion.li
                key={row.key}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="rounded-xl border border-slate-200 bg-white/80 p-2 text-sm transition hover:border-emerald-200 hover:bg-emerald-50 dark:border-slate-800 dark:bg-slate-900/70 dark:hover:border-emerald-500/40 dark:hover:bg-emerald-500/10"
              >
                <div className="flex items-center gap-2">
                  <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full border text-[11px] ${row.type === 'request' ? 'border-sky-200 bg-sky-500/15 text-sky-600 dark:border-sky-500/40 dark:bg-sky-500/20 dark:text-sky-300' : 'border-emerald-200 bg-emerald-500/15 text-emerald-600 dark:border-emerald-500/40 dark:bg-emerald-500/20 dark:text-emerald-300'}`}>
                    {row.type === 'request' ? 'REQ' : 'RES'}
                  </span>

                  <div className="flex items-center gap-2 text-slate-800 dark:text-slate-100">
                    <strong className="font-semibold">{row.from}</strong>
                    <ArrowRight className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                    <strong className="font-semibold">{row.to}</strong>
                    <span className="ml-2 rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                      {row.phase === 'PARALLEL' ? 'Parallel' : row.phase === 'FUSE' ? 'Fuse' : 'Comms'}
                    </span>
                  </div>

                  <span className="ml-auto inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                    <Clock className="w-3.5 h-3.5" /> {row.ts}
                  </span>
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      </div>

      {/* Legend */}
      <div className="mt-3 flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
        <span className="inline-flex items-center gap-1"><span className="inline-block h-3 w-3 rounded-full border border-sky-300 bg-sky-500/20 dark:border-sky-500/40 dark:bg-sky-500/30" /> Request</span>
        <span className="inline-flex items-center gap-1"><span className="inline-block h-3 w-3 rounded-full border border-emerald-300 bg-emerald-500/20 dark:border-emerald-500/40 dark:bg-emerald-500/30" /> Response</span>
        <span className="ml-auto text-[11px]">Trace stream resets each fetch.</span>
      </div>
    </Card>
  )
}

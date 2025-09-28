import { useEffect, useMemo, useRef, useState } from 'react'
import Card from './Card'
import { getTrace } from '../api'
import { Activity, CheckCircle2, Loader2, RefreshCw } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

type A2AItem = {
  dir?: '→' | '←'
  env?: {
    id?: string
    from?: string
    to?: string
    type?: 'request' | 'response' | 'event'
    timestamp?: string
    correlationId?: string
  }
}
type Status = 'idle' | 'running' | 'success'

const AGENTS = [
  { key: 'A1', label: 'Weather (A1)', desc: 'Fetches rainfall probability & amount' },
  { key: 'A2', label: 'Drain/Grid (A2)', desc: 'Logs drain/citizen incident reports' },
  { key: 'A3', label: 'Social (A3)', desc: 'Captures flood-related social posts' },
  { key: 'A4', label: 'Risk Fusion (A4)', desc: 'Combines signals → risk score' },
  { key: 'A6', label: 'Comms (A6)', desc: 'Generates Ops & Public alerts' },
] as const
const KEYS = ['A1','A2','A3','A4','A6'] as const

export default function AgentStatusBoard() {
  const [trace, setTrace] = useState<A2AItem[]>([])
  const [lastStamp, setLastStamp] = useState<number>(0)
  const [isLive, setIsLive] = useState(true)
  const pollRef = useRef<number | null>(null)

  // Poll /ops/trace safely every 2s
  useEffect(() => {
    async function tick() {
      const batch = await getTrace()
      if (Array.isArray(batch) && batch.length) {
        const clean = batch.filter(b => b && b.env && typeof b.env.timestamp === 'string')
        if (clean.length) {
          setTrace(prev => [...prev, ...clean].slice(-120))
          setLastStamp(Date.now())
        }
      }
    }
    if (isLive) {
      tick()
      pollRef.current = window.setInterval(tick, 2000) as unknown as number
    }
    return () => { if (pollRef.current) window.clearInterval(pollRef.current) }
  }, [isLive])

  // Derive per-agent statuses from recent envelopes
  const { statusMap, mode } = useMemo(() => {
    const windowMs = 20000
    const now = Date.now()
    const recent = trace.filter(t => {
      const ts = t?.env?.timestamp
      const time = ts ? new Date(ts).getTime() : NaN
      return Number.isFinite(time) && (now - time) <= windowMs
    })

    const reqSeen: Record<string, A2AItem | undefined> = {}
    const resSeen: Record<string, A2AItem | undefined> = {}

    for (const it of recent) {
      const to = String(it?.env?.to ?? '')
      const from = String(it?.env?.from ?? '')
      const agent = (KEYS as readonly string[]).includes(to) ? to :
                    (KEYS as readonly string[]).includes(from) ? from : undefined
      if (!agent) continue
      if (it?.env?.type === 'request' && it.dir === '→') reqSeen[agent] = it
      if (it?.env?.type === 'response' && it.dir === '←') resSeen[agent] = it
    }

    const status: Record<string, Status> = {}
    for (const k of KEYS) {
      if (reqSeen[k] && !resSeen[k]) status[k] = 'running'
      else if (resSeen[k])           status[k] = 'success'
      else                           status[k] = 'idle'
    }

    const mode = (Date.now() - lastStamp) < 6000 ? 'Looping' : 'One-shot'
    return { statusMap: status, mode }
  }, [trace, lastStamp])

  const Chip = ({ s }: { s: Status }) => {
    const map: Record<Status, { cls: string; icon: JSX.Element; text: string }> = {
      idle: {
        cls: 'border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
        icon: <Activity className="h-3.5 w-3.5" />,
        text: 'Idle',
      },
      running: {
        cls: 'border-sky-200 bg-sky-500/15 text-sky-700 dark:border-sky-500/40 dark:bg-sky-500/20 dark:text-sky-300',
        icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
        text: 'Running',
      },
      success: {
        cls: 'border-emerald-200 bg-emerald-500/15 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/20 dark:text-emerald-300',
        icon: <CheckCircle2 className="h-3.5 w-3.5" />,
        text: 'Success',
      },
    }
    const m = map[s]
    return <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium ${m.cls}`}>{m.icon}{m.text}</span>
  }

  return (
    <Card
      title="Agent Status"
      actions={
        <button
          onClick={() => setIsLive(v => !v)}
          className={`rounded-lg border px-2 py-1 text-xs font-semibold transition ${
            isLive
              ? 'border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:text-emerald-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-emerald-500/40 dark:hover:text-emerald-200'
              : 'border-emerald-500 bg-emerald-500 text-white hover:bg-emerald-400 dark:border-emerald-400 dark:bg-emerald-400 dark:text-slate-900'
          }`}
        >
          {isLive ? 'Pause' : 'Resume'}
        </button>
      }
    >
      {/* Short descriptions for phases */}
      <div className="mb-3 space-y-1 text-xs text-slate-600 dark:text-slate-400">
        <div><strong>Parallel</strong> — A1/A2/A3 ingest weather, incident reports, and social signals in parallel.</div>
        <div><strong>Fuse</strong> — A4 combines signals → computes risk score & tier per zone.</div>
        <div><strong>Comms</strong> — A6 generates Ops & Public alerts if any zone is HIGH.</div>
      </div>

      {/* Looping vs one-shot badge */}
      <div className="mb-3 text-xs">
        <div className={`inline-flex items-center gap-2 px-2 py-1 rounded-lg border ${
          (Date.now() - lastStamp) < 6000
            ? 'border-purple-200 bg-purple-500/15 text-purple-700 dark:border-purple-500/40 dark:bg-purple-500/20 dark:text-purple-300'
            : 'border-teal-200 bg-teal-500/15 text-teal-700 dark:border-teal-500/40 dark:bg-teal-500/20 dark:text-teal-300'
        }`}>
          <RefreshCw className="w-3.5 h-3.5" /> Mode: {(Date.now() - lastStamp) < 6000 ? 'Looping' : 'One-shot'}
        </div>
      </div>

      {/* Per-agent cards */}
      <div className="grid grid-cols-1 gap-2">
        <AnimatePresence initial={false}>
          {AGENTS.map(a => (
            <motion.div
              key={a.key}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-xl border border-slate-200 bg-white/80 p-3 transition hover:border-emerald-200 hover:bg-emerald-50 dark:border-slate-800 dark:bg-slate-900/70 dark:hover:border-emerald-500/40 dark:hover:bg-emerald-500/10"
            >
              <div className="flex items-center gap-2">
                <div className="font-medium text-slate-800 dark:text-slate-100">{a.label}</div>
                <div className="ml-auto"><Chip s={statusMap[a.key] as Status} /></div>
              </div>
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{a.desc}</div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Card>
  )
}

import React from 'react'
import { ActivitySquare, ArrowRight, Bot, Leaf, Zap } from 'lucide-react'
import { cn } from '../lib/utils.js'

const typeIcon = {
  ingest: ActivitySquare,
  orchestrate: Bot,
  alert: Zap,
  sustainability: Leaf,
}

export default function AgentActivityTimeline({ events = [], formatTime }) {
  if (events.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
        Timeline will populate as agents report new activity.
      </div>
    )
  }

  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="absolute inset-y-6 left-12 hidden w-px bg-gradient-to-b from-brand-300/0 via-brand-300/70 to-brand-300/0 md:block" />
      <div className="relative">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Agent activity timeline</h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
          Highlighting cross-agent signals to evidence the continuous parallel loop.
        </p>

        <ul className="mt-6 space-y-6">
          {events.map((event) => {
            const Icon = typeIcon[event.type] || ActivitySquare
            return (
              <li key={event.id} className="relative pl-10 md:pl-16">
                <span className="absolute left-3 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-brand-700 shadow-sm dark:bg-brand-500/20 dark:text-brand-100 md:left-10">
                  <Icon className="h-4 w-4" />
                </span>
                <div className="rounded-2xl border border-slate-200/60 bg-white/70 p-4 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700/80 dark:bg-slate-900/70">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                        <span>{event.agent}</span>
                        <ArrowRight className="h-3 w-3" />
                        <span className="text-slate-500 dark:text-slate-300">{event.title}</span>
                      </div>
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-200">{event.summary}</p>
                    </div>
                    <time className="flex-shrink-0 text-xs font-medium text-slate-400 dark:text-slate-500">
                      {formatEventTime(event.timestamp, formatTime)}
                    </time>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                    {event.tags?.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-300"
                      >
                        {tag}
                      </span>
                    ))}
                    {event.impact && (
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium',
                          event.type === 'sustainability'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200'
                            : 'bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-100'
                        )}
                      >
                        {event.impact}
                      </span>
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

function formatEventTime(value, formatOverride) {
  if (formatOverride) {
    return formatOverride(value)
  }
  if (!value) return 'moments ago'
  try {
    const now = Date.now()
    const ts = new Date(value).getTime()
    const diff = Math.max(0, now - ts)
    const minutes = Math.round(diff / 60000)
    if (minutes <= 1) return 'moments ago'
    if (minutes < 60) return `${minutes} min ago`
    const hours = Math.round(minutes / 60)
    if (hours < 24) return `${hours} hr ago`
    const days = Math.round(hours / 24)
    return `${days}d ago`
  } catch (error) {
    return value
  }
}

